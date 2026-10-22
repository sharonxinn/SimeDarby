"""Public footprint lookup and transparent rooftop screening for Selangor."""
import json
import hashlib
import math
import time
import urllib.parse
import urllib.request
import uuid
from typing import Literal
import xml.etree.ElementTree as ET
from contextlib import closing
from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, ConfigDict, Field, model_validator
from shapely.geometry import Polygon
from database import get_connection
from models.geospatial import calculate_footprint_and_usable_area
from evidence_planner import SiteEvidence, build_plan, build_metrics
from implementation_scenario import ScenarioInputs, for_site, solar_observations
from roof_ranking import rank_rows

router = APIRouter(prefix='/api/roofs', tags=['Roof explorer'])
BUILDING_API = 'https://api.openstreetmap.org/api/0.6/map'
REGIONS = [
    {'id': 'sungai-buloh', 'name': 'Sungai Buloh', 'label': 'Sungai Buloh, Selangor — near the station', 'coordinates': [3.2062441, 101.5799923], 'zoom': 18, 'sourceUrl': 'https://www.openstreetmap.org/way/1073736705'},
    {'id': 'kota-damansara', 'name': 'Kota Damansara', 'label': 'Kota Damansara, Petaling Jaya, Selangor', 'coordinates': [3.1536719, 101.5935440], 'zoom': 18, 'sourceUrl': 'https://www.openstreetmap.org/relation/11275860'},
]


def ensure_tables():
    with closing(get_connection()) as conn, conn:
        conn.executescript('''
        CREATE TABLE IF NOT EXISTS geo_cache (key TEXT PRIMARY KEY, payload TEXT NOT NULL, fetched_at REAL NOT NULL);
        CREATE TABLE IF NOT EXISTS building_footprints (id TEXT PRIMARY KEY, payload TEXT NOT NULL, fetched_at REAL NOT NULL);
        CREATE TABLE IF NOT EXISTS site_meter_readings (site_key TEXT NOT NULL, timestamp TEXT NOT NULL, demand_kw REAL NOT NULL CHECK(demand_kw>=0), run_id TEXT NOT NULL REFERENCES pipeline_runs(id), PRIMARY KEY(site_key,timestamp));
        CREATE TABLE IF NOT EXISTS site_evidence (site_key TEXT PRIMARY KEY, payload TEXT NOT NULL, updated_at TEXT NOT NULL);
        CREATE TABLE IF NOT EXISTS roof_assessments (id TEXT PRIMARY KEY, created_at TEXT NOT NULL, payload TEXT NOT NULL);
        CREATE TABLE IF NOT EXISTS implementation_scenarios (site_key TEXT PRIMARY KEY, inputs TEXT NOT NULL, updated_at TEXT NOT NULL);
        ''')


def cached(key, ttl):
    with closing(get_connection()) as conn:
        row = conn.execute('SELECT * FROM geo_cache WHERE key=?', (key,)).fetchone()
    if row and time.time() - row['fetched_at'] < ttl:
        return json.loads(row['payload'])
    return None


def save_cache(key, payload):
    with closing(get_connection()) as conn, conn:
        conn.execute('INSERT OR REPLACE INTO geo_cache VALUES(?,?,?)', (key, json.dumps(payload), time.time()))


def fetch_json(url):
    request = urllib.request.Request(url, headers={'User-Agent': 'SolarSyncLocalRoofPlanner/3.0', 'Accept': 'application/xml' if 'api.openstreetmap.org' in url else 'application/json'})
    with urllib.request.urlopen(request, timeout=30) as response:
        data = response.read(12_000_001)
        if len(data) > 12_000_000:
            raise ValueError('Map response is too large; zoom in')
        if 'api.openstreetmap.org/api/0.6/map' in url:
            root = ET.fromstring(data)
            nodes = {node.attrib['id']: {'lat': float(node.attrib['lat']), 'lon': float(node.attrib['lon'])} for node in root.findall('node')}
            elements = []
            for way in root.findall('way'):
                tags = {tag.attrib['k']: tag.attrib['v'] for tag in way.findall('tag')}
                if 'building' not in tags:
                    continue
                refs = [nd.attrib['ref'] for nd in way.findall('nd')]
                if all(ref in nodes for ref in refs):
                    elements.append({'type': 'way', 'id': int(way.attrib['id']), 'tags': tags, 'geometry': [nodes[ref] for ref in refs]})
            return {'elements': elements}
        return json.loads(data)


