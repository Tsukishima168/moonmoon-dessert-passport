import React, { useState, useEffect, useRef } from 'react';
import { useSupabaseAuth } from './src/contexts/SupabaseAuthContext';

import { Sparkles, BookOpen, LogIn, LogOut, CircleAlert, X } from 'lucide-react';
import { Screen } from './types';
import { BRANDING } from './constants';
import { Button } from './components/Button';
import PassportScreen from './PassportScreen';
import LoadingScreen from './components/LoadingScreen';
import {
  unlockStamp,
  getUnlockedStampCount,
  handleIncomingPointsSync
} from './passportUtils';
import { consumeMbtiClaim } from './mbtiClaim';
import { consumeRewardClaim, resolveRewardClaimTarget } from './rewardClaim';
import { trackUserEvent } from './src/lib/eventTracker';
import {
  trackEvent,
  trackDessertView,
  trackButtonClick,
  trackTimeSpent,
  trackEntranceSource,
  buildUtmUrl,
  trackUtmLanding
} from './analytics';

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
  const { user: supabaseUser, signInWithGoogle, signOut: supabaseSignOut } = useSupabaseAuth();

  if (currentScreen !== 'landing') {
    return null;
  }

  return (
    <header className="fixed top-0 left-0 right-0 z-50 px-6 py-6 flex justify-between items-center pointer-events-none">
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
        <div className="hidden sm:flex items-center rounded-full border border-brand-black bg-white/90 px-4 py-2 text-[11px] font-black uppercase tracking-[0.22em] text-brand-black/55 shadow-[2px_2px_0px_black]">
          Passport No. {passportCoverNumber}
        </div>

        {!/Line\//i.test(navigator.userAgent) && (
          <>
            {supabaseUser ? (
              <div className="flex items-center bg-white border border-brand-black rounded-full px-2 py-1 shadow-[2px_2px_0px_black] ml-1 gap-2">
                <button onClick={supabaseSignOut} className="flex items-center gap-1 text-xs font-bold text-gray-500 hover:text-brand-black transition-colors">
                  <LogOut size={12} /> <span className="hidden sm:inline">登出</span>
                </button>
              </div>
            ) : (
              <button 
                onClick={signInWithGoogle} 
                className="flex items-center gap-1.5 text-xs bg-brand-lime border border-brand-black text-brand-black ml-1 px-3 py-2 h-9 rounded-full font-bold shadow-[2px_2px_0px_black] hover:bg-white hover:translate-y-[1px] hover:shadow-[1px_1px_0px_black] transition-all"
              >
                <LogIn size={14} /> <span className="hidden sm:inline">Google </span>登入
              </button>
            )}
          </>
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

  const illustration = BRANDING.LANDING_ILLUSTRATION;

  return (
    <div className="h-[100dvh] w-full flex flex-col relative overflow-hidden bg-[#FAFAF8]">
      <div className="h-full w-full max-w-[1400px] mx-auto flex flex-col relative">
        <div className="flex-none pt-28 md:pt-32 px-4 z-10 relative flex flex-col items-center">
          <div className="text-center space-y-5 max-w-xl mx-auto">
            <p className="text-[11px] font-black uppercase tracking-[0.26em] text-brand-black/45">
              Kiwimu Moon Moon Passport
            </p>
            <p className="text-[11px] font-black uppercase tracking-[0.32em] text-brand-black/40">
              Passport No. {passportCoverNumber}
            </p>
            <h1 className="text-7xl sm:text-8xl md:text-9xl font-serif font-black text-brand-black leading-none tracking-tight" style={{ fontFamily: 'Playfair Display, serif' }}>
              PASSPORT
            </h1>
            <p className="text-sm md:text-base font-semibold text-brand-black/70 leading-relaxed">
              把你在月島的任務、集章、積分與會員福利，
              <br />
              都收進這本屬於你的護照。
            </p>
          </div>
        </div>

        <div className="absolute bottom-0 md:-bottom-10 lg:-bottom-20 left-1/2 -translate-x-1/2 w-full max-w-[500px] md:max-w-[700px] lg:max-w-[900px] flex justify-center z-0 animate-fade-in pointer-events-none">
          {illustration ? (
            <img
              src={illustration}
              alt="Mascot"
              className="w-full h-auto object-contain drop-shadow-2xl max-h-[50vh] md:max-h-[60vh]"
              loading="eager"
              fetchpriority="high"
            />
          ) : (
            <div className="w-full h-[50vh] flex items-center justify-center text-gray-300 font-bold text-4xl opacity-20 rotate-12">
              MOON MOON
            </div>
          )}
        </div>

        <div className="flex-1 w-full relative flex items-end justify-center pb-8 md:pb-12 z-30">
          <div className="relative w-full max-w-[360px] px-4 pointer-events-auto">
            <div className="bg-white/88 backdrop-blur-xl border-2 border-brand-black p-5 md:p-6 rounded-[2.5rem] shadow-[6px_6px_0px_black] text-center">
              <div className="mb-5 rounded-[1.75rem] border border-brand-black/15 bg-brand-black/[0.03] p-4 text-left">
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-brand-black/40">持有人</p>
                    <p className="mt-1 text-sm font-bold text-brand-black">月島旅人</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-brand-black/40">用途</p>
                    <p className="mt-1 text-sm font-bold text-brand-black">集章積分</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-brand-black/40">狀態</p>
                    <p className="mt-1 text-sm font-bold text-brand-black">等待開啟</p>
                  </div>
                </div>
              </div>

              <p className="mb-6 text-xs font-semibold leading-relaxed text-brand-black/70">
                第一次開啟後，就能同步你的任務進度、印章與會員足跡。
              </p>

              <div className="flex flex-col gap-3">
                <Button
                  onClick={() => {
                    trackButtonClick('open_passport', 'landing_cover');
                    onOpenPassport();
                  }}
                  variant="black"
                  size="lg"
                  fullWidth
                  className="rounded-full shadow-lg text-base h-14 group hover:scale-[1.02] transition-all duration-300"
                >
                  <BookOpen className="mr-2 w-5 h-5" />
                  打開我的護照
                </Button>
                <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-brand-black/40">
                  Open to view stamps, points and member rewards
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// -- Main App --

function App() {
  const { user: supabaseUser, signInWithGoogle, signOut: supabaseSignOut, error: authError, clearError: clearAuthError } = useSupabaseAuth();
  const [screen, setScreen] = useState<Screen>('landing');
  const [loading, setLoading] = useState(true);
  const [appNotice, setAppNotice] = useState<{ tone: 'success' | 'error'; message: string } | null>(null);
  const prevScreenRef = useRef<Screen | null>(null);
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

  // Handle cross-site points sync from Gacha redirect URL
  useEffect(() => {
    const result = handleIncomingPointsSync();
    if (!result?.credited) return;

    trackEvent('points_sync_received', {
      source: 'gacha',
      points: result.credited,
    });

    document.dispatchEvent(new CustomEvent('kiwimu:points_earned', {
      detail: {
        points: result.credited,
        action: 'gacha_earn',
        description: `扭蛋同步 +${result.credited} 積分`,
      },
    }));

    // Open passport directly so users can immediately see updated points
    setScreen('passport');
  }, []);

  const goHome = () => {
    setScreen('landing');
    window.scrollTo(0, 0);
  };

  // GA4：記錄進入來源（所有 UTM 皆發送 entrance_scan），方便依放置位置分析
  useEffect(() => {
    trackUtmLanding();
    const params = new URLSearchParams(window.location.search);
    const utmSource = params.get('utm_source');
    const utmMedium = params.get('utm_medium') || 'qr';
    const utmCampaign = params.get('utm_campaign');
    if (utmSource) {
      trackEntranceSource(utmSource, utmMedium, utmCampaign || undefined);
    }
  }, []);

  // Handle URL parameters for stamp unlocking (QR codes, MBTI claims, etc.)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const stampParam = params.get('stamp');
    const unlockParam = params.get('unlock');
    const claimParam = params.get('claim');
    const rewardParam = params.get('reward');
    const claimCodeParam = params.get('claim_code') || params.get('code');
    const debugParam = params.get('debug');
    const mbtiType = params.get('mbti_type');
    const autoUnlock = params.get('auto_unlock');
    const variant = params.get('variant');

    if (!stampParam && !unlockParam && !claimParam && (!rewardParam || !claimCodeParam) && debugParam !== '1' && !(autoUnlock === 'true' && mbtiType)) {
      return;
    }

    void (async () => {
      let stampUnlocked = false;

      // Debug mode: unlock all stamps
      if (debugParam === '1') {
        try {
          localStorage.setItem('moonmoon_passport', JSON.stringify({
            unlockedStamps: [
              'quiz_completed',
              'ig_followed',
              'line_joined',
              'secret_qr_1',
              'secret_qr_2',
              'social_share',
              'order_with_staff',
              'mbti_completed',
              'google_review',
              'referral_share'
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
          'dessert_connect': 'social_share',
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
          unlockStamp('mbti_completed');

          // Save result
          try {
            localStorage.setItem('user_mbti_result', upperType);
            if (variant) {
              localStorage.setItem('user_mbti_variant', variant);
            }
          } catch (e) {
            console.error('Failed to save MBTI result', e);
          }

          trackEvent('stamp_unlocked', {
            stamp_id: 'mbti_completed',
            method: 'auto_unlock_url',
            mbti_result: upperType
          });
          trackUserEvent('stamp_earned', { stamp_id: 'mbti_completed', method: 'mbti', mbti_type: upperType });

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
          unlockStamp('mbti_completed');
          trackEvent('stamp_auto_unlocked', { stamp_id: 'mbti_completed', source: 'url' });
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
          unlockStamp('mbti_completed');
          trackEvent('stamp_auto_unlocked', { stamp_id: 'mbti_completed', source: 'mbti_claim' });
          trackEvent('stamp_claim', { status: 'success', source: 'mbti_claim' });
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
          trackEvent('stamp_claim_failed', { reason: 'unsupported_reward_id', reward_id: rewardParam });
          setAppNotice({
            tone: 'error',
            message: `目前尚未支援這個限定徽章（${rewardParam}），請通知管理員協助確認。`,
          });
        } else {
          const result = await consumeRewardClaim(claimCodeParam, rewardParam);

          if (!result.ok) {
            const errorReason = (result as any).reason;
            console.error('Reward claim failed:', errorReason);
            trackEvent('stamp_claim_failed', { reason: errorReason, reward_id: rewardParam, stamp_id: rewardTarget.stampId });

            if (errorReason === 'invalid_or_used') {
              // Check if already unlocked locally
              const currentState = JSON.parse(localStorage.getItem('moonmoon_passport') || '{}');
              if (currentState.unlockedStamps?.includes(rewardTarget.stampId)) {
                stampUnlocked = true; // Already have it, just open passport
              } else {
                setAppNotice({
                  tone: 'error',
                  message: '此兌換碼無效、已被使用，或與目前要領取的徽章不符。',
                });
              }
            } else if (errorReason === 'unconfigured') {
              setAppNotice({
                tone: 'error',
                message: 'Passport 尚未完成 reward claim 設定，請先確認 Supabase 環境變數。',
              });
            } else {
              setAppNotice({
                tone: 'error',
                message: '兌換失敗，請稍後再試。',
              });
            }
          } else {
            // Success
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
        setScreen('passport');
      }

      // Clean up URL
      window.history.replaceState({}, '', window.location.pathname);
    })();
  }, []);

  const openPassport = () => {
    if (screen !== 'passport') {
      prevScreenRef.current = screen;
    }
    setScreen('passport');
    trackEvent('passport_opened', { from_screen: screen });
  };

  const closePassport = () => {
    setScreen(prevScreenRef.current || 'landing');
    trackEvent('passport_closed');
  };



  return (
    <div className="min-h-screen font-sans selection:bg-brand-lime selection:text-brand-black">
      {loading && <LoadingScreen />}

      {/* Google Login is now inside <Header /> */}

      <Header currentScreen={screen} passportCoverNumber={passportCoverNumber} onHomeClick={goHome} />

      {appNotice && (
        <div className="fixed top-24 left-1/2 z-[70] w-[calc(100%-2rem)] max-w-md -translate-x-1/2 px-1">
          <div
            className={`flex items-start gap-3 rounded-2xl border-2 px-4 py-3 shadow-[4px_4px_0px_black] ${
              appNotice.tone === 'success'
                ? 'border-brand-black bg-brand-lime text-brand-black'
                : 'border-red-200 bg-red-50 text-red-700'
            }`}
          >
            {appNotice.tone === 'success' ? (
              <Sparkles size={18} className="mt-0.5 shrink-0" />
            ) : (
              <CircleAlert size={18} className="mt-0.5 shrink-0" />
            )}
            <p className="flex-1 text-sm font-semibold leading-6">{appNotice.message}</p>
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
        {screen === 'passport' && <PassportScreen onClose={closePassport} passportCoverNumber={passportCoverNumber} />}
      </main>


    </div>
  );
}

export default App;
