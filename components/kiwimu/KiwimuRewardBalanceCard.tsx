import React from 'react';
import { Coins, ShoppingBag } from 'lucide-react';

interface KiwimuRewardBalanceCardProps {
  points: number;
}

export const KiwimuRewardBalanceCard: React.FC<KiwimuRewardBalanceCardProps> = ({
  points,
}) => {
  return (
    <div className="mb-5 flex items-center justify-between rounded-2xl bg-gradient-to-br from-[#ff8f00] to-[#ffa000] px-5 py-4">
      <div>
        <p className="m-0 text-xs text-white/80">我的積分餘額</p>
        <div className="mt-1 flex items-center gap-2 text-white">
          <Coins size={24} />
          <p className="m-0 text-[32px] font-extrabold">{points}</p>
        </div>
      </div>
      <div className="flex h-14 w-14 items-center justify-center rounded-[18px] bg-white/15 text-white">
        <ShoppingBag size={28} />
      </div>
    </div>
  );
};
