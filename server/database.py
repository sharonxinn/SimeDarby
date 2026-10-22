import sqlite3
import os
import json
from contextvars import ContextVar

DB_PATH = os.getenv("SOLARSYNC_DB_PATH", os.path.join(os.path.dirname(__file__), "township_solar.db"))
VISITOR_DB_PATH = ContextVar('visitor_db_path', default=None)

def get_connection():
    conn = sqlite3.connect(VISITOR_DB_PATH.get() or DB_PATH, timeout=30)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys=ON")
    return conn

def init_db():
    conn = get_connection()
    cursor = conn.cursor()

    # Table for sites cadastre
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS sites (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        code TEXT NOT NULL,
        type TEXT NOT NULL,
        category TEXT NOT NULL,
        zone TEXT NOT NULL,
        lat REAL NOT NULL,
        lng REAL NOT NULL,
        polygon_json TEXT NOT NULL,
        footprint_sqm REAL NOT NULL,
        usable_sqm REAL NOT NULL,
        usable_ratio REAL NOT NULL,
        estimated_kwp REAL NOT NULL,
        azimuth_deg REAL NOT NULL,
        tilt_deg REAL NOT NULL,
        ghi_kwh_m2 REAL NOT NULL,
        annual_gen_kwh REAL NOT NULL,
        peak_demand_kw REAL NOT NULL,
        daytime_ratio REAL NOT NULL,
        self_consumption_pct REAL NOT NULL,
        roof_condition TEXT NOT NULL,
        structural_suitability TEXT NOT NULL,
        shading_pct REAL NOT NULL,
        substation_distance_m REAL NOT NULL,
        flags_json TEXT NOT NULL,
        ev_details_json TEXT,
        rationale TEXT NOT NULL
    )
    """)

    # Table for historical building electricity consumption training data
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS electricity_consumption (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        building_category TEXT NOT NULL,
        hour_of_day INTEGER NOT NULL,
        is_weekday INTEGER NOT NULL,
        ambient_temp_c REAL NOT NULL,
        solar_ghi_w_m2 REAL NOT NULL,
        demand_kw_per_1000sqm REAL NOT NULL
    )
    """)

    # Table for simulation run logs
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS simulation_runs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        scenario_id TEXT NOT NULL,
        selected_sites_json TEXT NOT NULL,
        total_kwp REAL NOT NULL,
        annual_gen_mwh REAL NOT NULL,
        self_consumption_pct REAL NOT NULL,
        cost_savings_myr REAL NOT NULL,
        co2_avoided_tonnes REAL NOT NULL
    )
    """)

    conn.commit()
    conn.close()

    with get_connection() as conn:
        conn.executescript('''
        CREATE TABLE IF NOT EXISTS pipeline_runs (
            id TEXT PRIMARY KEY, source TEXT NOT NULL, started_at TEXT NOT NULL,
            completed_at TEXT, status TEXT NOT NULL, row_count INTEGER DEFAULT 0,
            source_url TEXT NOT NULL, raw_path TEXT, sha256 TEXT, error TEXT
        );
        CREATE TABLE IF NOT EXISTS solar_daily (
            date TEXT PRIMARY KEY, ghi_kwh_m2 REAL NOT NULL,
            temperature_c REAL NOT NULL, run_id TEXT NOT NULL REFERENCES pipeline_runs(id)
        );
        CREATE TABLE IF NOT EXISTS malaysia_electricity (
            date TEXT NOT NULL, sector TEXT NOT NULL, consumption_million_kwh REAL NOT NULL,
            run_id TEXT NOT NULL REFERENCES pipeline_runs(id), PRIMARY KEY(date, sector)
        );
        CREATE TABLE IF NOT EXISTS meter_readings (
            site_id TEXT NOT NULL REFERENCES sites(id), timestamp TEXT NOT NULL,
            demand_kw REAL NOT NULL CHECK(demand_kw >= 0),
            run_id TEXT NOT NULL REFERENCES pipeline_runs(id), PRIMARY KEY(site_id, timestamp)
        );
        ''')

if __name__ == "__main__":
    init_db()
    print("Database initialized successfully at", DB_PATH)
