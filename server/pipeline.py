"""Repeatable imports: archive source bytes, validate, then atomically publish."""
import argparse
import calendar
import csv
import hashlib
import io
import json
import math
import os
import time
import urllib.request
import uuid
from contextlib import closing
from datetime import date, datetime, timedelta, timezone
from pathlib import Path
from database import get_connection, init_db

DATA_DIR = Path(os.getenv('SOLARSYNC_DATA_DIR', str(Path(__file__).parent / 'data')))
NASA_URL = 'https://power.larc.nasa.gov/api/temporal/daily/point?parameters=ALLSKY_SFC_SW_DWN,T2M&community=RE&longitude=101.5235&latitude=3.1812&start={year}0101&end={year}1231&format=JSON&time-standard=LST'
GOV_URL = 'https://storage.data.gov.my/energy/electricity_consumption.csv'


def now():
    return datetime.now(timezone.utc).isoformat()


def download(url):
    for attempt in range(3):
        try:
            request = urllib.request.Request(url, headers={'User-Agent': 'SolarSync/3.0'})
            with urllib.request.urlopen(request, timeout=45) as response:
                return response.read()
        except (OSError, TimeoutError):
            if attempt == 2:
                raise
            time.sleep(2 ** attempt)


def number(value, low, high):
    result = float(value)
    if not math.isfinite(result) or not low <= result <= high:
        raise ValueError(f'Value outside [{low}, {high}]: {value}')
    return result


def parse_solar(raw, year):
    data = json.loads(raw)
    unit = data['parameters']['ALLSKY_SFC_SW_DWN']['units'].lower()
    factors = {'kw-hr/m^2/day': 1, 'kwh/m^2/day': 1, 'mj/m^2/day': 1 / 3.6}
    if unit not in factors:
        raise ValueError(f'Unrecognized solar units: {unit}')
    params = data['properties']['parameter']
    days = 366 if calendar.isleap(year) else 365
    rows = []
    for offset in range(days):
        day = date(year, 1, 1) + timedelta(days=offset)
        key = day.strftime('%Y%m%d')
        # Reject missing days and NASA fill values; never turn them into zero.
        ghi = number(params['ALLSKY_SFC_SW_DWN'][key], 0, 50) * factors[unit]
        ghi = number(ghi, 0, 15)
        temp = number(params['T2M'][key], -10, 55)
        rows.append((day.isoformat(), ghi, temp))
    return rows


def parse_electricity(raw):
    rows, seen = [], set()
    for row in csv.DictReader(io.StringIO(raw.decode('utf-8-sig'))):
        day = date.fromisoformat(row['date'])
        sector = row['sector']
        if day.day != 1 or sector not in {'total', 'local', 'local_commercial', 'local_domestic', 'exports', 'losses'}:
            raise ValueError('Invalid electricity date or sector')
        key = (day.isoformat(), sector)
        if key in seen:
            raise ValueError('Duplicate monthly electricity observation')
        seen.add(key)
        rows.append((*key, number(row['consumption'], 0, 1000000)))
    if not rows:
        raise ValueError('Empty electricity dataset')
    return rows


def parse_meters(raw, conn):
    rows, seen = [], set()
    known = {r[0] for r in conn.execute("SELECT DISTINCT json_extract(payload,'$.siteKey') FROM roof_assessments WHERE json_extract(payload,'$.dataMode')='evidence_only'")}
    for row in csv.DictReader(io.StringIO(raw.decode('utf-8-sig'))):
        stamp = datetime.fromisoformat(row['timestamp'])
        if stamp.utcoffset() != timedelta(hours=8) or stamp.minute or stamp.second or stamp.microsecond:
            raise ValueError('Meter timestamps must be hourly, with +08:00 Malaysia offset')
        if row['site_id'] not in known:
            raise ValueError(f"Unknown site: {row['site_id']}")
        key = (row['site_id'], stamp.isoformat())
        if key in seen:
            raise ValueError('Duplicate meter reading')
        seen.add(key)
        rows.append((*key, number(row['demand_kw'], 0, 1000000)))
    if not rows:
        raise ValueError('Empty meter dataset')
    return rows


