import React from 'react';
import { Star } from 'lucide-react';

interface KiwimuAchievementModalProps {
  title: string;
  description: string;
  onClose: () => void;
}

export const KiwimuAchievementModal: React.FC<KiwimuAchievementModalProps> = ({
  title,
  description,
  onClose,
}) => {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-brand-black/90 p-8 backdrop-blur-sm">
      <div className="relative w-full max-w-sm animate-scale-up rounded-[40px] border-4 border-brand-lime bg-white p-8 text-center shadow-[0_0_50px_rgba(212,255,0,0.4)]">
        <div className="absolute left-1/2 top-[-3rem] flex h-24 w-24 -translate-x-1/2 items-center justify-center rounded-full border-4 border-brand-black bg-brand-lime shadow-xl animate-bounce">
          <Star size={48} className="text-brand-black" />
        </div>

        <h2 className="mt-8 text-2xl font-black uppercase tracking-tighter text-brand-black">
          New Legend!
        </h2>
        <p className="mb-6 text-[10px] font-black uppercase tracking-[0.3em] text-brand-lime-dark">
          Achievement Unlocked
        </p>

        <div className="mb-8 rounded-3xl border-2 border-brand-black/5 bg-gray-100 p-4">
          <h3 className="mb-1 text-lg font-black text-brand-black">{title}</h3>
          <p className="text-xs font-medium text-gray-500">{description}</p>
        </div>

        <button
          onClick={onClose}
          className="w-full rounded-[24px] border-2 border-brand-black bg-brand-black py-4 font-black uppercase tracking-widest text-white shadow-[4px_4px_0px_theme(colors.brand.lime)] transition-all active:translate-y-1"
        >
          Continue Journey
        </button>
      </div>
    </div>
  );
};
