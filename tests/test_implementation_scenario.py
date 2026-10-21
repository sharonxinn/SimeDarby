"""Analytical scenarios are test fixtures only, never live source observations."""
import math
import json
from datetime import date, timedelta
import pytest
import database
import pipeline
from test_evidence_mode import client, select
from implementation_scenario import ScenarioInputs, calculate, resource_for


def test_energy_and_money_conservation():
    p = ScenarioInputs(usableRoofPct=100, panelWatts=500, panelAreaSqM=2, dcLossPct=20,
                       inverterEfficiencyPct=95, selfConsumptionPct=60, capexPerKWpMYR=4000,
                       tariffMYRPerKWh=.5, evChargers=2, evChargerKW=7.4)
    s = calculate({'footprintSqM': 100}, None, p, {'annualGHI': 1800})
    assert s['panels'] == 50 and s['proposedKWp'] == 25
    assert s['annualDCKWh'] == 36000 and s['annualACKWh'] == 34200
    assert s['annualSelfConsumedKWh'] == 20520
    assert s['annualSavingsMYR'] == 10260
    assert s['capexMYR'] == 100000 and s['capexLowMYR'] == 80000 and s['capexHighMYR'] == 120000
    assert s['paybackYears'] == pytest.approx(100000/10260)
    assert s['annualCO2Tonnes'] == pytest.approx(20520*.758/1000)
    assert s['ev']['pvAllocatedKWh'] <= s['annualSelfConsumedKWh']
    assert s['ev']['pvAllocatedKWh'] + s['ev']['remainingGridKWh'] == pytest.approx(s['ev']['annualChargingKWh'])
    assert 0 <= s['ev']['annualSolarSharePct'] <= 100


def test_zero_and_missing_resource_are_not_fabricated():
    site = {'footprintSqM': 100}
    missing = calculate(site, None, ScenarioInputs(), None)
    assert missing['annualDCKWh'] is None and missing['annualSavingsMYR'] is None and missing['paybackYears'] is None
    zero = calculate(site, None, ScenarioInputs(usableRoofPct=0, evChargers=0), {'annualGHI': 1800})
    assert zero['proposedKWp'] == 0 and zero['annualDCKWh'] == 0 and zero['capexMYR'] == 0
    assert zero['paybackYears'] is None and zero['ev']['annualSolarSharePct'] is None
    no_use = calculate(site, None, ScenarioInputs(selfConsumptionPct=0), {'annualGHI': 1800})
    assert no_use['annualSavingsMYR'] == 0 and no_use['annualCO2Tonnes'] == 0 and no_use['paybackYears'] is None


def test_survey_overrides_area_and_supply_is_not_guessed():
    s = calculate({'footprintSqM': 100}, {'surveyedUsableRoofSqM': 20, 'confirmedSupplyKW': 20, 'peakDemandKW': 15, 'parkingBays': 1}, ScenarioInputs(), {'annualGHI': 1800})
    assert s['usableAreaSqM'] == 20 and s['panels'] == math.floor(20/2.583252)
    assert s['ev']['recordedSupplyMarginKW'] == 5 and 'exceeds' in s['ev']['supplyCheck']
    assert 'parking' in s['warnings'][0]


def test_scenario_persistence_is_site_specific(client, monkeypatch):
    a = select(client, monkeypatch)
    assert a['scenario']['kind'] == 'modelled' and a['scenario']['resource'] is None
    values = {**a['scenario']['inputs'], 'tariffMYRPerKWh': .65, 'evChargers': 4}
    saved = client.post('/api/roofs/scenario/' + a['id'], json=values)
    assert saved.status_code == 200
    assert saved.json()['metrics']['installedSolarKWp'] is None
    assert client.get('/api/roofs/plan/' + a['id']).json()['scenario']['inputs']['evChargers'] == 4
    again = select(client, monkeypatch)
    assert again['scenario']['inputs']['tariffMYRPerKWh'] == .65
    with database.get_connection() as conn:
        conn.execute('DELETE FROM geo_cache')
    b = select(client, monkeypatch, 456)
    assert b['scenario']['inputs']['evChargers'] == 2
    assert client.post('/api/roofs/scenario/' + b['id'], json={**values, 'evChargers': -1}).status_code == 422
    assert client.post('/api/roofs/scenario/' + b['id'], json={**values, 'evChargers': 1.2}).status_code == 422


def test_only_complete_nearby_imports_supply_scenario_weather(client, tmp_path, monkeypatch):
    keys = [(date(2025, 1, 1)+timedelta(days=i)).strftime('%Y%m%d') for i in range(365)]
    payload = {'parameters': {'ALLSKY_SFC_SW_DWN': {'units': 'kW-hr/m^2/day'}}, 'properties': {'parameter': {'ALLSKY_SFC_SW_DWN': dict.fromkeys(keys, 4), 'T2M': dict.fromkeys(keys, 28)}}}
    path = tmp_path / 'test-only-nasa.json'
    path.write_text(json.dumps(payload))
    pipeline.run_import('nasa', file=path)
    site = select(client, monkeypatch)
    resource = site['scenario']['resource']
    assert resource['annualGHI'] == 1460 and resource['days'] == 365 and resource['sha256']
    assert site['scenario']['annualACKWh'] == pytest.approx(site['scenario']['proposedKWp']*1460*.85*.96)
    assert site['metrics']['solarGenerationKWh'] is None
    assert resource_for([6, 104]) is None
    with database.get_connection() as conn:
        conn.execute("DELETE FROM solar_daily WHERE date='2025-06-01'")
    assert resource_for(site['coordinates']) is None
