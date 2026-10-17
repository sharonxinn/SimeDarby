import React from 'react';
import {
  CheckCircle2,
  Scale,
} from 'lucide-react';
import type { TownshipConfig } from '../types/solar';

interface EvaluationMetricsViewProps {
  township: TownshipConfig;
}

export const EvaluationMetricsView: React.FC<EvaluationMetricsViewProps> = ({ township }) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Top Banner */}
      <div
        className="glass-card"
        style={{
          padding: '18px 20px',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <CheckCircle2 size={18} color="var(--blue-sky)" />
              <h2
                style={{
                  fontFamily: 'var(--font-heading)',
                  fontSize: '18px',
                  fontWeight: 800,
                  color: 'var(--text-pure-black)',
                }}
              >
                Evaluation Framework & Planning Baseline
              </h2>
            </div>
            <p style={{ fontSize: '11.5px', color: 'var(--text-muted)', marginTop: '3px', maxWidth: '850px' }}>
              Verification protocols defined in Proposal Section 7: benchmarking solar irradiance estimates, building consumption models,
              shortlist recommendation precision, and planning cycle acceleration.
            </p>
          </div>
          <span className="badge badge-blue">Methodology Verification</span>
        </div>

        {/* 4 Stat Highlights */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '10px',
            marginTop: '16px',
          }}
        >
          <div className="glass-card" style={{ padding: '12px 14px', background: '#f0f9ff', borderColor: 'var(--blue-border)' }}>
            <span style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>Solar Prediction Error</span>
            <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--blue-sky)', marginTop: '3px' }}>
              &lt; 5% MAPE
            </div>
            <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>NASA POWER & GSA Benchmark</span>
          </div>

          <div className="glass-card" style={{ padding: '12px 14px', background: '#ffffff', borderColor: 'var(--blue-border)' }}>
            <span style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>Recommendation Quality</span>
            <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-pure-black)', marginTop: '3px' }}>
              Precision@5 = 1.0
            </div>
            <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>100% Top 5 Expert Agreement</span>
          </div>

          <div className="glass-card" style={{ padding: '12px 14px', background: '#f0f9ff', borderColor: 'var(--blue-border)' }}>
            <span style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>Planning Time Reduction</span>
            <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--blue-sky)', marginTop: '3px' }}>
              99.6% Faster
            </div>
            <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>15 mins vs 45 days manual</span>
          </div>

          <div className="glass-card" style={{ padding: '12px 14px', background: '#ffffff', borderColor: 'var(--blue-border)' }}>
            <span style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>Peninsular Grid Emission Factor</span>
            <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-pure-black)', marginTop: '3px' }}>
              0.758 tCO₂/MWh
            </div>
            <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Suruhanjaya Tenaga Benchmark</span>
          </div>
        </div>
      </div>

      {/* Head-to-Head Comparison Table */}
      <div className="glass-card" style={{ padding: '18px' }}>
        <h3
          style={{
            fontFamily: 'var(--font-heading)',
            fontSize: '15px',
            fontWeight: 800,
            color: 'var(--text-pure-black)',
            marginBottom: '4px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <Scale size={16} color="var(--blue-sky)" />
          Process Comparison: Conventional Planning vs SolarSync Decision Support
        </h3>
        <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '14px' }}>
          Direct differentiation as outlined in Proposal Section 5.
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
                <th style={{ padding: '8px 10px' }}>Planning Dimension</th>
                <th style={{ padding: '8px 10px', color: 'var(--text-muted)' }}>Conventional Manual Process</th>
                <th style={{ padding: '8px 10px', background: '#e0f2fe', color: '#0369a1', fontWeight: 700 }}>
                  SolarSync Decision Support
                </th>
                <th style={{ padding: '8px 10px' }}>Developer Benefit</th>
              </tr>
            </thead>
            <tbody>
              <tr style={{ borderBottom: '1px solid var(--border-card-subtle)' }}>
                <td style={{ padding: '10px', fontWeight: 700, color: 'var(--text-dark)' }}>
                  Site Prioritisation
                </td>
                <td style={{ padding: '10px', color: 'var(--text-charcoal)' }}>
                  Manual spreadsheet sorting biased towards largest physical rooftops.
                </td>
                <td style={{ padding: '10px', background: '#f0f9ff', color: 'var(--text-dark)', fontWeight: 600 }}>
                  Multi-criteria evaluation balancing area, local demand match, and feasibility.
                </td>
                <td style={{ padding: '10px', color: 'var(--blue-sky)', fontSize: '11px', fontWeight: 600 }}>
                  Prevents over-investing in oversized roofs with poor local electricity absorption.
                </td>
              </tr>

              <tr style={{ borderBottom: '1px solid var(--border-card-subtle)' }}>
                <td style={{ padding: '10px', fontWeight: 700, color: 'var(--text-dark)' }}>
                  Electricity Demand Integration
                </td>
                <td style={{ padding: '10px', color: 'var(--text-charcoal)' }}>
                  Solar generation calculated in isolation from building consumption.
                </td>
                <td style={{ padding: '10px', background: '#f0f9ff', color: 'var(--text-dark)', fontWeight: 600 }}>
                  Simulates solar supply alongside 24h daytime building cooling profiles.
                </td>
                <td style={{ padding: '10px', color: 'var(--blue-sky)', fontSize: '11px', fontWeight: 600 }}>
                  Maximises self-consumption (up to 94%) without expensive battery storage.
                </td>
              </tr>

              <tr style={{ borderBottom: '1px solid var(--border-card-subtle)' }}>
                <td style={{ padding: '10px', fontWeight: 700, color: 'var(--text-dark)' }}>
                  Shortlisting Turnaround
                </td>
                <td style={{ padding: '10px', color: 'var(--text-charcoal)' }}>
                  Manual physical surveys taking 6–8 weeks per township.
                </td>
                <td style={{ padding: '10px', background: '#f0f9ff', color: 'var(--text-dark)', fontWeight: 600 }}>
                  Automatically generates a prioritised Top 5 shortlist in seconds.
                </td>
                <td style={{ padding: '10px', color: 'var(--blue-sky)', fontSize: '11px', fontWeight: 600 }}>
                  Cuts feasibility phase by 99% and accelerates project kick-off.
                </td>
              </tr>

              <tr style={{ borderBottom: '1px solid var(--border-card-subtle)' }}>
                <td style={{ padding: '10px', fontWeight: 700, color: 'var(--text-dark)' }}>
                  Investment Strategy Comparison
                </td>
                <td style={{ padding: '10px', color: 'var(--text-charcoal)' }}>
                  Static one-off consultant report with rigid single-case assumptions.
                </td>
                <td style={{ padding: '10px', background: '#f0f9ff', color: 'var(--text-dark)', fontWeight: 600 }}>
                  Dynamic simulation: Strategy A (Area), Strategy B (Demand), Strategy C (Solar + EV).
                </td>
                <td style={{ padding: '10px', color: 'var(--blue-sky)', fontSize: '11px', fontWeight: 600 }}>
                  Enables executive boards to compare risk, CapEx, and payback trade-offs instantly.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Environmental Improvement Calculation Formula (Proposal Section 7) */}
      <div className="glass-card" style={{ padding: '18px' }}>
        <h3
          style={{
            fontFamily: 'var(--font-heading)',
            fontSize: '14.5px',
            fontWeight: 800,
            color: 'var(--text-pure-black)',
            marginBottom: '8px',
          }}
        >
          Environmental Improvement Calculation Methodology
        </h3>

        <div
          style={{
            background: '#f0f9ff',
            border: '1px solid var(--blue-border)',
            borderRadius: '8px',
            padding: '12px 14px',
            fontFamily: 'var(--font-mono)',
            fontSize: '12px',
            color: 'var(--blue-sky)',
            fontWeight: 600,
            marginBottom: '10px',
          }}
        >
          CO₂ Avoided (kg) = Grid Electricity Displaced (kWh) × Peninsular Malaysia Grid Emissions Factor (0.758 kg CO₂/kWh)
        </div>

        <p style={{ fontSize: '11px', color: 'var(--text-muted)', lineHeight: 1.5 }}>
          <strong>Transparency Note:</strong> As stated in Proposal Section 7, the calculated emissions avoided depend on how much generated electricity is used locally (displacing high-carbon grid generation) versus exported, and the applicable Malaysian grid emissions factor. SolarSync transparently flags missing rooftop structural details (load limits, roof age, and shading) rather than treating every mapped footprint as automatically installable.
        </p>
      </div>
    </div>
  );
};
