import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { useSupabaseAuth } from './src/contexts/SupabaseAuthContext';

import { Stamp as StampIcon, Sparkles, Instagram, BookOpen, LogIn, LogOut, CircleAlert, X } from 'lucide-react';
import { Screen, Stamp } from './types';
import { LINKS, STAMPS, REWARD_TIERS, ACHIEVEMENTS, BRANDING } from './constants';
import { Button } from './components/Button';
import PassportScreen from './PassportScreen';
import LoadingScreen from './components/LoadingScreen';
import {
  getPassportState,
  unlockStamp,
  markRewardRedeemed,
  getUnlockedStampCount,
  calculateUserLevel,
  isStampUnlocked,
  getUnlockedAchievements,
  handleIncomingPointsSync
} from './passportUtils';
import { consumeMbtiClaim } from './mbtiClaim';
import { consumeRewardClaim, resolveRewardClaimTarget } from './rewardClaim';
import { trackUserEvent } from './src/lib/eventTracker';
import {
  trackEvent,
  trackDessertView,
  trackButtonClick,
  trackOutboundNavigation,
  trackTimeSpent,
  trackEntranceSource,
  buildUtmUrl,
  trackUtmLanding
} from './analytics';

// -- Sub-components --

const StickerBadge = ({
  text,
  rotate = 0,
  className = "",
  variant = "lime"
}: {
  text: string,
  rotate?: number,
  className?: string,
  variant?: "lime" | "white" | "black"
}) => {
  const styles = {
    lime: "bg-brand-lime text-brand-black border-brand-black",
    white: "bg-white text-brand-black border-brand-black",
    black: "bg-brand-black text-brand-lime border-brand-black",
  };

  return (
    <div
      className={`absolute px-4 py-1.5 rounded-full border text-xs font-bold uppercase tracking-wider shadow-sm z-10 animate-float ${styles[variant]} ${className}`}
      style={{ transform: `rotate(${rotate}deg)` }}
    >
      {text}
    </div>
  );
};

