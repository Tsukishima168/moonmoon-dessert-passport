import React from 'react';

interface KiwimuTabOption<T extends string> {
  key: T;
  label: string;
}

interface KiwimuTabsProps<T extends string> {
  tabs: KiwimuTabOption<T>[];
  activeTab: T;
  onChange: (tab: T) => void;
}

export function KiwimuTabs<T extends string>({
  tabs,
  activeTab,
  onChange,
}: KiwimuTabsProps<T>) {
  return (
    <div className="mb-8 flex rounded-2xl border-2 border-brand-black bg-brand-gray/10 p-1">
      {tabs.map((tab) => (
        <button
          key={tab.key}
          onClick={() => onChange(tab.key)}
          className={`flex-1 rounded-xl py-2 text-[10px] font-black uppercase tracking-wider transition-all ${
            activeTab === tab.key
              ? 'bg-brand-lime text-brand-black shadow-[2px_2px_0px_black]'
              : 'text-gray-400 hover:text-brand-black'
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
