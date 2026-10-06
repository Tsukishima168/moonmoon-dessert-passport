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
    <div className="member-tabs" role="group" aria-label="會員中心頁面">
      {tabs.map((tab) => (
        <button
          key={tab.key}
          type="button"
          aria-pressed={activeTab === tab.key}
          onClick={() => onChange(tab.key)}
          className={activeTab === tab.key ? 'is-active' : ''}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
