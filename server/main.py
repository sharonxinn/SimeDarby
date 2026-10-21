import os
from contextlib import asynccontextmanager, closing
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from database import init_db, get_connection
from roof_explorer import router as roof_router, ensure_tables
from pipeline import data_status

@asynccontextmanager
async def lifespan(app):
    init_db()
    ensure_tables()
    yield

app = FastAPI(title='SolarSync — Site Evidence and Implementation Planning', version='3.0.0', lifespan=lifespan)
app.add_middleware(CORSMiddleware, allow_origins=[os.getenv('FRONTEND_ORIGIN', 'http://localhost:5173'), 'http://127.0.0.1:5173'], allow_credentials=False, allow_methods=['GET', 'POST'], allow_headers=['*'])
app.include_router(roof_router)

@app.get('/api/health')
def health():
    with closing(get_connection()) as conn:
        conn.execute('SELECT 1').fetchone()
    return {'status': 'online', 'service': 'SolarSync Site Evidence', 'dataMode': 'evidence_only', 'storageMode': os.getenv('SOLARSYNC_STORAGE_MODE', 'local')}

@app.get('/api/data-status')
def status():
    result = data_status()
    with closing(get_connection()) as conn:
        result['recordedSites'] = conn.execute('SELECT COUNT(*) FROM site_evidence').fetchone()[0]
        result['mappedBuildings'] = conn.execute('SELECT COUNT(*) FROM building_footprints').fetchone()[0]
        result['assessments'] = conn.execute("SELECT COUNT(*) FROM roof_assessments WHERE json_extract(payload,'$.dataMode')='evidence_only'").fetchone()[0]
    result['dataMode'] = 'evidence_only'
    result['limitations'] = ['Public building geometry is approximate and may be incomplete; it is not a roof survey.', 'NASA solar observations cover the Elmina reference point; they do not measure generation at a selected roof.', 'National electricity records do not describe the selected building.', 'Site records supplied by an owner or user retain their declared source and are not independently verified.', 'Unavailable site measurements stay null. Separate implementation scenarios use editable, labelled engineering and budget assumptions; these never replace actual records.']
    return result

@app.api_route('/api/{legacy_path:path}', methods=['GET', 'POST'], include_in_schema=False)
def retired(legacy_path: str):
    if legacy_path in {'sites', 'township', 'rank-sites', 'predict-demand', 'simulate-scenario', 'simulations', 'ev-canopy-planner', 'model-evaluation'}:
        raise HTTPException(410, 'Assumption-based portfolio and synthetic model endpoints are retired. Select a roof and use its evidence-based plan.')
    raise HTTPException(404, 'Endpoint not found')


# Registered after API routes so /api failures never fall through to index.html.
from frontend_hosting import configure_hosting
configure_hosting(app, os.getenv('SOLARSYNC_STATIC_DIR'), os.getenv('SOLARSYNC_ACCESS_USER', 'solarsync'), os.getenv('SOLARSYNC_ACCESS_PASSWORD'),
                  public_access=os.getenv('SOLARSYNC_PUBLIC_ACCESS', '').lower() == 'true',
                  visitor_directory=os.getenv('SOLARSYNC_VISITOR_DIR', '/tmp/solarsync/visitors'), bundle=os.getenv('SOLARSYNC_BOOTSTRAP_DIR'))
