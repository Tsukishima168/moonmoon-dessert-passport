import React from 'react';
import {
  CakeSlice,
  Coffee,
  Coins,
  CupSoda,
  Gift,
  ShoppingBag,
  Sparkles,
  Sticker as StickerIcon,
  type LucideIcon,
} from 'lucide-react';
import { RedeemableItem } from '../../types';

interface KiwimuRewardCardProps {
  reward: RedeemableItem;
  userPoints: number;
  onRedeem: (reward: RedeemableItem) => void;
}

const REWARD_ICON_MAP: Record<string, { Icon: LucideIcon; accent: string; bg: string }> = {
  tea_buckwheat: { Icon: CupSoda, accent: '#0f766e', bg: '#d1fae5' },
  coffee_iced: { Icon: Coffee, accent: '#7c2d12', bg: '#ffedd5' },
  coffee_sicily: { Icon: Coffee, accent: '#9a3412', bg: '#ffedd5' },
  latte_matcha: { Icon: CupSoda, accent: '#166534', bg: '#dcfce7' },
  second_half: { Icon: CupSoda, accent: '#1d4ed8', bg: '#dbeafe' },
  pudding_classic: { Icon: CakeSlice, accent: '#b45309', bg: '#fef3c7' },
  chiffon_slice: { Icon: CakeSlice, accent: '#c2410c', bg: '#ffedd5' },
  seasonal_fruit: { Icon: Sparkles, accent: '#be185d', bg: '#fce7f3' },
  sticker_set: { Icon: StickerIcon, accent: '#6d28d9', bg: '#ede9fe' },
  cooler_bag: { Icon: ShoppingBag, accent: '#1f2937', bg: '#e5e7eb' },
};

export const KiwimuRewardCard: React.FC<KiwimuRewardCardProps> = ({
  reward,
  userPoints,
  onRedeem,
}) => {
  const canAfford = userPoints >= reward.pointsCost;
  const categoryLabel =
    reward.category === 'drink'
      ? '飲品'
      : reward.category === 'dessert'
        ? '甜點'
        : '周邊';
  const iconMeta = REWARD_ICON_MAP[reward.id] ?? {
    Icon: Gift,
    accent: '#92400e',
    bg: '#fef3c7',
  };
  const RewardIcon = iconMeta.Icon;

  return (
    <div
      className={`relative flex flex-col items-center gap-2.5 rounded-2xl border-2 px-4 py-5 transition-all ${
        canAfford
          ? 'border-[#f0c070] bg-[linear-gradient(135deg,#fff9f0_0%,#fff3e0_100%)]'
          : 'border-[#e0e0e0] bg-[#f5f5f5] opacity-65'
      }`}
    >
      <span
        className={`absolute right-2 top-2 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
          reward.category === 'drink'
            ? 'bg-[#e3f2fd] text-[#1565c0]'
            : reward.category === 'dessert'
              ? 'bg-[#fff3e0] text-[#e65100]'
              : 'bg-[#ede7f6] text-[#6a1b9a]'
        }`}
      >
        {categoryLabel}
      </span>

      <div
        className="flex h-[72px] w-[72px] items-center justify-center rounded-3xl"
        style={{
          background: iconMeta.bg,
          color: iconMeta.accent,
          border: `1px solid ${canAfford ? iconMeta.accent : '#d1d5db'}`,
        }}
      >
        <RewardIcon size={34} strokeWidth={2.2} />
      </div>

      <h3 className="m-0 text-center text-[15px] font-bold text-[#3d2c00]">
        {reward.name}
      </h3>
      <p className="m-0 min-h-9 text-center text-xs leading-[1.5] text-[#8d6e63]">
        {reward.description}
      </p>
      <div
        className={`flex items-center gap-1.5 text-lg font-extrabold ${
          canAfford ? 'text-[#e65100]' : 'text-[#9e9e9e]'
        }`}
      >
        <Coins size={18} />
        <span>{reward.pointsCost} 積分</span>
      </div>

      <button
        onClick={() => onRedeem(reward)}
        disabled={!canAfford}
        className={`w-full rounded-[10px] py-2.5 text-sm font-bold text-white transition-all ${
          canAfford
            ? 'cursor-pointer bg-gradient-to-r from-[#ff8f00] to-[#ffa000]'
            : 'cursor-not-allowed bg-[#bdbdbd]'
        }`}
      >
        {canAfford ? '立即兌換' : `還需 ${reward.pointsCost - userPoints} 積分`}
      </button>
    </div>
  );
};
