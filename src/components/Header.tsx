import React from 'react';
import { Sun, Zap, FileText, RotateCcw, MapPin, Building2 } from 'lucide-react';
import type { TownshipConfig, ScenarioId } from '../types/solar';

interface HeaderProps {
  township: TownshipConfig;
  activeScenario: ScenarioId;
  onResetWeights: () => void;
  onOpenReport: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  township,
  activeScenario,
  onResetWeights,
  onOpenReport,
}) => {
  return (
    <header
      style={{
        background: '#ffffff',
        borderBottom: '1px solid var(--blue-border)',
        boxShadow: '0 2px 10px rgba(2, 132, 199, 0.06)',
        position: 'sticky',
        top: 0,
        zIndex: 1000,
        padding: '12px 24px',
      }}
    >
      <div
        style={{
          maxWidth: '1600px',
          margin: '0 auto',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '16px',
        }}
      >
        {/* Township Brand & Project Identification */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              width: '38px',
              height: '38px',
              borderRadius: '9px',
              background: 'var(--blue-pale)',
              border: '1px solid var(--blue-border-strong)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--blue-sky)',
            }}
          >
            <Sun size={20} />
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span
                style={{
                  fontFamily: 'var(--font-heading)',
                  fontSize: '18px',
                  fontWeight: 800,
                  letterSpacing: '-0.3px',
                  color: 'var(--text-pure-black)',
                }}
              >
                SolarSync
              </span>
              <span
                style={{
                  color: 'var(--blue-border-strong)',
                  fontWeight: 300,
                }}
              >
                /
              </span>
              <span
                style={{
                  fontSize: '13px',
                  fontWeight: 600,
                  color: 'var(--blue-sky)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                <MapPin size={13} /> {township.name}
              </span>
            </div>
            <p
              style={{
                fontSize: '11px',
                color: 'var(--text-muted)',
                letterSpacing: '0.1px',
                marginTop: '1px',
              }}
            >
              {township.developer} • Township Renewable Energy & Decarbonisation Planner
            </p>
          </div>
        </div>

        {/* Natural Township Metrics Bar */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '14px',
            background: 'var(--bg-app)',
            padding: '6px 14px',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--blue-border)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Portfolio:</span>
            <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-dark)' }}>
              12 Sites (7.2 MWp)
            </span>
          </div>

          <div style={{ width: '1px', height: '14px', background: 'var(--blue-border)' }} />

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Grid Factor:</span>
            <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--blue-sky)' }}>
              {township.gridEmissionFactor} kg CO₂/kWh
            </span>
          </div>

          <div style={{ width: '1px', height: '14px', background: 'var(--border-card)' }} />

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Strategy:</span>
            <span
              className="badge badge-blue"
              style={{ fontSize: '10.5px', padding: '2px 8px' }}
            >
              {activeScenario === 'A'
                ? 'Max Area'
                : activeScenario === 'B'
                ? 'High Daytime Match'
                : activeScenario === 'C'
                ? 'Rooftop + EV Canopies'
                : 'Custom Selection'}
            </span>
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            onClick={onResetWeights}
            className="btn btn-secondary"
            title="Reset prioritization weights to default"
          >
            <RotateCcw size={13} />
            Reset Weights
          </button>

          <button
            onClick={onOpenReport}
            className="btn btn-primary"
          >
            <FileText size={13} />
            Feasibility Summary
          </button>
        </div>
      </div>
    </header>
  );
};
