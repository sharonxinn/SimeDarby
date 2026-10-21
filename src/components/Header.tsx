import React from 'react';
import { Sun } from 'lucide-react';
export const Header: React.FC<{ backendOnline: boolean; checking?: boolean }> = ({ backendOnline, checking }) => <header className="app-header"><div className="app-header-inner">
  <div className="brand"><div className="brand-icon"><Sun size={22} /></div><div><strong>SolarSync</strong><span>Selangor solar & EV planning</span></div></div>
  <span className={`connection ${backendOnline ? 'online' : ''}`} title={backendOnline ? 'Connected to the backend and database' : 'Evidence API unavailable; no substitute data is generated'}><i />{checking ? 'Connecting…' : backendOnline ? 'Connected' : 'Offline mode'}</span>
</div></header>;
