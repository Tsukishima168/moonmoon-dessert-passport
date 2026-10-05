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
import { trackOutboundNavigation } from '../analytics';
import type { JourneyMode } from '../src/lib/memberJourney';

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
  canCheckin: boolean;
  checkinStreak: number;
  nextReward: NextRewardSummary | null;
  onOpenCheckin: () => void;
  onGoJourney: (mode?: JourneyMode) => void;
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
  const [orderReload, setOrderReload] = useState(0);
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
          setOrderError('目前無法讀取訂單，請確認網路後重試。');
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
  }, [userId, orderReload]);

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
    if (!hasIdentity) {
      return {
        id: 'login',
        eyebrow: 'Identity',
        title: '先登入，把這本護照接上你的會員資料',
        description: '登入後可查看帳號資料與訂單；此裝置的探索紀錄會先保留。',
        label: '登入同步',
        icon: <ReceiptText size={15} />,
        run: () => void onLogin(),
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
        title: `${nextReward.title}：已達探索里程碑`,
        description: '可查看獎勵說明；實體領取仍須門市確認與核銷。',
        label: '前往集章獎勵',
        icon: <Star size={15} />,
        run: onGoRewards,
      };
    }

    if (latestOrder && ['pending', 'paid', 'ready'].includes(latestOrder.status)) {
      return {
        id: 'order',
        eyebrow: getOrderSourceLabel(latestOrder),
        title: `${statusLabel || '最新訂單'}：${latestOrder.order_id}`,
        description: '先確認這筆訂單的付款或取貨狀態，再安排下一次到店。',
        label: '查看最新訂單',
        icon: <Package2 size={15} />,
        run: () => document.getElementById('passport-latest-order')?.scrollIntoView({ behavior: 'smooth', block: 'start' }),
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
    checkinStreak,
    hasIdentity,
    latestOrder,
    nextReward,
    onGoJourney,
    onGoRewards,
    onLogin,
    onOpenCheckin,
    statusLabel,
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
                <p className="text-[12px] font-black uppercase tracking-[0.24em] text-white/65">
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
                <p className="text-[12px] font-black uppercase tracking-[0.18em] text-white/65">
                  Passport
                </p>
                <p className="mt-1 text-xs font-black text-white">#{passportCoverNumber}</p>
                <p className="mt-1 text-[12px] font-bold text-white/65">{passportMode}</p>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-3 gap-2">
              <KiwimuMetricCard label="積分" value={`${points}P`} accent="lime" />
              <KiwimuMetricCard label="印章" value={unlockedCount} />
              <KiwimuMetricCard label="足跡" value={`${visitedSiteCount}/${visitedSiteTotal}`} />
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[12px] font-black uppercase tracking-[0.16em] text-brand-lime">
                護照等級 Lv.{userLevel}
              </span>
              {mbtiType ? (
                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[12px] font-black uppercase tracking-[0.16em] text-white">
                  靈魂甜點 {mbtiType}
                </span>
              ) : (
                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[12px] font-black uppercase tracking-[0.16em] text-white/65">
                  尚未同步 MBTI
                </span>
              )}
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[12px] font-black uppercase tracking-[0.16em] text-white/65">
                {canCheckin ? '今日可簽到' : '今日已簽到'}
              </span>
            </div>

            <div className="mt-4 rounded-[1.6rem] border border-white/15 bg-white p-4 text-brand-black">
              <p className="text-[12px] font-black uppercase tracking-[0.2em] text-brand-black/65">
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
          <CheckinCard onOpen={onOpenCheckin} />

          <KiwimuPanel padded={false}>
            <div className="border-b-2 border-brand-black bg-brand-lime px-4 py-3 text-brand-black">
              <p className="text-[12px] font-black uppercase tracking-[0.2em] text-brand-black/60">
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
                      <p className="mt-1 text-[12px] font-medium leading-relaxed text-brand-black/60">
                        {nextReward.isReady
                          ? '已達探索里程碑；請查看獎勵說明，實體領取須門市確認。'
                          : `距離解鎖還差 ${nextReward.remainingStamps} 枚印章。`}
                      </p>
                    </div>
                    <div className="rounded-full border border-brand-black bg-white px-3 py-1 text-[12px] font-black uppercase tracking-[0.16em] text-brand-black">
                      {nextReward.requiredStamps} stamps
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => trackSectionClick('next_unlock', 'rewards', onGoRewards)}
                    className="inline-flex items-center gap-2 rounded-full border-2 border-brand-black bg-brand-black px-4 py-2 text-[12px] font-black uppercase tracking-[0.18em] text-white shadow-[2px_2px_0px_black] transition-all hover:bg-brand-lime hover:text-brand-black"
                  >
                    <Star size={13} />
                    前往集章獎勵
                  </button>
                </>
              ) : (
                <div className="rounded-2xl border border-dashed border-brand-black/20 bg-brand-gray/10 p-4">
                  <p className="text-sm font-black text-brand-black">所有里程碑都已完成</p>
                  <p className="mt-2 text-[12px] font-medium leading-relaxed text-brand-black/65">
                    下一步可以把重心放在任務回訪、集章紀錄與跨站探索。
                  </p>
                </div>
              )}
            </div>
          </KiwimuPanel>
        </div>

        <KiwimuPanel padded={false} className="scroll-mt-20">
          <div id="passport-latest-order" className="scroll-mt-20" />
          <div className="border-b-2 border-brand-black bg-white px-4 py-3">
            <p className="text-[12px] font-black uppercase tracking-[0.2em] text-brand-black/65">
              Latest Activity
            </p>
            <h4 className="mt-1 text-sm font-black text-brand-black">最近訂單與消費狀態</h4>
          </div>

          <div className="space-y-3 p-4">
            {!userId ? (
              <div className="rounded-2xl border border-dashed border-brand-black/20 bg-brand-gray/10 p-4">
                <div>
                  <p className="text-sm font-black text-brand-black">登入後可同步最新訂單</p>
                  <p className="mt-2 text-[12px] font-medium leading-relaxed text-brand-black/65">
                    Shop 與 Map 訂單紀錄會在這裡回來，先登入才能把會員資料接起來。
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => void onLogin()}
                  className="mt-4 inline-flex items-center gap-2 rounded-full border-2 border-brand-black bg-brand-black px-4 py-2 text-[12px] font-black uppercase tracking-[0.18em] text-white shadow-[2px_2px_0px_black] transition-all hover:bg-brand-lime hover:text-brand-black"
                >
                  <ReceiptText size={13} />
                  先登入同步
                </button>
              </div>
            ) : loadingOrder ? (
              <div role="status" className="flex items-center gap-2 rounded-2xl border border-brand-black/10 bg-brand-gray/10 px-4 py-4 text-sm font-bold text-brand-black/60">
                <Loader2 size={16} className="animate-spin" />
                正在讀取最新訂單...
              </div>
            ) : orderError ? (
              <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-4">
                <p className="text-sm font-black text-red-700">訂單狀態暫時無法讀取</p>
                <p className="mt-2 text-[12px] font-medium leading-relaxed text-red-600">
                  {orderError}
                </p>
                <button
                  type="button"
                  onClick={() => setOrderReload(value => value + 1)}
                  className="mt-4 inline-flex items-center gap-2 rounded-full border border-brand-black bg-white px-4 py-2 text-[12px] font-black uppercase tracking-[0.18em] text-brand-black shadow-[2px_2px_0px_black] transition-all hover:bg-brand-gray"
                >
                  重試讀取訂單
                  <ReceiptText size={13} />
                </button>
              </div>
            ) : latestOrder ? (
              <div className="rounded-[1.6rem] border-2 border-brand-black bg-brand-black p-4 text-white shadow-[3px_3px_0px_black]">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[12px] font-black uppercase tracking-[0.18em] text-white/65">
                      Latest Order
                    </p>
                    <p className="mt-2 text-sm font-black text-white">{latestOrder.order_id}</p>
                  </div>
                  <span className="rounded-full border border-white/10 bg-white/10 px-3 py-1 text-[12px] font-black uppercase tracking-[0.16em] text-brand-lime">
                    {statusLabel}
                  </span>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-2">
                  <div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-3">
                    <p className="text-[12px] font-black uppercase tracking-[0.16em] text-white/65">
                      來源
                    </p>
                    <p className="mt-1 text-[12px] font-black text-white">
                      {getOrderSourceLabel(latestOrder)}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-3">
                    <p className="text-[12px] font-black uppercase tracking-[0.16em] text-white/65">
                      取貨時間
                    </p>
                    <p className="mt-1 text-[12px] font-black text-white">
                      {formatPickupTime(latestOrder.pickup_time)}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-3">
                    <p className="text-[12px] font-black uppercase tracking-[0.16em] text-white/65">
                      訂單金額
                    </p>
                    <p className="mt-1 text-[12px] font-black text-white">
                      ${Number(latestOrder.final_price ?? latestOrder.total_price ?? 0).toLocaleString()}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => trackSectionClick('latest_order', 'shop', openShopMenu)}
                  className="mt-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-4 py-2 text-[12px] font-black uppercase tracking-[0.18em] text-white transition-all hover:bg-white hover:text-brand-black"
                >
                  <Package2 size={13} />
                  前往甜點選單
                </button>
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-brand-black/20 bg-brand-gray/10 p-4">
                <p className="text-sm font-black text-brand-black">目前還沒有同步到訂單</p>
                <p className="mt-2 text-[12px] font-medium leading-relaxed text-brand-black/65">
                  第一次登入下單後，這裡就會出現你的最近取貨與消費狀態。
                </p>
                <button
                  type="button"
                  onClick={() => trackSectionClick('latest_order_empty', 'shop', openShopMenu)}
                  className="mt-4 inline-flex items-center gap-2 rounded-full border border-brand-black bg-white px-4 py-2 text-[12px] font-black uppercase tracking-[0.18em] text-brand-black shadow-[2px_2px_0px_black] transition-all hover:bg-brand-gray"
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
                  <p className="mt-1 text-[12px] font-medium leading-relaxed text-brand-black/65">
                    查看印章、門市定位與跨站探索進度。
                  </p>
                </div>
              </div>
              <ArrowRight size={15} className="text-brand-black/65" />
            </button>
          </div>
        </KiwimuPanel>
      </div>

      <KiwimuPanel padded={false}>
        <div className="border-b border-brand-black/10 px-4 py-3">
          <h4 className="text-sm font-black">下次回來，從這裡繼續</h4>
          <p className="mt-2 text-xs leading-relaxed text-brand-black/65">今天做一件小事即可。線上簽到與到店集章是不同的紀錄。</p>
        </div>
        <div className="grid gap-3 p-4 sm:grid-cols-2">
          <button type="button" onClick={() => trackSectionClick('return_online', 'journey', () => onGoJourney('online'))}
            className="rounded-2xl border border-brand-black/20 bg-brand-lime/15 p-4 text-left">
            <span className="block text-sm font-black">在家先做線上任務 →</span>
            <span className="mt-2 block text-xs leading-relaxed text-brand-black/65">例如完成免費測驗，再回護照查看探索進度。</span>
          </button>
          <button type="button" onClick={() => trackSectionClick('return_store', 'journey', () => onGoJourney('store'))}
            className="rounded-2xl border border-brand-black/20 bg-white p-4 text-left">
            <span className="block text-sm font-black">到店繼續集章 →</span>
            <span className="mt-2 block text-xs leading-relaxed text-brand-black/65">定位與 QR 在現場完成，獎勵由門市確認。</span>
          </button>
          <a href="https://kiwimu.com/read/library?from=passport_report_library" target="_blank" rel="noopener noreferrer"
            onClick={() => trackOutboundNavigation('https://kiwimu.com/read/library?from=passport_report_library', 'member_report_library', { entrySurface: 'passport_return', destinationType: 'report_library' })}
            className="flex min-h-11 items-center gap-2 rounded-xl border border-brand-black/20 px-4 py-3 text-xs font-bold">
            <BookOpen size={16} /> 回看我已購的 MBTI 報告 <ExternalLink size={14} />
          </a>
          <a href="https://map.kiwimu.com/?from=passport_visit_plan" target="_blank" rel="noopener noreferrer"
            onClick={() => trackOutboundNavigation('https://map.kiwimu.com/?from=passport_visit_plan', 'member_visit_plan', { entrySurface: 'passport_return', destinationType: 'map' })}
            className="flex min-h-11 items-center gap-2 rounded-xl border border-brand-black/20 px-4 py-3 text-xs font-bold">
            <Package2 size={16} /> 查看月島地圖與甜點 <ExternalLink size={14} />
          </a>
        </div>
      </KiwimuPanel>
    </div>
  );
}
