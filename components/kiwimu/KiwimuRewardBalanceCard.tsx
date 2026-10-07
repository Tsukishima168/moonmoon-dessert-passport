import React from 'react';
import { Coins, ShoppingBag } from 'lucide-react';

/**
 * 兌換畫面的餘額狀態。
 * - ready：已讀到伺服器餘額（points 一定是 number，可為 0）
 * - guest：未登入，沒有伺服器餘額
 * - loading：登入狀態或餘額還在讀取
 * - error：讀不到伺服器餘額（不可當成 0 點讓人誤以為能兌換）
 */
export type RewardBalanceStatus = 'ready' | 'guest' | 'loading' | 'error';

interface KiwimuRewardBalanceCardProps {
  /** 伺服器端「可兌換點數」；非 ready 時為 null。 */
  points: number | null;
  status: RewardBalanceStatus;
  /** 本機遊戲積分（localStorage），僅供參考、不可兌換；0 或未提供時不顯示。 */
  gamePoints?: number;
  onLogin?: () => void;
  onRetry?: () => void;
}

export const KiwimuRewardBalanceCard: React.FC<KiwimuRewardBalanceCardProps> = ({
  points,
  status,
  gamePoints = 0,
  onLogin,
  onRetry,
}) => {
  const display = status === 'ready' && points !== null ? String(points) : status === 'loading' ? '…' : '—';

  return (
    <div className="mb-5 rounded-2xl bg-linear-to-br from-[#ff8f00] to-[#ffa000] px-5 py-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="m-0 text-xs text-white/80">可兌換點數</p>
          <div className="mt-1 flex items-center gap-2 text-white">
            <Coins size={24} />
            <p className="m-0 text-[32px] font-extrabold" data-testid="redeemable-points">{display}</p>
          </div>
        </div>
        <div className="flex h-14 w-14 items-center justify-center rounded-[18px] bg-white/15 text-white">
          <ShoppingBag size={28} />
        </div>
      </div>

      {status === 'error' ? (
        <div className="mt-3 flex items-center justify-between gap-3 text-xs font-semibold text-white">
          <span>暫時無法取得可兌換點數，請稍後再試。</span>
          {onRetry && (
            <button
              type="button"
              onClick={onRetry}
              className="shrink-0 rounded-full bg-white/90 px-3 py-1 text-[12px] font-bold text-[#c25e00]"
            >
              重試
            </button>
          )}
        </div>
      ) : (
        <p className="m-0 mt-3 text-xs font-semibold text-white/90">每日簽到可累積可兌換點數。</p>
      )}

      {status === 'guest' && (
        <div className="mt-3 flex items-center justify-between gap-3 text-xs font-semibold text-white">
          <span>請先使用 Google 登入，才能查看並兌換福利。</span>
          {onLogin && (
            <button
              type="button"
              onClick={onLogin}
              className="shrink-0 rounded-full bg-white/90 px-3 py-1 text-[12px] font-bold text-[#c25e00]"
            >
              Google 登入
            </button>
          )}
        </div>
      )}

      {gamePoints > 0 && (
        <p className="m-0 mt-3 border-t border-white/25 pt-2 text-[11px] text-white/70">
          遊戲積分（不可兌換）：{gamePoints}
        </p>
      )}
    </div>
  );
};
