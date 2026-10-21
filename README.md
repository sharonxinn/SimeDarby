# SolarSync — site evidence and implementation planning

SolarSync has three pages: **Explore**, **Plan**, and **Data**. Select a real
building in Explore; Plan uses that same building, its recorded evidence and its
saved solar/EV implementation scenario.

For hosted deployment, see [DEPLOYMENT.md](DEPLOYMENT.md). The Render setup serves
the frontend and Python API together on the free instance plan. Visitors use
separate browser sessions without a username or password. Free hosting uses temporary
storage: records and scenarios can reset on sleep/restart/redeploy. Export important
records from Plan. Public datasets reload from verified bundled snapshots.
The anonymous session uses an HTTP-only cookie. Clearing it or changing browsers
starts a separate workspace; export important records before doing so.

## Evidence policy

The active app contains no seeded demo portfolio or synthetic demand model.
Actual site measurements remain `null` when unavailable. A separate **Modelled
scenario** estimates solar and EV implementation using public geometry, a real
NASA resource import and visible editable assumptions. Proposed capacities and
charger counts are never labelled as existing installations. Data-centre status,
structural condition and utility capacity are never guessed.

Explore includes annual DC yield, annual AC output, solar CAPEX and sensitivity
range, annual bill savings, simple payback, avoided CO₂ and proposed EV charging.
The initial assumptions are 60% usable mapped area, 550 W / 2.583252 m² modules,
15% combined DC losses, 96% inverter efficiency, 70% on-site solar use,
RM3,500/kWp budget ±20%, RM0.50/kWh flat tariff and 0.758 kg CO₂/kWh reference
factor. These are **screening inputs**, not measured conditions, current tariff
advice, an installer quote or a verified current grid factor. Edit them under
**Edit solar and EV assumptions**. Supplied surveyed usable area overrides the
mapped-area percentage. Module dimensions link to an example manufacturer sheet.

The annual horizontal-resource approximation is `kWp × annual GHI × (1 − DC
losses)`; AC applies inverter efficiency. It is not a roof-plane/hourly PVWatts
model: no orientation, tilt, resolved shade, hourly temperature or clipping model
is claimed. NASA data is gridded, from a declared regional point (distance shown),
not a roof meter. Only a complete imported calendar year within 100 km is used;
missing weather never becomes an invented yield. Source URL, import date and
SHA-256 are available with the calculation formulas.

Savings and avoided CO₂ credit only assumed on-site AC consumption, including EV
allocation. Exports have zero assigned revenue. Payback excludes maintenance,
financing, degradation and EV installation cost. The CAPEX range is sensitivity,
not statistical confidence. EV starts with a proposed two 7.4 kW points,
4 available hours/day, 35% utilisation and 25% of on-site PV allocated to charging.
PV-to-EV energy is capped by charging demand and never double-counted. Annual
energy matching does not prove simultaneous supply. A supply-margin comparison
is shown only if actual supply and peak records exist; utility approval and a
time-aligned electrical design are still required.

Public OpenStreetMap building geometry and Esri satellite imagery remain.
Footprint area is computed from the outline with a local metric projection. It
is an approximate map-derived area, **not** a roof survey, usable roof-plane area,
structural assessment or measurement of pitch/shading. Manual traces are
identified as user-traced and unverified. OSM tags are displayed as mapped labels,
not independently confirmed operating conditions.

Owner/operator records must state a source reference, source date, reporting
period and measurement boundary. These are recorded with **User-supplied; not
independently verified** provenance. The application cannot establish that an
entered document reference is genuine without checking the underlying document.
No sample measurement records are entered into the live database.

## Run locally (Windows / PowerShell)

Requires Python 3.12+ and Node 22+.

```powershell
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
npm install
.\.venv\Scripts\python.exe -m uvicorn main:app --app-dir server --host 127.0.0.1 --port 8000
```

In a second terminal:

```powershell
npm run dev
```

Open http://127.0.0.1:5173. Vite routes `/api` to the local API. Documentation:
http://127.0.0.1:8000/docs. The SQLite database is `server/township_solar.db`.
Set `SOLARSYNC_DB_PATH` and `SOLARSYNC_DATA_DIR` in the launching shell to change
writable storage paths. `FRONTEND_ORIGIN` controls an additional allowed origin.
`VITE_API_BASE_URL` changes the frontend API prefix (default `/api`).

## Explore

Search for a Selangor town or use Sungai Buloh / Kota Damansara shortcuts.
Satellite imagery shows individual roofs; cyan polygons are public building
footprints. Click one to save its geometry and open **Plan for this site**.
Unmapped roofs can be traced using at least three corners. Invalid, self-crossing
or excessive outlines are rejected. Tracing does not make an outline surveyed.

Small OpenStreetMap map-read windows are cached for seven days. Region search
uses Nominatim on form submission, with Selangor address filtering and caching.
Only simple building ways are loaded; multipolygon relations/holes are not yet
supported. Attribution is displayed on the map. Higher zoom can magnify existing
imagery without increasing its native resolution. For shared/high-traffic use,
provision building vector tiles instead of relying on public map-read services.

The geometry source, acquisition date and OSM tags are inspectable. Old numerical
assessments based on assumptions are excluded from current history and return
HTTP 410 if accessed through a plan URL. Existing legacy database rows are
preserved for audit; they do not populate the current pages.

## Plan: selected site only

Plan has no sample projects or preselected venue portfolio. It uses the selected
Explore record and provides conditional next steps for:

- Solar: ownership, structure, usable roof, shading, actual demand, design,
  quotation and utility connection evidence.
