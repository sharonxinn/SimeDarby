"""Fixtures below are test-only records, never application seed data."""
import io
import json
import sys
from pathlib import Path
from datetime import date, timedelta
import pytest
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'server'))
import database
import pipeline
import roof_explorer as roofs


@pytest.fixture()
def client(tmp_path, monkeypatch):
    from fastapi.testclient import TestClient
    from main import app
    monkeypatch.setattr(database, 'DB_PATH', str(tmp_path / 'evidence.db'))
    monkeypatch.setattr(pipeline, 'DATA_DIR', tmp_path / 'raw')
    with TestClient(app) as client:
        yield client


def feature(identifier=123):
    return {'type': 'way', 'id': identifier, 'tags': {'building': 'house', 'name': 'Test fixture building'}, 'geometry': [
        {'lat': 3.153, 'lon': 101.593}, {'lat': 3.153, 'lon': 101.5931}, {'lat': 3.1531, 'lon': 101.5931},
        {'lat': 3.1531, 'lon': 101.593}, {'lat': 3.153, 'lon': 101.593}]}


def select(client, monkeypatch, identifier=123):
    monkeypatch.setattr(roofs, 'fetch_json', lambda url: {'elements': [feature(identifier)]})
    assert client.get('/api/roofs/buildings?south=3.152&west=101.592&north=3.154&east=101.594').status_code == 200
    return client.post('/api/roofs/analyze', json={'buildingId': f'way/{identifier}'}).json()


def record(**kwargs):
    return {'sourceReference': 'TEST FIXTURE: operator metering report', 'sourceDate': '2025-02-01', 'periodStart': '2025-01-01',
            'periodEnd': '2025-01-31', 'measurementBoundary': 'Facility and IT meters share a site and period', **kwargs}


def test_retired_mock_routes_and_no_seed(client):
    assert client.get('/api/health').json()['dataMode'] == 'evidence_only'
    for path in ['sites', 'township', 'model-evaluation', 'simulations']:
        assert client.get('/api/' + path).status_code == 410
    for path in ['predict-demand', 'rank-sites', 'simulate-scenario', 'ev-canopy-planner']:
        assert client.post('/api/' + path, json={}).status_code == 410
    assert client.get('/api/data-status').json()['recordedSites'] == 0
    with database.get_connection() as conn:
        assert conn.execute('SELECT COUNT(*) FROM sites').fetchone()[0] == 0


def test_no_assumed_metrics(client, monkeypatch):
    result = select(client, monkeypatch)
    assert 120 < result['metrics']['mappedFootprintSqM'] < 125
    assert all(value is None for key, value in result['metrics'].items() if key != 'mappedFootprintSqM')
    assert result['evidence'] is None and 'hourly' not in result and 'assumptions' not in result
    assert 'not established' in result['plan']['dataCenterStatus']
    assert len(result['plan']['topics']) == 4
    assert client.post('/api/roofs/analyze', json={'buildingId': 'way/123', 'shadingPct': 10}).status_code == 422


def test_actual_ratios_and_shared_site_records(client, monkeypatch):
    site = select(client, monkeypatch)
    payload = record(dataCenterStatus='operating', surveyedUsableRoofSqM=50, installedSolarKWp=10, siteElectricityKWh=1000,
                     solarGenerationKWh=100, solarSelfConsumedKWh=60, peakDemandKW=40, confirmedSupplyKW=70, parkingBays=0,
                     existingEVChargers=0, itElectricityKWh=800, waterLitres=1600, totalEmissionsKgCO2e=500)
    response = client.post('/api/roofs/evidence/' + site['id'], json=payload)
    assert response.status_code == 200, response.text
    m = response.json()['metrics']
    assert m['pue'] == 1.25 and m['wueLitresPerKWhIT'] == 2 and m['cueKgCO2ePerKWhIT'] == .625
    assert m['solarSelfConsumptionPct'] == 60 and m['solarDemandCoveragePct'] == 6
    assert m['recordedSupplyMarginKW'] == 30 and m['parkingBays'] == 0
    assert m['annualSavingsMYR'] is None and m['recommendedEVChargers'] is None
    assert 'not independently verified' in response.json()['evidence']['verificationStatus']
    assert client.post('/api/roofs/analyze', json={'buildingId': 'way/123'}).json()['metrics']['pue'] == 1.25
    assert client.get('/api/roofs/plan/' + site['id']).json()['metrics']['pue'] == 1.25


def test_evidence_does_not_leak_between_sites(client, monkeypatch):
    site = select(client, monkeypatch)
    assert client.post('/api/roofs/evidence/' + site['id'], json=record(installedSolarKWp=10)).status_code == 200
    with database.get_connection() as conn:
        other = roofs.parse_buildings({'elements': [feature(456)]})[0]
        conn.execute('INSERT INTO building_footprints VALUES(?,?,?)', ('way/456', json.dumps(other), 1))
    result = client.post('/api/roofs/analyze', json={'buildingId': 'way/456'}).json()
    assert result['metrics']['installedSolarKWp'] is None


