import { useState, type FormEvent } from 'react';
import { FileText, Download, Printer } from 'lucide-react';
import { roofApi } from '../api/roofClient';
import type { ESGReport, RoofAssessment } from '../types/roof';

export function ESGReportView({ site }: { site: RoofAssessment }) {
  const [report, setReport] = useState<ESGReport | null>(null), [busy, setBusy] = useState(false), [error, setError] = useState('');
  async function generate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError('');
    const values = new FormData(event.currentTarget);
    try { setReport(await roofApi.esgReport(site.id, { organisation: String(values.get('organisation') || ''), preparedBy: String(values.get('preparedBy') || '') })); }
    catch (failure) { setError((failure as Error).message); }
    finally { setBusy(false); }
  }
  function exportReport() {
    if (!report) return;
    const url = URL.createObjectURL(new Blob([report.html], { type: 'text/html;charset=utf-8' }));
    const anchor = document.createElement('a'); anchor.href = url;
    anchor.download = `SolarSync-ESG-${site.id}.html`;
    anchor.click(); setTimeout(() => URL.revokeObjectURL(url), 60000);
  }
  function printReport() {
    document.body.classList.add('printing-esg');
    window.addEventListener('afterprint', () => document.body.classList.remove('printing-esg'), { once: true });
    window.print();
  }
  return <section className="panel esg-panel" aria-label="ESG report generator"><div className="panel-heading"><div><h3><FileText size={19} /> ESG planning report</h3><p className="help-note">A source-attributed report for {site.name}, using its current saved solar and EV scenario.</p></div><span className="badge badge-white">Environmental · Social · Governance</span></div><p className="help-note">Includes real records where supplied, modelled solar/EV impact, historical weather, data-centre status, missing evidence and implementation actions. No ESG score, assurance or regulatory compliance claim is invented.</p><form className="page-stack" onSubmit={generate} style={{ marginTop: 16 }}><div className="form-grid"><label className="field">Organisation (optional)<input name="organisation" maxLength={200} placeholder="Enter the actual organisation name" /></label><label className="field">Prepared by (optional)<input name="preparedBy" maxLength={200} placeholder="Enter the actual author or team" /></label></div><button className="btn btn-primary" disabled={busy}>{busy ? 'Generating report…' : 'Generate ESG report'}</button></form>{error && <p role="alert" className="notice" style={{ marginTop: 12 }}>{error}</p>}{report && <div className="page-stack esg-preview"><div className="panel-heading"><div><h4>{report.title}</h4><p className="help-note">Generated {report.generatedAt} · Recorded period: {report.recordPeriod}</p></div><div className="report-actions"><button className="btn btn-secondary" onClick={() => exportReport()}><Download size={15} />Download HTML report</button><button className="btn btn-primary" onClick={printReport}><Printer size={15} />Print / Save PDF</button></div></div><p className="help-note">Choose <strong>Print / Save PDF</strong>, then select “Save as PDF” in the print dialog. The print view contains the complete report. HTML downloads also retain all tables and provenance.</p><div className="report-section-grid">{report.sections.map(section => <details className="disclosure" key={section.title}><summary>{section.title}</summary><div className="disclosure-body page-stack"><p className="help-note">{section.description}</p><dl className="detail-list">{section.metrics.map(metric => <div key={metric.label}><dt>{metric.label}<small className="help-note" style={{ display: 'block' }}>{metric.basis}</small></dt><dd>{metric.value}</dd></div>)}</dl><ol className="action-list">{section.actions.map(action => <li key={action}>{action}</li>)}</ol></div></details>)}</div><p className="help-note"><strong>Evidence still required:</strong> {report.missingEvidence.join(' · ')}</p></div>}{report && <ESGPrintDocument report={report} />}</section>;
}

function ESGPrintDocument({ report }: { report: ESGReport }) {
  const fmt = (value: number | null) => value === null ? 'Not available' : value.toLocaleString('en-MY', { maximumFractionDigits: 2 });
  return <article className="esg-print-document"><p>SolarSync · Selangor, Malaysia</p><h1>{report.title}</h1><h2>{report.siteName}</h2><p>{report.organisation || 'Organisation not supplied'} · Prepared by {report.preparedBy || 'not supplied'}<br />Generated {report.generatedAt}<br />{report.coordinates.map(v => v.toFixed(6)).join(', ')} · {report.siteKey}<br />Assessment {report.assessmentId}</p><p className="report-disclaimer">Source-attributed planning report. Recorded facts, modelled estimates and missing evidence are separated. No ESG rating, independent assurance or compliance certification is claimed.</p>
    {report.sections.map(section => <section key={section.title}><h2>{section.title}</h2><p>{section.description}</p><table><thead><tr><th>Metric</th><th>Value</th><th>Basis</th></tr></thead><tbody>{section.metrics.map(row => <tr key={row.label}><td>{row.label}</td><td>{row.value}</td><td>{row.basis}</td></tr>)}</tbody></table><h3>Next actions</h3><ul>{section.actions.map(action => <li key={action}>{action}</li>)}</ul></section>)}
    <section><h2>Historical monthly weather and modelled generation</h2><p>Monthly AC estimates allocate the annual base case by observed GHI. Ambient temperature is context only, not an additional derate.</p>{report.monthlyWeather.length ? <table><thead><tr><th>Month</th><th>GHI (kWh/m²)</th><th>Mean air (°C)</th><th>Modelled AC (kWh)</th></tr></thead><tbody>{report.monthlyWeather.map(row => <tr key={row.month}><td>{row.month}</td><td>{fmt(row.ghiKWhM2)}</td><td>{fmt(row.meanAmbientC)}</td><td>{fmt(row.modelledACKWh)}</td></tr>)}</tbody></table> : <p>No complete historical weather profile available.</p>}</section>
    <section><h2>Calculation inputs</h2><table><thead><tr><th>Input</th><th>Value</th></tr></thead><tbody>{Object.entries(report.assumptions).map(([key, value]) => <tr key={key}><td>{key}</td><td>{value}</td></tr>)}</tbody></table></section><section><h2>Missing evidence</h2><ul>{report.missingEvidence.map(item => <li key={item}>{item}</li>)}</ul></section><section><h2>Method limits</h2><ul>{report.limitations.map(item => <li key={item}>{item}</li>)}</ul></section><section><h2>Source references</h2><table><thead><tr><th>Reference</th><th>URL</th></tr></thead><tbody>{report.references.map(item => <tr key={item.url}><td>{item.title}</td><td>{item.url}</td></tr>)}</tbody></table></section><p>Historical weather, actual reporting periods and annual estimates must not be treated as the same accounting period.</p>
  </article>;
}
