import React, { useEffect, useRef, useState } from 'react';
import { Search, MousePointer2, PencilRuler, RotateCcw } from 'lucide-react';
import { STARTER_REGIONS, type RoofRegion, type RoofBuilding, type RoofAssessment } from '../types/roof';
import { roofApi } from '../api/roofClient';
import { RoofSatelliteMap } from './RoofSatelliteMap';
import { ImplementationScenarioView } from './ImplementationScenarioView';
import { BuildingRankingView } from './BuildingRankingView';

type Point = [number, number];
interface Props { assessment: RoofAssessment | null; onAssessmentChange: (value: RoofAssessment | null) => void; onOpenPlan: () => void }
function contains(point: Point, outline: Point[]) {
  const [y, x] = point; let inside = false;
  for (let i = 0, j = outline.length - 1; i < outline.length; j = i++) {
    const [yi, xi] = outline[i], [yj, xj] = outline[j];
    if (((yi > y) !== (yj > y)) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}
const fmt = (value: number, decimals = 0) => value.toLocaleString('en-MY', { maximumFractionDigits: decimals });

export const SolarOpportunityMap: React.FC<Props> = props => {
  const [region, setRegion] = useState(STARTER_REGIONS[0]);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<RoofRegion[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [viewport, setViewport] = useState<{ bounds: number[]; zoom: number } | null>(null);
  const [buildings, setBuildings] = useState<RoofBuilding[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [coverage, setCoverage] = useState('');
  const [reload, setReload] = useState(0);
  const [outlinesVisible, setOutlinesVisible] = useState(true);
  const [selectedOutline, setSelectedOutline] = useState<Point[]>([]);
  const [tracing, setTracing] = useState(false);
  const [tracePoints, setTracePoints] = useState<Point[]>([]);
  const [message, setMessage] = useState('');
  const assessment = props.assessment;
  const setAssessment = props.onAssessmentChange;
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState('');
  const [history, setHistory] = useState<RoofAssessment[]>([]);
  const sequence = useRef(0);
  useEffect(() => { roofApi.history().then(setHistory).catch(() => {}); }, []);
  useEffect(() => {
    if (!viewport) return;
    const [s, w, n, e] = viewport.bounds;
    setBuildings([]); setLoadError(''); setCoverage('');
    if (viewport.zoom < 17 || n - s > .016 || e - w > .022) {
      setLoading(false); setMessage('Zoom to level 17 or closer to load individual building outlines.'); return;
    }
    const controller = new AbortController();
    const timer = setTimeout(() => {
      setLoading(true);
      roofApi.buildings(viewport.bounds, controller.signal).then(value => {
        if (controller.signal.aborted) return;
        setBuildings(value.buildings);
        setCoverage(`${value.buildings.length} building outlines${value.cached ? ' · cached' : ' · live OSM'}${value.truncated ? ' · zoom in for the remaining buildings' : ''}`);
        setMessage(value.buildings.length ? 'Click a cyan building outline to assess that roof.' : 'No mapped building outlines here. Zoom or trace a visible roof.');
      }).catch(error => { if (!controller.signal.aborted) setLoadError(error.message); })
        .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    }, 550);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [viewport, reload]);

  function chooseRegion(value: RoofRegion) {
    sequence.current++; setAnalyzing(false); setAnalysisError(''); setQuery(value.name); setRegion({ ...value }); setResults([]); setSearchError('');
    setSelectedOutline([]); setAssessment(null); setTracing(false); setTracePoints([]); setMessage('Loading the selected region…');
  }
  async function search(event: React.FormEvent) {
    event.preventDefault(); if (!query.trim()) return;
    setSearching(true); setSearchError('');
    try { const values = await roofApi.regions(query.trim()); if (values.length === 1) chooseRegion(values[0]); else setResults(values); if (!values.length) setSearchError('No Selangor location found. Try a town or neighbourhood name.'); }
    catch (error) { setSearchError((error as Error).message); }
    finally { setSearching(false); }
  }
  async function analyze(selection: { buildingId?: string; outline?: Point[] }) {
    const current = ++sequence.current;
    setAnalyzing(true); setAnalysisError(''); setAssessment(null);
    try {
      const result = await roofApi.analyze(selection);
      if (current !== sequence.current) return;
      setAssessment(result); setSelectedOutline(result.outline);
      setHistory(previous => [result, ...previous.filter(item => item.id !== result.id)].slice(0, 20));
    } catch (error) { if (current === sequence.current) setAnalysisError((error as Error).message); }
    finally { if (current === sequence.current) setAnalyzing(false); }
  }
  function selectBuilding(building: RoofBuilding) {
    setTracing(false); setTracePoints([]); setSelectedOutline(building.outline);
    const selection = { buildingId: building.id }; setMessage(''); analyze(selection);
  }
  function selectPoint(point: Point) {
    const found = buildings.filter(building => contains(point, building.outline)).sort((a, b) => a.areaSqM - b.areaSqM)[0];
    if (found) selectBuilding(found);
    else { sequence.current++; setAnalyzing(false); setSelectedOutline([]); setAssessment(null); setAnalysisError(''); setMessage(loading ? 'Building outlines are still loading. Wait, then click the roof again, or use Trace roof.' : 'No mapped footprint at this point. Choose Trace roof and click the roof corners to measure it.'); }
  }
  function startTrace() {
    sequence.current++; setAnalyzing(false); setTracing(true); setTracePoints([]); setAssessment(null); setSelectedOutline([]); setAnalysisError('');
    setMessage('Click around the outside corners of one roof. Add at least 3 points, then choose Analyze traced roof.');
  }
  function finishTrace() {
    const outline: Point[] = [...tracePoints, tracePoints[0]];
    const selection = { outline }; setSelectedOutline(outline); setTracing(false); setTracePoints([]); analyze(selection);
  }
  function restore(item: RoofAssessment) {
    sequence.current++; setAnalyzing(false); setAssessment(item); setAnalysisError(''); setSelectedOutline(item.outline);
    setRegion({ id: item.id, name: item.name, label: 'Saved roof location', coordinates: item.coordinates, zoom: 19, sourceUrl: item.sources.geometryUrl || '' });
    setTracing(false); setTracePoints([]);
  }
  const selectionSequence = sequence.current;
  const metrics = assessment?.metrics;
  const value = (number: number | null | undefined, unit: string) => number === null || number === undefined ? 'Not available' : `${fmt(number, 2)} ${unit}`;
  const googleLink = `https://www.google.com/maps/@?api=1&map_action=map&center=${(assessment?.coordinates || region.coordinates).join(',')}&zoom=19&basemap=satellite`;
  return <div className="page-stack">
    <div className="page-heading"><div><h1>Explore a real site</h1><p>Choose a roof to analyse solar potential and plan EV charging.</p></div><span className="eyebrow">Selangor</span></div>
    <div><div className="roof-search-bar"><form onSubmit={search} className="roof-search"><label className="roof-search-label"><Search size={18} /><input aria-label="Search Selangor region" value={query} onChange={event => setQuery(event.target.value)} maxLength={120} placeholder="Search a town or neighbourhood…" /></label><button className="btn btn-primary" disabled={searching || !query.trim()}>{searching ? 'Searching…' : 'Search'}</button></form><div className="region-shortcuts">{STARTER_REGIONS.map(item => <button key={item.id} className="btn btn-secondary" onClick={() => chooseRegion(item)}>{item.name}</button>)}</div></div>{searchError && <p role="alert" className="notice">{searchError}</p>}{!!results.length && <div className="page-stack">{results.map(item => <button className="btn btn-secondary" key={item.id} onClick={() => chooseRegion(item)}>{item.label}</button>)}</div>}</div>
    <div className="roof-explorer-grid"><div className="page-stack" style={{ minWidth: 0, gap: 10 }}>
      <section className="glass-card" style={{ overflow: 'hidden' }}><div className="map-toolbar"><strong>{region.name}</strong><button className={`btn ${tracing ? 'btn-primary' : 'btn-secondary'}`} onClick={startTrace}><PencilRuler size={14} />Trace outline</button><details className="map-options"><summary className="btn btn-ghost">Map options</summary><div className="map-options-panel"><label><input type="checkbox" checked={outlinesVisible} onChange={event => setOutlinesVisible(event.target.checked)} />Show building outlines</label><button className="btn btn-secondary" onClick={() => setReload(item => item + 1)} disabled={loading}><RotateCcw size={14} />Reload outlines</button><a href={googleLink} target="_blank" rel="noreferrer">Open Google satellite maps ↗</a><a href={region.sourceUrl || 'https://www.openstreetmap.org'} target="_blank" rel="noreferrer">Location source ↗</a><p className="help-note">Imagery: Esri. Footprints: OpenStreetMap. These are public map records, not roof surveys.</p></div></details></div>
        {tracing && <div className="trace-toolbar"><span>{tracePoints.length} corners</span><button className="btn btn-primary" disabled={tracePoints.length < 3 || analyzing} onClick={finishTrace}>Use traced outline</button><button className="btn btn-secondary" onClick={() => setTracePoints(points => points.slice(0, -1))}>Undo</button><button className="btn btn-ghost" onClick={() => { setTracing(false); setTracePoints([]); }}>Cancel</button></div>}
        <RoofSatelliteMap region={region} buildings={outlinesVisible ? buildings : []} selected={selectedOutline} tracing={tracing} tracePoints={tracePoints} onViewport={(bounds, zoom) => setViewport({ bounds, zoom })} onSelect={selectBuilding} onPoint={selectPoint} onTracePoint={point => setTracePoints(points => [...points, point])} />
        <div role="status" aria-live="polite" className="map-status">{loading ? 'Loading public building outlines…' : coverage}{loadError && <p role="alert">{loadError}</p>}{message && <p>{message}</p>}</div>
      </section><details className="disclosure"><summary>Mapped building list ({buildings.length})</summary><div className="disclosure-body" style={{ maxHeight: 240, overflow: 'auto', display: 'grid', gap: 6 }}>{buildings.map(item => <button className="btn btn-secondary" key={item.id} onClick={() => selectBuilding(item)} style={{ justifyContent: 'space-between' }}>{item.name}<span>{fmt(item.areaSqM, 1)} m² mapped</span></button>)}</div></details>
    </div><aside className="page-stack">
      <section className="glass-card roof-summary"><h3>Site evidence</h3>{analyzing && <p role="status" className="help-note">Reading this building's records…</p>}{analysisError && <p role="alert" className="notice">{analysisError}</p>}{!assessment && !analyzing && <div className="empty-roof"><MousePointer2 size={26} /><p>Select a building outline.<br />View source-backed geometry and a clearly labelled solar & EV scenario.</p></div>}
        {assessment && metrics && <><p className="summary-name">{assessment.name}<br />{assessment.coordinates.map(number => number.toFixed(6)).join(', ')}</p><div className="roof-primary-stats">{[['Map-derived footprint', value(metrics.mappedFootprintSqM, 'm²')], ['Surveyed usable roof', value(metrics.surveyedUsableRoofSqM, 'm²')], ['Recorded solar generation', value(metrics.solarGenerationKWh, 'kWh')], ['Recorded facility electricity', value(metrics.siteElectricityKWh, 'kWh')]].map(([label, number]) => <div className="stat" key={label}><small>{label}</small><strong>{number}</strong></div>)}</div><p className="help-note">{assessment.geometryNote}</p><p className="help-note" style={{ marginTop: 10 }}>{assessment.evidence ? `Reporting period: ${assessment.evidence.periodStart} — ${assessment.evidence.periodEnd}. ${assessment.evidence.verificationStatus}` : 'No site measurements supplied. The scenario below uses disclosed assumptions; actual performance remains unknown.'}</p><button className="btn btn-primary" style={{ width: '100%', marginTop: 16 }} onClick={props.onOpenPlan}>Plan for this site →</button></>}
      </section>
      {assessment && <details className="disclosure"><summary>Geometry source and mapped tags</summary><div className="disclosure-body page-stack"><p>{assessment.sources.geometry}</p>{assessment.sources.geometryUrl && <a href={assessment.sources.geometryUrl} target="_blank" rel="noreferrer">Open source building ↗</a>}<p className="help-note">{assessment.sources.geometryFetchedAt ? `Fetched ${new Date(assessment.sources.geometryFetchedAt).toLocaleString('en-MY', { timeZone: 'Asia/Kuala_Lumpur' })} MYT` : 'Source timestamp not recorded'}</p><dl className="detail-list">{Object.entries(assessment.tags).map(([key, item]) => <div key={key}><dt>{key}</dt><dd>{item}</dd></div>)}</dl><p className="help-note">OSM tags are community map labels, not an independent verification of building use or condition.</p></div></details>}
    </aside></div>
    <BuildingRankingView buildings={buildings} selectedId={assessment?.buildingId} revision={assessment?.scenario.updatedAt} onSelect={selectBuilding} disabled={analyzing} />
    {assessment && <ImplementationScenarioView key={assessment.siteKey} site={assessment} onChange={result => { if (selectionSequence === sequence.current) setAssessment(result); }} />}
    <details className="disclosure"><summary>Saved site records ({history.length})</summary><div className="disclosure-body page-stack">{!history.length && <p className="help-note">Select a building to save its source-backed geometry and implementation scenario.</p>}{history.map(item => <button key={item.id} className="btn btn-secondary" style={{ justifyContent: 'space-between' }} onClick={async () => { try { restore(await roofApi.plan(item.id)); } catch (error) { setAnalysisError((error as Error).message); } }}>{item.name}<span>{fmt(item.footprintSqM, 1)} m² mapped</span></button>)}</div></details>
  </div>;
};
