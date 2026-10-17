import React, { useState } from 'react';
import { Header } from './components/Header';
import { NavigationTabs, TabKey } from './components/NavigationTabs';
import { SolarOpportunityMap } from './components/SolarOpportunityMap';
import { SiteRankingView } from './components/SiteRankingView';
import { ImpactSimulatorView } from './components/ImpactSimulatorView';
import { EVChargingPlannerView } from './components/EVChargingPlannerView';
import { EvaluationMetricsView } from './components/EvaluationMetricsView';
import { SiteDetailModal } from './components/SiteDetailModal';
import { ExecutiveReportModal } from './components/ExecutiveReportModal';
import {
  SIME_DARBY_TOWNSHIP,
  INITIAL_TOWNSHIP_SITES,
} from './data/townshipSites';
import {
  DEFAULT_MCDA_WEIGHTS,
  SCENARIO_DEFINITIONS,
  rankSites,
  calculateScenarioMetrics,
} from './utils/solarEngine';
import {
  SolarSite,
  ScenarioId,
  MCDAWeights,
} from './types/solar';

export function App() {
  const [activeTab, setActiveTab] = useState<TabKey>('map');
  const [activeScenario, setActiveScenario] = useState<ScenarioId>('B'); // Default to high daytime demand
  const [mcdaWeights, setMcdaWeights] = useState<MCDAWeights>(DEFAULT_MCDA_WEIGHTS);
  const [selectedSiteId, setSelectedSiteId] = useState<string>('ELM-COM-05');
  const [deepDiveSite, setDeepDiveSite] = useState<SolarSite | null>(null);
  const [isReportOpen, setIsReportOpen] = useState<boolean>(false);

  // Custom selection starts with Scenario B targets
  const [customSelectedSiteIds, setCustomSelectedSiteIds] = useState<string[]>([
    'ELM-COM-05',
    'ELM-COM-01',
    'ELM-UTL-10',
    'ELM-COM-09',
    'ELM-PUB-02',
  ]);

  // Dynamically ranked sites based on MCDA weights
  const rankedSites = rankSites(INITIAL_TOWNSHIP_SITES, mcdaWeights);
  const topFive = rankedSites.slice(0, 5);

  // Compute active metrics
  const activeTargetIds =
    activeScenario === 'A'
      ? SCENARIO_DEFINITIONS[0].targetSiteIds
      : activeScenario === 'B'
      ? SCENARIO_DEFINITIONS[1].targetSiteIds
      : activeScenario === 'C'
      ? SCENARIO_DEFINITIONS[2].targetSiteIds
      : customSelectedSiteIds;

  const activeMetrics = calculateScenarioMetrics(
    activeScenario,
    activeTargetIds,
    INITIAL_TOWNSHIP_SITES,
    SIME_DARBY_TOWNSHIP
  );

  const handleToggleCustomSite = (siteId: string) => {
    setCustomSelectedSiteIds((prev) =>
      prev.includes(siteId) ? prev.filter((id) => id !== siteId) : [...prev, siteId]
    );
  };

  const handleResetWeights = () => {
    setMcdaWeights(DEFAULT_MCDA_WEIGHTS);
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--bg-app-gradient)',
        color: 'var(--text-charcoal)',
      }}
    >
      {/* Top Header */}
      <Header
        township={SIME_DARBY_TOWNSHIP}
        activeScenario={activeScenario}
        onResetWeights={handleResetWeights}
        onOpenReport={() => setIsReportOpen(true)}
      />

      {/* Navigation Tabs */}
      <NavigationTabs
        activeTab={activeTab}
        onTabChange={setActiveTab}
        topSiteName={topFive[0]?.name || 'Temu Commercial Square Arcade'}
      />

      {/* Main Content Area */}
      <main
        style={{
          flex: 1,
          maxWidth: '1600px',
          width: '100%',
          margin: '0 auto',
          padding: '24px',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {activeTab === 'map' && (
          <SolarOpportunityMap
            sites={rankedSites}
            selectedSiteId={selectedSiteId}
            onSelectSite={setSelectedSiteId}
            onViewDeepDive={setDeepDiveSite}
            township={SIME_DARBY_TOWNSHIP}
          />
        )}

        {activeTab === 'ranking' && (
          <SiteRankingView
            rankedSites={rankedSites}
            weights={mcdaWeights}
            onWeightsChange={setMcdaWeights}
            onSelectSite={(id) => {
              setSelectedSiteId(id);
              setActiveTab('map');
            }}
            onViewDeepDive={setDeepDiveSite}
          />
        )}

        {activeTab === 'simulator' && (
          <ImpactSimulatorView
            allSites={rankedSites}
            activeScenario={activeScenario}
            onSelectScenario={setActiveScenario}
            customSelectedSiteIds={customSelectedSiteIds}
            onToggleCustomSite={handleToggleCustomSite}
            township={SIME_DARBY_TOWNSHIP}
          />
        )}

        {activeTab === 'ev' && (
          <EVChargingPlannerView
            allSites={rankedSites}
            township={SIME_DARBY_TOWNSHIP}
            onSelectSite={(id) => {
              setSelectedSiteId(id);
              setActiveTab('map');
            }}
            onViewDeepDive={setDeepDiveSite}
          />
        )}

        {activeTab === 'evaluation' && (
          <EvaluationMetricsView township={SIME_DARBY_TOWNSHIP} />
        )}
      </main>

      {/* Footer */}
      <footer
        style={{
          borderTop: '1px solid var(--blue-border)',
          background: '#ffffff',
          padding: '16px 24px',
          fontSize: '11.5px',
          color: 'var(--text-muted)',
          boxShadow: '0 -2px 10px rgba(2, 132, 199, 0.04)',
        }}
      >
        <div
          style={{
            maxWidth: '1600px',
            margin: '0 auto',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '12px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ color: 'var(--blue-sky)', fontWeight: 700 }}>SolarSync</span>
            <span>•</span>
            <span style={{ color: 'var(--text-charcoal)' }}>Township Solar Energy & Decarbonisation Planning</span>
            <span>•</span>
            <span style={{ color: 'var(--text-dark)', fontWeight: 600 }}>Sime Darby Property</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <span style={{ color: 'var(--text-muted)' }}>
              Malaysian Grid Emission Factor: <strong style={{ color: 'var(--text-dark)' }}>0.758 kg CO₂/kWh</strong>
            </span>
            <span
              className="badge"
              style={{
                background: 'var(--blue-pale)',
                color: 'var(--blue-sky)',
                border: '1px solid var(--blue-border)',
                fontSize: '10px',
              }}
            >
              Light Blue, Black & White
            </span>
          </div>
        </div>
      </footer>

      {/* Modals */}
      <SiteDetailModal
        site={deepDiveSite}
        onClose={() => setDeepDiveSite(null)}
        township={SIME_DARBY_TOWNSHIP}
      />

      <ExecutiveReportModal
        isOpen={isReportOpen}
        onClose={() => setIsReportOpen(false)}
        township={SIME_DARBY_TOWNSHIP}
        topFiveSites={topFive}
        metrics={activeMetrics}
      />
    </div>
  );
}

export default App;
