"""Deployment routing, access protection and public-data bootstrap checks."""
import json
from pathlib import Path
import pytest
from fastapi import FastAPI, HTTPException
from fastapi.testclient import TestClient
from test_evidence_mode import client
from frontend_hosting import configure_hosting
from bootstrap_public_data import bootstrap
import pipeline
import database


def test_frontend_and_api_share_origin_and_require_access(tmp_path):
    (tmp_path / 'index.html').write_text('<!doctype html><title>SolarSync deployment fixture</title>')
    app = FastAPI()

    @app.get('/api/health')
    def health():
        return {'status': 'online'}

    @app.get('/api/{rest:path}')
    def api_missing(rest):
        raise HTTPException(404, 'Endpoint not found')

    configure_hosting(app, tmp_path, 'test-user', 'test-only-password')
    with TestClient(app) as browser:
        assert browser.get('/api/health').status_code == 200
        assert browser.get('/').status_code == 401
        assert browser.get('/api/roofs/history').status_code == 401
        assert browser.get('/docs').status_code == 401
        assert browser.get('/', headers={'Authorization': 'Basic broken!'}).status_code == 401
        assert browser.get('/', auth=('test-user', 'wrong')).status_code == 401
        page = browser.get('/', auth=('test-user', 'test-only-password'))
        assert page.status_code == 200 and 'SolarSync deployment fixture' in page.text
        assert page.headers['cache-control'] == 'no-store'
        missing = browser.get('/api/does-not-exist', auth=('test-user', 'test-only-password'))
        assert missing.status_code == 404 and missing.headers['content-type'].startswith('application/json')
        assert browser.get('/missing-asset.js', auth=('test-user', 'test-only-password')).status_code == 404


def test_public_bundle_bootstrap_is_complete_and_idempotent(client):
    folder = Path(__file__).resolve().parents[1] / 'deployment-data'
    bootstrap(folder)
    first = pipeline.data_status()
    assert first['solar']['rows'] == 365 and first['electricity']['rows'] == 612
    assert first['meterRows'] == 0
    with database.get_connection() as conn:
        assert conn.execute('SELECT COUNT(*) FROM site_evidence').fetchone()[0] == 0
        assert conn.execute('SELECT COUNT(*) FROM roof_assessments').fetchone()[0] == 0
    bootstrap(folder)
    assert len(pipeline.data_status()['runs']) == len(first['runs']) == 2


def test_bundle_checksum_failure_never_imports(client, tmp_path):
    (tmp_path / 'bad.json').write_text('{}')
    (tmp_path / 'manifest.json').write_text(json.dumps({'datasets': [{'source': 'nasa', 'file': 'bad.json', 'sha256': 'incorrect'}]}))
    with pytest.raises(ValueError, match='checksum'):
        bootstrap(tmp_path)
    assert pipeline.data_status()['solar']['rows'] == 0
