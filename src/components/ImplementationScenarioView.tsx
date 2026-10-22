import React, { useState } from 'react';
import { Sun, Wallet, Banknote, Clock3, Leaf, PlugZap } from 'lucide-react';
import { roofApi } from '../api/roofClient';
import type { RoofAssessment, ScenarioInputs } from '../types/roof';
import { WeatherImpactView } from './WeatherImpactView';

const fmt = (value: number | null, digits = 0) => value === null ? 'Unavailable' : value.toLocaleString('en-MY', { maximumFractionDigits: digits });
const cash = (value: number | null) => value === null ? 'Unavailable' : `RM ${fmt(value)}`;
const fields: [keyof ScenarioInputs, string, number, number, number][] = [
  ['usableRoofPct', 'Mapped roof available for panels (%)', 0, 100, 1],
  ['panelWatts', 'Module nameplate power (W)', 1, 1000, 1], ['panelAreaSqM', 'Module area (m²)', .01, 10, .000001],
  ['dcLossPct', 'Combined DC losses (%)', 0, 100, 1], ['inverterEfficiencyPct', 'Inverter efficiency (%)', .1, 100, .1],
  ['selfConsumptionPct', 'Solar used on site, including EV (%)', 0, 100, 1],
  ['capexPerKWpMYR', 'Solar installed cost budget (RM/kWp)', 0, 100000, 50], ['capexRangePct', 'CAPEX sensitivity ± (%)', 0, 100, 1],
  ['tariffMYRPerKWh', 'Reference electricity tariff (RM/kWh)', 0, 10, .01], ['gridFactorKgPerKWh', 'Reference grid factor (kg CO₂/kWh)', 0, 5, .001],
  ['evChargers', 'Proposed EV charging points', 0, 1000, 1], ['evChargerKW', 'Power per charging point (kW)', .1, 500, .1],
  ['evHoursPerDay', 'Available charging hours / day', 0, 24, .5], ['evUtilisationPct', 'Use within available hours (%)', 0, 100, 1],
  ['evSolarAllocationPct', 'On-site PV allocated to EV (%)', 0, 100, 1],
];