- EV charging: actual parking layout, dwell/utilisation records, measured load,
  documented supply capacity, connection design and load management.
- Data centres: recorded operating/proposed status, facility/IT energy, water,
  emissions, power allocation, redundancy, cooling, fibre, flood/fire and land use.
- Other improvements: submetering, energy audit, drainage, accessibility,
  maintenance and evidence for any storage proposal.

Recommendations are actions to investigate or implement subject to evidence,
not detected defects, a feasibility approval or a compliance certificate.
Each relevant topic links to official Malaysian guidance:

- [SEDA Solar ATAP](https://www.seda.gov.my/reportal/atap/)
- [Energy Commission EVCS guideline (2025)](https://www.st.gov.my/sites/default/files/2026-02/EVCS-EDISI-2025.pdf)
- [MITI sustainable data-centre guideline](https://www.miti.gov.my/miti/resources/Media%20Release/Final_Guidelines_for_Sustainable_Data_Centre.pdf)

Regional data-centre context links to operator-published NTT DATA Cyberjaya and
TM Global KVDC listings. It does not claim these facilities are nearby, establish
a complete regional inventory, or infer their effect on the selected site.
No unverified MW, demand, water-stress or spare utility capacity is assigned.

### Actual site records

Under **Add or replace actual site records**, enter only documented values.
Leave unknown fields blank. Record dates and a common facility boundary/period
are required. Source references and reported values persist by the OSM building
ID (or the exact traced geometry key), so selecting the same site restores its
records. Records never transfer to a different building.

The allowed arithmetic is directly traceable to those records:

- Solar self-consumption = measured on-site solar use / measured PV generation.
- Solar share of consumption = measured on-site solar use / facility electricity.
- Recorded supply margin = documented supply limit − measured peak demand.
  This is arithmetic, not proof of spare grid capacity or charger connection approval.
- Operating data-centre PUE = facility electricity / IT electricity.
- Operating data-centre WUE = water litres / IT kWh.
- Operating data-centre CUE = reported facility kg CO₂e / IT kWh.

Ratios require matching periods/boundaries. No annualisation or extrapolation is
performed. IT energy greater than facility energy, impossible solar balances,
negative values and future/invalid periods are rejected. DC ratios remain
unavailable unless an operating data-centre record and their required values
exist. Programme-specific annual/design targets are not treated as measured
site performance. Print or export the selected record and its recommendations.

### Actual hourly meter CSV

Select the building first. Use its `siteKey` from Plan's exported JSON or the API,
e.g. `osm:way/123456` (replace with the real ID). CSV columns:

```csv
site_id,timestamp,demand_kw
```

Each row is the **actual average kW over one hour**, not a cumulative reading.
Timestamps must be hour-aligned and include the Malaysia `+08:00` offset. Use
existing evidence-only site keys; obsolete demo IDs are rejected.

```powershell
.\.venv\Scripts\python.exe server/pipeline.py --source meters --file path/to/actual-meter-export.csv
```

A contiguous series covering whole days can supply period energy (sum of hourly
kW × 1 hour) and actual peak demand. Partial/gapped series are retained, but do
not produce a complete-period aggregate. Source archive run IDs and actual period
are retained. A manually supplied record takes precedence; different measurement
periods/boundaries are never silently merged for PUE/WUE/CUE.

## Data pipeline and context

```powershell
.\.venv\Scripts\python.exe server/pipeline.py --source all --year 2025
```

Downloads are archived with SHA-256, validated, then published transactionally.
Invalid units, fill values, missing days, duplicates and non-finite values fail
before publication. Repeat imports upsert natural keys. Failed imports preserve
last-good data and record the error. Raw snapshots and databases are Git-ignored.

NASA POWER daily solar resource for Elmina supplies the separately labelled
annual screening scenario. National data.gov.my consumption remains regional
context only. Neither is rooftop PV meter data or selected-building demand.
Scenario results use the latest complete imported resource year when read;
public source refresh runs only when the command is explicitly invoked,
never at API startup. Scenario inputs persist per site in SQLite.

## API

- `GET /api/health`, `/api/data-status`
- `GET /api/roofs/regions?q=...`
- `GET /api/roofs/buildings?south=...&west=...&north=...&east=...`
- `POST /api/roofs/analyze` — building ID or traced outline; returns actual metrics and separate modelled scenario
- `GET /api/roofs/history`, `/api/roofs/plan/{assessment_id}`
- `POST /api/roofs/evidence/{assessment_id}` — source-backed site record
- `POST /api/roofs/scenario/{assessment_id}` — save editable solar/EV scenario inputs for this site

Old site/ranking/synthetic-demand/scenario/EV simulation endpoints return HTTP
410. No demo assets are seeded at startup. The synthetic model is no longer
loaded or used. The original archived contract tests for those retired behaviours
are marked skipped; the current contract is covered by `test_evidence_mode.py`.

## Validation

```powershell
.\.venv\Scripts\python.exe -m pip install -r requirements-dev.txt
.\.venv\Scripts\python.exe -m pytest tests/test_evidence_mode.py tests/test_implementation_scenario.py -q
npm run build
npm run lint
```

Tests use isolated temporary databases and explicit test-only fixtures, never
live application source/measurement records. They cover null missing metrics,
retired mock endpoints, site isolation, real-record ratios, period validation,
source geometry, preserved historical rows, meter aggregation and atomic imports.

The app runs locally without user authentication. Keep it bound to loopback.
A shared deployment needs access controls for nonpublic meter/operator records,
TLS, backups and a deployment reverse proxy for `/api`. `npm run preview` does
not provide Vite's development API proxy.
