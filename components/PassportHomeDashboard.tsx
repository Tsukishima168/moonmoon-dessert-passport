import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  BookOpen,
  Coins,
  ExternalLink,
  Loader2,
  Package2,
  ReceiptText,
  Sparkles,
  Star,
} from 'lucide-react';
import { KiwimuPanel } from './kiwimu/KiwimuPanel';
import { KiwimuMetricCard } from './kiwimu/KiwimuMetricCard';
import CheckinCard from './CheckinCard';
import { getUserShopOrders, type ShopOrderRecord } from '../src/api/orders';

interface NextRewardSummary {
  title: string;
  requiredStamps: number;
  remainingStamps: number;
  isReady: boolean;
}

interface PassportHomeDashboardProps {
  displayName: string;
  passportCoverNumber: string;
  passportMode: string;
  userLevel: number;
  points: number;
  unlockedCount: number;
  visitedSiteCount: number;
  visitedSiteTotal: number;
  mbtiType: string | null;
  hasIdentity: boolean;
  userId: string | null;
  nextReward: NextRewardSummary | null;
  onOpenCheckin: () => void;
  onGoJourney: () => void;
  onGoRewards: () => void;
  onGoShop: () => void;
  onLogin: () => Promise<void> | void;
}

const ORDER_STATUS_LABEL: Record<string, string> = {
  pending: '待付款',
  paid: '已付款',
  ready: '可取貨',
  completed: '完成',
  cancelled: '已取消',
};

