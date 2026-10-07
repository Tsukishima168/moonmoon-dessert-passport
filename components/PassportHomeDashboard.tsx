import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowRight,
  BookOpen,
  Calendar,
  ExternalLink,
  Loader2,
  Package2,
  ReceiptText,
  Star,
  ChevronDown,
  MapPin,
  ShieldCheck,
} from 'lucide-react';

import { getUserShopOrders, type ShopOrderRecord } from '../src/api/orders';
import { getOrderSourceLabel, getOrderStatusLabel } from '../src/lib/orderLabels';
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
  authLoading?: boolean;
}

function formatPickupTime(value: string) {
  return new Date(value).toLocaleString('zh-TW', {
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
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
  authLoading = false,
}: PassportHomeDashboardProps) {
  const [latestOrder, setLatestOrder] = useState<ShopOrderRecord | null>(null);
  const [loadingOrder, setLoadingOrder] = useState(false);
  const [orderError, setOrderError] = useState<string | null>(null);
  const [orderReload, setOrderReload] = useState(0);
  const hasTrackedView = useRef(false);
  const orderRef = useRef<HTMLDetailsElement>(null);

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
    return getOrderStatusLabel(latestOrder.status);
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
        title: '登入，開始累積你的月島日常',
        description: '用 Google 帳號登入，查看會員資料與訂單。已有的探索紀錄會留在這個裝置。',
        label: '使用 Google 登入',
        icon: <ReceiptText size={15} />,
        run: () => void onLogin(),
      };
    }

    if (canCheckin) {
      return {
        id: 'checkin',
        eyebrow: 'Today',
        title: checkinStreak > 0 ? `已連續簽到 ${checkinStreak} 天，今天也來坐坐` : '今天來簽到，留下一次回訪',
        description: '完成每日簽到後，此裝置的回訪紀錄與積分會更新。',
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
        run: () => {
          if (orderRef.current) {
            orderRef.current.open = true;
            orderRef.current.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
            orderRef.current.querySelector('summary')?.focus();
          }
        },
      };
    }

    return {
      id: 'journey',
      eyebrow: 'Continue',
      title: '今天已簽到，慢慢繼續探索吧',
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
    <div className="member-home">
      <section className="member-welcome" aria-labelledby="member-welcome-title">
        <div className="member-welcome-copy">
          <p className="member-eyebrow">MOON ISLAND · YOUR PASSPORT</p>
          <h2 id="member-welcome-title">{hasIdentity ? <><span>{displayName}，</span><span>歡迎回來。</span></> : <><span>在月島，</span><span>留一份日常。</span></>}</h2>
          <p className="member-welcome-intro">{hasIdentity ? '今天的小事、累積的印章，都從這裡繼續。' : '你的集章、訂單與已購報告，在這裡找到。'}</p>
          <div className="member-next-action">
            <h3>{nextAction.title}</h3>
            <p>{nextAction.description}</p>
            <button type="button" className="member-button member-button-gold" onClick={handleNextAction} disabled={nextAction.id === 'login' && authLoading}>
              {nextAction.icon}{nextAction.id === 'login' && authLoading ? '確認登入狀態中…' : nextAction.label}<ArrowRight size={18} aria-hidden="true" />
            </button>
          </div>
        </div>
        <div className="member-passport-card">
          <div className="member-card-top"><span>月島會員護照</span><span className="member-card-mode">{passportMode}</span></div>
          <img src="/assets/member-green/kiwimu-welcome-841d2d20d0.webp" alt="Kiwimu 在綠葉旁等待你的下一次回訪" width="1517" height="1037" fetchPriority="high" />
          <div className="member-card-holder"><span>{hasIdentity ? displayName : '月島旅人'}</span><span>No. {passportCoverNumber}</span></div>
          <div className="member-card-stats"><div><span>{hasIdentity ? '積分紀錄' : '此裝置積分'}</span><strong>{points.toLocaleString()}<small>P</small></strong></div><div><span>探索印章</span><strong>{unlockedCount}<small>枚</small></strong></div></div>
          <p>{hasIdentity ? '積分可能包含此裝置紀錄；會員可兌換餘額與領取資格請向門市確認。' : '積分與探索印章保留於此裝置，會員可兌換餘額需另行確認。'}</p>
        </div>
      </section>

      <section className="member-essentials" aria-label="常用會員功能">
        <div className="member-essential">
          <div className="member-icon"><Star size={24} aria-hidden="true" /></div>
          <div><h3>我的集章</h3><p>{unlockedCount > 0 ? `已累積 ${unlockedCount} 枚探索印章。` : '從一個小任務，開始你的月島紀錄。'}</p><button type="button" className="member-link" onClick={() => trackSectionClick('journey', 'journey', () => onGoJourney('online'))}>查看集章 <ArrowRight size={16} aria-hidden="true" /></button></div>
        </div>
        <div className="member-essential">
          <div className="member-icon"><BookOpen size={24} aria-hidden="true" /></div>
          <div><h3>我的報告</h3><p>已保存的 MBTI 報告，隨時回來讀。</p><a className="member-link" href="https://kiwimu.com/read/library?from=passport_report_library" target="_blank" rel="noopener noreferrer" onClick={() => trackOutboundNavigation('https://kiwimu.com/read/library?from=passport_report_library', 'member_report_library', { entrySurface: 'passport_return', destinationType: 'report_library' })}>開啟報告清單 <ExternalLink size={15} aria-hidden="true" /><span className="visually-hidden">（另開分頁）</span></a></div>
        </div>
      </section>

      <details className="member-disclosure" ref={orderRef} id="passport-latest-order">
        <summary><span className="member-summary-title"><ReceiptText size={20} aria-hidden="true" />我的訂單</span><span className="member-summary-meta">{!userId ? '登入後查看' : loadingOrder ? '讀取中' : orderError ? '暫時無法讀取' : latestOrder ? statusLabel : '尚無訂單'}</span><ChevronDown size={18} aria-hidden="true" /></summary>
        <div className="member-order-content">
          {!userId ? <p>使用首頁的 Google 登入後，這裡會顯示該帳號最近的甜點訂單。</p>
            : loadingOrder ? <p role="status" className="member-loading"><Loader2 size={18} className="animate-spin" />正在讀取最新訂單…</p>
            : orderError ? <div role="alert"><h3>訂單暫時無法讀取</h3><p>{orderError}</p><button type="button" className="member-button" onClick={() => setOrderReload(value => value + 1)}>重試讀取訂單</button></div>
            : latestOrder ? <div><div className="member-order-heading"><h3>最近一筆訂單</h3><span className="member-state">{statusLabel}</span></div><p className="member-order-number">{latestOrder.order_id}</p><dl className="member-order-facts"><div><dt>取貨時間</dt><dd>{formatPickupTime(latestOrder.pickup_time)}</dd></div><div><dt>訂單金額</dt><dd>NT$ {Number(latestOrder.final_price ?? latestOrder.total_price ?? 0).toLocaleString()}</dd></div><div><dt>訂購來源</dt><dd>{getOrderSourceLabel(latestOrder)}</dd></div></dl><button type="button" className="member-link" onClick={() => trackSectionClick('latest_order', 'shop', openShopMenu)}>前往甜點選單 <ExternalLink size={15} aria-hidden="true" /></button></div>
            : <div><h3>還沒有找到你的訂單</h3><p>使用同一個會員帳號登入下單，之後可在這裡查看最近的付款與取貨狀態。</p><button type="button" className="member-link" onClick={() => trackSectionClick('latest_order_empty', 'shop', openShopMenu)}>看看甜點選單 <ExternalLink size={15} aria-hidden="true" /></button></div>}
        </div>
      </details>

      <div className="member-quiet-links"><button type="button" onClick={() => trackSectionClick('return_store', 'journey', () => onGoJourney('store'))}><MapPin size={16} aria-hidden="true" />我已到店，查看集章方式<ArrowRight size={15} aria-hidden="true" /></button><button type="button" onClick={() => trackSectionClick('next_unlock', 'rewards', onGoRewards)}>獎勵說明<ArrowRight size={15} aria-hidden="true" /></button></div>
      <p className="member-record-note"><ShieldCheck size={14} aria-hidden="true" />線上探索與到店集章分開；實體獎勵需由門市確認領取資格。</p>
    </div>
  );
}
