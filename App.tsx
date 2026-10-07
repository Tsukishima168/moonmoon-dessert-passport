import React, { useState, useEffect, useRef } from 'react';
import { useSupabaseAuth } from './src/contexts/SupabaseAuthContext';

import { Sparkles, BookOpen, ArrowUpRight, LogIn, LogOut, CircleAlert, X } from 'lucide-react';
import { PassportTab, Screen } from './types';
import { BRANDING } from './constants';
import PassportScreen from './PassportScreen';
import LoadingScreen from './components/LoadingScreen';
import PwaInstallPrompt from './components/PwaInstallPrompt';
import { isSsoBrokerMode } from './src/lib/ssoBroker';
import {
  unlockStamp,
  getUnlockedStampCount,
  handleIncomingPointsSync
} from './passportUtils';
import { consumeMbtiClaim } from './mbtiClaim';
import { consumeRewardClaim, resolveRewardClaimTarget } from './rewardClaim';
import { trackUserEvent } from './src/lib/eventTracker';
import { saveStoredMbtiResult } from './src/lib/mbtiResult';
import { syncAttributionFromUrl } from './src/lib/attribution';
import {
  trackEvent,
  trackEventWhenReady,
  trackDessertView,
  trackButtonClick,
  trackTimeSpent,
  trackEntranceSource,
  buildUtmUrl,
  trackUtmLanding
} from './analytics';

type PassportWindow = Window & {
  __PASSPORT_INITIAL_SEARCH__?: string;
};

const getInitialUrlSearch = () => {
  if (typeof window === 'undefined') {
    return '';
  }

  return (window as PassportWindow).__PASSPORT_INITIAL_SEARCH__ || window.location.search;
};

const getInitialUrlParams = () => new URLSearchParams(getInitialUrlSearch());

const PENDING_REWARD_CLAIM_KEY = 'kiwimu_passport_pending_reward_claim';
const TRACKING_ENTRY_PARAMS = new Set([
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_content',
  'utm_term',
  'from',
  'source',
  'source_site',
  'origin_path',
  'entry_surface',
  'destination_type',
]);

type PendingRewardClaim = {
  code: string;
  rewardId: string;
};

const getRewardClaimCodeParam = (params: URLSearchParams) => {
  return params.get('claim_code') || (params.has('reward') ? params.get('code') : null);
};

const readPendingRewardClaim = (): PendingRewardClaim | null => {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const raw = window.sessionStorage.getItem(PENDING_REWARD_CLAIM_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<PendingRewardClaim>;
    if (typeof parsed.code !== 'string' || typeof parsed.rewardId !== 'string') {
      return null;
    }
    return {
      code: parsed.code,
      rewardId: parsed.rewardId,
    };
  } catch {
    return null;
  }
};

const savePendingRewardClaim = (claim: PendingRewardClaim) => {
  try {
    window.sessionStorage.setItem(PENDING_REWARD_CLAIM_KEY, JSON.stringify(claim));
  } catch {
    // Ignore storage failures; the URL fallback is already scrubbed for safety.
  }
};

const clearPendingRewardClaim = () => {
  try {
    window.sessionStorage.removeItem(PENDING_REWARD_CLAIM_KEY);
  } catch {
    // no-op
  }
};

const scrubSensitiveClaimParamsFromUrl = () => {
  if (typeof window === 'undefined') {
    return;
  }

  const url = new URL(window.location.href);
  // OAuth callback 一定帶非空 state；用 getAll + trim 收斂兩個 edge：
  //   - `?state=%20` 之類純空白 state 不再被當成 OAuth state 保護 reward code
  //   - `?state=&state=REAL` 之類重複 state 不會被第一個空值矇騙，誤刪真實 OAuth code
  // 與 index.html 早期 scrubber、oauthSafety.ts 的 hasOAuthCallbackSignal 三邊對齊。
  const hasOAuthState = url.searchParams.getAll('state').some((value) => value.trim().length > 0);
  const hasRewardClaimCode = !hasOAuthState && url.searchParams.has('code') && url.searchParams.has('reward');
  const paramsToScrub = hasRewardClaimCode
    ? ['claim', 'claim_code', 'reward', 'code']
    : ['claim', 'claim_code', 'reward'];
  let changed = false;

  paramsToScrub.forEach((param) => {
    if (url.searchParams.has(param)) {
      url.searchParams.delete(param);
      changed = true;
    }
  });

  if (!changed) {
    return;
  }

  const nextSearch = url.searchParams.toString();
  window.history.replaceState({}, '', `${url.pathname}${nextSearch ? `?${nextSearch}` : ''}${url.hash}`);
};