function formatPickupTime(value: string) {
  return new Date(value).toLocaleString('zh-TW', {
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

export default function PassportHomeDashboard({
  displayName,
  passportCoverNumber,
  passportMode,
  userLevel,
  points,
  unlockedCount,
  visitedSiteCount,
  visitedSiteTotal,
  mbtiType,
  hasIdentity,
  userId,
  nextReward,
  onOpenCheckin,
  onGoJourney,
  onGoRewards,
  onGoShop,
  onLogin,
}: PassportHomeDashboardProps) {
  const [latestOrder, setLatestOrder] = useState<ShopOrderRecord | null>(null);
  const [loadingOrder, setLoadingOrder] = useState(false);
  const [orderError, setOrderError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) {
      setLatestOrder(null);
      setOrderError(null);
      setLoadingOrder(false);
      return;
    }

    let cancelled = false;

    const loadLatestOrder = async () => {
      setLoadingOrder(true);
      setOrderError(null);
      try {
        const orders = await getUserShopOrders(userId);
        if (!cancelled) {
          setLatestOrder(orders[0] ?? null);
        }
      } catch (error) {
        if (!cancelled) {
          setOrderError(error instanceof Error ? error.message : '讀取最新訂單失敗');
        }
      } finally {
        if (!cancelled) {
          setLoadingOrder(false);
        }
      }
    };

    void loadLatestOrder();

    return () => {
      cancelled = true;
    };
  }, [userId]);

  const statusLabel = useMemo(() => {
    if (!latestOrder) return null;
    return ORDER_STATUS_LABEL[latestOrder.status] || latestOrder.status;
  }, [latestOrder]);

  return (
    <div className="space-y-4">
      <KiwimuPanel padded={false} className="overflow-hidden">
        <div className="relative bg-brand-black px-4 py-5 text-white md:px-5">
          <div className="absolute -right-12 top-0 h-32 w-32 rounded-full bg-brand-lime/20 blur-3xl" />
          <div className="absolute bottom-0 left-0 h-28 w-28 rounded-full bg-white/5 blur-2xl" />

          <div className="relative">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.24em] text-white/40">
                  Passport Home
                </p>
                <h3 className="mt-2 text-2xl font-black tracking-tight text-white">
                  {displayName}
                </h3>
                <p className="mt-2 max-w-md text-[12px] font-medium leading-relaxed text-white/70">
                  {hasIdentity
                    ? '你的身份、任務、足跡與消費狀態都先在這裡匯合。'
                    : '目前還在訪客模式。先登入，再把跨站資料同步回這本護照。'}
                </p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-right">
                <p className="text-[9px] font-black uppercase tracking-[0.18em] text-white/35">
                  Passport
                </p>
                <p className="mt-1 text-xs font-black text-white">#{passportCoverNumber}</p>
                <p className="mt-1 text-[10px] font-bold text-white/55">{passportMode}</p>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-brand-lime">
                護照等級 Lv.{userLevel}
              </span>
              {mbtiType ? (
                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-white">
                  靈魂甜點 {mbtiType}
                </span>
              ) : null}
            </div>

            <div className="mt-4 grid grid-cols-3 gap-2">
              <KiwimuMetricCard label="積分" value={`${points}P`} accent="lime" />
              <KiwimuMetricCard label="印章" value={unlockedCount} />
              <KiwimuMetricCard label="足跡" value={`${visitedSiteCount}/${visitedSiteTotal}`} />
            </div>

            <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-3">
              <button
                type="button"
                onClick={onGoJourney}
                className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-3 py-3 text-left transition-all hover:bg-white/10"
              >
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-white/35">
                    Continue
                  </p>
                  <p className="mt-1 text-xs font-black text-white">繼續任務</p>
                </div>
                <ArrowRight size={15} className="text-brand-lime" />
              </button>

              <button
                type="button"
                onClick={onGoRewards}
                className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-3 py-3 text-left transition-all hover:bg-white/10"
              >
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-white/35">
                    Rewards
                  </p>
                  <p className="mt-1 text-xs font-black text-white">查看獎勵</p>
                </div>
                <Sparkles size={15} className="text-brand-lime" />
              </button>

              <button
                type="button"
                onClick={onGoShop}
                className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-3 py-3 text-left transition-all hover:bg-white/10"
              >
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-white/35">
                    Benefits
                  </p>
                  <p className="mt-1 text-xs font-black text-white">會員福利</p>
                </div>
                <ExternalLink size={15} className="text-brand-lime" />
              </button>
            </div>
          </div>
        </div>
      </KiwimuPanel>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <div className="space-y-4">
          <CheckinCard onOpen={onOpenCheckin} />

          <KiwimuPanel padded={false}>
            <div className="border-b-2 border-brand-black bg-brand-lime px-4 py-3 text-brand-black">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-brand-black/60">
                Next Unlock
              </p>
              <h4 className="mt-1 text-sm font-black">你的下一個里程碑</h4>
            </div>

            <div className="space-y-3 p-4">
              {nextReward ? (
                <>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-lg font-black text-brand-black">{nextReward.title}</p>
                      <p className="mt-1 text-[11px] font-medium leading-relaxed text-brand-black/60">
                        {nextReward.isReady
                          ? '已達成條件，現在可以前往集章獎勵頁兌換。'
                          : `距離解鎖還差 ${nextReward.remainingStamps} 枚印章。`}
                      </p>
                    </div>
                    <div className="rounded-full border border-brand-black bg-white px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-brand-black">
                      {nextReward.requiredStamps} stamps
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={onGoRewards}
                    className="inline-flex items-center gap-2 rounded-full border-2 border-brand-black bg-brand-black px-4 py-2 text-[11px] font-black uppercase tracking-[0.18em] text-white shadow-[2px_2px_0px_black] transition-all hover:bg-brand-lime hover:text-brand-black"
                  >
                    <Star size={13} />
                    前往集章獎勵
                  </button>
                </>
              ) : (
                <div className="rounded-2xl border border-dashed border-brand-black/20 bg-brand-gray/10 p-4">
                  <p className="text-sm font-black text-brand-black">所有里程碑都已完成</p>
                  <p className="mt-2 text-[11px] font-medium leading-relaxed text-brand-black/55">
                    下一步可以把重心放在會員福利、消費累積與跨站探索。
                  </p>
                </div>
              )}
            </div>
          </KiwimuPanel>
        </div>

        <KiwimuPanel padded={false}>
          <div className="border-b-2 border-brand-black bg-white px-4 py-3">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-brand-black/35">
              Latest Activity
            </p>
            <h4 className="mt-1 text-sm font-black text-brand-black">最近訂單與消費狀態</h4>
          </div>

          <div className="space-y-3 p-4">
            {!userId ? (
              <div className="rounded-2xl border border-dashed border-brand-black/20 bg-brand-gray/10 p-4">
                <p className="text-sm font-black text-brand-black">登入後可同步最新訂單</p>
                <p className="mt-2 text-[11px] font-medium leading-relaxed text-brand-black/55">
                  shop 訂單與跨站消費紀錄會在這裡回來，先登入才能把會員資料接起來。
                </p>
                <button
                  type="button"
                  onClick={() => void onLogin()}
                  className="mt-4 inline-flex items-center gap-2 rounded-full border-2 border-brand-black bg-brand-black px-4 py-2 text-[11px] font-black uppercase tracking-[0.18em] text-white shadow-[2px_2px_0px_black] transition-all hover:bg-brand-lime hover:text-brand-black"
                >
                  <ReceiptText size={13} />
                  先登入同步
                </button>
              </div>
            ) : loadingOrder ? (
              <div className="flex items-center gap-2 rounded-2xl border border-brand-black/10 bg-brand-gray/10 px-4 py-4 text-sm font-bold text-brand-black/60">
                <Loader2 size={16} className="animate-spin" />
                正在讀取最新訂單...
              </div>
            ) : orderError ? (
              <div className="rounded-2xl border border-red-200 bg-red-50 p-4">
                <p className="text-sm font-black text-red-700">目前沒有順利讀到 shop 狀態</p>
                <p className="mt-2 text-[11px] font-medium leading-relaxed text-red-600">
                  {orderError}
                </p>
                <button
                  type="button"
                  onClick={onGoShop}
                  className="mt-4 inline-flex items-center gap-2 rounded-full border border-brand-black bg-white px-4 py-2 text-[11px] font-black uppercase tracking-[0.18em] text-brand-black shadow-[2px_2px_0px_black] transition-all hover:bg-brand-gray"
                >
                  前往會員福利
                  <ArrowRight size={13} />
                </button>
              </div>
            ) : latestOrder ? (
              <div className="rounded-[1.6rem] border-2 border-brand-black bg-brand-black p-4 text-white shadow-[3px_3px_0px_black]">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-white/35">
                      Latest Order
                    </p>
                    <p className="mt-2 text-sm font-black text-white">{latestOrder.order_id}</p>
                  </div>
                  <span className="rounded-full border border-white/10 bg-white/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-brand-lime">
                    {statusLabel}
                  </span>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-2">
                  <div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-3">
                    <p className="text-[9px] font-black uppercase tracking-[0.16em] text-white/35">
                      取貨時間
                    </p>
                    <p className="mt-1 text-[11px] font-black text-white">
                      {formatPickupTime(latestOrder.pickup_time)}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-3">
                    <p className="text-[9px] font-black uppercase tracking-[0.16em] text-white/35">
                      訂單金額
                    </p>
                    <p className="mt-1 text-[11px] font-black text-white">
                      ${Number(latestOrder.final_price ?? latestOrder.total_price ?? 0).toLocaleString()}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={onGoShop}
                  className="mt-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-4 py-2 text-[11px] font-black uppercase tracking-[0.18em] text-white transition-all hover:bg-white hover:text-brand-black"
                >
                  <Package2 size={13} />
                  查看完整訂單與福利
                </button>
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-brand-black/20 bg-brand-gray/10 p-4">
                <p className="text-sm font-black text-brand-black">目前還沒有 shop 訂單</p>
                <p className="mt-2 text-[11px] font-medium leading-relaxed text-brand-black/55">
                  第一次下單後，這裡就會出現你的最近取貨與消費狀態。
                </p>
                <button
                  type="button"
                  onClick={onGoShop}
                  className="mt-4 inline-flex items-center gap-2 rounded-full border border-brand-black bg-white px-4 py-2 text-[11px] font-black uppercase tracking-[0.18em] text-brand-black shadow-[2px_2px_0px_black] transition-all hover:bg-brand-gray"
                >
                  <Coins size={13} />
                  去看會員福利
                </button>
              </div>
            )}

            <div className="rounded-2xl border border-brand-black/10 bg-brand-gray/10 p-4">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-brand-black/35">
                Quick View
              </p>
              <div className="mt-3 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-brand-black bg-white">
                  <BookOpen size={16} className="text-brand-black" />
                </div>
                <div>
                  <p className="text-sm font-black text-brand-black">護照首頁已經是預設第一屏</p>
                  <p className="mt-1 text-[11px] font-medium leading-relaxed text-brand-black/55">
                    先看身份與動態，再決定要前往任務、獎勵或福利。
                  </p>
                </div>
              </div>
            </div>
          </div>
        </KiwimuPanel>
      </div>
    </div>
  );
}
