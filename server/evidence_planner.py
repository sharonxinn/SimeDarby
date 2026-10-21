"""Recommendations and arithmetic based only on explicitly recorded site evidence."""
from datetime import date, datetime, timezone, timedelta
from typing import Literal
from pydantic import BaseModel, ConfigDict, Field, model_validator

REFERENCES = {
    'solar': {'title': 'SEDA Malaysia — Solar ATAP', 'url': 'https://www.seda.gov.my/reportal/atap/', 'reviewedOn': '2026-10-21'},
    'ev': {'title': 'Energy Commission — EV charging system guideline (2025)', 'url': 'https://www.st.gov.my/sites/default/files/2026-02/EVCS-EDISI-2025.pdf', 'reviewedOn': '2026-10-21'},
    'dc': {'title': 'MITI — Guidelines for Sustainable Development of Data Centre', 'url': 'https://www.miti.gov.my/miti/resources/Media%20Release/Final_Guidelines_for_Sustainable_Data_Centre.pdf', 'reviewedOn': '2026-10-21'},
}

class SiteEvidence(BaseModel):
    model_config = ConfigDict(extra='forbid', allow_inf_nan=False)
    sourceReference: str = Field(min_length=5, max_length=1500)
    sourceDate: date
    periodStart: date
    periodEnd: date
    measurementBoundary: str = Field(min_length=5, max_length=1000)
    dataCenterStatus: Literal['not_assessed', 'operating', 'proposed', 'not_present'] = 'not_assessed'
    surveyedUsableRoofSqM: float | None = Field(None, ge=0, le=1000000)
    installedSolarKWp: float | None = Field(None, ge=0, le=1000000)
    siteElectricityKWh: float | None = Field(None, ge=0, le=1e12)
    solarGenerationKWh: float | None = Field(None, ge=0, le=1e12)
    solarSelfConsumedKWh: float | None = Field(None, ge=0, le=1e12)
    peakDemandKW: float | None = Field(None, ge=0, le=1e8)
    confirmedSupplyKW: float | None = Field(None, ge=0, le=1e8)
    parkingBays: int | None = Field(None, ge=0, le=1000000)
    existingEVChargers: int | None = Field(None, ge=0, le=100000)
    evChargingKWh: float | None = Field(None, ge=0, le=1e12)
    itElectricityKWh: float | None = Field(None, gt=0, le=1e12)
    waterLitres: float | None = Field(None, ge=0, le=1e15)
    totalEmissionsKgCO2e: float | None = Field(None, ge=0, le=1e15)
    notes: str = Field('', max_length=3000)

    @model_validator(mode='after')
    def consistent_records(self):
        if self.periodStart > self.periodEnd:
            raise ValueError('Measurement period start must precede its end')
        if self.sourceDate > datetime.now(timezone(timedelta(hours=8))).date() or self.periodEnd > datetime.now(timezone(timedelta(hours=8))).date():
            raise ValueError('Observed records cannot be dated in the future')
        if self.sourceDate < self.periodEnd:
            raise ValueError('Source date must be on or after the recorded measurement period')
        if self.itElectricityKWh is not None and self.siteElectricityKWh is not None and self.itElectricityKWh > self.siteElectricityKWh:
            raise ValueError('IT electricity cannot exceed total facility electricity over the same boundary and period')
        if self.solarSelfConsumedKWh is not None:
            if self.solarGenerationKWh is None:
                raise ValueError('Solar self-consumption needs a corresponding generation measurement')
            if self.solarSelfConsumedKWh > self.solarGenerationKWh:
                raise ValueError('Self-consumed solar cannot exceed measured solar generation')
            if self.siteElectricityKWh is not None and self.solarSelfConsumedKWh > self.siteElectricityKWh:
                raise ValueError('Self-consumed solar cannot exceed total facility consumption')
        if self.evChargingKWh is not None and self.siteElectricityKWh is not None and self.evChargingKWh > self.siteElectricityKWh:
            raise ValueError('EV charging energy cannot exceed total facility electricity')
        return self


