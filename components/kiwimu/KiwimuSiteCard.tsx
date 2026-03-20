import React from 'react';
import { ArrowRight, CheckCircle2 } from 'lucide-react';

interface KiwimuSiteCardProps {
  icon: React.ReactNode;
  name: string;
  description: string;
  visited: boolean;
  onClick: () => void;
}

export const KiwimuSiteCard: React.FC<KiwimuSiteCardProps> = ({
  icon,
  name,
  description,
  visited,
  onClick,
}) => {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-3 rounded-xl border-2 p-3 transition-all active:scale-[0.98] ${
        visited
          ? 'border-brand-black/10 bg-white'
          : 'border-brand-black bg-white shadow-[2px_2px_0px_black] hover:bg-brand-gray/5'
      }`}
    >
      <div
        className={`flex h-10 w-10 items-center justify-center rounded-lg border ${
          visited
            ? 'border-brand-lime/20 bg-brand-lime/10 text-brand-black/40'
            : 'border-brand-black bg-brand-lime text-brand-black'
        }`}
      >
        {icon}
      </div>

      <div className="flex-1 text-left">
        <h3 className={`text-xs font-bold ${visited ? 'text-brand-black/40' : 'text-brand-black'}`}>
          {name}
        </h3>
        <p className="text-[10px] font-medium text-gray-400">{description}</p>
      </div>

      <div className="flex items-center justify-center">
        {visited ? (
          <CheckCircle2 size={18} className="text-brand-lime-dark" />
        ) : (
          <ArrowRight size={16} className="text-brand-black" />
        )}
      </div>
    </button>
  );
};
