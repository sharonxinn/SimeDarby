"""Source-attributed ESG planning report; no invented ratings or assurance claims."""
from datetime import datetime, timezone, timedelta
from html import escape
from pydantic import BaseModel, ConfigDict, Field


class ReportMetadata(BaseModel):
    model_config = ConfigDict(extra='forbid')
    organisation: str = Field('', max_length=200)
    preparedBy: str = Field('', max_length=200)


def number(value, unit='', digits=2):
    if value is None:
        return 'Not available'
    return f'{value:,.{digits}f}'.rstrip('0').rstrip('.') + (f' {unit}' if unit else '') if digits else f'{value:,.0f}' + (f' {unit}' if unit else '')


def build_report(site, metadata):
    m, s, e = site['metrics'], site['scenario'], site.get('evidence') or {}
    resource, weather = s.get('resource') or {}, s['weather']
    period = f"{e['periodStart']} to {e['periodEnd']}" if e else 'No measured reporting period supplied'
    generated = datetime.now(timezone(timedelta(hours=8))).strftime('%Y-%m-%d %H:%M MYT')
    def metric(label, value, basis):
        return {'label': label, 'value': value, 'basis': basis}
    sections = [
        {'title': 'E · Environmental baseline', 'description': 'Only supplied records for the declared period and facility boundary. These are not annualised or independently assured.',
         'metrics': [metric('Reporting period', period, 'Source record'),
                     metric('Facility electricity', number(m['siteElectricityKWh'], 'kWh'), 'Supplied record'),
                     metric('Existing installed PV', number(m['installedSolarKWp'], 'kWp'), 'Supplied record'),
                     metric('Recorded solar generation', number(m['solarGenerationKWh'], 'kWh'), 'Supplied record'),
                     metric('Recorded charging energy', number(m['evChargingKWh'], 'kWh'), 'Supplied record'),
                     metric('Water consumption', number(m['waterLitres'], 'litres'), 'Supplied record'),
                     metric('Reported facility emissions', number(m['totalEmissionsKgCO2e'], 'kg CO₂e'), 'As supplied; scopes not established'),
                     metric('Scope 1 / 2 / 3 inventory', 'Not established', 'No separate scope inventory or consolidation approach supplied')],
         'actions': ['Collect interval electricity and charging meters, water records and a documented emissions inventory for a consistent facility boundary.']},
        {'title': 'E · Proposed solar and EV implementation', 'description': 'Annual modelled planning estimates, separate from actual operating performance. EV installation costs are excluded from solar CAPEX and payback.',
         'metrics': [metric('Mapped footprint', number(site['footprintSqM'], 'm²'), site['sources']['geometry']),
                     metric('Proposed PV capacity', number(s['proposedKWp'], 'kWp'), f"{s['panels']} area-based panels; not an existing installation"),
                     metric('Annual DC / AC output', number(s['annualDCKWh'], 'kWh DC') + ' / ' + number(s['annualACKWh'], 'kWh AC'), 'Modelled annual horizontal-resource budget'),
                     metric('Solar installed CAPEX budget', 'RM ' + number(s['capexMYR']), 'Editable cost assumption; not a quote'),
                     metric('CAPEX sensitivity range', 'RM ' + number(s['capexLowMYR']) + ' – RM ' + number(s['capexHighMYR']), 'Budget sensitivity, not statistical confidence'),
                     metric('Annual bill savings', ('RM ' + number(s['annualSavingsMYR'])) if s['annualSavingsMYR'] is not None else 'Not available', 'Assumed on-site solar only; no export revenue'),
                     metric('Simple solar payback', number(s['paybackYears'], 'years'), 'Excludes financing, maintenance, degradation and EV costs'),
                     metric('Potential annual avoided CO₂', number(s['annualCO2Tonnes'], 't CO₂'), f"Modelled on-site PV × {s['inputs']['gridFactorKgPerKWh']} kg CO₂/kWh reference; not measured reduction or carbon credits"),
                     metric('Proposed EV points', f"{s['inputs']['evChargers']} × {s['inputs']['evChargerKW']} kW", 'Design assumption, not surveyed demand'),
                     metric('Annual EV charging / PV allocation', number(s['ev']['annualChargingKWh'], 'kWh') + ' / ' + number(s['ev']['pvAllocatedKWh'], 'kWh'), 'Annual energy budget; PV allocation included in on-site solar, not added twice')],
         'actions': [s['ev']['supplyCheck'], 'Confirm roof structure, panel layout, parking, electrical design, ownership and utility permission before procurement.']},
        {'title': 'E · Weather, energy resilience and data centres', 'description': weather['basis'],
         'metrics': [metric('Historical resource year', str(resource.get('year', 'Not available')), 'A historical year, not a forecast'),
                     metric('Annual horizontal solar resource', number(resource.get('annualGHI'), 'kWh/m²'), 'NASA POWER gridded estimate'),
                     metric('Mean ambient air temperature', number(weather.get('meanAmbientC'), '°C'), 'Historical daily 2 m air temperatures; not cell temperature'),
                     metric('Data-centre situation', site['plan']['dataCenterStatus'], 'Selected-site evidence only'),
                     metric('PUE / WUE / CUE', number(m['pue']) + ' / ' + number(m['wueLitresPerKWhIT'], 'L/kWh IT') + ' / ' + number(m['cueKgCO2ePerKWhIT'], 'kg CO₂e/kWh IT'), 'Only calculated from common-period operating records')],
         'actions': ['Weather changes operating output and generation, not the installed module nameplate kWp.',
                     'Check drainage, roof waterproofing, lightning protection and maintenance access. These are recommended checks, not detected defects.',
                     'For a proposed data centre, obtain power/water allocation, cooling and redundancy design, fibre and land-use evidence; no MW capacity or readiness is inferred.']},
        {'title': 'S · People, access and safety', 'description': 'No employment, training, incident, stakeholder consultation or accessibility records have been supplied. No social performance score is assigned.',
         'metrics': [metric('Recorded parking / existing chargers', number(m['parkingBays'], 'bays', 0) + ' / ' + number(m['existingEVChargers'], 'points', 0), 'Supplied record; accessibility not verified'),
                     metric('Safety, training and stakeholder outcomes', 'Not assessed', 'Supporting records required')],
         'actions': ['Design accessible charging bays and safe pedestrian/cable routes with site users.', 'Assign competent electrical and roof contractors, record training and inspections, and document emergency response and incident reporting.', 'Record stakeholder feedback, service availability and charging accessibility before claiming social benefits.']},
        {'title': 'G · Governance, provenance and accountability', 'description': 'A planning report, not an audited ESG statement, certification, GRI-compliant report, regulatory filing or investment approval.',
         'metrics': [metric('Site record source', e.get('sourceReference', 'No site measurement record supplied'), e.get('verificationStatus', 'No independent verification')),
                     metric('Source date', e.get('sourceDate', 'Not available'), 'Supplied record'),
                     metric('Measurement boundary', e.get('measurementBoundary', 'Not established'), 'Supplied record'),
                     metric('Weather source / checksum', resource.get('sourceUrl', 'Not available'), resource.get('sha256', 'Not available'))],
         'actions': ['Assign named owners, implementation milestones and evidence review responsibilities; none are invented by this report.', 'Retain source documents, equipment quotes, approvals, calculation inputs and meter exports. Review assumptions when evidence changes.', 'For formal disclosures, establish material topics, organisational boundary, reporting period, applicable standards and independent assurance requirements.']},
    ]
    missing = [label for key, label in [('surveyedUsableRoofSqM', 'Usable-roof and structural survey'), ('siteElectricityKWh', 'Facility electricity record'),
               ('peakDemandKW', 'Measured peak demand'), ('confirmedSupplyKW', 'Documented supply limit'), ('parkingBays', 'Parking survey'),
               ('waterLitres', 'Water record'), ('totalEmissionsKgCO2e', 'Facility emissions record')] if m.get(key) is None]
    missing += ['Scope-specific GHG inventory and boundary', 'Social outcome and governance approval records', 'Independent assurance or compliance assessment']
    report = {'title': 'Solar & EV ESG Planning Report', 'siteName': site['name'], 'siteKey': site['siteKey'], 'assessmentId': site['id'],
              'generatedAt': generated, 'organisation': metadata.organisation, 'preparedBy': metadata.preparedBy,
              'coordinates': site['coordinates'], 'recordPeriod': period, 'sections': sections,
              'monthlyWeather': weather['monthly'], 'assumptions': s['inputs'], 'missingEvidence': missing,
              'limitations': s['warnings'] + weather['limits'],
              'references': s['references'] + site['plan']['references'] + [{'title': 'GRI climate and energy standards information (no compliance claim)', 'url': 'https://globalreporting.org/standards/standards-development/topic-standard-for-climate-change-and-energy/'}]}
    report['html'] = render_html(report)
    return report


