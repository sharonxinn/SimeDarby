import React, { useEffect, useState } from 'react';
import { Header } from './components/Header';
import { NavigationTabs, type TabKey } from './components/NavigationTabs';
import { SolarOpportunityMap } from './components/SolarOpportunityMap';
import { SitePlanView } from './components/SitePlanView';
import { EvaluationMetricsView } from './components/EvaluationMetricsView';
import type { RoofAssessment } from './types/roof';
import { roofApi } from './api/roofClient';

export default function App() {
  const [activeTab, setActiveTab] = useState<TabKey>('map');
  const [visitedPages, setVisitedPages] = useState(new Set<TabKey>(['map']));
  const [assessment, setAssessment] = useState<RoofAssessment | null>(null);
  const [online, setOnline] = useState(false);
  const [checked, setChecked] = useState(false);
  function changePage(page: TabKey) { setActiveTab(page); setVisitedPages(previous => new Set([...previous, page])); }
  function updateSiteRecord(updated: RoofAssessment) { setAssessment(current => current?.siteKey === updated.siteKey ? updated : current); }
  useEffect(() => {
    let active = true;
    async function check() { try { const health = await roofApi.health(); if (active) setOnline(health.status === 'online' && health.dataMode === 'evidence_only'); } catch { if (active) setOnline(false); } finally { if (active) setChecked(true); } }
    check(); const timer = setInterval(check, 30000);
    return () => { active = false; clearInterval(timer); };
  }, []);
  return <>
    <Header backendOnline={online} checking={!checked} />
    <NavigationTabs activeTab={activeTab} onTabChange={changePage} />
    <main className="app-main">
      {checked && !online && <p role="status" className="notice">The evidence API is unavailable. No demonstration data or estimated results are substituted.</p>}
      <section hidden={activeTab !== 'map'} aria-label="Explore page"><SolarOpportunityMap assessment={assessment} onAssessmentChange={setAssessment} onOpenPlan={() => changePage('plan')} /></section>
      {visitedPages.has('plan') && <section hidden={activeTab !== 'plan'} aria-label="Plan page"><SitePlanView key={assessment?.siteKey || 'none'} assessment={assessment} onAssessmentChange={updateSiteRecord} onExplore={() => changePage('map')} /></section>}
      {visitedPages.has('data') && <section hidden={activeTab !== 'data'} aria-label="Data page"><EvaluationMetricsView /></section>}
    </main>
    <footer className="app-footer"><span>SolarSync · Selangor, Malaysia</span><span>Real map data · Transparent solar & EV scenarios</span></footer>
  </>;
}