const getOrCreatePassportCoverNumber = () => {
  if (typeof window === 'undefined') {
    return '001';
  }

  const existing = window.localStorage.getItem('moonmoon_passport_cover_no');
  if (existing) {
    return existing;
  }

  const generated = String(Math.floor(Math.random() * 900) + 100);
  window.localStorage.setItem('moonmoon_passport_cover_no', generated);
  return generated;
};

const PUBLIC_PASSPORT_TABS: PassportTab[] = ['hub', 'journey', 'rewards'];

const getInitialScreen = (): Screen => {
  if (typeof window === 'undefined') {
    return 'landing';
  }

  const params = getInitialUrlParams();
  const opensPassport =
    params.get('screen') === 'passport' ||
    params.has('tab') ||
    params.has('stamp') ||
    params.has('unlock') ||
    params.has('claim') ||
    params.has('claim_code') ||
    (params.has('reward') && params.has('code')) ||
    params.has('reward') ||
    params.get('auto_unlock') === 'true' ||
    params.get('action') === 'add_points' ||
    params.has('amount') ||
    params.has('utm_source') ||
    params.has('from');

  return opensPassport ? 'passport' : 'landing';
};

const getInitialPassportTab = (): PassportTab => {
  if (typeof window === 'undefined') {
    return 'hub';
  }

  const params = getInitialUrlParams();
  const tab = params.get('tab');
  return PUBLIC_PASSPORT_TABS.includes(tab as PassportTab) ? (tab as PassportTab) : 'hub';
};

const isPureTrackingEntry = () => {
  const params = getInitialUrlParams();
  const keys = Array.from(params.keys());
  return keys.length > 0 && keys.every((key) => TRACKING_ENTRY_PARAMS.has(key));
};

const isInitialSsoBrokerEntry = () => isSsoBrokerMode(getInitialUrlParams());

// -- Header --
const Header = ({
  currentScreen,
  passportCoverNumber,
  onHomeClick,
}: {
  currentScreen: Screen;
  passportCoverNumber: string;
  onHomeClick: () => void;
}) => {
  const { user: supabaseUser, loading: authLoading, signInWithGoogle, signOut: supabaseSignOut } = useSupabaseAuth();
  const [signingOut, setSigningOut] = useState(false);

  if (currentScreen !== 'landing') {
    return null;
  }

  return (
    <header className="ku-passport-fixed-header fixed left-0 right-0 z-50 px-6 py-6 flex justify-between items-center pointer-events-none">
      <div className="flex items-center gap-2 pointer-events-auto">
        <button onClick={onHomeClick} className="cursor-pointer" aria-label="回首頁">
          <img
            src={BRANDING.KIWIMU_LOGO}
            alt="Kiwimu"
            className="h-8 md:h-9 w-auto object-contain"
            loading="eager"
            style={{ filter: 'brightness(0)' }}
          />
        </button>
      </div>

      <div className="pointer-events-auto flex items-center gap-2">
        <div className="hidden sm:flex items-center rounded-full border border-brand-black bg-white/90 px-4 py-2 text-[12px] font-black uppercase tracking-[0.22em] text-brand-black/65 shadow-[2px_2px_0px_black]">
          Passport No. {passportCoverNumber}
        </div>

        {supabaseUser ? (
          <div className="flex items-center bg-white border border-brand-black rounded-full px-2 py-1 shadow-[2px_2px_0px_black] ml-1 gap-2">
            <button type="button" aria-label={signingOut ? '登出中' : '登出'} disabled={signingOut} onClick={async () => { setSigningOut(true); try { await supabaseSignOut(); } finally { setSigningOut(false); } }} className="flex items-center gap-1 text-xs font-bold text-gray-500 hover:text-brand-black transition-colors">
              <LogOut size={12} /> <span className="hidden sm:inline">登出</span>
            </button>
          </div>
        ) : (
          <button
            type="button"
            disabled={authLoading}
            aria-label={authLoading ? '確認登入狀態中' : '使用 Google 登入'}
            onClick={() => void signInWithGoogle()}
            className="flex items-center gap-1.5 text-xs bg-brand-lime border border-brand-black text-brand-black ml-1 px-3 py-2 min-h-11 rounded-full font-bold shadow-[2px_2px_0px_black] hover:bg-white hover:translate-y-px hover:shadow-[1px_1px_0px_black] transition-all"
          >
            <LogIn size={14} /> <span className="hidden sm:inline">Google </span>{authLoading ? '確認中…' : '登入'}
          </button>
        )}
      </div>
    </header>
  );
};

