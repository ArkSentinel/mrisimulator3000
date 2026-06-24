import { clsx } from 'clsx';
import type { ParameterTab } from '../../data/mockData';

interface ParamTabsProps {
  tabs: ParameterTab[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
}

export function ParamTabs({ tabs, activeTab, onTabChange }: ParamTabsProps) {
  return (
    <div className="flex border-b border-slate-700">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          className={clsx(
            'px-4 py-2 text-xs font-medium transition-colors',
            activeTab === tab.id
              ? 'bg-[#232323] text-orange-500 border-b-2 border-orange-500'
              : 'bg-[#1a1a1a] text-gray-500 hover:text-gray-300'
          )}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}