def build_metrics(footprint, evidence):
    e = evidence or {}
    metrics = {'mappedFootprintSqM': footprint,
               **{key: e.get(key) for key in ['surveyedUsableRoofSqM', 'installedSolarKWp', 'siteElectricityKWh', 'solarGenerationKWh', 'solarSelfConsumedKWh', 'peakDemandKW', 'confirmedSupplyKW', 'parkingBays', 'existingEVChargers', 'evChargingKWh', 'itElectricityKWh', 'waterLitres', 'totalEmissionsKgCO2e']},
               'solarSelfConsumptionPct': None, 'solarDemandCoveragePct': None, 'recordedSupplyMarginKW': None,
               'pue': None, 'wueLitresPerKWhIT': None, 'cueKgCO2ePerKWhIT': None,
               'recommendedSolarKWp': None, 'annualGenerationForecastKWh': None, 'annualSavingsMYR': None,
               'simplePaybackYears': None, 'recommendedEVChargers': None}
    generated, consumed, total = e.get('solarGenerationKWh'), e.get('solarSelfConsumedKWh'), e.get('siteElectricityKWh')
    if generated is not None and generated > 0 and consumed is not None:
        metrics['solarSelfConsumptionPct'] = round(consumed / generated * 100, 2)
    if total is not None and total > 0 and consumed is not None:
        metrics['solarDemandCoveragePct'] = round(consumed / total * 100, 2)
    if e.get('confirmedSupplyKW') is not None and e.get('peakDemandKW') is not None:
        metrics['recordedSupplyMarginKW'] = round(e['confirmedSupplyKW'] - e['peakDemandKW'], 2)
    it = e.get('itElectricityKWh')
    if e.get('dataCenterStatus') == 'operating' and it:
        if total is not None:
            metrics['pue'] = round(total / it, 4)
        if e.get('waterLitres') is not None:
            metrics['wueLitresPerKWhIT'] = round(e['waterLitres'] / it, 4)
        if e.get('totalEmissionsKgCO2e') is not None:
            metrics['cueKgCO2ePerKWhIT'] = round(e['totalEmissionsKgCO2e'] / it, 4)
    return metrics


