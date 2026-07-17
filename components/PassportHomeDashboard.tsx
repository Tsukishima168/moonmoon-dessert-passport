import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowRight,
  BookOpen,
  Calendar,
  Coins,
  ExternalLink,
  Loader2,
  Package2,
  ReceiptText,
  Star,
} from 'lucide-react';
import { KiwimuPanel } from './kiwimu/KiwimuPanel';
import { KiwimuMetricCard } from './kiwimu/KiwimuMetricCard';
import CheckinCard from './CheckinCard';
import { getUserShopOrders, type ShopOrderRecord } from '../src/api/orders';
import { trackEvent } from '../analytics';

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
  checkinEnabled: boolean;
  canCheckin: boolean;
  checkinStreak: number;
  nextReward: NextRewardSummary | null;
  onOpenCheckin: () => void;
  onGoJourney: () => void;
  onGoRewards: () => void;
  onLogin: () => Promise<void> | void;
}

const ORDER_STATUS_LABEL: Record<string, string> = {
  pending: '待付款',
  paid: '已付款',
  ready: '可取貨',
  completed: '完成',
  cancelled: '已取消',
};

const ORDER_SOURCE_LABEL: Record<string, string> = {
  shop: 'Shop',
  map: 'Map',
  moon_map: 'Map',
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

function getOrderSourceLabel(order: ShopOrderRecord) {
  const source = order.source_from || order.checkout_site || '';
  return ORDER_SOURCE_LABEL[source] || source || '未設定';
}

function openShopMenu() {
  const outboundUrl = new URL('https://map.kiwimu.com/menu');
  outboundUrl.searchParams.set('from', 'passport');
  window.open(outboundUrl.toString(), '_blank', 'noopener,noreferrer');
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
  checkinEnabled,
  canCheckin,
  checkinStreak,
  nextReward,
  onOpenCheckin,
  onGoJourney,
  onGoRewards,
  onLogin,
}: PassportHomeDashboardProps) {
  const [latestOrder, setLatestOrder] = useState<ShopOrderRecord | null>(null);
  const [loadingOrder, setLoadingOrder] = useState(false);
  const [orderError, setOrderError] = useState<string | null>(null);
  const hasTrackedView = useRef(false);

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

  useEffect(() => {
    if (hasTrackedView.current) {
      return;
    }

    hasTrackedView.current = true;
    trackEvent('passport_home_view', {
      has_identity: hasIdentity,
      has_mbti: Boolean(mbtiType),
      points,
      stamps: unlockedCount,
      footprints: visitedSiteCount,
    });
  }, [hasIdentity, mbtiType, points, unlockedCount, visitedSiteCount]);

  const trackSectionClick = (section: string, destination: string, callback: () => void) => {
    trackEvent('passport_home_section_click', {
      section,
      destination,
      has_identity: hasIdentity,
    });
    callback();
  };

  const nextAction = useMemo(() => {
    if (!userId) {
      return {
        id: 'login',
        eyebrow: 'Identity',
        title: '先登入，把這本護照接上你的會員資料',
        description: '登入後才能同步跨站足跡、點數與訂單狀態。',
        label: '登入同步',
        icon: <ReceiptText size={15} />,
        run: () => void onLogin(),
      };
    }

    if (!checkinEnabled) {
      return {
        id: 'wallet_wait',
        eyebrow: 'Economy v2',
        title: '正式簽到正在安全分批開放',
        description: '目前只顯示遠端相容餘額，不會透過舊介面新增正式點數。',
        label: '查看會員旅程',
        icon: <BookOpen size={15} />,
        run: onGoJourney,
      };
    }

    if (canCheckin) {
      return {
        id: 'checkin',
        eyebrow: 'Today',
        title: checkinStreak > 0 ? `延續 ${checkinStreak} 連簽到` : '領取今天的護照積分',
        description: '完成每日簽到後，首頁點數會立即更新。',
        label: '今日簽到',
        icon: <Calendar size={15} />,
        run: onOpenCheckin,
      };
    }

    if (nextReward?.isReady) {
      return {
        id: 'reward',
        eyebrow: 'Ready',
        title: `${nextReward.title} 已可兌換`,
        description: '你已達成這個集章里程碑，現在可以查看獎勵狀態。',
        label: '前往集章獎勵',
        icon: <Star size={15} />,
        run: onGoRewards,
      };
    }

    if (latestOrder) {
      return {
        id: 'order',
        eyebrow: getOrderSourceLabel(latestOrder),
        title: `${statusLabel || '最新訂單'}：${latestOrder.order_id}`,
        description: '查看最新訂單狀態，或前往甜點選單繼續探索。',
        label: '前往甜點選單',
        icon: <Package2 size={15} />,
        run: openShopMenu,
      };
    }

    return {
      id: 'journey',
      eyebrow: 'Continue',
      title: '繼續補齊月島任務與足跡',
      description: '今天已完成簽到，下一步可以累積印章或探索其他入口。',
      label: '繼續任務',
      icon: <ArrowRight size={15} />,
      run: onGoJourney,
    };
  }, [
    canCheckin,
    checkinEnabled,
    checkinStreak,
    hasIdentity,
    latestOrder,
    nextReward,
    onGoJourney,
    onGoRewards,
    onLogin,
    onOpenCheckin,
    statusLabel,
    userId,
  ]);

  const handleNextAction = () => {
    trackEvent('passport_home_next_action_click', {
      action: nextAction.id,
      has_identity: hasIdentity,
      order_status: latestOrder?.status || null,
      order_source: latestOrder ? getOrderSourceLabel(latestOrder) : null,
    });
    nextAction.run();
  };

  return (
    <div className="space-y-4">
      <KiwimuPanel padded={false} className="overflow-hidden">
        <div className="bg-brand-black px-4 py-5 text-white md:px-5">
          <div>
            <div className="flex items-start justify-between gap-3 border-b border-white/10 pb-4">
              <div className="min-w-0">
                <p className="text-[10px] font-black uppercase tracking-[0.24em] text-white/40">
                  Passport Home
                </p>
                <h3 className="mt-2 truncate text-2xl font-black tracking-tight text-white">
                  {displayName}
                </h3>
                <p className="mt-2 max-w-md text-[12px] font-medium leading-relaxed text-white/70">
                  {hasIdentity
                    ? '你的身份、任務、足跡與消費狀態都先在這裡匯合。'
                    : '目前還在訪客模式。先登入，再把跨站資料同步回這本護照。'}
                </p>
              </div>

              <div className="shrink-0 rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-right">
                <p className="text-[9px] font-black uppercase tracking-[0.18em] text-white/35">
                  Passport
                </p>
                <p className="mt-1 text-xs font-black text-white">#{passportCoverNumber}</p>
                <p className="mt-1 text-[10px] font-bold text-white/55">{passportMode}</p>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-3 gap-2">
              <KiwimuMetricCard label="積分" value={`${points}P`} accent="lime" />
              <KiwimuMetricCard label="印章" value={unlockedCount} />
              <KiwimuMetricCard label="足跡" value={`${visitedSiteCount}/${visitedSiteTotal}`} />
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-brand-lime">
                護照等級 Lv.{userLevel}
              </span>
              {mbtiType ? (
                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-white">
                  靈魂甜點 {mbtiType}
                </span>
              ) : (
                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-white/55">
                  尚未同步 MBTI
                </span>
              )}
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-white/55">
                {canCheckin ? '今日可簽到' : '今日已簽到'}
              </span>
            </div>

            <div className="mt-4 rounded-[1.6rem] border border-white/15 bg-white p-4 text-brand-black">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-brand-black/40">
                {nextAction.eyebrow}
              </p>
              <h4 className="mt-2 text-lg font-black leading-tight text-brand-black">
                {nextAction.title}
              </h4>
              <p className="mt-2 text-[12px] font-medium leading-relaxed text-brand-black/62">
                {nextAction.description}
              </p>
              <button
                type="button"
                onClick={handleNextAction}
                className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-brand-black bg-brand-lime px-4 py-3 text-[12px] font-black uppercase tracking-[0.16em] text-brand-black shadow-[3px_3px_0px_black] transition-all hover:bg-white active:translate-y-0.5 active:shadow-[1px_1px_0px_black]"
              >
                {nextAction.icon}
                {nextAction.label}
              </button>
            </div>
          </div>
        </div>
      </KiwimuPanel>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <div className="space-y-4">
          <CheckinCard
            onOpen={onOpenCheckin}
            canCheckin={canCheckin}
            streak={checkinStreak}
            requiresLogin={!userId}
            disabled={Boolean(userId) && !checkinEnabled}
            disabledMessage="正式簽到尚未開放；相容餘額維持只讀"
          />

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
                    onClick={() => trackSectionClick('next_unlock', 'rewards', onGoRewards)}
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
                    下一步可以把重心放在任務回訪、集章紀錄與跨站探索。
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
                <div>
                  <p className="text-sm font-black text-brand-black">登入後可同步最新訂單</p>
                  <p className="mt-2 text-[11px] font-medium leading-relaxed text-brand-black/55">
                    Shop 與 Map 訂單紀錄會在這裡回來，先登入才能把會員資料接起來。
                  </p>
                </div>
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
                <p className="text-sm font-black text-red-700">目前沒有順利讀到訂單狀態</p>
                <p className="mt-2 text-[11px] font-medium leading-relaxed text-red-600">
                  {orderError}
                </p>
                <button
                  type="button"
                  onClick={() => trackSectionClick('latest_order_error', 'shop', openShopMenu)}
                  className="mt-4 inline-flex items-center gap-2 rounded-full border border-brand-black bg-white px-4 py-2 text-[11px] font-black uppercase tracking-[0.18em] text-brand-black shadow-[2px_2px_0px_black] transition-all hover:bg-brand-gray"
                >
                  前往甜點選單
                  <ExternalLink size={13} />
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
                      來源
                    </p>
                    <p className="mt-1 text-[11px] font-black text-white">
                      {getOrderSourceLabel(latestOrder)}
                    </p>
                  </div>
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
                  onClick={() => trackSectionClick('latest_order', 'shop', openShopMenu)}
                  className="mt-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-4 py-2 text-[11px] font-black uppercase tracking-[0.18em] text-white transition-all hover:bg-white hover:text-brand-black"
                >
                  <Package2 size={13} />
                  前往甜點選單
                </button>
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-brand-black/20 bg-brand-gray/10 p-4">
                <p className="text-sm font-black text-brand-black">目前還沒有同步到訂單</p>
                <p className="mt-2 text-[11px] font-medium leading-relaxed text-brand-black/55">
                  第一次登入下單後，這裡就會出現你的最近取貨與消費狀態。
                </p>
                <button
                  type="button"
                  onClick={() => trackSectionClick('latest_order_empty', 'shop', openShopMenu)}
                  className="mt-4 inline-flex items-center gap-2 rounded-full border border-brand-black bg-white px-4 py-2 text-[11px] font-black uppercase tracking-[0.18em] text-brand-black shadow-[2px_2px_0px_black] transition-all hover:bg-brand-gray"
                >
                  <Coins size={13} />
                  去看甜點選單
                </button>
              </div>
            )}

            <button
              type="button"
              onClick={() => trackSectionClick('activity_shortcut', 'journey', onGoJourney)}
              className="flex w-full items-center justify-between rounded-2xl border border-brand-black/10 bg-brand-gray/10 p-4 text-left transition-all hover:bg-brand-lime/20"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-brand-black bg-white">
                  <BookOpen size={16} className="text-brand-black" />
                </div>
                <div>
                  <p className="text-sm font-black text-brand-black">回到任務與足跡</p>
                  <p className="mt-1 text-[11px] font-medium leading-relaxed text-brand-black/55">
                    查看印章、門市定位與跨站探索進度。
                  </p>
                </div>
              </div>
              <ArrowRight size={15} className="text-brand-black/45" />
            </button>
          </div>
        </KiwimuPanel>
      </div>
    </div>
  );
}
