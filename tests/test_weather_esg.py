"""Weather sensitivity and evidence-separated reporting checks."""
import json
from pathlib import Path
import pytest
import database
from test_evidence_mode import client, select, record
from bootstrap_public_data import bootstrap
from implementation_scenario import ScenarioInputs, calculate
from weather_impact import WeatherSensitivity, sensitivity


def test_weather_sensitivity_changes_output_but_not_capacity_or_base_case():
    base = calculate({'footprintSqM': 100}, None, ScenarioInputs(), {'annualGHI': 1800})
    before = json.dumps(base, sort_keys=True)
    impact = sensitivity(base, WeatherSensitivity(sunlightChangePct=-20, cellTemperatureDeltaC=5))
    assert impact['annualACKWh'] == pytest.approx(base['annualACKWh']*.8*.985)
    assert impact['generationChangePct'] == pytest.approx(-21.2)
    assert impact['proposedKWp'] == base['proposedKWp']
    assert impact['annualSavingsMYR'] == pytest.approx(base['annualSavingsMYR']*.788)
    assert impact['paybackYears'] > base['paybackYears']
    assert json.dumps(base, sort_keys=True) == before
    zero = sensitivity(base, WeatherSensitivity())
    assert zero['annualACKWh'] == base['annualACKWh']
    no_weather = calculate({'footprintSqM': 100}, None, ScenarioInputs(), None)
    assert sensitivity(no_weather, WeatherSensitivity())['annualACKWh'] is None


def test_monthly_weather_reconciles_with_annual_generation(client, monkeypatch):
    bootstrap(Path(__file__).resolve().parents[1] / 'deployment-data')
    site = select(client, monkeypatch)
    s, w = site['scenario'], site['scenario']['weather']
    assert w['available'] and len(w['monthly']) == 12 and w['year'] == 2025
    assert sum(row['days'] for row in w['monthly']) == 365
    assert sum(row['modelledACKWh'] for row in w['monthly']) == pytest.approx(s['annualACKWh'])
    assert sum(row['ghiKWhM2'] for row in w['monthly']) == pytest.approx(s['resource']['annualGHI'])
    assert sum(row['meanAmbientC']*row['days'] for row in w['monthly'])/365 == pytest.approx(w['meanAmbientC'])
    response = client.post('/api/roofs/weather/' + site['id'], json={'sunlightChangePct': -20, 'cellTemperatureDeltaC': 5})
    assert response.status_code == 200 and response.json()['annualACKWh'] < s['annualACKWh']
    assert client.get('/api/roofs/plan/' + site['id']).json()['scenario']['annualACKWh'] == s['annualACKWh']
    assert client.post('/api/roofs/weather/' + site['id'], json={'cellTemperatureDeltaC': 100}).status_code == 422
    assert client.post('/api/roofs/weather/' + site['id'], json={'sunlightChangePct': -101}).status_code == 422


def test_esg_report_distinguishes_actual_and_modelled_and_escapes_text(client, monkeypatch):
    bootstrap(Path(__file__).resolve().parents[1] / 'deployment-data')
    site = select(client, monkeypatch)
    measured = record(dataCenterStatus='not_assessed', siteElectricityKWh=1000, totalEmissionsKgCO2e=500,
                      sourceReference='TEST ONLY <script>alert(1)</script> report')
    assert client.post('/api/roofs/evidence/' + site['id'], json=measured).status_code == 200
    report = client.post('/api/roofs/report/' + site['id'], json={'organisation': '<img src=x onerror=alert(1)>', 'preparedBy': 'Test fixture author'}).json()
    assert report['siteName'] == site['name'] and len(report['sections']) == 5
    actual = {row['label']: row for row in report['sections'][0]['metrics']}
    assert actual['Facility electricity']['value'] == '1,000 kWh'
    assert actual['Reported facility emissions']['value'] == '500 kg CO₂e'
    assert actual['Scope 1 / 2 / 3 inventory']['value'] == 'Not established'
    assert report['recordPeriod'] == '2025-01-01 to 2025-01-31'
    assert len(report['monthlyWeather']) == 12
    assert '<img src=x' not in report['html'] and '<script>' not in report['html']
    assert '&lt;script&gt;' in report['html'] and '&lt;img' in report['html']
    assert 'Print / Save as PDF' in report['html']
    assert any('water' in value.lower() for value in report['missingEvidence'])


def test_missing_evidence_does_not_become_an_esg_score(client, monkeypatch):
    site = select(client, monkeypatch)
    report = client.post('/api/roofs/report/' + site['id'], json={}).json()
    assert 'No measured reporting period supplied' == report['recordPeriod']
    assert report['monthlyWeather'] == []
    assert report['sections'][0]['metrics'][1]['value'] == 'Not available'
    assert 'No ESG rating' in report['html']
    assert client.post('/api/roofs/report/unknown', json={}).status_code == 404