// -- Screens --

// 建議書：開場問題（隨機輪播）
const LandingScreen: React.FC<{ onOpenPassport: () => void; passportCoverNumber: string }> = ({ onOpenPassport, passportCoverNumber }) => {
  useEffect(() => {
    const startTime = Date.now();
    return () => {
      const duration = (Date.now() - startTime) / 1000;
      trackTimeSpent('landing', duration);
    };
  }, []);

  return (
    <div className="member-landing member-shell">
      <section className="member-landing-stage">
        <div><p className="member-eyebrow">KIWIMU PASSPORT · No. {passportCoverNumber}</p><h1>每次回來，<br />都從這裡繼續。</h1><p>集章、訂單、已購報告。<br />你的月島日常，放在一個地方。</p><button type="button" className="member-button member-button-gold" aria-label="開啟會員中心" onClick={() => { trackButtonClick('open_passport', 'landing_cover'); onOpenPassport(); }}><BookOpen size={19} aria-hidden="true" />開啟會員中心<ArrowUpRight size={18} aria-hidden="true" /></button><span className="member-landing-note">先看看也可以，會員資料請登入後查看。</span></div>
        <img src="/assets/member-green/kiwimu-welcome-841d2d20d0.webp" alt="在綠葉與柔和月光旁等待你的 Kiwimu" width="1517" height="1037" fetchPriority="high" />
      </section>
      <p className="member-landing-footer">MOON ISLAND · 一份屬於你的日常紀錄</p>
    </div>
  );
};

