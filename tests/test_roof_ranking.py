"""Ranking uses test-only geometry/weather; no application seed records."""
import pytest
import database
import implementation_scenario
import roof_explorer as roofs
from roof_ranking import rank_rows
from test_evidence_mode import client, feature


def load_pair(client, monkeypatch):
    larger = feature(456)
    for point in larger['geometry']:
        point['lon'] = 101.593 + 2*(point['lon']-101.593)
    monkeypatch.setattr(roofs, 'fetch_json', lambda url: {'elements': [feature(123), larger]})
    response = client.get('/api/roofs/buildings?south=3.152&west=101.592&north=3.154&east=101.594')
    assert response.status_code == 200
    return [item['id'] for item in response.json()['buildings']]


def test_ranking_matches_analysis_and_does_not_save_assessments(client, monkeypatch):
    ids = load_pair(client, monkeypatch)
    monkeypatch.setattr(implementation_scenario, 'resource_for', lambda coordinates, observations=None: {'annualGHI': 1800})
    ranked = client.post('/api/roofs/ranking', json={'buildingIds': ids}).json()
    assert ranked['total'] == 2 and ranked['rows'][0]['id'] == 'way/456'
    assert [row['rank'] for row in ranked['rows']] == [1, 2]
    assert client.get('/api/roofs/history').json() == []
    site = client.post('/api/roofs/analyze', json={'buildingId': 'way/456'}).json()
    top = ranked['rows'][0]
    assert top['annualACKWh'] == site['scenario']['annualACKWh']
    assert top['annualSavingsMYR'] == site['scenario']['annualSavingsMYR']
    assert top['paybackYears'] == site['scenario']['paybackYears']
    # Saved assumptions must change the comparison, not be replaced by shared defaults.
    values = {**site['scenario']['inputs'], 'capexPerKWpMYR': 7000, 'evChargers': 8}
    assert client.post('/api/roofs/scenario/' + site['id'], json=values).status_code == 200
    reranked = client.post('/api/roofs/ranking', json={'buildingIds': ids, 'sortBy': 'payback'}).json()['rows']
    assert reranked[0]['id'] == 'way/123' and reranked[1]['evChargers'] == 8
    assert reranked[1]['paybackYears'] == pytest.approx(2*reranked[0]['paybackYears'])
    assert len(client.get('/api/roofs/history').json()) == 1


def test_unknown_weather_is_not_ranked_as_zero_and_area_remains_available(client, monkeypatch):
    ids = load_pair(client, monkeypatch)
    ranked = client.post('/api/roofs/ranking', json={'buildingIds': ids + ids}).json()
    assert ranked['total'] == 2
    assert all(row['rank'] is None and row['annualACKWh'] is None for row in ranked['rows'])
    area = client.post('/api/roofs/ranking', json={'buildingIds': ids, 'sortBy': 'area'}).json()
    assert area['rows'][0]['id'] == 'way/456' and area['rows'][0]['rank'] == 1
    assert client.post('/api/roofs/ranking', json={'buildingIds': ['way/unknown']}).status_code == 404
    assert client.post('/api/roofs/ranking', json={'buildingIds': ids, 'sortBy': 'inventedScore'}).status_code == 422
    assert client.post('/api/roofs/ranking', json={'buildingIds': []}).status_code == 422


def test_equal_values_share_rank_and_missing_payback_is_last():
    rows = [{'id': 'c', 'paybackYears': None}, {'id': 'b', 'paybackYears': 7.0000000001},
            {'id': 'a', 'paybackYears': 7}, {'id': 'd', 'paybackYears': 8}]
    ranked = rank_rows(rows, 'payback')
    assert [row['id'] for row in ranked] == ['a', 'b', 'd', 'c']
    assert [row['rank'] for row in ranked] == [1, 1, 3, None]
