import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AdminTabs, TAB_ICONS } from './tabs/AdminTabs';
import { UsersTab } from './tabs/UsersTab';
import { SessionsTab } from './tabs/SessionsTab';
import { StatsTab } from './tabs/StatsTab';
import { ProtocolsEditor } from './tabs/ProtocolsEditorTab';

const TABS = [
  { id: 'sessions', label: 'Sessions', icon: TAB_ICONS.sessions },
  { id: 'users', label: 'Users', icon: TAB_ICONS.users },
  { id: 'protocols', label: 'Protocols', icon: TAB_ICONS.protocols },
  { id: 'stats', label: 'Statistics', icon: TAB_ICONS.stats },
];

export function AdminScreen() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('protocols');

  const handleLogout = () => {
    localStorage.removeItem('mri_token');
    navigate('/');
  };

  return (
    <div className="flex flex-col h-screen bg-black text-gray-300 overflow-hidden">
      <header className="h-12 bg-[#1a1a1a] border-b border-slate-700 flex items-center justify-between px-4 shrink-0">
        <div className="flex items-center gap-4">
          <h1 className="text-sm font-bold text-orange-500">ScRmhoot Admin</h1>
          <span className="text-xs text-gray-500">MRI Simulator</span>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/console')}
            className="text-xs text-gray-400 hover:text-white"
          >
            Console
          </button>
          <button
            onClick={handleLogout}
            className="text-xs text-gray-400 hover:text-white"
          >
            Logout
          </button>
        </div>
      </header>

      <AdminTabs tabs={TABS} activeTab={activeTab} onTabChange={setActiveTab} />

      <main className="flex-1 overflow-hidden bg-[#0a0a0a]">
        {activeTab === 'sessions' && <SessionsTab />}
        {activeTab === 'users' && <UsersTab />}
        {activeTab === 'protocols' && <ProtocolsEditor />}
        {activeTab === 'stats' && <StatsTab />}
      </main>
    </div>
  );
}