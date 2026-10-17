import React, { useState } from 'react';
import {
  BarChart3,
  TrendingUp,
  DollarSign,
  Leaf,
  Layers,
  Zap,
} from 'lucide-react';
import type {
  SolarSite,
  ScenarioId,
  TownshipConfig,
} from '../types/solar';
import {
  SCENARIO_DEFINITIONS,
  calculateScenarioMetrics,
  calculateHourlyProfile,
  formatNumber,
  formatMYR,
} from '../utils/solarEngine';

interface ImpactSimulatorViewProps {
  allSites: SolarSite[];
  activeScenario: ScenarioId;
  onSelectScenario: (scenarioId: ScenarioId) => void;
  customSelectedSiteIds: string[];
  onToggleCustomSite: (siteId: string) => void;
  township: TownshipConfig;
}

export const ImpactSimulatorView: React.FC<ImpactSimulatorViewProps> = ({
  allSites,
  activeScenario,
  onSelectScenario,
  customSelectedSiteIds,
  onToggleCustomSite,
  township,
}) => {
  const [selectedHour, setSelectedHour] = useState<number>(12);

  const metricsA = calculateScenarioMetrics(
    'A',
    SCENARIO_DEFINITIONS[0].targetSiteIds,
    allSites,
    township
  );
  const metricsB = calculateScenarioMetrics(
    'B',
    SCENARIO_DEFINITIONS[1].targetSiteIds,
    allSites,
    township
  );
  const metricsC = calculateScenarioMetrics(
    'C',
    SCENARIO_DEFINITIONS[2].targetSiteIds,
    allSites,
    township
  );
  const metricsCustom = calculateScenarioMetrics(
    'custom',
    customSelectedSiteIds,
    allSites,
    township
  );

  const currentMetrics =
    activeScenario === 'A'
      ? metricsA
      : activeScenario === 'B'
      ? metricsB
      : activeScenario === 'C'
      ? metricsC
      : metricsCustom;

  const hourlyData = calculateHourlyProfile(currentMetrics.selectedSiteIds, allSites);
  const hourDataAtScrubber = hourlyData[selectedHour] || hourlyData[12];

  const maxKW = Math.max(
    ...hourlyData.map((d) => Math.max(d.solarGenerationKW, d.buildingDemandKW + d.evDemandKW)),
    100
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Strategy Selector Banner */}
      <div
        className="glass-card"
        style={{
          padding: '18px 20px',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <BarChart3 size={18} color="var(--blue-sky)" />
              <h2
                style={{
                  fontFamily: 'var(--font-heading)',
                  fontSize: '18px',
                  fontWeight: 800,
                  color: 'var(--text-pure-black)',
                }}
              >
                Township Energy Simulation & Investment Scenarios
              </h2>
            </div>
            <p style={{ fontSize: '11.5px', color: 'var(--text-muted)', marginTop: '3px', maxWidth: '850px' }}>
              Compare trade-offs across three development pathways. Evaluate whether prioritizing sheer square footage (Strategy A),
              daytime building self-consumption (Strategy B), or integrated parking canopies with EV charging (Strategy C) delivers better economic return.
            </p>
          </div>
          <span className="badge badge-blue">Scenario Simulator</span>
        </div>

        {/* Strategy Selector Cards */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))',
            gap: '10px',
            marginTop: '16px',
          }}
        >
          {SCENARIO_DEFINITIONS.map((scen) => {
            const isSelected = activeScenario === scen.id;
            const metric = scen.id === 'A' ? metricsA : scen.id === 'B' ? metricsB : metricsC;

            return (
              <div
                key={scen.id}
                onClick={() => onSelectScenario(scen.id)}
                className="glass-card glass-card-interactive"
                style={{
                  padding: '12px 14px',
                  borderColor: isSelected ? 'var(--blue-sky)' : 'var(--blue-border)',
                  background: isSelected ? '#e0f2fe' : '#ffffff',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span
                    className="badge"
                    style={{
                      background: isSelected ? 'var(--blue-sky)' : '#f0f9ff',
                      color: isSelected ? '#ffffff' : 'var(--text-dark)',
                      fontSize: '10px',
                      fontWeight: 700,
                      border: `1px solid ${isSelected ? 'var(--blue-bright)' : 'var(--blue-border)'}`,
                    }}
                  >
                    Strategy {scen.id}
                  </span>
                  <span style={{ fontSize: '11px', color: 'var(--blue-sky)', fontWeight: 700 }}>
                    {metric.totalCapacityKWp} kWp
                  </span>
                </div>

                <h4
                  style={{
                    fontSize: '13px',
                    fontWeight: 700,
                    color: 'var(--text-dark)',
                    marginTop: '6px',
                  }}
                >
                  {scen.shortDesc}
                </h4>

                <div
                  style={{
                    marginTop: '8px',
                    paddingTop: '6px',
                    borderTop: '1px solid var(--blue-border)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontSize: '11px',
                  }}
                >
                  <span style={{ color: 'var(--text-muted)' }}>Self-Match: <strong style={{ color: 'var(--text-dark)' }}>{metric.selfConsumptionPct}%</strong></span>
                  <span style={{ color: 'var(--blue-sky)', fontWeight: 700 }}>Payback: {metric.simplePaybackYears} yrs</span>
                </div>
              </div>
            );
          })}

          {/* Custom Selection Card */}
          <div
            onClick={() => onSelectScenario('custom')}
            className="glass-card glass-card-interactive"
            style={{
              padding: '12px 14px',
              borderColor: activeScenario === 'custom' ? 'var(--blue-sky)' : 'var(--blue-border)',
              background: activeScenario === 'custom' ? '#e0f2fe' : '#ffffff',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span
                className="badge"
                style={{
                  background: activeScenario === 'custom' ? 'var(--blue-sky)' : '#f0f9ff',
                  color: activeScenario === 'custom' ? '#ffffff' : 'var(--text-dark)',
                  fontSize: '10px',
                  fontWeight: 700,
                  border: `1px solid ${activeScenario === 'custom' ? 'var(--blue-bright)' : 'var(--blue-border)'}`,
                }}
              >
                Custom Mix
              </span>
              <span style={{ fontSize: '11px', color: 'var(--blue-sky)', fontWeight: 700 }}>
                {metricsCustom.totalCapacityKWp} kWp
              </span>
            </div>

            <h4
              style={{
                fontSize: '13px',
                fontWeight: 700,
                color: 'var(--text-dark)',
                marginTop: '6px',
              }}
            >
              Manual Portfolio Selection
            </h4>

            <div
              style={{
                marginTop: '8px',
                paddingTop: '6px',
                borderTop: '1px solid var(--blue-border)',
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: '11px',
              }}
            >
              <span style={{ color: 'var(--text-muted)' }}>{customSelectedSiteIds.length} of 12 Sites</span>
              <span style={{ color: 'var(--blue-sky)', fontWeight: 700 }}>Payback: {metricsCustom.simplePaybackYears} yrs</span>
            </div>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))',
          gap: '10px',
        }}
      >
        <div className="glass-card" style={{ padding: '14px' }}>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Solar Capacity</span>
          <div style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-pure-black)', marginTop: '4px' }}>
            {formatNumber(currentMetrics.totalCapacityKWp)} <span style={{ fontSize: '12px', fontWeight: 500 }}>kWp</span>
          </div>
          <span style={{ fontSize: '10.5px', color: 'var(--blue-sky)', marginTop: '2px', display: 'block', fontWeight: 600 }}>
            {formatNumber(currentMetrics.totalUsableAreaSqM)} m² usable area
          </span>
        </div>

        <div className="glass-card" style={{ padding: '14px' }}>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Annual Generation</span>
          <div style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-pure-black)', marginTop: '4px' }}>
            {formatNumber(currentMetrics.annualSolarGenerationMWh)} <span style={{ fontSize: '12px', fontWeight: 500 }}>MWh/yr</span>
          </div>
          <span style={{ fontSize: '10.5px', color: 'var(--text-muted)', marginTop: '2px', display: 'block' }}>
            {formatNumber(currentMetrics.gridDisplacedMWh)} MWh used on-site
          </span>
        </div>

        <div className="glass-card" style={{ padding: '14px' }}>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Self-Consumption Rate</span>
          <div style={{ fontSize: '20px', fontWeight: 800, color: 'var(--blue-sky)', marginTop: '4px' }}>
            {currentMetrics.selfConsumptionPct}%
          </div>
          <span style={{ fontSize: '10.5px', color: 'var(--text-muted)', marginTop: '2px', display: 'block' }}>
            {100 - currentMetrics.selfConsumptionPct}% exported under NEM
          </span>
        </div>

        <div className="glass-card" style={{ padding: '14px' }}>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Annual Utility Savings</span>
          <div style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-pure-black)', marginTop: '4px' }}>
            {formatMYR(currentMetrics.annualCostSavingsMYR)}
          </div>
          <span style={{ fontSize: '10.5px', color: 'var(--blue-sky)', marginTop: '2px', display: 'block', fontWeight: 600 }}>
            {currentMetrics.simplePaybackYears} years payback
          </span>
        </div>

        <div className="glass-card" style={{ padding: '14px' }}>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Avoided Carbon</span>
          <div style={{ fontSize: '20px', fontWeight: 800, color: 'var(--blue-sky)', marginTop: '4px' }}>
            {formatNumber(currentMetrics.avoidedCO2Tonnes)} <span style={{ fontSize: '12px', fontWeight: 500 }}>tCO₂/yr</span>
          </div>
          <span style={{ fontSize: '10.5px', color: 'var(--text-muted)', marginTop: '2px', display: 'block' }}>
            0.758 tCO₂/MWh factor
          </span>
        </div>
      </div>

      {/* 24-Hour Diurnal Daily Curve */}
      <div className="glass-card" style={{ padding: '18px 20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
          <div>
            <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '15px', fontWeight: 800, color: 'var(--text-pure-black)' }}>
              24-Hour Diurnal Energy Profile
            </h3>
            <p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
              Hourly solar generation vs. building and EV charger demand for {currentMetrics.scenarioName}
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', fontSize: '11px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <div style={{ width: '10px', height: '10px', background: 'var(--blue-sky)', borderRadius: '2px' }} />
              <span style={{ color: 'var(--text-charcoal)', fontWeight: 500 }}>Solar Generation (kW)</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <div style={{ width: '10px', height: '2.5px', background: '#000000', borderRadius: '1px' }} />
              <span style={{ color: 'var(--text-charcoal)', fontWeight: 500 }}>Building & EV Demand (kW)</span>
            </div>
          </div>
        </div>

        {/* Clean SVG Curve Chart */}
        <div style={{ marginTop: '16px', height: '220px', position: 'relative' }}>
          <svg width="100%" height="100%" viewBox="0 0 800 200" preserveAspectRatio="none">
            <defs>
              <linearGradient id="lightSolarFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.45" />
                <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.05" />
              </linearGradient>
            </defs>

            {/* Subtle horizontal grid lines */}
            <line x1="0" y1="180" x2="800" y2="180" stroke="#bae6fd" strokeWidth="1" />
            <line x1="0" y1="135" x2="800" y2="135" stroke="#e0f2fe" strokeWidth="1" strokeDasharray="3 3" />
            <line x1="0" y1="90" x2="800" y2="90" stroke="#e0f2fe" strokeWidth="1" strokeDasharray="3 3" />
            <line x1="0" y1="45" x2="800" y2="45" stroke="#e0f2fe" strokeWidth="1" strokeDasharray="3 3" />

            {/* Solar fill area */}
            <path
              d={
                hourlyData.reduce((acc, pt, idx) => {
                  const x = (idx / 23) * 800;
                  const y = 180 - (pt.solarGenerationKW / maxKW) * 160;
                  return `${acc} ${idx === 0 ? 'M' : 'L'} ${x} ${y}`;
                }, '') + ` L 800 180 L 0 180 Z`
              }
              fill="url(#lightSolarFill)"
            />

            {/* Solar generation line */}
            <path
              d={hourlyData.reduce((acc, pt, idx) => {
                const x = (idx / 23) * 800;
                const y = 180 - (pt.solarGenerationKW / maxKW) * 160;
                return `${acc} ${idx === 0 ? 'M' : 'L'} ${x} ${y}`;
              }, '')}
              fill="none"
              stroke="#0284c7"
              strokeWidth="2.5"
            />

            {/* Building demand line (Crisp black line for contrast) */}
            <path
              d={hourlyData.reduce((acc, pt, idx) => {
                const x = (idx / 23) * 800;
                const totalD = pt.buildingDemandKW + pt.evDemandKW;
                const y = 180 - (totalD / maxKW) * 160;
                return `${acc} ${idx === 0 ? 'M' : 'L'} ${x} ${y}`;
              }, '')}
              fill="none"
              stroke="#000000"
              strokeWidth="2"
              strokeDasharray="4 3"
            />

            {/* Vertical cursor */}
            <line
              x1={(selectedHour / 23) * 800}
              y1="10"
              x2={(selectedHour / 23) * 800}
              y2="180"
              stroke="#0284c7"
              strokeWidth="2"
            />
          </svg>
        </div>

        {/* Time Slider */}
        <div style={{ marginTop: '10px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '11px' }}>
            <span style={{ color: 'var(--text-dark)' }}>
              Hour: <strong style={{ color: 'var(--blue-sky)' }}>{hourDataAtScrubber.hourLabel}</strong>
            </span>
            <div style={{ display: 'flex', gap: '14px' }}>
              <span style={{ color: 'var(--blue-sky)', fontWeight: 600 }}>
                Solar: {formatNumber(hourDataAtScrubber.solarGenerationKW)} kW
              </span>
              <span style={{ color: 'var(--text-pure-black)', fontWeight: 600 }}>
                Load: {formatNumber(hourDataAtScrubber.buildingDemandKW + hourDataAtScrubber.evDemandKW)} kW
              </span>
              <span style={{ color: 'var(--text-muted)' }}>
                Self-Consumed: {formatNumber(hourDataAtScrubber.selfConsumedKW)} kW
              </span>
            </div>
          </div>

          <input
            type="range"
            min={0}
            max={23}
            value={selectedHour}
            onChange={(e) => setSelectedHour(parseInt(e.target.value))}
          />
        </div>
      </div>

      {/* Side-by-Side Strategy Matrix Table */}
      <div className="glass-card" style={{ padding: '18px' }}>
        <h3
          style={{
            fontFamily: 'var(--font-heading)',
            fontSize: '15px',
            fontWeight: 800,
            color: 'var(--text-pure-black)',
            marginBottom: '4px',
          }}
        >
          Strategy Comparison Matrix
        </h3>
        <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '14px' }}>
          Evaluating investment outcomes: sheer physical size vs. high daytime self-consumption vs. EV mobility synergy.
        </p>

        <div style={{ overflowX: 'auto' }}>
          <table
            style={{
              width: '100%',
              borderCollapse: 'collapse',
              fontSize: '11.5px',
              textAlign: 'left',
            }}
          >
            <thead>
              <tr
                style={{
                  borderBottom: '1.5px solid var(--blue-border)',
                  color: 'var(--text-muted)',
                  fontSize: '10.5px',
                  textTransform: 'uppercase',
                }}
              >
                <th style={{ padding: '8px 10px' }}>Metric</th>
                <th style={{ padding: '8px 10px' }}>Strategy A: Max Rooftops</th>
                <th style={{ padding: '8px 10px', background: '#e0f2fe', color: '#0369a1', fontWeight: 700 }}>
                  Strategy B: High Daytime Demand
                </th>
                <th style={{ padding: '8px 10px' }}>Strategy C: Rooftop + EV Canopies</th>
                <th style={{ padding: '8px 10px' }}>Township Planning Assessment</th>
              </tr>
            </thead>
            <tbody>
              <tr style={{ borderBottom: '1px solid var(--border-card-subtle)' }}>
                <td style={{ padding: '10px', fontWeight: 700, color: 'var(--text-dark)' }}>
                  Installed Capacity
                </td>
                <td style={{ padding: '10px' }}>{formatNumber(metricsA.totalCapacityKWp)} kWp</td>
                <td style={{ padding: '10px', background: '#f0f9ff', color: 'var(--blue-sky)', fontWeight: 700 }}>
                  {formatNumber(metricsB.totalCapacityKWp)} kWp
                </td>
                <td style={{ padding: '10px' }}>{formatNumber(metricsC.totalCapacityKWp)} kWp</td>
                <td style={{ padding: '10px', fontSize: '11px', color: 'var(--text-muted)' }}>
                  Strategy A installs the largest system by including the large warehouse.
                </td>
              </tr>

              <tr style={{ borderBottom: '1px solid var(--border-card-subtle)' }}>
                <td style={{ padding: '10px', fontWeight: 700, color: 'var(--text-dark)' }}>
                  Self-Consumption Rate
                </td>
                <td style={{ padding: '10px' }}>{metricsA.selfConsumptionPct}%</td>
                <td style={{ padding: '10px', background: '#f0f9ff', color: 'var(--blue-sky)', fontWeight: 700 }}>
                  {metricsB.selfConsumptionPct}%
                </td>
                <td style={{ padding: '10px' }}>{metricsC.selfConsumptionPct}%</td>
                <td style={{ padding: '10px', fontSize: '11px', color: 'var(--text-charcoal)' }}>
                  Strategy B directly absorbs 91% on-site, displacing high retail electricity bills.
                </td>
              </tr>

              <tr style={{ borderBottom: '1px solid var(--border-card-subtle)' }}>
                <td style={{ padding: '10px', fontWeight: 700, color: 'var(--text-dark)' }}>
                  Annual Savings
                </td>
                <td style={{ padding: '10px' }}>{formatMYR(metricsA.annualCostSavingsMYR)}</td>
                <td style={{ padding: '10px', background: '#f0f9ff', color: 'var(--text-pure-black)', fontWeight: 700 }}>
                  {formatMYR(metricsB.annualCostSavingsMYR)}
                </td>
                <td style={{ padding: '10px' }}>{formatMYR(metricsC.annualCostSavingsMYR)}</td>
                <td style={{ padding: '10px', fontSize: '11px', color: 'var(--text-muted)' }}>
                  Offsets commercial tariff RM 0.465/kWh.
                </td>
              </tr>

              <tr style={{ borderBottom: '1px solid var(--border-card-subtle)' }}>
                <td style={{ padding: '10px', fontWeight: 700, color: 'var(--text-dark)' }}>
                  Estimated CapEx
                </td>
                <td style={{ padding: '10px' }}>{formatMYR(metricsA.estimatedCapExMYR)}</td>
                <td style={{ padding: '10px', background: '#f0f9ff', color: 'var(--blue-sky)', fontWeight: 700 }}>
                  {formatMYR(metricsB.estimatedCapExMYR)}
                </td>
                <td style={{ padding: '10px' }}>{formatMYR(metricsC.estimatedCapExMYR)}</td>
                <td style={{ padding: '10px', fontSize: '11px', color: 'var(--text-muted)' }}>
                  Strategy B requires ~43% lower initial capital commitment.
                </td>
              </tr>

              <tr style={{ borderBottom: '1px solid var(--border-card-subtle)' }}>
                <td style={{ padding: '10px', fontWeight: 700, color: 'var(--text-dark)' }}>
                  Simple Payback
                </td>
                <td style={{ padding: '10px' }}>{metricsA.simplePaybackYears} years</td>
                <td style={{ padding: '10px', background: '#f0f9ff', color: 'var(--blue-sky)', fontWeight: 800 }}>
                  {metricsB.simplePaybackYears} years
                </td>
                <td style={{ padding: '10px' }}>{metricsC.simplePaybackYears} years</td>
                <td style={{ padding: '10px', fontSize: '11px', color: 'var(--text-charcoal)' }}>
                  Strategy B achieves fastest financial break-even.
                </td>
              </tr>

              <tr>
                <td style={{ padding: '10px', fontWeight: 700, color: 'var(--text-dark)' }}>
                  EV Charging Infrastructure
                </td>
                <td style={{ padding: '10px', color: 'var(--text-muted)' }}>None</td>
                <td style={{ padding: '10px', background: '#f0f9ff', color: 'var(--text-muted)' }}>None</td>
                <td style={{ padding: '10px', color: 'var(--blue-sky)', fontWeight: 700 }}>
                  100 Bays ({formatNumber(metricsC.evKmPoweredPerYear)} km/yr)
                </td>
                <td style={{ padding: '10px', fontSize: '11px', color: 'var(--blue-sky)' }}>
                  Strategy C delivers shaded parking + clean EV travel.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Custom Site Selection Tray if Custom Strategy */}
      {activeScenario === 'custom' && (
        <div className="glass-card" style={{ padding: '18px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '14px', fontWeight: 700, color: 'var(--text-pure-black)' }}>
              Configure Portfolio ({customSelectedSiteIds.length} of 12 Sites Selected)
            </h3>
            <span style={{ fontSize: '11px', color: 'var(--blue-sky)', fontWeight: 600 }}>
              Select specific rooftops and car parks to simulate
            </span>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
              gap: '8px',
            }}
          >
            {allSites.map((site) => {
              const isChecked = customSelectedSiteIds.includes(site.id);
              return (
                <label
                  key={site.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '8px 10px',
                    background: isChecked ? '#e0f2fe' : '#ffffff',
                    border: `1px solid ${isChecked ? 'var(--blue-sky)' : 'var(--blue-border)'}`,
                    borderRadius: '6px',
                    cursor: 'pointer',
                    userSelect: 'none',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => onToggleCustomSite(site.id)}
                    style={{ accentColor: 'var(--blue-sky)' }}
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11.5px', fontWeight: 600 }}>
                      <span style={{ color: 'var(--text-dark)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {site.name}
                      </span>
                      <span style={{ color: 'var(--blue-sky)', fontWeight: 700 }}>
                        {site.estimatedKWp}kWp
                      </span>
                    </div>
                    <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                      {site.code} • {site.selfConsumptionPct}% self-use
                    </div>
                  </div>
                </label>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