def test_invalid_periods_and_energy_values_rejected(client, monkeypatch):
    site = select(client, monkeypatch)
    url = '/api/roofs/evidence/' + site['id']
    for payload in [record(siteElectricityKWh=10, itElectricityKWh=20), record(solarGenerationKWh=10, solarSelfConsumedKWh=11),
                    record(periodStart='2025-03-01'), record(sourceDate='2050-01-01'),
                    record(siteElectricityKWh=10, evChargingKWh=11), record(sourceReference='')]:
        assert client.post(url, json=payload).status_code == 422
    result = client.post(url, json=record(waterLitres=100)).json()
    assert result['metrics']['pue'] is None and result['metrics']['wueLitresPerKWhIT'] is None


def test_legacy_history_hidden_and_trace_unverified(client):
    outline = [[3.153,101.593],[3.153,101.5931],[3.1531,101.5931],[3.1531,101.593]]
    result = client.post('/api/roofs/analyze', json={'outline': outline}).json()
    assert 'not independently verified' in result['sources']['geometry']
    assert result['metrics']['surveyedUsableRoofSqM'] is None
    with database.get_connection() as conn:
        conn.execute('INSERT INTO roof_assessments VALUES(?,?,?)', ('legacy', '2099-01-01', json.dumps({'id': 'legacy', 'metrics': {'capacityKWp': 100}})))
    assert all(item['id'] != 'legacy' for item in client.get('/api/roofs/history').json())
    assert client.get('/api/roofs/plan/legacy').status_code == 410


def test_meter_csv_uses_actual_period_without_annualisation(client, monkeypatch, tmp_path):
    site = select(client, monkeypatch)
    path = tmp_path / 'fixture-meter.csv'
    path.write_text('site_id,timestamp,demand_kw\n' + ''.join(f"{site['siteKey']},2025-01-01T{h:02}:00:00+08:00,10\n" for h in range(24)))
    pipeline.run_import('meters', file=path)
    pipeline.run_import('meters', file=path)
    measured = client.get('/api/roofs/plan/' + site['id']).json()
    assert measured['metrics']['siteElectricityKWh'] == 240 and measured['metrics']['peakDemandKW'] == 10
    assert measured['metrics']['annualGenerationForecastKWh'] is None
    assert measured['evidence']['periodStart'] == measured['evidence']['periodEnd'] == '2025-01-01'
    assert pipeline.data_status()['meterRows'] == 24


def test_real_source_xml_and_geometry_validation(client, monkeypatch):
    xml = b'<osm><node id="1" lat="3.153" lon="101.593"/><node id="2" lat="3.153" lon="101.59305"/><node id="3" lat="3.1531" lon="101.59305"/><node id="4" lat="3.1531" lon="101.593"/><way id="42"><nd ref="1"/><nd ref="2"/><nd ref="3"/><nd ref="4"/><nd ref="1"/><tag k="building" v="house"/></way></osm>'
    monkeypatch.setattr(roofs.urllib.request, 'urlopen', lambda *args, **kwargs: io.BytesIO(xml))
    url = '/api/roofs/buildings?south=3.152&west=101.592&north=3.154&east=101.594'
    assert client.get(url).json()['buildings'][0]['id'] == 'way/42'
    assert client.get(url).json()['cached']
    assert client.get('/api/roofs/buildings?south=3.1&west=101.5&north=3.8&east=101.6').status_code == 422
    assert client.post('/api/roofs/analyze', json={'outline': [[0,0],[0,1],[1,1]]}).status_code == 422


def test_public_import_atomic_and_no_site_forecasts(client, tmp_path):
    start = date(2025,1,1)
    keys = [(start+timedelta(days=i)).strftime('%Y%m%d') for i in range(365)]
    payload = {'parameters': {'ALLSKY_SFC_SW_DWN': {'units': 'kW-hr/m^2/day'}}, 'properties': {'parameter': {'ALLSKY_SFC_SW_DWN': dict.fromkeys(keys,4), 'T2M': dict.fromkeys(keys,28)}}}
    path = tmp_path / 'fixture-solar.json'
    path.write_text(json.dumps(payload))
    pipeline.run_import('nasa', file=path)
    pipeline.run_import('nasa', file=path)
    assert pipeline.data_status()['solar']['rows'] == 365
    payload['properties']['parameter']['ALLSKY_SFC_SW_DWN']['20250101'] = -999
    path.write_text(json.dumps(payload))
    with pytest.raises(ValueError):
        pipeline.run_import('nasa', file=path)
    assert pipeline.data_status()['solar']['rows'] == 365