@router.get('/regions')
def search_regions(q: str = Query('', max_length=120)):
    query = q.strip()
    if not query:
        return REGIONS
    matches = [r for r in REGIONS if query.casefold() in r['name'].casefold()]
    if matches:
        return matches
    key = 'region:' + query.casefold()
    saved = cached(key, 30 * 86400)
    if saved is not None:
        return saved
    params = urllib.parse.urlencode({'q': query + ', Selangor, Malaysia', 'format': 'jsonv2', 'addressdetails': 1, 'countrycodes': 'my', 'limit': 6})
    try:
        rows = fetch_json('https://nominatim.openstreetmap.org/search?' + params)
        results = []
        for row in rows:
            if row.get('address', {}).get('state') != 'Selangor':
                continue
            results.append({'id': f"{row['osm_type']}/{row['osm_id']}", 'name': row.get('name') or query,
                            'label': row['display_name'], 'coordinates': [float(row['lat']), float(row['lon'])],
                            'zoom': 18, 'sourceUrl': f"https://www.openstreetmap.org/{row['osm_type']}/{row['osm_id']}"})
        save_cache(key, results)
        return results
    except (OSError, ValueError, KeyError, ET.ParseError) as exc:
        raise HTTPException(503, 'Region search is unavailable. Use Sungai Buloh or Kota Damansara shortcuts.') from exc


def parse_buildings(data):
    if data.get('remark'):
        raise ValueError('Building provider returned an incomplete response; try a smaller area')
    result = []
    for element in data.get('elements', []):
        if element.get('type') != 'way' or not element.get('tags', {}).get('building') or element['tags']['building'] == 'no':
            continue
        geometry = element.get('geometry', [])
        if not 4 <= len(geometry) <= 2000:
            continue
        outline = [[p['lat'], p['lon']] for p in geometry]
        if outline[0] != outline[-1]:
            continue
        polygon = Polygon([(p[1], p[0]) for p in outline])
        if not polygon.is_valid or polygon.is_empty:
            continue
        area, _, _ = calculate_footprint_and_usable_area(outline)
        if not 8 <= area <= 1000000:
            continue
        tags = element['tags']
        result.append({'id': f"way/{element['id']}", 'name': tags.get('name') or tags.get('addr:housename') or f"Building {element['id']}",
                       'outline': outline, 'coordinates': [polygon.centroid.y, polygon.centroid.x], 'areaSqM': area,
                       'buildingType': tags.get('building', 'yes'), 'tags': tags,
                       'sourceUrl': f"https://www.openstreetmap.org/way/{element['id']}",
                       'sourceTimestamp': data.get('osm3s', {}).get('timestamp_osm_base')})
    return result


@router.get('/buildings')
def get_buildings(south: float, west: float, north: float, east: float):
    if not all(math.isfinite(v) for v in [south, west, north, east]) or not (2.5 <= south < north <= 4.0 and 100.5 <= west < east <= 102.1):
        raise HTTPException(422, 'Choose a valid bounding box in the Selangor study area')
    if north - south > .016 or east - west > .022:
        raise HTTPException(422, 'Zoom in to building level before loading roofs')
    key = 'buildings:' + ','.join(f'{v:.5f}' for v in [south, west, north, east])
    saved = cached(key, 7 * 86400)
    if saved is not None:
        return {**saved, 'cached': True}
    # Reuse a larger cached window after small pans/zooms; never cache only by region name.
    with closing(get_connection()) as conn:
        windows = conn.execute("SELECT key,payload FROM geo_cache WHERE key LIKE 'buildings:%' AND fetched_at>? ORDER BY fetched_at DESC LIMIT 100", (time.time() - 7 * 86400,)).fetchall()
    for window in windows:
        s, w, n, e = map(float, window['key'].split(':', 1)[1].split(','))
        value = json.loads(window['payload'])
        if s <= south and w <= west and n >= north and e >= east and not value.get('truncated'):
            visible = [building for building in value['buildings'] if
                       min(p[0] for p in building['outline']) <= north and max(p[0] for p in building['outline']) >= south and
                       min(p[1] for p in building['outline']) <= east and max(p[1] for p in building['outline']) >= west]
            return {**value, 'buildings': visible, 'cached': True}
    url = BUILDING_API + '?' + urllib.parse.urlencode({'bbox': f'{west:.6f},{south:.6f},{east:.6f},{north:.6f}'})
    try:
        data = fetch_json(url)
        buildings = parse_buildings(data)
        result = {'buildings': buildings[:1500], 'truncated': len(buildings) > 1500, 'cached': False,
                  'attribution': '© OpenStreetMap contributors, ODbL 1.0', 'sourceUrl': url,
                  'fetchedAt': datetime.now(timezone.utc).isoformat(),
                  'coverageNote': 'Building footprints may be incomplete, outdated or displaced relative to imagery. Unmapped roofs can be traced manually.'}
        with closing(get_connection()) as conn, conn:
            conn.executemany('INSERT OR REPLACE INTO building_footprints VALUES(?,?,?)', [(b['id'], json.dumps(b), time.time()) for b in result['buildings']])
        save_cache(key, result)
        return result
    except (OSError, ValueError, KeyError, ET.ParseError) as exc:
        raise HTTPException(503, 'Building lookup is unavailable. Try again or trace a roof boundary on the satellite image.') from exc


