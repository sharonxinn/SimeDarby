"""Explicit screening assumptions, separate from measured site metrics.

Annual horizontal-resource energy budget; not an hourly PVWatts/roof-plane design.
No generated weather, load profiles, quotes or measured roof properties.
"""
import calendar
import json
import math
from contextlib import closing
from datetime import date, datetime, timedelta, timezone
from pydantic import BaseModel, ConfigDict, Field
from database import get_connection


class ScenarioInputs(BaseModel):
    model_config = ConfigDict(extra='forbid', allow_inf_nan=False)
    usableRoofPct: float = Field(60, ge=0, le=100)
    panelWatts: float = Field(550, gt=0, le=1000)
    panelAreaSqM: float = Field(2.583252, gt=0, le=10)
    dcLossPct: float = Field(15, ge=0, le=100)
    inverterEfficiencyPct: float = Field(96, gt=0, le=100)
    selfConsumptionPct: float = Field(70, ge=0, le=100)
    capexPerKWpMYR: float = Field(3500, ge=0, le=100000)
    capexRangePct: float = Field(20, ge=0, le=100)
    tariffMYRPerKWh: float = Field(.50, ge=0, le=10)
    gridFactorKgPerKWh: float = Field(.758, ge=0, le=5)
    evChargers: int = Field(2, ge=0, le=1000)
    evChargerKW: float = Field(7.4, gt=0, le=500)
    evHoursPerDay: float = Field(4, ge=0, le=24)
    evUtilisationPct: float = Field(35, ge=0, le=100)
    evSolarAllocationPct: float = Field(25, ge=0, le=100)


def solar_observations():
    with closing(get_connection()) as conn:
        return conn.execute("SELECT d.date,d.ghi_kwh_m2,r.source_url,r.completed_at,r.sha256,r.id FROM solar_daily d JOIN pipeline_runs r ON r.id=d.run_id WHERE r.status='succeeded' ORDER BY d.date").fetchall()


def resource_for(coordinates, observations=None):
    """Use only a complete, validated NASA import, with its actual source location."""
    rows = solar_observations() if observations is None else observations
    if not rows:
        return None
    from urllib.parse import urlparse, parse_qs
    # Select the latest complete calendar year from a single import and location.
    for year in sorted({int(r['date'][:4]) for r in rows}, reverse=True):
        selected = [r for r in rows if int(r['date'][:4]) == year]
        days = 366 if calendar.isleap(year) else 365
        dates = [(date(year, 1, 1) + timedelta(days=i)).isoformat() for i in range(days)]
        if year >= date.today().year or [r['date'] for r in selected] != dates or len({r['id'] for r in selected}) != 1:
            continue
        query = parse_qs(urlparse(selected[0]['source_url']).query)
        try:
            lat, lng = float(query['latitude'][0]), float(query['longitude'][0])
        except (ValueError, KeyError):
            continue
        a, b = map(math.radians, coordinates), map(math.radians, [lat, lng])
        y1, x1 = a; y2, x2 = b
        hav = math.sin((y2-y1)/2)**2 + math.cos(y1)*math.cos(y2)*math.sin((x2-x1)/2)**2
        distance = 6371 * 2 * math.asin(min(1, math.sqrt(hav)))
        if distance > 100:
            continue
        return {'year': year, 'days': days, 'annualGHI': sum(r['ghi_kwh_m2'] for r in selected),
                'coordinates': [lat, lng], 'distanceKm': round(distance, 1), 'sourceUrl': selected[0]['source_url'],
                'importedAt': selected[0]['completed_at'], 'sha256': selected[0]['sha256'],
                'description': 'NASA POWER regional gridded horizontal irradiance; not a rooftop measurement'}
    return None


