import { useEffect, useState } from 'react';
import { ArrowUpRight, Trophy } from 'lucide-react';
import { roofApi } from '../api/roofClient';
import type { BuildingRanking, RankingCriterion, RoofBuilding } from '../types/roof';

const format = (value: number | null, suffix = '', digits = 0) => value === null ? '—' : value.toLocaleString('en-MY', { maximumFractionDigits: digits }) + suffix;

export function BuildingRankingView({ buildings, selectedId, revision, onSelect, disabled }: {
  buildings: RoofBuilding[]; selectedId?: string | null; revision?: string; onSelect: (building: RoofBuilding) => void; disabled: boolean;
}) {
  const [sortBy, setSortBy] = useState<RankingCriterion>('generation');
  const [expanded, setExpanded] = useState(false);
  const [retry, setRetry] = useState(0);
  const [response, setResponse] = useState<{ key: string; data: BuildingRanking | null; error: string } | null>(null);
  const ids = buildings.map(building => building.id).join(',');
  const key = `${ids};${sortBy};${revision || ''};${retry}`;
  useEffect(() => {
    if (!ids) return;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      roofApi.ranking(ids.split(','), sortBy, controller.signal)
        .then(data => { if (!controller.signal.aborted) setResponse({ key, data, error: '' }); })
        .catch(error => { if (!controller.signal.aborted) setResponse({ key, data: null, error: error.message }); });
    }, 200);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [ids, sortBy, key]);
  const result = response?.key === key ? response : null;
  const data = result?.data;
  const rows = expanded ? data?.rows : data?.rows.slice(0, 5);

  return <section className="panel building-ranking" aria-label="Building ranking">
    <div className="panel-heading"><div><h3><Trophy size={18} /> Building ranking</h3><p className="help-note">Compare {buildings.length} mapped buildings in the current map view.</p></div><label className="ranking-sort">Rank by<select aria-label="Rank buildings by" value={sortBy} onChange={event => setSortBy(event.target.value as RankingCriterion)}>
      <option value="generation">Highest annual solar output</option><option value="savings">Highest annual bill savings</option><option value="payback">Shortest solar payback</option><option value="evSolarShare">Highest EV solar energy share</option><option value="area">Largest mapped footprint</option>
    </select></label></div>
    {!ids ? <p className="help-note">Zoom in or move the map to load building outlines for comparison.</p> : !result ? <p role="status" className="help-note">Calculating building rankings…</p> : result.error ? <p role="alert" className="notice">{result.error} <button className="btn btn-secondary" onClick={() => setRetry(value => value + 1)}>Retry ranking</button></p> : data && <>
      <div className={`table-scroll ranking-table ${expanded ? 'ranking-expanded' : ''}`}><table className="simple-table"><thead><tr><th scope="col">Rank</th><th scope="col">Building</th><th scope="col">Proposed solar</th><th scope="col">AC solar / yr</th><th scope="col">Savings / yr</th><th scope="col">Payback</th><th scope="col">EV solar share</th><th scope="col"><span className="small muted">Analysis</span></th></tr></thead><tbody>{rows?.map(row => <tr key={row.id} className={selectedId === row.id ? 'ranking-selected' : ''}>
        <td><span className={row.rank === 1 ? 'ranking-first' : 'ranking-number'}>{row.rank === null ? '—' : `#${row.rank}`}</span></td>
        <th scope="row"><span className="ranking-name">{row.name}</span><small>{format(row.footprintSqM, ' m² mapped', 1)} · {row.hasSiteRecords ? 'Site records supplied' : 'Survey not supplied'}</small></th>
        <td>{format(row.proposedKWp, ' kWp', 2)}</td><td>{format(row.annualACKWh, ' kWh')}</td><td>{row.annualSavingsMYR === null ? '—' : `RM ${format(row.annualSavingsMYR)}`}</td><td>{format(row.paybackYears, ' yrs', 1)}</td><td>{format(row.evSolarSharePct, '%', 1)}<small>{row.evChargers} proposed points</small></td>
        <td><button className="btn btn-secondary" aria-label={`Analyse ${row.name}`} disabled={disabled} onClick={() => { const building = buildings.find(item => item.id === row.id); if (building) onSelect(building); }}>{selectedId === row.id ? 'Selected' : 'View roof'}<ArrowUpRight size={14} /></button></td>
      </tr>)}</tbody></table></div>
      {data.total > 5 && <button className="btn btn-ghost" style={{ marginTop: 10 }} onClick={() => setExpanded(value => !value)}>{expanded ? 'Show top 5' : `Show all ${data.total} buildings`}</button>}
      <p className="help-note" style={{ marginTop: 12 }}><strong>{sortBy === 'area' ? 'Map-derived area comparison.' : 'Modelled comparison.'}</strong> Uses each building’s saved scenario or default assumptions. Ties share a rank; — means unavailable. Solar-to-EV share is an annual energy estimate, not proof of charging suitability.</p>
      <details className="disclosure" style={{ marginTop: 12 }}><summary>How the ranking works</summary><div className="disclosure-body page-stack"><p className="help-note">{data.basis}</p><p className="help-note">{data.limitations}</p><p className="help-note">Shared resource, tariff and cost assumptions can produce equal paybacks or EV solar shares. This comparison covers loaded outlines, not every building in the town. Unmapped roofs are excluded. Update a roof’s assumptions or source records to refine its result.</p></div></details>
    </>}
  </section>;
}
