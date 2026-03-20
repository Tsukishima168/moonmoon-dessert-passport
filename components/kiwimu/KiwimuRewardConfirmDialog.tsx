import React from 'react';
import { Gift } from 'lucide-react';

interface KiwimuRewardConfirmDialogProps {
  rewardName: string;
  pointsCost: number;
  onConfirm: () => void;
  onCancel: () => void;
}

export const KiwimuRewardConfirmDialog: React.FC<KiwimuRewardConfirmDialogProps> = ({
  rewardName,
  pointsCost,
  onConfirm,
  onCancel,
}) => {
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-5">
      <div className="w-full max-w-80 rounded-[20px] bg-white p-7 text-center">
        <div className="mx-auto mb-2 flex h-14 w-14 items-center justify-center rounded-[18px] bg-orange-50 text-orange-600">
          <Gift size={28} />
        </div>
        <h3 className="mb-2 text-lg font-black text-[#3d2c00]">確認兌換？</h3>
        <p className="mb-6 text-sm text-[#666]">
          <strong>{rewardName}</strong>
          <br />
          本次將扣除 <strong>{pointsCost} 點</strong>，請確認你要兌換這項福利。
        </p>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 rounded-[10px] border-2 border-[#eee] bg-white py-3 font-semibold text-[#666]"
          >
            取消
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 rounded-[10px] bg-gradient-to-r from-[#ff8f00] to-[#ffa000] py-3 font-bold text-white"
          >
            確認兌換
          </button>
        </div>
      </div>
    </div>
  );
};