export const ImplementationScenarioView: React.FC<{ site: RoofAssessment; onChange: (site: RoofAssessment) => void; editable?: boolean }> = ({ site, onChange, editable = true }) => {
  const [busy, setBusy] = useState(false), [error, setError] = useState('');
  const s = site.scenario;
  if (!s) return null;
  const p = s.inputs;
  async function update(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError('');
    const form = new FormData(event.currentTarget);
    const inputs = Object.fromEntries(fields.map(([key]) => [key, Number(form.get(key))])) as unknown as ScenarioInputs;
    try { onChange(await roofApi.scenario(site.id, inputs)); }
    catch (failure) { setError((failure as Error).message); }
    finally { setBusy(false); }
  }
  const cards = [
    { label: 'Annual DC yield', icon: Sun, value: `${fmt(s.annualDCKWh)} kWh`, note: `${fmt(s.proposedKWp, 2)} kWp proposed · ${fmt(s.annualACKWh)} kWh AC / yr` },
    { label: 'Installed CAPEX', icon: Wallet, value: cash(s.capexMYR), note: `${cash(s.capexLowMYR)} – ${cash(s.capexHighMYR)} (base ±${fmt(p.capexRangePct)}%) · solar budget` },
    { label: 'Bill savings / yr', icon: Banknote, value: cash(s.annualSavingsMYR), note: `RM ${p.tariffMYRPerKWh.toFixed(2)} / kWh reference · ${fmt(p.selfConsumptionPct)}% on-site use` },
    { label: 'Simple payback', icon: Clock3, value: s.paybackYears === null ? 'Not applicable' : `${fmt(s.paybackYears, 1)} yrs`, note: 'Solar CAPEX ÷ annual savings · excludes EV costs & O&M' },
    { label: 'CO₂ avoided / yr', icon: Leaf, value: s.annualCO2Tonnes === null ? 'Unavailable' : `${fmt(s.annualCO2Tonnes, 2)} t`, note: `${fmt(p.gridFactorKgPerKWh, 3)} kg CO₂ / kWh reference · on-site PV use` },
    { label: 'EV implementation', icon: PlugZap, value: `${p.evChargers} × ${fmt(p.evChargerKW, 1)} kW`, note: `${fmt(s.ev.annualChargingKWh)} kWh charging / yr · proposed, not existing` },
  ];
  return <div className="page-stack"><section className="panel scenario-panel"><div className="panel-heading"><div><h3>Solar & EV potential</h3><p className="help-note">For {site.name} · {s.panels} proposed panels · {fmt(s.usableAreaSqM, 1)} m² allocated</p></div><span className="badge badge-white">Modelled scenario</span></div>
    <div className="scenario-metrics">{cards.map(({ label, icon: Icon, value, note }) => <div className="scenario-stat" key={label}><small><Icon size={16} />{label}</small><strong>{value}</strong><p>{note}</p></div>)}</div>
    <p className="help-note scenario-source">{s.resource ? <>Based on NASA POWER {s.resource.year} regional solar resource, {fmt(s.resource.annualGHI)} kWh/m²/yr; reference point {fmt(s.resource.distanceKm, 1)} km away. </> : 'Solar resource missing. Import a complete NASA year to calculate yield. '}Area and weather are source-based; costs, losses and usage are editable assumptions. Results are estimates, not measured roof performance.</p>
    {editable && <details className="disclosure"><summary>Edit solar and EV assumptions</summary><div className="disclosure-body"><p className="help-note" style={{ marginBottom: 14 }}>Starting values are screening assumptions. The 550 W module and 2.583252 m² area are an example module pair, not a selected product. RM3,500/kWp is a budget input, not a quote. CAPEX range is a sensitivity range, not statistical confidence. Surveyed usable area, when supplied, overrides the mapped area percentage.</p><form onSubmit={update} className="page-stack" key={site.siteKey + s.updatedAt}><div className="form-grid">{fields.map(([key, label, min, max, step]) => <label className="field" key={key}>{label}<input required type="number" name={key} min={min} max={max} step={step} defaultValue={p[key]} disabled={key === 'usableRoofPct' && site.metrics.surveyedUsableRoofSqM !== null} />{key === 'usableRoofPct' && site.metrics.surveyedUsableRoofSqM !== null && <input type="hidden" name={key} value={p[key]} />}</label>)}</div>{error && <p role="alert" className="notice">{error}</p>}<button className="btn btn-primary" disabled={busy}>{busy ? 'Calculating…' : 'Update implementation scenario'}</button></form></div></details>}
    <details className="disclosure"><summary>Energy balance, sources and calculation limits</summary><div className="disclosure-body page-stack"><dl className="detail-list"><div><dt>Area basis</dt><dd>{s.areaBasis}</dd></div><div><dt>Assumed on-site solar use</dt><dd>{fmt(s.annualSelfConsumedKWh)} kWh/yr</dd></div><div><dt>PV allocated to charging (included above)</dt><dd>{fmt(s.ev.pvAllocatedKWh)} kWh/yr</dd></div><div><dt>EV annual solar energy share</dt><dd>{fmt(s.ev.annualSolarSharePct, 1)}%</dd></div><div><dt>Remaining annual EV grid energy</dt><dd>{fmt(s.ev.remainingGridKWh)} kWh/yr</dd></div></dl><p className="help-note">{s.ev.supplyCheck}. Annual energy balance does not establish daytime charging availability.</p><ul className="help-note">{s.warnings.map(w => <li key={w}>{w}</li>)}</ul><ul className="help-note">{s.formulas.map(f => <li key={f}>{f}</li>)}</ul>{s.resource && <><a href={s.resource.sourceUrl} target="_blank" rel="noreferrer">Actual NASA source request ({s.resource.days} days) ↗</a><p className="help-note">Imported {new Date(s.resource.importedAt).toLocaleString('en-MY')} · SHA-256 {s.resource.sha256}</p></>}{s.references.map(r => <a key={r.url} href={r.url} target="_blank" rel="noreferrer">{r.title} ↗</a>)}</div></details>
  </section><WeatherImpactView key={site.siteKey + s.updatedAt} site={site} /></div>;
};
