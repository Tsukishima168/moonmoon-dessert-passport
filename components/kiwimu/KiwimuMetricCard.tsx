import React from 'react';

interface KiwimuMetricCardProps {
  label: string;
  value: React.ReactNode;
  accent?: 'default' | 'lime';
  className?: string;
}

export const KiwimuMetricCard: React.FC<KiwimuMetricCardProps> = ({
  label,
  value,
  accent = 'default',
  className = '',
}) => {
  const valueClass =
    accent === 'lime' ? 'text-brand-lime' : 'text-white';

  return (
    <div
      className={`flex flex-1 flex-col items-center rounded-xl border border-white/10 bg-white/5 p-2.5 ${className}`.trim()}
    >
      <span className="mb-0.5 text-[9px] font-bold uppercase tracking-widest text-gray-400">
        {label}
      </span>
      <span className={`text-lg font-black ${valueClass}`}>{value}</span>
    </div>
  );
};