const SsoBrokerScreen = () => {
  const { user, loading, error, signInWithGoogle } = useSupabaseAuth();
  const startedRef = useRef(false);

  useEffect(() => {
    if (loading || user || startedRef.current) {
      return;
    }

    startedRef.current = true;
    void signInWithGoogle();
  }, [loading, signInWithGoogle, user]);

  return (
    <div className="ku-passport-route-shell flex items-center justify-center bg-brand-cream px-6 text-center">
      <div className="w-full max-w-sm rounded-[24px] border border-[#D8D7C4] bg-white p-8 shadow-[0_16px_32px_#10211530]">
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full border border-[#D8D7C4] bg-brand-lime">
          <LogIn size={22} className="text-brand-black" />
        </div>
        <p className="mb-3 text-[12px] font-black uppercase tracking-[0.28em] text-brand-black/65">
          Kiwimu Passport
        </p>
        <h1 className="text-2xl font-black leading-tight text-brand-black">
          正在確認會員身份
        </h1>
        <p className="mt-4 text-sm font-semibold leading-7 text-brand-black/65">
          這個視窗只用來完成登入。完成後會自動回到原本頁面。
        </p>
        {error ? (
          <>
          <p role="alert" className="mt-5 text-sm font-semibold leading-7 text-red-700">{error}</p>
          <button
            type="button"
            onClick={() => {
              startedRef.current = false;
              void signInWithGoogle();
            }}
            className="mt-6 w-full rounded-full border border-[#D8D7C4] bg-brand-lime px-5 py-3 text-xs font-black uppercase tracking-[0.18em] text-brand-black shadow-[0_8px_28px_#1F2F1F26]"
          >
            重新登入
          </button>
          </>
        ) : (
          <p className="mt-6 animate-pulse text-xs font-black uppercase tracking-[0.2em] text-brand-black/65">
            正在開啟 Google 登入…
          </p>
        )}
      </div>
    </div>
  );
};

// -- Main App --

function App() {
  const { user: supabaseUser, signInWithGoogle, signOut: supabaseSignOut, error: authError, clearError: clearAuthError } = useSupabaseAuth();
  const [screen, setScreen] = useState<Screen>(getInitialScreen);
  const [passportTab, setPassportTab] = useState<PassportTab>(getInitialPassportTab);
  const [loading, setLoading] = useState(true);
  const [appNotice, setAppNotice] = useState<{ tone: 'success' | 'error'; message: string } | null>(null);
  const prevScreenRef = useRef<Screen | null>(null);
  const skipInitialTrackingUrlSyncRef = useRef(isPureTrackingEntry());
  const [isBrokerEntry] = useState(isInitialSsoBrokerEntry);
  const [passportCoverNumber] = useState(getOrCreatePassportCoverNumber);

  // Initial Loading Simulation
  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(false);
    }, 1500); // 1.5s for brand impact
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!appNotice) {
      return;
    }

    const timer = window.setTimeout(() => {
      setAppNotice(null);
    }, 3600);

    return () => window.clearTimeout(timer);
  }, [appNotice]);

  useEffect(() => {
    if (!authError) {
      return;
    }

    setAppNotice({
      tone: 'error',
      message: authError,
    });
  }, [authError]);

  useEffect(() => {
    if (skipInitialTrackingUrlSyncRef.current) {
      skipInitialTrackingUrlSyncRef.current = false;
      return;
    }

    const params = new URLSearchParams(window.location.search);

    if (screen === 'passport') {
      params.set('screen', 'passport');
      params.set('tab', passportTab);
    } else {
      params.delete('screen');
      params.delete('tab');
    }

    const nextSearch = params.toString();
    const nextUrl = `${window.location.pathname}${nextSearch ? `?${nextSearch}` : ''}${window.location.hash}`;
    window.history.replaceState({}, '', nextUrl);
  }, [passportTab, screen]);

  // Handle cross-site points sync from Gacha redirect URL
  useEffect(() => {
    const result = handleIncomingPointsSync();
    if (!result) return;

    if ('rejected' in result) {
      // 只送原因代碼，不帶 amount／device_id／ts 等任何可識別或可重放的值。
      trackEventWhenReady('points_sync_rejected', { reason: result.rejected });
      return;
    }

    // 不帶金額或任何 id；被截斷（超過單次／日額度，多的作廢）時只標 capped。
    trackEventWhenReady(
      'points_sync_received',
      result.capped ? { source: 'gacha', capped: true } : { source: 'gacha', points: result.credited, capped: false },
    );

    // 額度用完的同步入帳 0：不需要開護照。
    if (result.credited <= 0) return;

    // 注意：這裡不能再 dispatch 'kiwimu:points_earned'。handleIncomingPointsSync 已經入帳
    // （並發出 passport-points-updated 更新畫面），而 PassportScreen 掛載時（網址帶 add_points 會直接
    // 開護照）會監聽 kiwimu:points_earned 並再呼叫 addPassportPoints，等於同一筆同步被入帳兩次。

    // Open passport directly so users can immediately see updated points
    setPassportTab('hub');
    setScreen('passport');
  }, []);

  const goHome = () => {
    setScreen('landing');
    window.scrollTo(0, 0);
  };

  // GA4：記錄進入來源（所有 UTM 皆發送 entrance_scan），方便依放置位置分析
  useEffect(() => {
    const initialSearch = getInitialUrlSearch();
    // R4: 同步 kw_attr 第一接觸歸因 cookie（from／utm_source），供 R3 的 source_site 判定
    // 在 OAuth 整頁導覽之後仍讀得到（見 analytics.ts trackAuthConversion）。
    syncAttributionFromUrl(initialSearch);
    trackUtmLanding(initialSearch);
    const params = new URLSearchParams(initialSearch);
    const utmSource = params.get('utm_source');
    const utmMedium = params.get('utm_medium') || 'qr';
    const utmCampaign = params.get('utm_campaign');
    if (utmSource) {
      trackEntranceSource(utmSource, utmMedium, utmCampaign || undefined);
    }
  }, []);

  // Handle URL parameters for stamp unlocking (QR codes, MBTI claims, etc.)
  useEffect(() => {
    const params = getInitialUrlParams();
    const stampParam = params.get('stamp');
    const unlockParam = params.get('unlock');
    const claimParam = params.get('claim');
    const pendingRewardClaim = readPendingRewardClaim();
    const rewardParam = params.get('reward') || pendingRewardClaim?.rewardId || null;
    const claimCodeParam = getRewardClaimCodeParam(params) || pendingRewardClaim?.code || null;
    // Debug 後門只存在於開發建置：正式站 import.meta.env.DEV 為 false，?debug=1 完全是 no-op
    // （不改 localStorage、不送事件），整段在 production bundle 內會被 tree-shake 掉。
    const isDebugAllStamps = import.meta.env.DEV && params.get('debug') === '1';
    const mbtiType = params.get('mbti_type');
    const autoUnlock = params.get('auto_unlock');
    const variant = params.get('variant');
    const hasSensitiveClaimParam = Boolean(claimParam || params.get('claim_code') || rewardParam);

    if (hasSensitiveClaimParam) {
      scrubSensitiveClaimParamsFromUrl();
    }

    if (!stampParam && !unlockParam && !claimParam && (!rewardParam || !claimCodeParam) && !isDebugAllStamps && !(autoUnlock === 'true' && mbtiType)) {
      return;
    }

    void (async () => {
      let stampUnlocked = false;

      // Debug mode: unlock all stamps（僅開發建置；見上方 isDebugAllStamps）
      if (isDebugAllStamps) {
        try {
          localStorage.setItem('moonmoon_passport', JSON.stringify({
            unlockedStamps: [
              'shop_checkin',
              'quiz_completed',
              'ig_followed',
              'line_joined',
              'order_with_staff',
              'secret_qr_1',
              'secret_qr_2',
              'google_review',
            ],
            redeemedRewards: [],
            createdAt: Date.now(),
            lastUpdatedAt: Date.now()
          }));
          trackEvent('debug_passport_unlocked', { mode: 'all_stamps' });
          stampUnlocked = true;
        } catch (err) {
          console.warn('Failed to set debug passport state:', err);
        }
      }

      // New QR code unlock system using `? unlock = ` parameter
      if (unlockParam) {
        // Map URL params to stamp IDs
        const unlockMap: Record<string, string> = {
          'secret_spot': 'secret_qr_1',
          'observer': 'secret_qr_2',
          'dessert_connect': 'ig_followed',
          'first_visit': 'order_with_staff'
        };

        const stampId = unlockMap[unlockParam];
        if (stampId) {
          unlockStamp(stampId);
          trackEvent('stamp_unlocked', {
            stamp_id: stampId,
            method: 'qr_code',
            unlock_param: unlockParam
          });
          trackUserEvent('stamp_earned', { stamp_id: stampId, method: 'qr_code' });
          stampUnlocked = true;
        }
      }



      // MBTI Auto-Unlock (Direct Redirect)
      if (autoUnlock === 'true' && mbtiType) {
        const validTypes = [
          'INTJ', 'INTP', 'ENTJ', 'ENTP',
          'INFJ', 'INFP', 'ENFJ', 'ENFP',
          'ISTJ', 'ISFJ', 'ESTJ', 'ESFJ',
          'ISTP', 'ISFP', 'ESTP', 'ESFP'
        ];
        const upperType = mbtiType.toUpperCase();

        if (validTypes.includes(upperType)) {
          unlockStamp('quiz_completed');

          try {
            saveStoredMbtiResult({
              mbtiType: upperType,
              variant: variant === 'A' || variant === 'T' ? variant : null,
              source: 'auto_unlock_url',
            });
          } catch (e) {
            console.error('Failed to save MBTI result', e);
          }

          trackEvent('stamp_unlocked', {
            stamp_id: 'quiz_completed',
            method: 'auto_unlock_url',
            mbti_result: upperType
          });
          trackUserEvent('stamp_earned', { stamp_id: 'quiz_completed', method: 'mbti', mbti_type: upperType });

          stampUnlocked = true;
        }
      }

      // Legacy stamp parameter support (for backward compatibility)
      if (stampParam) {
        // Auto-unlock stamp based on URL parameter
        if (stampParam === 'quiz') {
          unlockStamp('quiz_completed');
          trackEvent('stamp_auto_unlocked', { stamp_id: 'quiz_completed', source: 'url' });
          stampUnlocked = true;
        } else if (stampParam === 'mbti_complete' || stampParam === 'mbti') {
          unlockStamp('quiz_completed');
          trackEvent('stamp_auto_unlocked', { stamp_id: 'quiz_completed', source: 'url' });
          stampUnlocked = true;
        } else if (stampParam === 'secret1') {
          unlockStamp('secret_qr_1');
          trackEvent('stamp_auto_unlocked', { stamp_id: 'secret_qr_1', source: 'qr_scan' });
          stampUnlocked = true;
        } else if (stampParam === 'secret2') {
          unlockStamp('secret_qr_2');
          trackEvent('stamp_auto_unlocked', { stamp_id: 'secret_qr_2', source: 'qr_scan' });
          stampUnlocked = true;
        } else if (stampParam === 'order') {
          unlockStamp('order_with_staff');
          trackEvent('stamp_auto_unlocked', { stamp_id: 'order_with_staff', source: 'qr_scan' });
          stampUnlocked = true;
        }
      }

      // MBTI claim handling
      if (claimParam) {
        const result = await consumeMbtiClaim(claimParam);
        if (result.ok) {
          unlockStamp('quiz_completed');
          saveStoredMbtiResult({
            mbtiType: result.mbtiType,
            variant: result.variant === 'A' || result.variant === 'T' ? result.variant : null,
            source: 'mbti_claim',
          });
          trackEvent('stamp_auto_unlocked', { stamp_id: 'quiz_completed', source: 'mbti_claim' });
          trackEvent('stamp_claim', { status: 'success', source: 'mbti_claim' });
          trackUserEvent('stamp_earned', {
            stamp_id: 'quiz_completed',
            method: 'mbti_claim',
            mbti_type: result.mbtiType,
            variant: result.variant,
          });
          stampUnlocked = true;
        } else if ('reason' in result) {
          trackEvent('stamp_claim_failed', { reason: result.reason });
          trackEvent('stamp_claim', { status: 'failed', reason: result.reason });
        }
      }



      // Reward Claim handling (Easter Egg Master, etc.)
      if (rewardParam && claimCodeParam) {
        const rewardTarget = resolveRewardClaimTarget(rewardParam);

        if (!rewardTarget) {
          clearPendingRewardClaim();
          trackEvent('stamp_claim_failed', { reason: 'unsupported_reward_id', reward_id: rewardParam });
          setAppNotice({
            tone: 'error',
            message: '這個徽章連結目前無法使用，請回原活動頁重新開啟；若仍無法領取，請聯繫月島協助。',
          });
        } else {
          const result = await consumeRewardClaim(claimCodeParam, rewardParam);

          if (!result.ok) {
            const errorReason = 'reason' in result ? (result as { reason: string }).reason : 'unknown';
            console.error('Reward claim failed:', errorReason);
            trackEvent('stamp_claim_failed', { reason: errorReason, reward_id: rewardParam, stamp_id: rewardTarget.stampId });

            if (errorReason === 'invalid_or_used') {
              clearPendingRewardClaim();
              // Check if already unlocked locally
              const currentState = JSON.parse(localStorage.getItem('moonmoon_passport') || '{}');
              if (currentState.unlockedStamps?.includes(rewardTarget.stampId)) {
                stampUnlocked = true; // Already have it, just open passport
              } else {
                setAppNotice({
                  tone: 'error',
                  message: '此領取碼無效、已被使用，或不適用於這枚徽章。請回原活動頁確認領取連結。',
                });
              }
            } else if (errorReason === 'unconfigured') {
              setAppNotice({
                tone: 'error',
                message: '徽章領取暫時無法使用，請稍後從原活動頁重試；若持續發生，請聯繫月島協助。',
              });
            } else if (errorReason === 'auth_required') {
              savePendingRewardClaim({ code: claimCodeParam, rewardId: rewardParam });
              setAppNotice({
                tone: 'error',
                message: '請先登入 Kiwimu Passport，再回來領取這枚限定徽章。',
              });
            } else {
              setAppNotice({
                tone: 'error',
                message: '兌換失敗，請稍後再試。',
              });
            }
          } else {
            // Success
            clearPendingRewardClaim();
            unlockStamp(rewardTarget.stampId);
            trackEvent('stamp_auto_unlocked', { stamp_id: rewardTarget.stampId, source: 'reward_claim', reward_id: rewardParam });
            trackEvent('stamp_claim', {
              status: 'success',
              source: 'reward_claim',
              reward_id: rewardParam,
              stamp_id: rewardTarget.stampId,
            });
            setAppNotice({
              tone: 'success',
              message: `成功領取「${rewardTarget.stampName}」徽章。`,
            });
            stampUnlocked = true;
          }
        }
      }

      // Show passport and success message after unlocking
      if (stampUnlocked) {
        setAppNotice((currentNotice) => currentNotice ?? {
          tone: 'success',
          message: '成功解鎖印章，請查看你的護照。',
        });

        // Open passport to show the unlocked stamp
        prevScreenRef.current = screen;
        setPassportTab('hub');
        setScreen('passport');
      }

      // Clean up URL
      window.history.replaceState({}, '', `${window.location.pathname}${window.location.hash}`);
    })();
  }, []);

  const openPassport = () => {
    if (screen !== 'passport') {
      prevScreenRef.current = screen;
    }
    setPassportTab('hub');
    setScreen('passport');
    trackEvent('passport_opened', { from_screen: screen });
  };

  const closePassport = () => {
    setScreen(prevScreenRef.current || 'landing');
    trackEvent('passport_closed');
  };



  return (
    <div className="ku-passport-app-shell font-sans selection:bg-brand-lime selection:text-brand-black">
      {isBrokerEntry ? (
        <SsoBrokerScreen />
      ) : (
        <>
      {loading && <LoadingScreen />}

      {/* Google Login is now inside <Header /> */}

      <Header currentScreen={screen} passportCoverNumber={passportCoverNumber} onHomeClick={goHome} />

      {appNotice && (
        <div className="fixed top-[calc(var(--ku-rail-height)+6rem)] left-1/2 z-70 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 px-1">
          <div
            className={`flex items-start gap-3 rounded-2xl border px-4 py-3 shadow-[0_8px_28px_#1F2F1F26] ${
              appNotice.tone === 'success'
                ? 'border-[#D8D7C4] bg-brand-lime text-brand-black'
                : 'border-red-200 bg-red-50 text-red-700'
            }`}
          >
            {appNotice.tone === 'success' ? (
              <Sparkles size={18} className="mt-0.5 shrink-0" />
            ) : (
              <CircleAlert size={18} className="mt-0.5 shrink-0" />
            )}
            <p role={appNotice.tone === 'error' ? 'alert' : 'status'} className="flex-1 text-sm font-semibold leading-6">{appNotice.message}</p>
            <button
              type="button"
              onClick={() => {
                setAppNotice(null);
                clearAuthError();
              }}
              className="rounded-full p-1 transition-colors hover:bg-black/5"
              aria-label="關閉通知"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      )}

      <main>
        {screen === 'landing' && <LandingScreen onOpenPassport={openPassport} passportCoverNumber={passportCoverNumber} />}
        {screen === 'passport' && (
          <PassportScreen
            onClose={closePassport}
            passportCoverNumber={passportCoverNumber}
            initialTab={passportTab}
            onTabChange={setPassportTab}
          />
        )}
      </main>

      <PwaInstallPrompt />
        </>
      )}

    </div>
  );
}

export default App;