class RoofRequest(BaseModel):
    model_config = ConfigDict(extra='forbid', allow_inf_nan=False)
    buildingId: str | None = Field(None, max_length=100)
    outline: list[tuple[float, float]] | None = Field(None, min_length=3, max_length=2000)

    @model_validator(mode='after')
    def valid_selection(self):
        if bool(self.buildingId) == bool(self.outline):
            raise ValueError('Supply either a cached building ID or a traced outline')
        return self


def load_evidence(site_key):
    with closing(get_connection()) as conn:
        row = conn.execute('SELECT payload FROM site_evidence WHERE site_key=?', (site_key,)).fetchone()
    if row:
        return json.loads(row['payload'])
    with closing(get_connection()) as conn:
        readings = conn.execute('SELECT m.timestamp,m.demand_kw,m.run_id,r.completed_at FROM site_meter_readings m JOIN pipeline_runs r ON r.id=m.run_id WHERE m.site_key=? ORDER BY m.timestamp', (site_key,)).fetchall()
    if not readings:
        return None
    stamps = [datetime.fromisoformat(r['timestamp']) for r in readings]
    complete = stamps[0].hour == 0 and stamps[-1].hour == 23 and all(b-a == timedelta(hours=1) for a,b in zip(stamps,stamps[1:]))
    if not complete:
        return None
    return {'sourceReference': 'Hourly meter CSV import(s): ' + ', '.join(sorted({r['run_id'] for r in readings})),
            'sourceDate': max(datetime.fromisoformat(r['completed_at']).astimezone(timezone(timedelta(hours=8))).date() for r in readings).isoformat(), 'periodStart': stamps[0].date().isoformat(), 'periodEnd': stamps[-1].date().isoformat(),
            'measurementBoundary': 'Site meter identified by the file owner; no independent boundary verification',
            'verificationStatus': 'Owner-supplied meter CSV; not independently verified', 'dataCenterStatus': 'not_assessed',
            'siteElectricityKWh': round(sum(r['demand_kw'] for r in readings),3), 'peakDemandKW': max(r['demand_kw'] for r in readings)}


def enrich(assessment):
    evidence = load_evidence(assessment['siteKey'])
    return {**assessment, 'evidence': evidence, 'metrics': build_metrics(assessment['footprintSqM'], evidence), 'plan': build_plan(assessment, evidence), 'scenario': for_site(assessment, evidence)}


def assess_roof(req):
    if req.buildingId:
        with closing(get_connection()) as conn:
            row = conn.execute('SELECT payload,fetched_at FROM building_footprints WHERE id=?', (req.buildingId,)).fetchone()
        if not row:
            raise HTTPException(404, 'Load this building outline on the map first')
        building = json.loads(row['payload'])
        outline = building['outline']
        geometry_source = 'OpenStreetMap building footprint'
        site_key = 'osm:' + req.buildingId
    else:
        outline = req.outline
        building = {'name': 'User-traced outline', 'buildingType': 'unknown', 'tags': {}, 'sourceUrl': None}
        geometry_source = 'User-traced outline; not independently verified'
        site_key = 'trace:' + hashlib.sha256(json.dumps(outline).encode()).hexdigest()
    if not all(2.5 <= lat <= 4.0 and 100.5 <= lng <= 102.1 for lat, lng in outline):
        raise HTTPException(422, 'Outline is outside the Selangor study envelope')
    poly = Polygon([(lng, lat) for lat, lng in outline])
    if not poly.is_valid or poly.is_empty:
        raise HTTPException(422, 'Boundary is invalid or crosses itself')
    if poly.bounds[2] - poly.bounds[0] > .02 or poly.bounds[3] - poly.bounds[1] > .02:
        raise HTTPException(422, 'Outline is too large for one building')
    footprint, _, _ = calculate_footprint_and_usable_area(outline)
    if not 8 <= footprint <= 1000000:
        raise HTTPException(422, 'Footprint must be between 8 and 1,000,000 m²')
    assessment = {'id': str(uuid.uuid4()), 'dataMode': 'evidence_only', 'createdAt': datetime.now(timezone.utc).isoformat(),
                  'siteKey': site_key, 'name': building['name'], 'buildingId': req.buildingId, 'outline': outline,
                  'coordinates': [poly.centroid.y, poly.centroid.x], 'footprintSqM': footprint,
                  'buildingType': building.get('buildingType'), 'tags': building.get('tags', {}),
                  'sources': {'geometry': geometry_source, 'geometryUrl': building.get('sourceUrl'),
                              'geometryFetchedAt': datetime.fromtimestamp(row['fetched_at'], timezone.utc).isoformat() if req.buildingId and 'fetched_at' in row.keys() else None},
                  'geometryNote': 'Approximate area derived from a public building footprint, not a roof-plane or usable-area survey.' if req.buildingId else 'Approximate area from your tracing; no survey accuracy is claimed.'}
    result = enrich(assessment)
    with closing(get_connection()) as conn, conn:
        conn.execute('INSERT INTO roof_assessments VALUES(?,?,?)', (result['id'], result['createdAt'], json.dumps(result)))
    return result


