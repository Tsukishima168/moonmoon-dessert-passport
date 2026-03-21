import React from 'react';

interface KiwimuSectionIntroProps {
  eyebrow: string;
  children: React.ReactNode;
}

export const KiwimuSectionIntro: React.FC<KiwimuSectionIntroProps> = ({
  eyebrow,
  children,
}) => {
  return (
    <div className="rounded-2xl border border-brand-black/10 bg-white p-4">
      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">
        {eyebrow}
      </p>
      <div className="mt-2 text-xs font-medium leading-relaxed text-gray-500">
        {children}
      </div>
    </div>
  );
};
