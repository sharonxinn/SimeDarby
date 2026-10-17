import React from 'react';
import { MapPin, SlidersHorizontal, BarChart3, Car, CheckCircle2 } from 'lucide-react';

export type TabKey = 'map' | 'ranking' | 'simulator' | 'ev' | 'evaluation';

interface NavigationTabsProps {
  activeTab: TabKey;
  onTabChange: (tab: TabKey) => void;
  topSiteName: string;
}

export const NavigationTabs: React.FC<NavigationTabsProps> = ({
  activeTab,
  onTabChange,
  topSiteName,
}) => {
  const tabs = [
    {
      id: 'map' as TabKey,
      label: 'Solar Opportunity Map',
      icon: MapPin,
      desc: 'Interactive Rooftops & Parking Areas',
    },
    {
      id: 'ranking' as TabKey,
      label: 'Site Prioritisation',
      icon: SlidersHorizontal,
      desc: `Scored Shortlist • Top: ${topSiteName.split(' ')[0]}`,
    },
    {
      id: 'simulator' as TabKey,
      label: 'Impact & Scenarios',
      icon: BarChart3,
      desc: 'Area vs Demand Match & 24h Curves',
    },
    {
      id: 'ev' as TabKey,
      label: 'EV Car Park Canopies',
      icon: Car,
      desc: 'Canopy Solar & Charging Bays',
    },
    {
      id: 'evaluation' as TabKey,
      label: 'Baseline & Methodology',
      icon: CheckCircle2,
      desc: 'Validation & Planning Speedup',
    },
  ];

  return (
    <div
      style={{
        background: '#ffffff',
        borderBottom: '1px solid var(--blue-border)',
        padding: '0 24px',
        boxShadow: '0 1px 3px rgba(2, 132, 199, 0.04)',
      }}
    >
      <div
        style={{
          maxWidth: '1600px',
          margin: '0 auto',
          display: 'flex',
          gap: '6px',
          overflowX: 'auto',
          scrollbarWidth: 'none',
        }}
      >
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '12px 16px',
                background: isActive ? '#e0f2fe' : 'transparent',
                color: isActive ? '#0369a1' : 'var(--text-muted)',
                border: 'none',
                borderBottom: isActive ? '2px solid var(--blue-sky)' : '2px solid transparent',
                borderRadius: '8px 8px 0 0',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                whiteSpace: 'nowrap',
              }}
              onMouseEnter={(e) => {
                if (!isActive) {
                  e.currentTarget.style.color = 'var(--text-dark)';
                  e.currentTarget.style.background = '#f0f9ff';
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  e.currentTarget.style.color = 'var(--text-muted)';
                  e.currentTarget.style.background = 'transparent';
                }
              }}
            >
              <div
                style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '6px',
                  background: isActive ? '#bae6fd' : '#f1f5f9',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: isActive ? '#0284c7' : 'var(--text-dim)',
                }}
              >
                <Icon size={14} />
              </div>

              <div style={{ textAlign: 'left' }}>
                <div
                  style={{
                    fontFamily: 'var(--font-sans)',
                    fontSize: '12.5px',
                    fontWeight: isActive ? 700 : 500,
                    color: isActive ? 'var(--text-dark)' : 'inherit',
                  }}
                >
                  {tab.label}
                </div>
                <div
                  style={{
                    fontSize: '10.5px',
                    color: isActive ? '#0284c7' : 'var(--text-muted)',
                  }}
                >
                  {tab.desc}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
