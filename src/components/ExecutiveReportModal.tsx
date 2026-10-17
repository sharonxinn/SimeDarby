import React from 'react';
import {
  X,
  Printer,
  FileText,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import type { SolarSite, TownshipConfig, ScenarioMetrics } from '../types/solar';
import { formatNumber, formatMYR } from '../utils/solarEngine';

interface ExecutiveReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  township: TownshipConfig;
  topFiveSites: SolarSite[];
  metrics: ScenarioMetrics;
}

export const ExecutiveReportModal: React.FC<ExecutiveReportModalProps> = ({
  isOpen,
  onClose,
  township,
  topFiveSites,
  metrics,
}) => {
  if (!isOpen) return null;

  const handlePrint = () => {
    confetti({
      particleCount: 50,
      spread: 60,
      origin: { y: 0.6 },
      colors: ['#0284c7', '#38bdf8', '#bae6fd', '#ffffff'],
    });

    setTimeout(() => {
      window.print();
    }, 400);
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 2500,
        background: 'rgba(9, 13, 22, 0.65)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        animation: 'naturalFadeIn 0.2s ease',
      }}
      onClick={onClose}
    >
      <div
        className="glass-card"
        style={{
          width: '100%',
          maxWidth: '920px',
          maxHeight: '92vh',
          overflowY: 'auto',
          padding: '28px',
          borderColor: 'var(--blue-border)',
          background: '#ffffff',
          color: 'var(--text-dark)',
          boxShadow: 'var(--shadow-lg)',
          display: 'flex',
          flexDirection: 'column',
          gap: '20px',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Actions */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span className="badge badge-blue">Official Pre-Feasibility Brief</span>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
              Ref: SD-SOLAR-2026-ELM
            </span>
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={handlePrint}
              className="btn btn-primary"
              style={{ fontSize: '12px', padding: '6px 14px' }}
            >
              <Printer size={13} />
              Print / Save as PDF
            </button>
            <button
              onClick={onClose}
              className="btn btn-ghost"
              style={{ padding: '6px', borderRadius: '50%' }}
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Report Content */}
        <div
          id="printable-report"
          style={{
            background: '#ffffff',
            border: '1.5px solid var(--blue-border)',
            borderRadius: '10px',
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '18px',
          }}
        >
          {/* Letterhead */}
          <div
            style={{
              borderBottom: '2px solid var(--blue-sky)',
              paddingBottom: '14px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-end',
            }}
          >
            <div>
              <div
                style={{
                  fontSize: '11px',
                  fontWeight: 800,
                  color: 'var(--blue-sky)',
                  letterSpacing: '1.2px',
                  textTransform: 'uppercase',
                }}
              >
                {township.developer}
              </div>
              <h1
                style={{
                  fontFamily: 'var(--font-heading)',
                  fontSize: '20px',
                  fontWeight: 900,
                  color: 'var(--text-pure-black)',
                  marginTop: '4px',
                }}
              >
                SolarSync — Township Solar & Decarbonisation Brief
              </h1>
              <p style={{ fontSize: '11.5px', color: 'var(--text-muted)', marginTop: '2px' }}>
                Asset: {township.name} ({township.location})
              </p>
            </div>

            <div style={{ textAlign: 'right', fontSize: '11px', color: 'var(--text-muted)' }}>
              <div>Strategy: <strong style={{ color: 'var(--text-dark)' }}>{metrics.scenarioName}</strong></div>
              <div>Grid Factor: <strong style={{ color: 'var(--text-dark)' }}>0.758 tCO₂/MWh</strong></div>
              <div>Status: <strong style={{ color: 'var(--blue-sky)' }}>Pre-Feasibility Evaluation</strong></div>
            </div>
          </div>

          {/* Executive Overview */}
          <div>
            <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '14px', fontWeight: 800, color: 'var(--text-pure-black)', marginBottom: '5px' }}>
              1. Executive Summary & Strategic Rationale
            </h3>
            <p style={{ fontSize: '11.5px', color: 'var(--text-charcoal)', lineHeight: 1.6 }}>
              This pre-feasibility assessment synthesises geospatial building cadastre data, satellite solar irradiance benchmarks
              (Global Solar Atlas), and 24-hour diurnal building load profiles across <strong>{township.name}</strong>.
              Unlike conventional solar models that bias strictly toward the largest physical rooftops, the SolarSync decision framework
              prioritises high daytime electricity consumption matches (e.g. retail arcades, commercial clinics, and utility baseloads),
              achieving an optimal <strong>{metrics.selfConsumptionPct}% self-consumption rate</strong> and accelerating capital payback to{' '}
              <strong>{metrics.simplePaybackYears} years</strong> without requiring expensive battery storage systems.
            </p>
          </div>

          {/* Metrics Grid */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: '10px',
            }}
          >
            <div style={{ background: '#f0f9ff', padding: '12px', borderRadius: '8px', border: '1px solid var(--blue-border)' }}>
              <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Solar Capacity</span>
              <div style={{ fontSize: '17px', fontWeight: 800, color: 'var(--text-pure-black)' }}>
                {formatNumber(metrics.totalCapacityKWp)} kWp
              </div>
              <span style={{ fontSize: '10px', color: 'var(--blue-sky)' }}>{formatNumber(metrics.totalUsableAreaSqM)} m² area</span>
            </div>

            <div style={{ background: '#f0f9ff', padding: '12px', borderRadius: '8px', border: '1px solid var(--blue-border)' }}>
              <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Annual Output</span>
              <div style={{ fontSize: '17px', fontWeight: 800, color: 'var(--text-pure-black)' }}>
                {formatNumber(metrics.annualSolarGenerationMWh)} MWh
              </div>
              <span style={{ fontSize: '10px', color: 'var(--blue-sky)' }}>{metrics.selfConsumptionPct}% on-site offset</span>
            </div>

            <div style={{ background: '#f0f9ff', padding: '12px', borderRadius: '8px', border: '1px solid var(--blue-border)' }}>
              <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Avoided Carbon</span>
              <div style={{ fontSize: '17px', fontWeight: 800, color: 'var(--blue-sky)' }}>
                {formatNumber(metrics.avoidedCO2Tonnes)} tCO₂/yr
              </div>
              <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>0.758 tCO₂/MWh factor</span>
            </div>

            <div style={{ background: '#f0f9ff', padding: '12px', borderRadius: '8px', border: '1px solid var(--blue-border)' }}>
              <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Annual Utility Savings</span>
              <div style={{ fontSize: '17px', fontWeight: 800, color: 'var(--text-pure-black)' }}>
                {formatMYR(metrics.annualCostSavingsMYR)}
              </div>
              <span style={{ fontSize: '10px', color: 'var(--blue-sky)' }}>Payback {metrics.simplePaybackYears} yrs</span>
            </div>
          </div>

          {/* Top 5 Prioritised Sites Table */}
          <div>
            <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '14px', fontWeight: 800, color: 'var(--text-pure-black)', marginBottom: '8px' }}>
              2. Recommended Top Five Candidate Sites for Detailed Engineering Sign-Off
            </h3>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1.5px solid var(--blue-border)', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                  <th style={{ padding: '6px' }}>Rank</th>
                  <th style={{ padding: '6px' }}>Site Asset</th>
                  <th style={{ padding: '6px' }}>Category</th>
                  <th style={{ padding: '6px' }}>Capacity</th>
                  <th style={{ padding: '6px' }}>Self-Use</th>
                  <th style={{ padding: '6px' }}>Score</th>
                  <th style={{ padding: '6px' }}>Strategic Rationale</th>
                </tr>
              </thead>
              <tbody>
                {topFiveSites.map((site, idx) => (
                  <tr key={site.id} style={{ borderBottom: '1px solid var(--border-card-subtle)' }}>
                    <td style={{ padding: '8px 6px', fontWeight: 700, color: 'var(--blue-sky)' }}>
                      #{idx + 1}
                    </td>
                    <td style={{ padding: '8px 6px', fontWeight: 700, color: 'var(--text-dark)' }}>
                      {site.name} ({site.code})
                    </td>
                    <td style={{ padding: '8px 6px', color: 'var(--text-muted)' }}>
                      {site.category}
                    </td>
                    <td style={{ padding: '8px 6px', color: 'var(--blue-sky)', fontWeight: 600 }}>
                      {site.estimatedKWp} kWp
                    </td>
                    <td style={{ padding: '8px 6px', fontWeight: 600, color: 'var(--text-dark)' }}>
                      {site.selfConsumptionPct}%
                    </td>
                    <td style={{ padding: '8px 6px', fontWeight: 800, color: 'var(--blue-sky)' }}>
                      {site.scores.totalCompositeScore}
                    </td>
                    <td style={{ padding: '8px 6px', color: 'var(--text-charcoal)', fontSize: '10.5px' }}>
                      {site.aiRecommendationRationale}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Section 9 Limitations & Footnote */}
          <div
            style={{
              background: '#f8fafc',
              border: '1px solid var(--blue-border)',
              borderRadius: '6px',
              padding: '10px 12px',
              fontSize: '10px',
              color: 'var(--text-muted)',
              lineHeight: 1.5,
            }}
          >
            <strong>Engineering Governance & Limitations (Proposal Section 9):</strong> Building footprints alone do not establish roof structural load carrying capacity, actual micro-shading, or TNB interconnection approval. Prior to capital deployment, structural load audits (minimum 15 kg/m² for ballasted PV arrays) and TNB NEM 3.0 / CGPP quota applications must be completed.
          </div>
        </div>

        {/* Modal Footer */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
            SolarSync • Developed for Sime Darby Property Township Renewable Planning
          </span>
          <button onClick={onClose} className="btn btn-secondary" style={{ padding: '6px 16px' }}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