def calculate(site, evidence, inputs, resource):
    p = inputs.model_dump()
    surveyed = (evidence or {}).get('surveyedUsableRoofSqM')
    area = surveyed if surveyed is not None else site['footprintSqM'] * p['usableRoofPct'] / 100
    panels = math.floor(area / p['panelAreaSqM'])
    capacity = panels * p['panelWatts'] / 1000
    dc = capacity * resource['annualGHI'] * (1-p['dcLossPct']/100) if resource else None
    ac = dc * p['inverterEfficiencyPct']/100 if dc is not None else None
    self_use = ac * p['selfConsumptionPct']/100 if ac is not None else None
    capex = capacity * p['capexPerKWpMYR']
    savings = self_use * p['tariffMYRPerKWh'] if self_use is not None else None
    charging = p['evChargers'] * p['evChargerKW'] * p['evHoursPerDay'] * 365 * p['evUtilisationPct']/100
    pv_ev = min(charging, self_use * p['evSolarAllocationPct']/100) if self_use is not None else None
    supply, peak = (evidence or {}).get('confirmedSupplyKW'), (evidence or {}).get('peakDemandKW')
    margin = supply - peak if supply is not None and peak is not None else None
    ev_peak = p['evChargers'] * p['evChargerKW']
    warnings = ['Screening scenario, not a survey, installer quote, bankable forecast or grid approval.',
                'Horizontal GHI approximation: no roof tilt, orientation, shading geometry, hourly temperature or inverter clipping model. DC losses combine assumed thermal, soiling, wiring and shading losses.',
                'Usable area allocation and panel count are area-only; roof strength, setbacks, obstructions and a physical layout still need a survey.',
                'Savings credit only assumed on-site AC use; exports have no assigned payment. Tariff is a flat reference, not the site bill. Simple payback excludes maintenance, financing, degradation and EV costs.',
                '0.758 kg CO₂/kWh is the requested reference assumption, not a verified current site emission factor. Avoided emissions credit only assumed on-site PV use.',
                'EV count, utilisation and charging hours are design assumptions. Annual PV allocation is an energy budget, not proof of simultaneous charging or off-grid operation. No battery is modelled.']
    if not resource:
        warnings.insert(0, 'Solar resource unavailable: import a complete NASA year. Yield, savings and avoided emissions are left unavailable.')
    parking = (evidence or {}).get('parkingBays')
    if parking is not None and p['evChargers'] > parking:
        warnings.insert(0, 'Proposed EV chargers exceed recorded parking bays; revise the scenario.')
    return {'kind': 'modelled', 'updatedAt': datetime.now(timezone.utc).isoformat(), 'inputs': p, 'resource': resource,
            'usableAreaSqM': area, 'areaBasis': 'Owner-supplied surveyed usable area' if surveyed is not None else 'Mapped footprint × assumed usable percentage',
            'panels': panels, 'proposedKWp': capacity, 'annualDCKWh': dc, 'annualACKWh': ac, 'annualSelfConsumedKWh': self_use,
            'capexMYR': capex, 'capexLowMYR': capex*(1-p['capexRangePct']/100), 'capexHighMYR': capex*(1+p['capexRangePct']/100),
            'annualSavingsMYR': savings, 'paybackYears': capex/savings if capex > 0 and savings and savings > 0 else None,
            'annualCO2Tonnes': self_use*p['gridFactorKgPerKWh']/1000 if self_use is not None else None,
            'ev': {'connectedKW': ev_peak, 'annualChargingKWh': charging, 'pvAllocatedKWh': pv_ev,
                   'annualSolarSharePct': 100*pv_ev/charging if pv_ev is not None and charging > 0 else None,
                   'remainingGridKWh': charging-pv_ev if pv_ev is not None else None, 'recordedSupplyMarginKW': margin,
                   'supplyCheck': 'Not established: supply limit and measured peak required' if margin is None else
                       'Proposed simultaneous charger load exceeds recorded margin; load management or a supply upgrade is needed' if ev_peak > margin else
                       'Within recorded margin on paper; utility review and time-aligned load assessment still required'},
            'warnings': warnings,
            'formulas': ['Panels = floor(available area ÷ panel area); proposed kWp = panels × panel W ÷ 1000.',
                         'Annual DC kWh = proposed kWp × annual horizontal GHI × (1 − DC losses). Annual AC = DC × inverter efficiency.',
                         'Savings = AC × assumed self-consumption × reference tariff. Payback = solar CAPEX ÷ savings.',
                         'Avoided t CO₂ = on-site AC kWh × reference kg CO₂/kWh ÷ 1000.',
                         'EV annual kWh = charger count × kW × hours/day × 365 × utilisation. PV-to-EV = min(EV annual kWh, on-site PV × allocation). EV allocation is already included in on-site PV, never added twice.'],
            'references': [{'title': 'NASA POWER daily resource methodology', 'url': 'https://power.larc.nasa.gov/docs/services/api/temporal/daily/'},
                           {'title': 'Example 550 W module dimensions (Jinko 2278 × 1134 mm)', 'url': 'https://www.jinkosolar.com/uploads/619f40ec/JKM550-570N-72HL4-BDV-F1-EN.pdf'}]}


def for_site(site, evidence, inputs=None, observations=None):
    if inputs is None:
        with closing(get_connection()) as conn:
            row = conn.execute('SELECT inputs FROM implementation_scenarios WHERE site_key=?', (site['siteKey'],)).fetchone()
        inputs = ScenarioInputs.model_validate_json(row['inputs']) if row else ScenarioInputs()
    return calculate(site, evidence, inputs, resource_for(site['coordinates'], observations))
