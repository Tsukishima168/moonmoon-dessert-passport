import React from 'react';

interface KiwimuHubMilestoneCardProps {
  icon: React.ReactNode;
  eyebrow: string;
  title: string;
  subtitle?: string;
}

export const KiwimuHubMilestoneCard: React.FC<KiwimuHubMilestoneCardProps> = ({
  icon,
  eyebrow,
  title,
  subtitle,
}) => {
  return (
    <div className="flex items-center gap-2.5 rounded-xl border-2 border-brand-black bg-white p-2.5 shadow-[2px_2px_0px_black]">
      <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg border border-brand-black bg-brand-lime text-brand-black">
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-[9px] font-bold uppercase text-gray-400">{eyebrow}</p>
        <p className="text-xs font-black text-brand-black">{title}</p>
        {subtitle ? <p className="truncate text-[9px] text-gray-500">{subtitle}</p> : null}
      </div>
    </div>
  );
};