def render_html(report):
    def esc(value):
        return escape(str(value), quote=True)
    def table(headers, rows):
        return '<table><thead><tr>' + ''.join('<th>'+esc(h)+'</th>' for h in headers) + '</tr></thead><tbody>' + ''.join('<tr>'+''.join('<td>'+esc(v)+'</td>' for v in row)+'</tr>' for row in rows) + '</tbody></table>'
    body = ''
    for section in report['sections']:
        body += '<section><h2>'+esc(section['title'])+'</h2><p>'+esc(section['description'])+'</p>'
        body += table(['Metric', 'Value', 'Basis'], [[r['label'], r['value'], r['basis']] for r in section['metrics']])
        body += '<h3>Next actions</h3><ul>'+''.join('<li>'+esc(a)+'</li>' for a in section['actions'])+'</ul></section>'
    body += '<section><h2>Historical monthly weather and modelled generation</h2><p>Monthly AC estimates allocate the annual base case by observed GHI. Ambient temperature is context only, not an additional derate.</p>'
    body += table(['Month', 'GHI (kWh/m²)', 'Mean air (°C)', 'Modelled AC (kWh)'], [[r['month'], number(r['ghiKWhM2']), number(r['meanAmbientC']), number(r['modelledACKWh'])] for r in report['monthlyWeather']]) if report['monthlyWeather'] else '<p>No complete historical weather profile is available.</p>'
    body += '</section><section><h2>Calculation inputs</h2>'+table(['Input', 'Value'], [[k, v] for k, v in report['assumptions'].items()])+'</section>'
    for title, values in [('Missing evidence', report['missingEvidence']), ('Method limits', report['limitations'])]:
        body += '<section><h2>'+esc(title)+'</h2><ul>'+''.join('<li>'+esc(v)+'</li>' for v in values)+'</ul></section>'
    body += '<section><h2>Source references</h2>'+table(['Reference', 'URL'], [[r['title'], r['url']] for r in report['references']])+'</section>'
    return '''<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>'''+esc(report['title'])+'''</title><style>
    *{box-sizing:border-box}body{font:14px/1.6 Arial,"Segoe UI",sans-serif;color:#263341;margin:0;background:#eef2f6}main{max-width:1000px;margin:32px auto;background:white;padding:48px}h1{font-size:30px;line-height:1.2;color:#16315e}h2{font-size:19px;color:#16315e;border-bottom:1px solid #d8e1ec;padding-bottom:8px;margin-top:32px}h3{font-size:14px}p,li{overflow-wrap:anywhere}.tag{font-size:12px;color:#475569;background:#eef3fa;padding:8px 12px;border-radius:5px}.meta{color:#64748b;font-size:12px}table{border-collapse:collapse;width:100%;table-layout:fixed;font-size:12px;margin:16px 0}th,td{padding:10px;text-align:left;border-bottom:1px solid #e2e8f0;vertical-align:top;overflow-wrap:anywhere}th{background:#f1f5f9}th:first-child{width:28%}button{padding:9px 14px;background:#2563eb;color:white;border:0;border-radius:6px;cursor:pointer}li+li{margin-top:7px}footer{margin-top:32px;font-size:11px;color:#64748b}@page{size:A4;margin:16mm}@media print{body{background:white}main{margin:0;padding:0;max-width:none;font-size:10pt}button{display:none}h2,h3{break-after:avoid}tr{break-inside:avoid}thead{display:table-header-group}table{font-size:9pt}section{margin-top:16px}}
    </style></head><body><main><button onclick="window.print()">Print / Save as PDF</button><p class="meta">SolarSync · Selangor, Malaysia</p><h1>'''+esc(report['title'])+'</h1><p><strong>'+esc(report['siteName'])+'</strong></p><p class="meta">'+esc(report['organisation'] or 'Organisation not supplied')+' · Prepared by '+esc(report['preparedBy'] or 'not supplied')+'<br>Generated '+esc(report['generatedAt'])+' · '+esc(', '.join(f'{v:.6f}' for v in report['coordinates']))+'<br>Site '+esc(report['siteKey'])+' · Assessment '+esc(report['assessmentId'])+'</p><p class="tag">Source-attributed planning report. Recorded facts, modelled estimates and missing evidence are separated. No ESG rating, assurance or compliance certification is claimed.</p>'+body+'<footer>Generated from the selected site and saved scenario. Historical weather, actual reporting periods and annual estimates must not be treated as the same accounting period. Export important records before the free server resets.</footer></main></body></html>'
