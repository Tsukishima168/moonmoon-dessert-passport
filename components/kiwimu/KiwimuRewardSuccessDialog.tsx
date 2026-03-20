import React from 'react';
import { Sparkles } from 'lucide-react';

interface KiwimuRewardSuccessDialogProps {
  rewardName: string;
  category: 'drink' | 'dessert' | 'merch';
  onClose: () => void;
}

export const KiwimuRewardSuccessDialog: React.FC<KiwimuRewardSuccessDialogProps> = ({
  rewardName,
  category,
  onClose,
}) => {
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-5">
      <div className="w-full max-w-80 rounded-[20px] border-2 border-[#f0c070] bg-gradient-to-br from-[#fff9f0] to-[#fff3e0] p-8 text-center">
        <div className="mx-auto mb-3 flex h-[68px] w-[68px] items-center justify-center rounded-[22px] bg-white/85 text-amber-500">
          <Sparkles size={34} />
        </div>
        <h2 className="mb-2 text-2xl font-black text-[#3d2c00]">兌換成功！</h2>
        <p className="mb-4 text-[15px] text-[#5d4037]">
          <strong>{rewardName}</strong>
          <br />
          已成功兌換
        </p>

        <div
          className={`mb-5 rounded-xl border border-[#f0c070] p-4 text-sm text-[#5d4037] ${
            category === 'merch' ? 'bg-[#ede7f6]' : 'bg-white'
          }`}
        >
          <strong>兌換提醒</strong>
          <br />
          請在店員面前出示此畫面，由店員掃描或確認後完成核銷。
        </div>

        <button
          onClick={onClose}
          className="w-full rounded-[10px] bg-gradient-to-r from-[#ff8f00] to-[#ffa000] py-3 text-[15px] font-bold text-white"
        >
          完成
        </button>
      </div>
    </div>
  );
};