def run_import(source, year=2025, file=None):
    if source not in {'nasa', 'electricity', 'meters'}:
        raise ValueError('Unknown source')
    if source == 'nasa' and not 1984 <= year < date.today().year:
        raise ValueError('Use a complete historical year, from 1984 onwards')
    if source == 'meters' and not file:
        raise ValueError('Meter import requires --file')
    init_db()
    from roof_explorer import ensure_tables
    ensure_tables()
    url = NASA_URL.format(year=year) if source == 'nasa' else GOV_URL if source == 'electricity' else 'local:meter-csv'
    run_id = str(uuid.uuid4())
    with closing(get_connection()) as conn:
        with conn:
            conn.execute('INSERT INTO pipeline_runs(id,source,started_at,status,source_url) VALUES(?,?,?,?,?)', (run_id, source, now(), 'running', url))
        try:
            raw = Path(file).read_bytes() if file else download(url)
            digest = hashlib.sha256(raw).hexdigest()
            DATA_DIR.mkdir(parents=True, exist_ok=True)
            path = DATA_DIR / f'{source}-{run_id}.raw'
            path.write_bytes(raw)
            with conn:
                conn.execute('UPDATE pipeline_runs SET raw_path=?,sha256=? WHERE id=?', (str(path), digest, run_id))
            if source == 'nasa':
                rows = parse_solar(raw, year)
            elif source == 'electricity':
                rows = parse_electricity(raw)
            else:
                rows = parse_meters(raw, conn)
            # One transaction: no partial imports or partially recalculated sites.
            with conn:
                if source == 'nasa':
                    conn.executemany('INSERT OR REPLACE INTO solar_daily VALUES(?,?,?,?)', [(*r, run_id) for r in rows])
                elif source == 'electricity':
                    conn.executemany('INSERT OR REPLACE INTO malaysia_electricity VALUES(?,?,?,?)', [(*r, run_id) for r in rows])
                else:
                    conn.executemany('INSERT OR REPLACE INTO site_meter_readings VALUES(?,?,?,?)', [(*r, run_id) for r in rows])
                conn.execute('UPDATE pipeline_runs SET completed_at=?,status=?,row_count=? WHERE id=?', (now(), 'succeeded', len(rows), run_id))
            return {'id': run_id, 'source': source, 'status': 'succeeded', 'rowCount': len(rows)}
        except Exception as exc:
            with conn:
                conn.execute('UPDATE pipeline_runs SET completed_at=?,status=?,error=? WHERE id=?', (now(), 'failed', str(exc)[:1000], run_id))
            raise


def data_status():
    with closing(get_connection()) as conn:
        runs = [dict(r) for r in conn.execute('SELECT id,source,started_at,completed_at,status,row_count,source_url,sha256,error FROM pipeline_runs ORDER BY started_at DESC LIMIT 20')]
        solar = dict(conn.execute('SELECT COUNT(*) AS rows, MIN(date) AS start, MAX(date) AS end FROM solar_daily').fetchone())
        electricity = dict(conn.execute('SELECT COUNT(*) AS rows, MIN(date) AS start, MAX(date) AS end FROM malaysia_electricity').fetchone())
        meters = conn.execute('SELECT COUNT(*) FROM site_meter_readings').fetchone()[0]
        latest = [dict(r) for r in conn.execute('SELECT date,sector,consumption_million_kwh FROM malaysia_electricity WHERE date=(SELECT MAX(date) FROM malaysia_electricity) ORDER BY sector')]
    return {'solar': solar, 'electricity': electricity, 'meterRows': meters, 'latestElectricity': latest, 'runs': runs,
            'limitations': ['Legacy assumption-based site records are excluded from the active application.', 'NASA POWER is a regional gridded estimate, not rooftop measurements.', 'National monthly consumption is context only, not building-level training data.', 'Building demand is unavailable unless actual site records are supplied.', 'Tariff and capital cost defaults apply only to the separately labelled modelled scenario.']}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--source', choices=['nasa', 'electricity', 'meters', 'all'], default='all')
    parser.add_argument('--year', type=int, default=2025)
    parser.add_argument('--file', help='Replay a source snapshot or import a meter CSV')
    args = parser.parse_args()
    if args.file and args.source == 'all':
        parser.error('--file requires a single source')
    from roof_explorer import ensure_tables
    init_db()
    ensure_tables()
    failures = []
    for source in ['nasa', 'electricity'] if args.source == 'all' else [args.source]:
        try:
            print(json.dumps(run_import(source, args.year, args.file)))
        except Exception as exc:
            failures.append(source)
            print(json.dumps({'source': source, 'status': 'failed', 'error': str(exc)}))
    if failures:
        raise SystemExit(1)

if __name__ == '__main__':
    main()
