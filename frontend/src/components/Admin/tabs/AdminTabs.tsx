import type { ReactNode } from 'react';

interface Tab {
  id: string;
  label: string;
  icon: ReactNode;
}

interface AdminTabsProps {
  tabs: Tab[];
  activeTab: string;
  onTabChange: (id: string) => void;
}

const TargetIcon = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="10" />
    <circle cx="12" cy="12" r="6" />
    <circle cx="12" cy="12" r="2" />
  </svg>
);

const UsersIcon = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);

const ListIcon = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="8" y1="6" x2="21" y2="6" />
    <line x1="8" y1="12" x2="21" y2="12" />
    <line x1="8" y1="18" x2="21" y2="18" />
    <line x1="3" y1="6" x2="3.01" y2="6" />
    <line x1="3" y1="12" x2="3.01" y2="12" />
    <line x1="3" y1="18" x2="3.01" y2="18" />
  </svg>
);

const ChartIcon = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="18" y1="20" x2="18" y2="10" />
    <line x1="12" y1="20" x2="12" y2="4" />
    <line x1="6" y1="20" x2="6" y2="14" />
  </svg>
);

export const TAB_ICONS = {
  sessions: <TargetIcon />,
  users: <UsersIcon />,
  protocols: <ListIcon />,
  stats: <ChartIcon />,
};

export function AdminTabs({ tabs, activeTab, onTabChange }: AdminTabsProps) {
  return (
    <div className="flex border-b border-slate-700 bg-[#1a1a1a]">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          className={`flex items-center gap-2 px-4 py-3 text-xs font-medium transition-colors border-b-2 ${
            activeTab === tab.id
              ? 'text-orange-500 border-orange-500 bg-[#252525]'
              : 'text-gray-500 border-transparent hover:text-gray-300 hover:bg-[#1f1f1f]'
          }`}
        >
          {tab.icon}
          <span>{tab.label}</span>
        </button>
      ))}
    </div>
  );
}