@router.post('/analyze')
def analyze(req: RoofRequest):
    return assess_roof(req)


def load_assessment(assessment_id):
    with closing(get_connection()) as conn:
        row = conn.execute('SELECT payload FROM roof_assessments WHERE id=?', (assessment_id,)).fetchone()
    if not row:
        raise HTTPException(404, 'Assessment not found')
    assessment = json.loads(row['payload'])
    if assessment.get('dataMode') != 'evidence_only':
        raise HTTPException(410, 'Legacy assumption-based assessment is retired. Select the roof again.')
    return assessment


@router.get('/history')
def history():
    with closing(get_connection()) as conn:
        rows = conn.execute("SELECT payload FROM roof_assessments WHERE json_extract(payload,'$.dataMode')='evidence_only' ORDER BY created_at DESC LIMIT 20").fetchall()
    return [enrich(json.loads(row['payload'])) for row in rows]


@router.get('/plan/{assessment_id}')
def get_plan(assessment_id: str):
    return enrich(load_assessment(assessment_id))


@router.post('/evidence/{assessment_id}')
def record_evidence(assessment_id: str, req: SiteEvidence):
    assessment = load_assessment(assessment_id)
    payload = req.model_dump(mode='json')
    payload['verificationStatus'] = 'User-supplied; not independently verified'
    with closing(get_connection()) as conn, conn:
        conn.execute('INSERT OR REPLACE INTO site_evidence VALUES(?,?,?)', (assessment['siteKey'], json.dumps(payload), datetime.now(timezone.utc).isoformat()))
    return enrich(assessment)


@router.post('/scenario/{assessment_id}')
def save_scenario(assessment_id: str, req: ScenarioInputs):
    assessment = load_assessment(assessment_id)
    with closing(get_connection()) as conn, conn:
        conn.execute('INSERT OR REPLACE INTO implementation_scenarios VALUES(?,?,?)', (assessment['siteKey'], req.model_dump_json(), datetime.now(timezone.utc).isoformat()))
    return enrich(assessment)


class RankingRequest(BaseModel):
    model_config = ConfigDict(extra='forbid')
    buildingIds: list[str] = Field(min_length=1, max_length=1500)
    sortBy: Literal['generation', 'savings', 'payback', 'evSolarShare', 'area'] = 'generation'


@router.post('/ranking')
def rank_roofs(req: RankingRequest):
    ids = list(dict.fromkeys(req.buildingIds))
    with closing(get_connection()) as conn:
        placeholders = ','.join('?' for _ in ids)
        buildings = conn.execute(f'SELECT id,payload FROM building_footprints WHERE id IN ({placeholders})', ids).fetchall()
    if len(buildings) != len(ids):
        raise HTTPException(404, 'Some building outlines are no longer available. Reload the map outlines and try again.')
    observations = solar_observations()
    rows = []
    for item in buildings:
        building = json.loads(item['payload'])
        site = {'siteKey': 'osm:' + item['id'], 'footprintSqM': building['areaSqM'], 'coordinates': building['coordinates']}
        evidence = load_evidence(site['siteKey'])
        scenario = for_site(site, evidence, observations=observations)
        rows.append({'id': item['id'], 'name': building['name'], 'footprintSqM': building['areaSqM'],
                     'proposedKWp': scenario['proposedKWp'], 'annualACKWh': scenario['annualACKWh'],
                     'annualSavingsMYR': scenario['annualSavingsMYR'], 'paybackYears': scenario['paybackYears'],
                     'capexMYR': scenario['capexMYR'], 'evSolarSharePct': scenario['ev']['annualSolarSharePct'],
                     'evChargers': scenario['inputs']['evChargers'], 'hasSiteRecords': evidence is not None})
    return {'kind': 'modelled', 'sortBy': req.sortBy, 'total': len(rows), 'rows': rank_rows(rows, req.sortBy),
            'basis': 'Loaded building outlines only. Each building uses its own saved scenario, or default assumptions. Opening a building uses the same calculation.',
            'limitations': 'A ranking of scenario estimates, not verified installation suitability. Surveyed roof condition, parking and utility connection still require evidence. Equal metric values share a rank; unavailable values are unranked.'}
