import React from 'react';
import {
  X,
  Zap,
} from 'lucide-react';
import type { SolarSite, TownshipConfig } from '../types/solar';
import { formatNumber, formatMYR } from '../utils/solarEngine';

interface SiteDetailModalProps {
  site: SolarSite | null;
  onClose: () => void;
  township: TownshipConfig;
}

export const SiteDetailModal: React.FC<SiteDetailModalProps> = ({
  site,
  onClose,
  township,
}) => {
  if (!site) return null;

  const annualSavings = Math.round(
    site.annualGenerationKWh *
      (site.selfConsumptionPct / 100) *
      township.tariffCommercialMYR +
      site.annualGenerationKWh *
        (1 - site.selfConsumptionPct / 100) *
        township.exportTariffMYR
  );

  const annualAvoidedCO2 = Math.round(
    ((site.annualGenerationKWh * (site.selfConsumptionPct / 100)) / 1000) *
      township.gridEmissionFactor
  );

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 2000,
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
          maxWidth: '850px',
          maxHeight: '90vh',
          overflowY: 'auto',
          padding: '24px',
          borderColor: 'var(--blue-border)',
          background: '#ffffff',
          boxShadow: 'var(--shadow-lg)',
          display: 'flex',
          flexDirection: 'column',
          gap: '18px',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span className="badge badge-rank">{site.code}</span>
              <span className="badge badge-blue">{site.category}</span>
              <span className="badge badge-white">{site.zone}</span>
            </div>
            <h2
              style={{
                fontFamily: 'var(--font-heading)',
                fontSize: '20px',
                fontWeight: 800,
                color: 'var(--text-pure-black)',
                marginTop: '6px',
              }}
            >
              {site.name}
            </h2>
            <p style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>
              Geospatial Coordinates: [{site.coordinates[0].toFixed(5)}, {site.coordinates[1].toFixed(5)}] • {township.name}
            </p>
          </div>

          <button
            onClick={onClose}
            className="btn btn-ghost"
            style={{ padding: '6px', borderRadius: '50%' }}
          >
            <X size={18} />
          </button>
        </div>

        {/* 4 Stat Cards */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: '10px',
          }}
        >
          <div className="glass-card" style={{ padding: '12px', background: '#f0f9ff', borderColor: 'var(--blue-border)' }}>
            <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>System Capacity</span>
            <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--blue-sky)', marginTop: '2px' }}>
              {site.estimatedKWp} kWp
            </div>
            <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{formatNumber(site.usableAreaSqM)} m² usable</span>
          </div>

          <div className="glass-card" style={{ padding: '12px', background: '#f0f9ff', borderColor: 'var(--blue-border)' }}>
            <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Annual Yield</span>
            <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-pure-black)', marginTop: '2px' }}>
              {Math.round(site.annualGenerationKWh / 1000)} MWh
            </div>
            <span style={{ fontSize: '10px', color: 'var(--blue-sky)' }}>{site.solarGHIKWhM2Year} GHI</span>
          </div>

          <div className="glass-card" style={{ padding: '12px', background: '#f0f9ff', borderColor: 'var(--blue-border)' }}>
            <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Self-Consumption</span>
            <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--blue-sky)', marginTop: '2px' }}>
              {site.selfConsumptionPct}%
            </div>
            <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Daytime match {Math.round(site.daytimeDemandRatio * 100)}%</span>
          </div>

          <div className="glass-card" style={{ padding: '12px', background: '#f0f9ff', borderColor: 'var(--blue-border)' }}>
            <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Annual Value</span>
            <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-pure-black)', marginTop: '2px' }}>
              {formatMYR(annualSavings)}
            </div>
            <span style={{ fontSize: '10px', color: 'var(--blue-sky)' }}>~{annualAvoidedCO2} tCO₂ avoided</span>
          </div>
        </div>

        {/* Planning Rationale Box */}
        <div
          style={{
            background: '#f0f9ff',
            border: '1px solid var(--blue-border)',
            borderRadius: '8px',
            padding: '12px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
            <Zap size={13} color="var(--blue-sky)" />
            <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--blue-sky)', textTransform: 'uppercase' }}>
              Planning Assessment Rationale
            </span>
          </div>
          <p style={{ fontSize: '11.5px', color: 'var(--text-charcoal)', lineHeight: 1.5 }}>
            {site.aiRecommendationRationale}
          </p>
        </div>

        {/* Engineering Pre-Feasibility Checklist */}
        <div className="glass-card" style={{ padding: '16px' }}>
          <h4 style={{ fontFamily: 'var(--font-heading)', fontSize: '13.5px', fontWeight: 800, color: 'var(--text-pure-black)', marginBottom: '10px' }}>
            Pre-Feasibility Engineering & Missing Information Checklist
          </h4>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px', fontSize: '11.5px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 8px', background: '#f8fafc', borderRadius: '6px', border: '1px solid var(--blue-border)' }}>
              <span style={{ color: 'var(--text-muted)' }}>Roof Condition:</span>
              <span style={{ color: 'var(--blue-sky)', fontWeight: 600 }}>{site.roofCondition}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 8px', background: '#f8fafc', borderRadius: '6px', border: '1px solid var(--blue-border)' }}>
              <span style={{ color: 'var(--text-muted)' }}>Structural Suitability:</span>
              <span style={{ color: 'var(--text-dark)', fontWeight: 600 }}>{site.structuralSuitability}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 8px', background: '#f8fafc', borderRadius: '6px', border: '1px solid var(--blue-border)' }}>
              <span style={{ color: 'var(--text-muted)' }}>Shading Factor:</span>
              <span style={{ color: 'var(--blue-sky)', fontWeight: 600 }}>{site.shadingFactorPct}%</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 8px', background: '#f8fafc', borderRadius: '6px', border: '1px solid var(--blue-border)' }}>
              <span style={{ color: 'var(--text-muted)' }}>Substation Proximity:</span>
              <span style={{ color: 'var(--text-dark)', fontWeight: 600 }}>{site.substationDistanceM} meters</span>
            </div>
          </div>

          {/* Notes */}
          <div style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {site.flags.notes.map((n, i) => (
              <div key={i} style={{ display: 'flex', gap: '6px', fontSize: '11px', color: 'var(--text-charcoal)' }}>
                <span style={{ color: 'var(--blue-sky)' }}>•</span>
                <span>{n}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Action */}
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button onClick={onClose} className="btn btn-primary" style={{ padding: '7px 20px' }}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