def build_plan(assessment, evidence):
    e = evidence or {}
    metrics = build_metrics(assessment['footprintSqM'], e)
    mapped_dc = any(str(assessment.get('tags', {}).get(key, '')).lower() in {'data_center', 'data_centre'} for key in ['building', 'telecom', 'industrial'])
    status = e.get('dataCenterStatus', 'not_assessed')
    dc_text = {'operating': 'Operating data centre reported in the supplied record', 'proposed': 'Proposed data centre reported in the supplied record', 'not_present': 'No data centre reported in the supplied record'}.get(status, 'OSM labels this building as a data centre; operating status is not verified' if mapped_dc else 'Data-centre use at this site is not established')
    solar_missing = [label for key, label in [('surveyedUsableRoofSqM', 'Usable roof survey'), ('siteElectricityKWh', 'Metered facility energy')] if e.get(key) is None]
    solar_actions = ['Confirm ownership permission and obtain a structural roof assessment, roof-plane measurements and shading survey.', 'Obtain timestamped building demand and a documented PV layout, equipment specification and quotation before sizing or calculating savings.', 'Confirm the applicable Solar ATAP or self-consumption arrangement and utility connection requirements with the utility and a qualified installer.']
    if e.get('installedSolarKWp') is not None and e['installedSolarKWp'] > 0:
        solar_actions.insert(0, 'Use the reported existing PV nameplate and inverter meter records to review actual output; do not assume additional roof capacity.')
    ev_missing = [label for key, label in [('parkingBays', 'Parking survey'), ('peakDemandKW', 'Measured peak demand'), ('confirmedSupplyKW', 'Documented supply limit')] if e.get(key) is None]
    ev_actions = ['Survey parking ownership, accessible bay layout, dwell times, demand for charging and safe cable routes.', 'Obtain an electrical capacity assessment and a documented connection/load-management design before choosing AC/DC ratings or a charger count.', 'Use the Energy Commission EVCS guideline for equipment, competent-person, installation and operating requirements.']
    if metrics['recordedSupplyMarginKW'] is not None:
        ev_actions.insert(0, 'Review the arithmetic supply margin against concurrent loads with the electrical engineer. It is not proof of available grid capacity or permission to connect chargers.')
    if e.get('existingEVChargers') is not None and e['existingEVChargers'] > 0:
        ev_actions.insert(0, 'Review the recorded chargers with session-level utilisation, uptime and charging-energy records before proposing expansion.')
    dc_actions = ['Establish whether this building operates, is proposed for, or has no data-centre use using an operator/owner record.', 'For an operating facility, record total facility and IT electricity, water and emissions over the same period and measurement boundary; only then calculate PUE, WUE and CUE.', 'For a proposed facility, obtain utility power allocation, connection timelines, supply redundancy and fibre-route evidence. A map cannot establish capacity or readiness.', 'Assess cooling, water availability/stress, flood exposure, backup power, fire strategy and land-use permission through the responsible providers and surveys.', 'Review the MITI data-centre guideline for the applicable facility category and scheme. No compliance rating is assigned here.']
    if status == 'operating':
        dc_actions[0] = 'Reconcile the supplied operating-facility record with the operator and metering boundary.'
        if metrics['pue'] is not None:
            dc_actions.insert(1, 'Use the recorded PUE and facility-versus-IT energy difference to target a cooling, UPS and power-distribution audit; the ratio alone does not diagnose the cause.')
    if status == 'not_present':
        dc_actions[0] = 'The supplied record reports no data centre at this site. The remaining checks apply only if a conversion or nearby data-centre impact is being investigated.'
    topics = [
        {'id': 'solar', 'title': 'Solar implementation', 'status': 'Needs design and survey evidence', 'basis': f"Mapped footprint: {assessment['footprintSqM']:,.1f} m². This is not a usable-roof survey.", 'missing': solar_missing, 'actions': solar_actions, 'references': [REFERENCES['solar']]},
        {'id': 'ev', 'title': 'EV charging implementation', 'status': 'Needs electrical and parking assessment', 'basis': f"Reported parking bays: {e['parkingBays']}" if e.get('parkingBays') is not None else 'Parking capacity and charger suitability are not known for this roof selection.', 'missing': ev_missing, 'actions': ev_actions, 'references': [REFERENCES['ev']]},
        {'id': 'dc', 'title': 'Data-centre situation', 'status': dc_text, 'basis': 'Only this selected site is assessed. Nearby facilities, spare utility capacity, fibre and water capacity have not been verified.', 'missing': [label for key, label in [('siteElectricityKWh', 'Facility energy'), ('itElectricityKWh', 'IT energy'), ('waterLitres', 'Facility water'), ('totalEmissionsKgCO2e', 'Reported facility emissions')] if e.get(key) is None], 'actions': dc_actions, 'references': [REFERENCES['dc']]},
        {'id': 'improvements', 'title': 'Other site improvements', 'status': 'Evidence collection priorities', 'basis': 'Actions are recommendations, not detected defects or quantified savings.', 'missing': [], 'actions': ['Establish electricity and water submetering, maintenance records and an agreed performance baseline.', 'Use an energy audit to identify lighting, cooling, controls and operating-schedule opportunities before claiming savings.', 'Inspect drainage, flood exposure, fire access, accessibility and pedestrian/EV separation through site-specific surveys.', 'Assess battery storage only against measured load/outage records, a safety assessment and an actual supplier design.'], 'references': []},
    ]
    return {'siteKey': assessment['siteKey'], 'siteName': assessment['name'], 'coordinates': assessment['coordinates'],
            'evidenceStatus': 'User-supplied record; not independently verified' if evidence else 'No site measurement records supplied',
            'dataCenterStatus': dc_text, 'metrics': metrics, 'topics': topics, 'references': list(REFERENCES.values()),
            'regionalDataCentreContext': {
                'scope': 'Documented Selangor regional examples, not a survey of facilities near the selected roof',
                'limitations': 'These operator listings do not establish local electricity/water availability, measured loads, expansion completion or an effect on this selected site.',
                'records': [
                    {'name': 'NTT DATA Cyberjaya data centres', 'location': 'Cyberjaya, Selangor', 'fact': 'The operator lists Cyberjaya 4, 5 and 6 data centres.', 'sourceUrl': 'https://www.nttdata.com/en-my/services/global-data-centers/global-locations/asia-pacific/cyberjaya-data-centers', 'checkedOn': '2026-10-21'},
                    {'name': 'TM Global Klang Valley Data Centre', 'location': 'Cyberjaya, Selangor', 'fact': 'TM lists KVDC in Cyberjaya among its data-centre facilities.', 'sourceUrl': 'https://tmglobal.com.my/products-and-solutions/data-centre-solutions/data-centre', 'checkedOn': '2026-10-21'},
                ],
            },
            'calculationNotes': ['Map area is computed from the selected footprint using a local metric projection; it is not a surveyed roof-plane area.', 'All recorded energy, water and emissions ratios use only supplied values for the declared common period and boundary. They are not forecasts or a compliance certificate.', 'Recorded metrics are never filled with assumptions. The separate modelled scenario uses disclosed editable engineering and financial inputs; it does not establish existing PV, chargers or data-centre capacity.']}
