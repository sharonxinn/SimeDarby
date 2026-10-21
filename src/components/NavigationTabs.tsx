import React from 'react';
import { Map, Layers3, Database } from 'lucide-react';
export type TabKey = 'map' | 'plan' | 'data';
export const NavigationTabs: React.FC<{ activeTab: TabKey; onTabChange: (tab: TabKey) => void }> = ({ activeTab, onTabChange }) => <nav className="main-nav" aria-label="Main pages">
  {([{ id: 'map', label: 'Explore', icon: Map }, { id: 'plan', label: 'Plan', icon: Layers3 }, { id: 'data', label: 'Data', icon: Database }] as const).map(({ id, label, icon: Icon }) => <button key={id} aria-current={activeTab === id ? 'page' : undefined} className={activeTab === id ? 'active' : ''} onClick={() => onTabChange(id)}><Icon size={17} />{label}</button>)}
</nav>;
