import React from 'react';
import {
  SlidersHorizontal,
  Building2,
  Car,
  ArrowRight,
} from 'lucide-react';
import type { SolarSite, MCDAWeights } from '../types/solar';
import { formatNumber } from '../utils/solarEngine';

interface SiteRankingViewProps {
  rankedSites: SolarSite[];
  weights: MCDAWeights;
  onWeightsChange: (weights: MCDAWeights) => void;
  onSelectSite: (siteId: string) => void;
  onViewDeepDive: (site: SolarSite) => void;
}

export const SiteRankingView: React.FC<SiteRankingViewProps> = ({
  rankedSites,
  weights,
  onWeightsChange,
  onSelectSite,
  onViewDeepDive,
}) => {
  const topFive = rankedSites.slice(0, 5);

  const handleSliderChange = (key: keyof MCDAWeights, val: number) => {
    onWeightsChange({
      ...weights,
      [key]: val,
    });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Criteria Weight Tuning Card */}
      <div
        className="glass-card"
        style={{
          padding: '18px 20px',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <SlidersHorizontal size={18} color="var(--blue-sky)" />
              <h2
                style={{
                  fontFamily: 'var(--font-heading)',
                  fontSize: '18px',
                  fontWeight: 800,
                  color: 'var(--text-pure-black)',
                }}
              >
                Multi-Criteria Site Prioritisation
              </h2>
            </div>
            <p
              style={{
                fontSize: '11.5px',
                color: 'var(--text-muted)',
                marginTop: '3px',
                maxWidth: '850px',
              }}
            >
              Adjust criteria weights to reflect township development priorities. SolarSync balances gross solar generation against{' '}
              <strong>daytime electricity demand matching</strong> (maximizing direct local self-consumption), structural readiness, and EV canopy integration.
            </p>
          </div>

          <span className="badge badge-blue">Weighted Evaluation Model</span>
        </div>

        {/* Sliders Grid */}
        <div
          style={{
            marginTop: '16px',
            paddingTop: '14px',
            borderTop: '1px solid var(--blue-border)',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '14px',
          }}
        >
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px', fontSize: '11px' }}>
              <span style={{ color: 'var(--text-dark)', fontWeight: 600 }}>Solar Generation Potential</span>
              <span style={{ color: 'var(--blue-sky)', fontWeight: 700 }}>{weights.generation}%</span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              value={weights.generation}
              onChange={(e) => handleSliderChange('generation', parseInt(e.target.value))}
            />
            <span style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '3px', display: 'block' }}>
              Favors larger square meter areas
            </span>
          </div>

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px', fontSize: '11px' }}>
              <span style={{ color: 'var(--text-dark)', fontWeight: 600 }}>Daytime Demand Match</span>
              <span style={{ color: 'var(--blue-sky)', fontWeight: 700 }}>{weights.demandMatch}%</span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              value={weights.demandMatch}
              onChange={(e) => handleSliderChange('demandMatch', parseInt(e.target.value))}
            />
            <span style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '3px', display: 'block' }}>
              Favors 8am–6pm high cooling loads
            </span>
          </div>

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px', fontSize: '11px' }}>
              <span style={{ color: 'var(--text-dark)', fontWeight: 600 }}>Structural Readiness</span>
              <span style={{ color: 'var(--blue-sky)', fontWeight: 700 }}>{weights.feasibility}%</span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              value={weights.feasibility}
              onChange={(e) => handleSliderChange('feasibility', parseInt(e.target.value))}
            />
            <span style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '3px', display: 'block' }}>
              Favors concrete slab & substation proximity
            </span>
          </div>

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px', fontSize: '11px' }}>
              <span style={{ color: 'var(--text-dark)', fontWeight: 600 }}>Carbon Displacement</span>
              <span style={{ color: 'var(--blue-sky)', fontWeight: 700 }}>{weights.environmental}%</span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              value={weights.environmental}
              onChange={(e) => handleSliderChange('environmental', parseInt(e.target.value))}
            />
            <span style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '3px', display: 'block' }}>
              Peninsular grid emission factor offset
            </span>
          </div>

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px', fontSize: '11px' }}>
              <span style={{ color: 'var(--text-dark)', fontWeight: 600 }}>EV Canopy Synergy</span>
              <span style={{ color: 'var(--blue-sky)', fontWeight: 700 }}>{weights.evSynergy}%</span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              value={weights.evSynergy}
              onChange={(e) => handleSliderChange('evSynergy', parseInt(e.target.value))}
            />
            <span style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '3px', display: 'block' }}>
              Car park canopy & EV charger bays
            </span>
          </div>
        </div>
      </div>

      {/* Top 5 Prioritised Sites Cards */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
          <h3
            style={{
              fontFamily: 'var(--font-heading)',
              fontSize: '15px',
              fontWeight: 800,
              color: 'var(--text-pure-black)',
            }}
          >
            Recommended Top Five Sites for Detailed Engineering Assessment
          </h3>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
            Rank dynamically updates as criteria shift
          </span>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '12px',
          }}
        >
          {topFive.map((site, index) => {
            const rank = index + 1;
            const isFirst = rank === 1;

            return (
              <div
                key={site.id}
                onClick={() => onSelectSite(site.id)}
                className="glass-card glass-card-interactive"
                style={{
                  padding: '16px',
                  borderColor: isFirst ? 'var(--blue-sky)' : 'var(--blue-border)',
                  background: isFirst ? '#f0f9ff' : '#ffffff',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px',
                }}
              >
                {/* Header Rank Badge */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div
                      style={{
                        width: '26px',
                        height: '26px',
                        borderRadius: '6px',
                        background: isFirst ? 'var(--blue-sky)' : '#e0f2fe',
                        color: isFirst ? '#ffffff' : '#0284c7',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 800,
                        fontSize: '12px',
                        fontFamily: 'var(--font-heading)',
                        border: `1px solid ${isFirst ? 'var(--blue-bright)' : 'var(--blue-border)'}`,
                      }}
                    >
                      #{rank}
                    </div>
                    <span className="badge badge-white" style={{ fontSize: '9.5px', background: '#f8fafc' }}>
                      {site.code}
                    </span>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <span
                      style={{
                        fontSize: '16px',
                        fontWeight: 800,
                        color: isFirst ? 'var(--blue-sky)' : 'var(--text-pure-black)',
                      }}
                    >
                      {site.scores.totalCompositeScore}
                    </span>
                    <span style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}> / 100</span>
                  </div>
                </div>

                {/* Site Title */}
                <div>
                  <h4
                    style={{
                      fontSize: '13.5px',
                      fontWeight: 700,
                      color: 'var(--text-dark)',
                      lineHeight: 1.3,
                    }}
                  >
                    {site.name}
                  </h4>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '5px',
                      marginTop: '3px',
                      fontSize: '11px',
                      color: 'var(--text-muted)',
                    }}
                  >
                    {site.type === 'carpark' ? <Car size={11} color="var(--blue-sky)" /> : <Building2 size={11} color="var(--blue-sky)" />}
                    <span>{site.category}</span>
                    <span>•</span>
                    <span>{site.zone}</span>
                  </div>
                </div>

                {/* Metrics Breakdown */}
                <div
                  style={{
                    background: isFirst ? '#ffffff' : '#f8fafc',
                    border: '1px solid var(--blue-border)',
                    borderRadius: '6px',
                    padding: '8px 10px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px',
                    fontSize: '11px',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Demand Match:</span>
                    <span style={{ color: 'var(--blue-sky)', fontWeight: 600 }}>
                      {site.selfConsumptionPct}% on-site use
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Solar Output:</span>
                    <span style={{ color: 'var(--text-dark)', fontWeight: 600 }}>
                      {site.estimatedKWp} kWp ({formatNumber(site.usableAreaSqM)} m²)
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Avoided CO₂:</span>
                    <span style={{ color: 'var(--blue-sky)', fontWeight: 600 }}>
                      ~{Math.round((site.annualGenerationKWh * (site.selfConsumptionPct / 100) * 0.758) / 1000)} tCO₂/yr
                    </span>
                  </div>
                </div>

                {/* Rationale */}
                <p
                  style={{
                    fontSize: '11px',
                    color: 'var(--text-charcoal)',
                    lineHeight: 1.45,
                    minHeight: '44px',
                  }}
                >
                  {site.aiRecommendationRationale}
                </p>

                {/* Action Link */}
                <div style={{ marginTop: 'auto', paddingTop: '6px', borderTop: '1px solid var(--blue-border)' }}>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onViewDeepDive(site);
                    }}
                    className="btn btn-ghost"
                    style={{ width: '100%', fontSize: '11px', padding: '3px' }}
                  >
                    View Engineering Sheet <ArrowRight size={11} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Cadastre Table for All 12 Sites */}
      <div className="glass-card" style={{ padding: '18px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <div>
            <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '15px', fontWeight: 800, color: 'var(--text-pure-black)' }}>
              Township Solar Candidate Cadastre (All 12 Sites)
            </h3>
            <p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
              Rooftops and car parks evaluated across Elmina East, Central Core, and West Residential
            </p>
          </div>
          <span className="badge badge-blue">12 Sites Evaluated</span>
        </div>

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
                  letterSpacing: '0.3px',
                }}
              >
                <th style={{ padding: '8px 10px' }}>Rank</th>
                <th style={{ padding: '8px 10px' }}>Site Name & Code</th>
                <th style={{ padding: '8px 10px' }}>Category</th>
                <th style={{ padding: '8px 10px' }}>Usable Area</th>
                <th style={{ padding: '8px 10px' }}>Capacity</th>
                <th style={{ padding: '8px 10px' }}>Self-Consumption</th>
                <th style={{ padding: '8px 10px' }}>Roof Readiness</th>
                <th style={{ padding: '8px 10px' }}>Score</th>
                <th style={{ padding: '8px 10px', textAlign: 'right' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {rankedSites.map((site, index) => {
                const rank = index + 1;
                const isTopFive = rank <= 5;

                return (
                  <tr
                    key={site.id}
                    onClick={() => onSelectSite(site.id)}
                    style={{
                      borderBottom: '1px solid var(--border-card-subtle)',
                      cursor: 'pointer',
                      background: isTopFive ? 'rgba(224, 242, 254, 0.3)' : 'transparent',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = '#f0f9ff')}
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.background = isTopFive
                        ? 'rgba(224, 242, 254, 0.3)'
                        : 'transparent')
                    }
                  >
                    <td style={{ padding: '10px' }}>
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          width: '20px',
                          height: '20px',
                          borderRadius: '4px',
                          background: isTopFive ? '#bae6fd' : '#f1f5f9',
                          color: isTopFive ? '#0369a1' : 'var(--text-muted)',
                          fontWeight: 700,
                          fontSize: '10.5px',
                        }}
                      >
                        {rank}
                      </span>
                    </td>

                    <td style={{ padding: '10px' }}>
                      <div style={{ fontWeight: 700, color: 'var(--text-dark)' }}>{site.name}</div>
                      <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{site.code} • {site.zone}</div>
                    </td>

                    <td style={{ padding: '10px' }}>
                      <span className="badge badge-white" style={{ fontSize: '9.5px', background: '#f8fafc' }}>
                        {site.category}
                      </span>
                    </td>

                    <td style={{ padding: '10px', color: 'var(--text-charcoal)' }}>
                      {formatNumber(site.usableAreaSqM)} m²
                    </td>

                    <td style={{ padding: '10px', color: 'var(--blue-sky)', fontWeight: 700 }}>
                      {site.estimatedKWp} kWp
                    </td>

                    <td style={{ padding: '10px' }}>
                      <span style={{ fontWeight: 700, color: 'var(--text-dark)' }}>
                        {site.selfConsumptionPct}%
                      </span>
                      <span style={{ fontSize: '10px', color: 'var(--text-muted)', marginLeft: '4px' }}>
                        ({(site.daytimeDemandRatio * 100).toFixed(0)}% daytime)
                      </span>
                    </td>

                    <td style={{ padding: '10px', color: 'var(--text-charcoal)' }}>
                      {site.roofCondition}
                    </td>

                    <td style={{ padding: '10px' }}>
                      <span
                        style={{
                          fontWeight: 800,
                          color: isTopFive ? 'var(--blue-sky)' : 'var(--text-dark)',
                        }}
                      >
                        {site.scores.totalCompositeScore}
                      </span>
                    </td>

                    <td style={{ padding: '10px', textAlign: 'right' }}>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onViewDeepDive(site);
                        }}
                        className="btn btn-secondary"
                        style={{ fontSize: '10.5px', padding: '2px 8px' }}
                      >
                        Details
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
