import React from 'react';
import { CheckCircle2, Gift, Lock } from 'lucide-react';

interface KiwimuRewardTierCardProps {
  title: string;
  requiredStamps: number;
  isUnlocked: boolean;
  isRedeemed: boolean;
  onRedeem?: () => void;
}

export const KiwimuRewardTierCard: React.FC<KiwimuRewardTierCardProps> = ({
  title,
  requiredStamps,
  isUnlocked,
  isRedeemed,
  onRedeem,
}) => {
  return (
    <div
      className={`rounded-2xl border-2 border-brand-black p-4 shadow-[4px_4px_0px_black] transition-all ${
        isUnlocked ? 'bg-white' : 'bg-gray-50 opacity-60'
      }`}
    >
      <div className="flex items-center gap-4">
        <div
          className={`flex h-12 w-12 items-center justify-center rounded-xl border-2 border-brand-black shadow-[2px_2px_0px_black] ${
            isUnlocked && !isRedeemed ? 'bg-brand-lime' : 'bg-white'
          }`}
        >
          {isRedeemed ? (
            <CheckCircle2 size={24} className="text-brand-lime-dark" />
          ) : (
            <Gift size={24} className="text-brand-black" />
          )}
        </div>

        <div className="min-w-0 flex-1">
          <h3 className="truncate text-xs font-black uppercase text-brand-black">
            {title}
          </h3>
          <p className="text-[10px] font-bold text-gray-400">
            {requiredStamps} STAMPS REQUIRED
          </p>
        </div>

        {isUnlocked && !isRedeemed && onRedeem ? (
          <button
            onClick={onRedeem}
            className="rounded-lg border border-brand-black bg-brand-black px-3 py-1.5 text-[10px] font-black uppercase text-white transition-all active:translate-y-0.5"
          >
            Redeem
          </button>
        ) : null}

        {!isUnlocked ? <Lock size={16} className="text-gray-300" /> : null}
      </div>
    </div>
  );
};