// -- Header --
const Header = ({ onPassportClick, onHomeClick }: { onPassportClick: () => void; onHomeClick: () => void }) => {
  const [stampCount, setStampCount] = useState(0);
  const { user: supabaseUser, signInWithGoogle, signOut: supabaseSignOut } = useSupabaseAuth();

  // P0 優化：改用事件驅動而非每秒輪詢，移除 setInterval
  useEffect(() => {
    // 初始化 stamp count
    setStampCount(getUnlockedStampCount());

    // 監聽自訂事件：當印章解鎖時更新
    const handleStampUnlocked = () => {
      setStampCount(getUnlockedStampCount());
    };

    // 也監聽 localStorage 變化（跨窗口同步）
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key?.includes('stamp') || e.key?.includes('passport')) {
        setStampCount(getUnlockedStampCount());
      }
    };

    document.addEventListener('stamp-unlocked', handleStampUnlocked);
    window.addEventListener('storage', handleStorageChange);

    return () => {
      document.removeEventListener('stamp-unlocked', handleStampUnlocked);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

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
        <button
          onClick={() => {
            trackButtonClick('open_passport', 'header');
            onPassportClick();
          }}
          className="relative"
          aria-label="打開護照收集印章"
        >
          <Button variant="outline" size="sm" className="bg-white shadow-[2px_2px_0px_black] flex items-center justify-center gap-1.5 px-3">
            <BookOpen size={18} />
            <span className="text-xs font-bold">護照</span>
          </Button>
          {stampCount > 0 && (
            <div className="absolute -top-1 -right-1 w-5 h-5 bg-brand-lime border-2 border-white rounded-full flex items-center justify-center text-xs font-bold text-brand-black">
              {stampCount}
            </div>
          )}
        </button>
        <a
          href={LINKS.INSTAGRAM}
          target="_blank"
          rel="noreferrer"
          onClick={() => trackOutboundNavigation(LINKS.INSTAGRAM, 'header_ig_button')}
        >
          <Button variant="outline" size="sm" className="bg-white shadow-[2px_2px_0px_black] w-10 px-0 flex items-center justify-center">
            <Instagram size={18} />
          </Button>
        </a>
        <a
          href={LINKS.LINE_OA}
          target="_blank"
          rel="noreferrer"
          onClick={() => trackOutboundNavigation(LINKS.LINE_OA, 'header_pass_button')}
        >
          <Button variant="outline" size="sm" className="bg-white shadow-[2px_2px_0px_black]">
            Pass
          </Button>
        </a>

        {/* Auth 狀態列 */}
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
const OPENING_QUESTIONS = [
  '你最近一次真心感到被理解，是什麼時候？',
  '你覺得自己值得擁有什麼樣的生活？',
  '你有多久沒有好好照顧自己了？',
];

const LandingScreen: React.FC<{ onOpenPassport: () => void }> = ({ onOpenPassport }) => {
  const [showMenu, setShowMenu] = useState(false);
  const [showSubtext, setShowSubtext] = useState(false);
  const [easterEggModal, setEasterEggModal] = useState<{ type: null | 'moonmoon' | 'dessert', content?: any }>({ type: null });
  const touchStartY = useRef(0);

  // Easter egg messages
  const moonMoonStories = [
    {
      title: "關於聲音",
      content: "你發現了嗎？\n\n其實 Moon Moon 不只是名字，更是品嚐美味時發出的聲音。\n\n願你在這裡的每一口，都能不自覺地發出這滿足的輕嘆。\n\n請慢用。"
    },
    {
      title: "關於光芒",
      content: "這座島嶼本身不發光，它靜靜地等待。\n\n月島就像一座安靜的島，而你就是那道月光。\n\n是你的到來投射了光芒，才讓這座島嶼擁有了溫柔的模樣。"
    },
    {
      title: "關於初衷",
      content: "其實取名「月島」藏著我們的小私心。\n\n那是汲取了月的溫柔，與島的安穩。\n\n我們搭建了這個避風港，希望你帶走的不只是甜點，還有一份能在心底靠岸的安心回憶。"
    },
    {
      title: "關於陪伴",
      content: "如果在角落看見一隻白色的小鳥，請別驚訝。\n\n他是 Kiwimu，一隻從鮮奶油裡誕生的精靈。\n\n他不像其他鳥兒飛向天空，而是選擇留在月島，靜靜陪伴你度過這段甜甜的時光。"
    }
  ];

  const dessertFacts = [
    "你知道嗎？提拉米蘇的名字在義大利文中意思是『帶我走』，因為它太好吃了會讓人想全部帶走。",
    "馬卡龍不是法國發明的！它其實源自義大利，16 世紀才傳入法國宮廷。",
    "巧克力曾經被當作貨幣使用，阿茲特克人用可可豆來交易商品。",
    "甜甜圈中間的洞其實是為了讓甜甜圈更均勻受熱而設計的。"
  ];

  const openingQuestion = useMemo(
    () => OPENING_QUESTIONS[Math.floor(Math.random() * OPENING_QUESTIONS.length)],
    []
  );

  useEffect(() => {
    const t = setTimeout(() => setShowSubtext(true), 1500);
    return () => clearTimeout(t);
  }, []);

  // Track time spent on landing
  useEffect(() => {
    const startTime = Date.now();
    return () => {
      const duration = (Date.now() - startTime) / 1000;
      trackTimeSpent('landing', duration);
    };
  }, []);

  // Use fixed illustration for faster loading
  const illustration = BRANDING.LANDING_ILLUSTRATION;


  const mbtiLandingUrl = useMemo(
    () =>
      buildUtmUrl(LINKS.MBTI_TEST, {
        medium: 'landing',
        campaign: '2026-q1-integration',
        content: 'landing_mbti',
      }),
    []
  );

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    const touchEndY = e.changedTouches[0].clientY;
    const diff = touchStartY.current - touchEndY;

    if (diff > 50) {
      setShowMenu(true);
    }
    if (diff < -50 && showMenu) {
      setShowMenu(false);
    }
  };

  const handleArrowClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowMenu(true);
    trackEvent('landing_menu_opened', { method: 'arrow_click' });
  };

  // Track mouse movement for desktop parallax
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const handleMouseMove = (e: React.MouseEvent) => {
    if (window.innerWidth >= 768) {
      const x = (e.clientX / window.innerWidth - 0.5) * 20;
      const y = (e.clientY / window.innerHeight - 0.5) * 20;
      setMousePos({ x, y });
    }
  };

  return (
    <div
      className="h-[100dvh] w-full flex flex-col relative overflow-hidden bg-[#FAFAF8] touch-none"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onMouseMove={handleMouseMove}
    >
      {/* Center container for desktop */}
      <div className="h-full w-full max-w-[1400px] mx-auto flex flex-col relative">
        <div
          style={{ transform: `translate(${mousePos.x * -1}px, ${mousePos.y * -1}px)`, transition: 'transform 0.1s ease-out' }}
          onClick={() => {
            const randomStory = moonMoonStories[Math.floor(Math.random() * moonMoonStories.length)];
            setEasterEggModal({ type: 'moonmoon', content: randomStory });
          }}
          className="cursor-pointer"
        >
          <StickerBadge text="Moon Moon" rotate={-12} className="top-24 left-6 md:left-[15%] lg:left-[20%]" variant="white" />
        </div>
        <div
          style={{ transform: `translate(${mousePos.x}px, ${mousePos.y}px)`, transition: 'transform 0.1s ease-out' }}
          onClick={() => {
            const randomFact = dessertFacts[Math.floor(Math.random() * dessertFacts.length)];
            setEasterEggModal({ type: 'dessert', content: randomFact });
          }}
          className="cursor-pointer"
        >
          <StickerBadge text="Dessert" rotate={15} className="top-32 right-6 md:right-[15%] lg:right-[20%]" variant="lime" />
        </div>
        <div style={{ transform: `translate(${mousePos.x * 0.5}px, ${mousePos.y * 0.5}px)`, transition: 'transform 0.1s ease-out' }}>
          <StickerBadge text="Exhibition" rotate={-5} className="bottom-[40%] left-4 z-0 opacity-50 md:opacity-100" variant="lime" />
        </div>

        <div className="flex-none pt-28 md:pt-32 px-4 z-10 pointer-events-none relative flex flex-col items-center">
          <div className="text-center space-y-4 max-w-xl mx-auto">
            <h1 className="text-7xl sm:text-8xl md:text-9xl font-serif font-black text-brand-black leading-none tracking-tight" style={{ fontFamily: 'Playfair Display, serif' }}>
              PASSPORT
            </h1>
          </div>
        </div>

        <div className={`absolute bottom-0 md:-bottom-10 lg:-bottom-20 left-1/2 -translate-x-1/2 w-full max-w-[500px] md:max-w-[700px] lg:max-w-[900px] flex justify-center z-0 animate-fade-in pointer-events-none transition-all duration-700 ${showMenu ? 'scale-95 opacity-80 blur-[2px]' : 'scale-100 opacity-100 blur-0'}`}>
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

        <div
          className={`fixed inset-0 z-20 bg-brand-black/20 backdrop-blur-[1px] transition-opacity duration-500 ${showMenu ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
          onClick={() => setShowMenu(false)}
        />

        <div className="flex-1 w-full relative flex items-end justify-center pb-8 md:pb-12 pointer-events-none z-30">
          <div
            className={`absolute bottom-8 left-0 right-0 flex flex-col items-center justify-center transition-all duration-500 cursor-pointer pointer-events-auto ${showMenu ? 'opacity-0 translate-y-10' : 'opacity-100 translate-y-0'}`}
            onClick={handleArrowClick}
          >
            <div className="flex flex-col items-center animate-bounce">
              <span className="text-xs font-bold uppercase tracking-[0.2em] text-brand-black mb-2 bg-white/50 backdrop-blur-sm px-3 py-1 rounded-full border border-white/50">
                Begin Journey
              </span>
              <div className="w-12 h-12 rounded-xl bg-brand-lime flex items-center justify-center border-2 border-brand-black shadow-[4px_4px_0px_black]">
                <StampIcon size={24} className="text-brand-black" />
              </div>
            </div>
          </div>

          <div
            className={`relative w-full max-w-[340px] px-4 transition-all duration-500 cubic-bezier(0.16,1,0.3,1) pointer-events-auto ${showMenu ? 'translate-y-0 opacity-100' : 'translate-y-[120%] opacity-0'}`}
          >
            <div className="bg-white/80 backdrop-blur-xl border border-white/60 p-5 md:p-6 rounded-[2.5rem] shadow-[0_20px_40px_rgba(0,0,0,0.15)] text-center ring-1 ring-black/5">
              <div className="w-12 h-1.5 bg-gray-300 rounded-full mx-auto mb-6 opacity-60" />

              <p className="font-sans font-medium text-brand-black mb-4 text-sm leading-relaxed">
                Kiwimu 宇宙會員中心。<br />
                到店集章，解鎖<span className="font-bold underline decoration-brand-lime decoration-4 underline-offset-2">限定獎勵</span>。
              </p>
              <p className="text-xs text-brand-black/80 mb-6">集章、積分、兌換，全部在護照裡。</p>

              <div className="flex flex-col gap-3">
                <Button
                  onClick={() => {
                    trackButtonClick('open_passport', 'landing_menu');
                    onOpenPassport();
                  }}
                  variant="black"
                  size="lg"
                  fullWidth
                  className="rounded-full shadow-lg text-base h-14 group hover:scale-[1.02] transition-all duration-300"
                >
                  <BookOpen className="mr-2 w-5 h-5" />
                  打開護照
                </Button>
                <div className="flex gap-2">
                  <a
                    href={mbtiLandingUrl}
                    className="flex-1 block"
                    onClick={() => trackOutboundNavigation(mbtiLandingUrl, 'landing_mbti')}
                  >
                    <Button variant="secondary" size="sm" fullWidth className="bg-white/80 border-transparent hover:border-black shadow-sm h-10">MBTI</Button>
                  </a>
                  <a
                    href={LINKS.LINE_OA}
                    className="flex-1 block"
                    onClick={() => trackOutboundNavigation(LINKS.LINE_OA, 'landing_line')}
                  >
                    <Button variant="secondary" size="sm" fullWidth className="bg-white/80 border-transparent hover:border-black shadow-sm h-10">Line</Button>
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Easter Egg Modal */}
        {easterEggModal.type && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in"
            onClick={() => setEasterEggModal({ type: null })}
          >
            <div
              className="bg-white rounded-3xl p-6 md:p-10 max-w-sm md:max-w-md w-full shadow-2xl transform animate-scale-in border-4 border-brand-black"
              onClick={(e) => e.stopPropagation()}
            >
              {easterEggModal.type === 'moonmoon' ? (
                <>
                  <h3 className="text-xl md:text-2xl font-bold text-brand-black text-center mb-6 md:mb-8 tracking-wide">
                    你找到彩蛋了！
                  </h3>
                  <div className="mb-6 md:mb-8 space-y-4 md:space-y-6">
                    <p className="text-xs font-bold text-brand-black/60 text-center uppercase tracking-widest">
                      {easterEggModal.content?.title}
                    </p>
                    <p className="text-sm text-brand-black/80 leading-loose text-center whitespace-pre-line tracking-wide">
                      {easterEggModal.content?.content}
                    </p>
                  </div>
                  <Button
                    onClick={() => setEasterEggModal({ type: null })}
                    variant="black"
                    fullWidth
                    size="lg"
                    className="rounded-xl tracking-wider"
                  >
                    謝謝你的發現
                  </Button>
                </>
              ) : (
                <>
                  <h3 className="text-xl md:text-2xl font-bold text-brand-black text-center mb-6 md:mb-8 tracking-wide">
                    甜點冷知識
                  </h3>
                  <div className="mb-6 md:mb-8 space-y-4 md:space-y-6">
                    <p className="text-sm text-brand-black/80 leading-loose bg-brand-lime/5 p-4 md:p-6 rounded-xl tracking-wide">
                      {easterEggModal.content}
                    </p>
                    <p className="text-xs text-center text-brand-black/50 italic tracking-wide">
                      點擊 DESSERT 按鈕可以看到更多冷知識哦
                    </p>
                  </div>
                  <Button
                    onClick={() => setEasterEggModal({ type: null })}
                    variant="black"
                    fullWidth
                    size="lg"
                    className="rounded-xl tracking-wider"
                  >
                    學到了
                  </Button>
                </>
              )}
            </div>
          </div>
        )}
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

      <Header onPassportClick={openPassport} onHomeClick={goHome} />

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
        {screen === 'landing' && <LandingScreen onOpenPassport={openPassport} />}
        {screen === 'passport' && <PassportScreen onClose={closePassport} />}
      </main>


    </div>
  );
}

export default App;
