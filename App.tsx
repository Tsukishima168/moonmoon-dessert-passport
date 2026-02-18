import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';


import { ArrowRight, Gift, BrainCircuit, RotateCcw, Sticker, MoveRight, Stamp, ChevronUp, Sparkles, MapPin, Instagram, BookOpen, Lock, CheckCircle, ScanLine } from 'lucide-react';
import { Screen, UserAnswers, Option, DessertRecommendation } from './types';
import { QUESTION_SETS, DESSERTS, LINKS, LANDING_ILLUSTRATION, STICKERS } from './constants';
import { Button } from './components/Button';
import PassportScreen from './PassportScreen';
import ARScanner from './components/ARScanner';
import { unlockStamp, getUnlockedStampCount } from './passportUtils';
import { consumeMbtiClaim } from './mbtiClaim';
import { consumeRewardClaim } from './rewardClaim';
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
const Header = ({ onPassportClick, onARClick }: { onPassportClick: () => void; onARClick: () => void }) => {
  const [stampCount, setStampCount] = useState(0);

  useEffect(() => {
    setStampCount(getUnlockedStampCount());
    // Update stamp count when localStorage changes
    const interval = setInterval(() => {
      setStampCount(getUnlockedStampCount());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 px-6 py-6 flex justify-between items-center pointer-events-none">
      <div className="flex items-center gap-2 pointer-events-auto">
        <img
          src="https://res.cloudinary.com/dvizdsv4m/image/upload/f_auto,q_70,w_300/v1768743629/Dessert-Chinese_u8uoxt.png"
          alt="月島甜點店"
          className="h-5 md:h-6 w-auto object-contain brightness-0"
          loading="eager"
        />
      </div>

      <div className="pointer-events-auto flex items-center gap-2">
        {/* AR 按鈕 — 設定 AR_ENABLED = true 開啟 */}
        {false && (
          <button
            onClick={() => {
              trackButtonClick('open_ar', 'header');
              onARClick();
            }}
            className="relative"
            aria-label="開啟 AR 探索"
          >
            <Button variant="outline" size="sm" className="bg-[#CDFF00] shadow-[2px_2px_0px_black] flex items-center justify-center gap-1.5 px-3 hover:bg-[#CDFF00]/80">
              <ScanLine size={18} />
              <span className="text-xs font-bold">AR</span>
            </Button>
          </button>
        )}
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
      </div>
    </header>
  );
};

// -- Fortune Slip (心情展籤) System --
const FORTUNES = [
  { level: '大吉', text: '新的一年，願你的煩惱像我的工作一樣少。' },
  { level: '中吉', text: '變胖沒關係，那是你對甜點尊重的重量。' },
  { level: '小吉', text: '把錢變成喜歡的形狀，例如千層蛋糕。' },
  { level: '吉', text: '今天的運氣，適合再來一顆布丁。' },
  { level: '大吉', text: '願你的財運，像台南的糖度一樣高。' },
  { level: '中吉', text: '工作可以低糖，但生活要全糖。' },
  { level: '吉', text: '老闆說，轉到這張的人，今年會變漂亮。' },
  { level: '小吉', text: '休息是為了走更長的路，吃甜點是為了不想走路。' },
  { level: '大吉', text: '恭喜，你今年的桃花運會跟鮮奶油一樣順滑。' },
  { level: '隱藏版', text: 'Kiwimu 覺得你今天長得很好看。' },
];

const STORE_GPS = { lat: 23.0463, lng: 120.2113, radius: 100 };
const FORTUNE_DATE_KEY = 'moonmoon_fortune_date';
const FORTUNE_RESULT_KEY = 'moonmoon_fortune_result';

function getTodayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function getTodayFortune(): { level: string; text: string } | null {
  try {
    if (localStorage.getItem(FORTUNE_DATE_KEY) === getTodayKey()) {
      const s = localStorage.getItem(FORTUNE_RESULT_KEY);
      if (s) return JSON.parse(s);
    }
  } catch { /* */ }
  return null;
}

function saveTodayFortune(f: { level: string; text: string }) {
  localStorage.setItem(FORTUNE_DATE_KEY, getTodayKey());
  localStorage.setItem(FORTUNE_RESULT_KEY, JSON.stringify(f));
}

function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

type GpsStatus = 'idle' | 'checking' | 'in_store' | 'out_of_range' | 'denied';

// -- Screens --

// 建議書：開場問題（隨機輪播）
const OPENING_QUESTIONS = [
  '你最近一次真心感到被理解，是什麼時候？',
  '你覺得自己值得擁有什麼樣的生活？',
  '你有多久沒有好好照顧自己了？',
];

const LandingScreen: React.FC<{ onStartQuiz: () => void }> = ({ onStartQuiz }) => {
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
  const illustration = LANDING_ILLUSTRATION;


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
      className="h-[100dvh] w-full flex flex-col relative overflow-hidden bg-brand-bg touch-none"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onMouseMove={handleMouseMove}
    >
      {/* Background Gradients */}
      <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-brand-lime/20 rounded-full blur-[100px] animate-pulse-slow pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-5%] w-[50%] h-[50%] bg-[#FFD700]/10 rounded-full blur-[80px] animate-pulse-slow delay-1000 pointer-events-none" />
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
            <h1 className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-serif font-bold text-brand-black leading-tight" style={{ fontFamily: 'Playfair Display, serif' }}>
              Don't<br />
              Hesitate<br />
              to <span className="italic">Eat!</span>
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
              <div className="w-12 h-12 rounded-full bg-brand-lime border border-brand-black flex items-center justify-center shadow-lg hover:scale-110 transition-transform">
                <ChevronUp className="text-brand-black w-6 h-6" strokeWidth={3} />
              </div>
            </div>
          </div>

          <div
            className={`relative w-full max-w-[340px] px-4 transition-all duration-500 cubic-bezier(0.16, 1, 0.3, 1) pointer-events-auto ${showMenu ? 'translate-y-0 opacity-100' : 'translate-y-[120%] opacity-0'}`}
          >
            <div className="bg-white/80 backdrop-blur-xl border border-white/60 p-5 md:p-6 rounded-[2.5rem] shadow-[0_20px_40px_rgba(0,0,0,0.15)] text-center ring-1 ring-black/5">
              <div className="w-12 h-1.5 bg-gray-300 rounded-full mx-auto mb-6 opacity-60" />

              <p className="font-sans font-medium text-brand-black mb-4 text-sm leading-relaxed">
                Not just a bakery, but a soul gallery. <br />
                Find your <span className="font-bold underline decoration-brand-lime decoration-4 underline-offset-2">destined flavor</span> in the exhibition.
              </p>
              <p className="text-xs text-brand-black/80 mb-6">完成測驗解鎖第一枚印章，到店集章兌獎。</p>

              <div className="flex flex-col gap-3">
                <Button
                  onClick={() => {
                    trackButtonClick('enter_exhibition', 'landing_menu');
                    onStartQuiz();
                  }}
                  variant="black"
                  size="lg"
                  fullWidth
                  className="rounded-full shadow-lg text-base h-14 group hover:scale-[1.02] transition-all duration-300"
                >
                  Enter Exhibition
                  <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
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

// Zone Configuration for the Exhibition Journey
const ZONE_CONFIG = [
  {
    id: 'zone_01',
    title: 'Zone 01 · Awareness',
    subtitle: '喚醒 · Awakening Senses',
    description: 'First, let us calibrate your sensory receptors.'
  },
  {
    id: 'zone_02',
    title: 'Zone 02 · Intuition',
    subtitle: '直覺 · Trusting Instincts',
    description: 'Follow your inner voice without hesitation.'
  },
  {
    id: 'zone_03',
    title: 'Zone 03 · Definition',
    subtitle: '定義 · Shaping Reality',
    description: 'Construct your own definition of soul.'
  }
];

const QuizScreen: React.FC<{
  questions: typeof QUESTION_SETS[0],
  onComplete: (answers: UserAnswers, options: Option[]) => void,
  onCancel: () => void
}> = ({ questions, onComplete, onCancel }) => {
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [answers, setAnswers] = useState<UserAnswers>({});
  const [selectedOptions, setSelectedOptions] = useState<Option[]>([]);
  const [isExiting, setIsExiting] = useState(false);

  // Determine current zone (safe fallback if more questions than zones)
  const currentZone = ZONE_CONFIG[currentQIndex] || ZONE_CONFIG[ZONE_CONFIG.length - 1];
  const currentQuestion = questions[currentQIndex];
  const totalSteps = questions.length;
  const progress = ((currentQIndex + 1) / totalSteps) * 100;

  const handleOptionSelect = (option: Option) => {
    trackEvent('question_answered', {
      question_id: currentQuestion.id,
      option_id: option.id
    });

    const newAnswers = { ...answers, [currentQuestion.id]: option.id };
    const newSelectedOptions = [...selectedOptions, option];

    setAnswers(newAnswers);
    setSelectedOptions(newSelectedOptions);

    if (currentQIndex < questions.length - 1) {
      setTimeout(() => setCurrentQIndex(prev => prev + 1), 300);
    } else {
      setIsExiting(true);
      setTimeout(() => onComplete(newAnswers, newSelectedOptions), 500);
    }
  };

  return (
    <div className={`min-h-screen bg-brand-bg flex flex-col pt-16 md:pt-24 px-6 pb-10 transition-all duration-500 ${isExiting ? 'opacity-0 translate-y-4' : 'opacity-100'}`}>

      {/* Exhibition Header / Zone Indicator */}
      <div className="w-full max-w-lg md:max-w-2xl lg:max-w-3xl mx-auto mb-8 md:mb-12">
        <div className="flex justify-between items-end mb-4 border-b border-brand-black/10 pb-4">
          <div>
            <span className="block text-[10px] md:text-xs font-bold uppercase tracking-[0.2em] text-gray-400 mb-1">
              Current Exhibition Zone
            </span>
            <h3 className="text-lg md:text-xl font-serif font-bold text-brand-black flex items-center gap-2">
              {currentZone.title}
            </h3>
          </div>
          <div className="text-right">
            <span className="font-mono text-xs text-gray-400">
              {currentQIndex + 1} / {totalSteps}
            </span>
          </div>
        </div>

        {/* Progress Bar styled as 'Exhibit Path' */}
        <div className="h-1 w-full bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-brand-black transition-all duration-500 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <div className="flex-1 max-w-lg md:max-w-2xl lg:max-w-3xl mx-auto w-full flex flex-col justify-center relative">
        {/* Animated Question Transition */}
        <div key={currentQIndex} className="animate-fade-in-up">
          <span className="inline-block px-3 py-1 rounded-full bg-white/60 border border-brand-black/10 text-[10px] font-bold uppercase tracking-wider text-brand-lime-dark mb-4 md:mb-6">
            {currentZone.subtitle}
          </span>

          <h2 className="text-3xl md:text-4xl lg:text-5xl font-sans font-bold text-brand-black mb-4 md:mb-6 leading-tight">
            {currentQuestion.question}
          </h2>

          {currentQuestion.subtitle && (
            <p className="text-gray-500 font-sans mb-8 text-base md:text-lg lg:text-xl italic">
              "{currentQuestion.subtitle}"
            </p>
          )}

          <div className="space-y-3 md:space-y-4">
            {currentQuestion.options.map((option) => (
              <button
                key={option.id}
                onClick={() => handleOptionSelect(option)}
                className="group w-full p-6 md:p-7 lg:p-8 bg-white border border-brand-black rounded-2xl flex items-center justify-between hover:bg-brand-lime hover:shadow-[4px_4px_0px_black] transition-all duration-200 active:translate-y-1 active:shadow-none"
              >
                <div className="flex items-center gap-4 w-full">
                  <span className="text-lg md:text-xl lg:text-2xl font-bold font-sans text-brand-black">
                    {option.label}
                  </span>
                </div>
                <MoveRight className="text-brand-black opacity-0 group-hover:opacity-100 -translate-x-4 group-hover:translate-x-0 transition-all duration-200 flex-shrink-0" />
              </button>
            ))}
          </div>
        </div>

        <div className="mt-8 text-center">
          <button onClick={onCancel} className="text-sm font-bold text-gray-400 hover:text-brand-black underline decoration-2 underline-offset-4">
            Cancel & Return
          </button>
        </div>
      </div>
    </div>
  );
};

const ResultScreen: React.FC<{
  selectedOptions: Option[],
  onRetry: () => void,
  onOpenPassport?: () => void
}> = ({ selectedOptions, onRetry, onOpenPassport }) => {
  const mbtiResultUrl = useMemo(
    () =>
      buildUtmUrl(LINKS.MBTI_TEST, {
        medium: 'result-cta',
        campaign: '2026-q1-integration',
        content: 'result_mbti',
      }),
    []
  );

  // --- Fortune Slip State ---
  const [fortune, setFortune] = useState<{ level: string; text: string } | null>(null);
  const [isRepeatFortune, setIsRepeatFortune] = useState(false);
  const [gpsStatus, setGpsStatus] = useState<GpsStatus>('idle');

  // Draw fortune on mount (daily limit)
  useEffect(() => {
    const existing = getTodayFortune();
    if (existing) {
      setFortune(existing);
      setIsRepeatFortune(true);
    } else {
      const drawn = FORTUNES[Math.floor(Math.random() * FORTUNES.length)];
      saveTodayFortune(drawn);
      setFortune(drawn);
      setIsRepeatFortune(false);
      trackEvent('fortune_drawn', { level: drawn.level });
    }
  }, []);

  // GPS check function
  const requestGps = useCallback(() => {
    if (!navigator.geolocation) { setGpsStatus('denied'); return; }
    setGpsStatus('checking');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const dist = haversineDistance(pos.coords.latitude, pos.coords.longitude, STORE_GPS.lat, STORE_GPS.lng);
        setGpsStatus(dist <= STORE_GPS.radius ? 'in_store' : 'out_of_range');
        trackEvent('fortune_gps', { status: dist <= STORE_GPS.radius ? 'in_store' : 'out_of_range', distance: Math.round(dist) });
      },
      () => { setGpsStatus('denied'); },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  }, []);

  // QR code unlock moved to App component root level

  // Track time spent on result screen
  useEffect(() => {
    const startTime = Date.now();
    // Auto-unlock quiz completion stamp
    unlockStamp('quiz_completed');
    trackEvent('stamp_auto_unlocked', { stamp_id: 'quiz_completed', source: 'quiz_completion' });

    return () => {
      const duration = (Date.now() - startTime) / 1000;
      trackTimeSpent('result', duration);
    };
  }, []);

  const { dessertResult, stickerResult } = useMemo(() => {
    // 1. Calculate Scores
    const scores = { classic: 0, deep: 0, bright: 0, fruity: 0 };
    selectedOptions.forEach(opt => {
      scores.classic += opt.scores.classic;
      scores.deep += opt.scores.deep;
      scores.bright += opt.scores.bright;
      scores.fruity += opt.scores.fruity;
    });

    // 2. Find Winning Category
    let maxScore = -1;
    let winningCategory: '經典' | '深色' | '亮色' | '果香' = '經典';

    (Object.keys(scores) as Array<keyof typeof scores>).forEach(key => {
      if (scores[key] > maxScore) {
        maxScore = scores[key];
        const map: Record<string, typeof winningCategory> = {
          'classic': '經典', 'deep': '深色', 'bright': '亮色', 'fruity': '果香'
        };
        winningCategory = map[key];
      }
    });

    // 3. Find Dessert Candidates
    const candidates = DESSERTS.filter(d => d.style === winningCategory);
    const finalCandidates = candidates.length > 0 ? candidates : DESSERTS;
    const selection = finalCandidates[Math.floor(Math.random() * finalCandidates.length)];

    // 4. Find Sticker Reward
    const sticker = STICKERS.find(s => s.style === winningCategory) || STICKERS[0];

    return { dessertResult: selection, stickerResult: sticker, winningCategory };
  }, [selectedOptions]);

  // 建議書：深度解讀（人際 / 財富 / 健康）
  const styleReading = useMemo(() => {
    const readings: Record<'經典' | '深色' | '亮色' | '果香', { relation: string; wealth: string; health: string; dessertWhy: string }> = {
      經典: {
        relation: '你是一個可靠的傾聽者，朋友總是在需要時想到你',
        wealth: '你相信穩健的價值，不追求浮誇，但追求品質',
        health: '你懂得用簡單的方式照顧自己，不需要複雜的儀式感',
        dessertWhy: '看似簡單，但內在豐富而深刻',
      },
      深色: {
        relation: '喜歡獨處思考，擁有看透本質的深邃靈魂',
        wealth: '你重視內在價值，勝過外在的喧囂',
        health: '你需要深度的休息與沈澱，才能重新充電',
        dessertWhy: '微苦回甘，像深夜裡的自我對話',
      },
      亮色: {
        relation: '充滿好奇心，總能在平凡中發現閃亮亮的新奇事物',
        wealth: '你願意嘗試新可能，對價值保持開放',
        health: '你透過探索與新鮮感來照顧自己的心情',
        dessertWhy: '層次分明、清新明亮，像一道光',
      },
      果香: {
        relation: '自帶療癒氣場，所到之處都會開出快樂的小花',
        wealth: '你相信分享與連結，本身就是最大的價值',
        health: '你用溫暖與甜味給自己與他人充電',
        dessertWhy: '繽紛有生命力，裝滿快樂的靈感',
      },
    };
    return readings[dessertResult?.style ?? '經典'];
  }, [dessertResult?.style]);

  // Track result view
  useEffect(() => {
    if (dessertResult && stickerResult) {
      trackEvent('result_viewed', {
        dessert_name: dessertResult.name,
        dessert_style: dessertResult.style,
        sticker_name: stickerResult.name,
        sticker_style: stickerResult.style,
        timestamp: new Date().toISOString()
      });

      // Track as dessert view too
      trackDessertView(dessertResult.id, dessertResult.name);
    }
  }, [dessertResult, stickerResult]);

  // Randomly select drink (Stable vs Sensitive) for display
  const recommendedDrink = useMemo(() => {
    return Math.random() > 0.5 ? dessertResult.drink_stable : dessertResult.drink_sensitive;
  }, [dessertResult]);

  return (
    <div className="min-h-screen bg-brand-bg pt-20 px-6 pb-12 animate-fade-in flex flex-col items-center">

      <div className="text-center mb-6 max-w-sm">
        <p className="font-mono text-xs md:text-sm text-gray-500 mb-2 uppercase tracking-widest">Your Soul Mate</p>
        <h2 className="text-4xl md:text-5xl lg:text-6xl font-sans font-bold text-brand-black leading-tight">{stickerResult.name}</h2>
      </div>

      {/* Reward Card Container (Sticker Focus) */}
      <div className="w-full max-w-md md:max-w-lg lg:max-w-xl bg-white border border-brand-black p-4 md:p-6 rounded-[2rem] shadow-[8px_8px_0px_black] mb-6 rotate-1">

        <div className="flex justify-between items-center mb-3 px-1">
          <div className="flex gap-1">
            <span className="w-3 h-3 rounded-full bg-brand-lime border border-black"></span>
            <span className="w-3 h-3 rounded-full bg-white border border-black"></span>
          </div>
          <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Moon Character</span>
        </div>

        {/* Sticker Image Area */}
        <div className="aspect-square rounded-[1.5rem] overflow-hidden border border-brand-black mb-4 relative bg-gray-50 group flex items-center justify-center p-6">
          <img
            src={stickerResult.imageUrl}
            alt={stickerResult.name}
            className="w-full h-full object-contain drop-shadow-xl"
            loading="lazy"
            onLoad={() => trackEvent('image_loaded', { image_type: 'sticker', name: stickerResult.name })}
          />
        </div>

        <div className="px-2 pb-2">
          <p className="text-gray-600 font-sans leading-relaxed text-sm mb-6 border-l-2 border-brand-lime pl-3">
            {stickerResult.description}
          </p>

          <div className="p-4 bg-brand-gray/20 rounded-xl border border-dashed border-gray-400 text-center mb-2">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">Your Mission</p>
            <p className="text-sm font-bold text-brand-black">
              截圖出示給店員看<br />
              獲得<span className="bg-brand-lime px-1">「月島限定小貼紙」</span>
            </p>
          </div>
        </div>
      </div>

      {/* --- 心情展籤 + 第二杯半價 GPS 優惠 --- */}
      {fortune && (
        <div className="w-full max-w-md md:max-w-lg lg:max-w-xl mb-6 bg-white border-2 border-brand-black rounded-2xl shadow-[4px_4px_0px_black] overflow-hidden">
          {/* Fortune Header */}
          <div className="bg-brand-black px-5 py-3 flex items-center justify-between">
            <p className="text-sm font-bold text-white tracking-wider flex items-center gap-2">
              🎴 心情展籤
            </p>
            {isRepeatFortune && (
              <span className="text-[10px] bg-white/20 text-white/80 px-2 py-0.5 rounded-full">
                今日已獲得祝福
              </span>
            )}
          </div>

          <div className="p-5 space-y-4">
            {/* Fortune Level Badge */}
            <div className="text-center">
              <span className={`inline-block px-4 py-1.5 rounded-full text-xs font-bold tracking-[0.15em] border-2 ${fortune.level === '隱藏版' ? 'bg-brand-lime text-brand-black border-brand-black' :
                fortune.level === '大吉' ? 'bg-red-50 text-red-800 border-red-300' :
                  fortune.level === '中吉' ? 'bg-orange-50 text-orange-700 border-orange-300' :
                    'bg-gray-50 text-gray-600 border-gray-300'
                }`}>
                {fortune.level}
              </span>
            </div>

            {/* Fortune Text */}
            <p className="text-center text-lg font-bold text-brand-black leading-relaxed px-2 font-serif" style={{ fontFamily: 'Noto Serif TC, serif' }}>
              「{fortune.text}」
            </p>

            <p className="text-center text-[10px] text-gray-400 tracking-wider">✨ 來自 Kiwimu 的祝福 ✨</p>

            {/* Divider */}
            <div className="border-t-2 border-dashed border-gray-200" />

            {/* 第二杯半價 GPS-locked Coupon */}
            <div className={`rounded-xl p-4 border-2 transition-all ${gpsStatus === 'in_store'
              ? 'bg-brand-lime/20 border-brand-black shadow-[2px_2px_0px_black]'
              : 'bg-gray-50 border-gray-200'
              }`}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm">🎫</span>
                  <span className={`text-xs font-bold tracking-wide ${gpsStatus === 'in_store' ? 'text-brand-black' : 'text-gray-400'
                    }`}>
                    展覽限定優惠
                  </span>
                </div>
                {gpsStatus === 'in_store' ? (
                  <span className="text-[10px] bg-brand-lime text-brand-black border border-brand-black px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                    <MapPin className="w-2.5 h-2.5" /> 店內可用
                  </span>
                ) : (
                  <span className="text-[10px] bg-gray-100 text-gray-400 px-2 py-0.5 rounded-full font-medium flex items-center gap-1">
                    <Lock className="w-2.5 h-2.5" /> 限店內
                  </span>
                )}
              </div>

              <p className={`font-bold text-xl mb-1 ${gpsStatus === 'in_store' ? 'text-brand-black' : 'text-gray-300'
                }`}>
                ☕ 第二杯半價
              </p>
              <p className={`text-[11px] ${gpsStatus === 'in_store' ? 'text-brand-black/70' : 'text-gray-400'
                }`}>
                飲品任選 · 當日限定 · 出示此畫面即可
              </p>

              {gpsStatus === 'in_store' ? (
                <div className="mt-3 pt-3 border-t border-brand-black/10">
                  <p className="text-[11px] text-brand-black font-bold text-center flex items-center justify-center gap-1">
                    <CheckCircle className="w-3.5 h-3.5" />
                    已驗證 · 出示此畫面給店員即可使用
                  </p>
                </div>
              ) : gpsStatus === 'checking' ? (
                <div className="mt-3 pt-3 border-t border-gray-200 text-center">
                  <p className="text-xs text-gray-400 animate-pulse">📍 定位中...</p>
                </div>
              ) : gpsStatus === 'out_of_range' || gpsStatus === 'denied' ? (
                <div className="mt-3 pt-3 border-t border-gray-200 text-center">
                  <p className="text-[11px] text-gray-400 leading-relaxed">
                    📍 {gpsStatus === 'denied' ? '無法取得位置' : '你目前不在店內'}<br />
                    請到<span className="font-bold text-brand-black"> 月島甜點店 </span>才能使用當日優惠哦！
                  </p>
                </div>
              ) : (
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <button
                    onClick={requestGps}
                    className="w-full text-xs text-gray-500 hover:text-brand-black py-1.5 flex items-center justify-center gap-1 transition-colors border border-gray-200 rounded-lg hover:border-brand-black hover:bg-brand-lime/10"
                  >
                    <MapPin className="w-3 h-3" />
                    點擊驗證是否在店內
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 集章：解鎖第一枚 + 打開護照 CTA */}
      {onOpenPassport && (
        <div className="w-full max-w-md md:max-w-lg lg:max-w-xl mb-6 p-4 bg-brand-lime/25 border-2 border-brand-black rounded-2xl shadow-[4px_4px_0px_black]">
          <p className="text-sm font-bold text-brand-black mb-2">✅ 你已解鎖第一枚印章 · 甜點測驗</p>
          <p className="text-xs text-brand-black/80 mb-4">到店繼續集章、集滿可兌換飲品升級、手工餅乾與千層蛋糕。</p>
          <Button
            fullWidth
            variant="black"
            size="lg"
            className="rounded-xl shadow-[4px_4px_0px_#D4FF00]"
            onClick={() => {
              trackButtonClick('open_passport', 'result_stamp_cta');
              onOpenPassport();
            }}
          >
            <BookOpen className="mr-2" size={20} />
            打開護照看集章進度
          </Button>
        </div>
      )}



      <div className="w-full max-w-md md:max-w-lg lg:max-w-xl mb-6 p-5 bg-brand-lime/15 border-2 border-brand-black rounded-2xl shadow-[4px_4px_0px_black]">
        <p className="text-xs font-bold text-brand-black uppercase tracking-widest mb-2">出示你的結果給店員，獲得：</p>
        <ul className="text-sm font-sans text-brand-black space-y-1.5 mb-3">
          <li>限時折扣（首次到店）</li>
          <li>拍照打卡區（分享你的甜點時刻）</li>
        </ul>
        <p className="text-xs text-gray-600">到店後掃描 QR Code 可解鎖護照印章；集滿章數可兌換獎勵。</p>
      </div>

      {/* Secondary Result: The Dessert (Soul Food) */}
      <div className="w-full max-w-md md:max-w-lg lg:max-w-xl bg-white border-2 border-brand-black rounded-2xl p-5 mb-8 flex items-center gap-5 shadow-[4px_4px_0px_black] hover:translate-y-[-2px] hover:shadow-[6px_6px_0px_black] transition-all duration-300">
        <div className="relative">
          <div className="absolute inset-0 bg-brand-lime rounded-lg translate-x-1 translate-y-1"></div>
          <img
            src={dessertResult.imageUrl}
            className="w-20 h-20 rounded-lg object-cover border border-brand-black relative z-10"
            alt={dessertResult.name}
            loading="lazy"
          />
        </div>

        <div className="flex-1">
          <span className="inline-block bg-brand-black text-white text-[10px] uppercase font-bold px-2 py-0.5 rounded-full mb-1 tracking-wider">
            Soul Food
          </span>
          <h3 className="font-bold text-lg text-brand-black font-sans leading-tight mb-1">{dessertResult.name}</h3>
          <div className="flex items-center text-xs font-bold text-gray-500 gap-1.5">
            <span>搭配飲品：{recommendedDrink}</span>
          </div>
        </div>
      </div>


      {/* 🌟 Enhanced LINE@ Landing Bonus - Screenshot to Rewards Flow */}
      <div className="w-full max-w-md md:max-w-lg lg:max-w-xl mb-6 bg-gradient-to-br from-brand-lime/20 to-brand-lime/5 border-2 border-brand-black rounded-2xl shadow-[4px_4px_0px_black] overflow-hidden">
        {/* Header Banner */}
        <div className="bg-brand-lime border-b-2 border-brand-black px-5 py-3 text-center">
          <p className="text-sm md:text-base font-bold text-brand-black flex items-center justify-center gap-2">
            <Sparkles size={18} className="animate-pulse" />
            獲得專屬登島優惠
            <Sparkles size={18} className="animate-pulse" />
          </p>
        </div>

        <div className="p-5 space-y-4">
          {/* Step-by-step Instructions */}
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-brand-black text-white flex items-center justify-center text-sm font-bold">1</div>
              <div className="flex-1">
                <p className="text-sm font-bold text-brand-black mb-1">截圖此頁面</p>
                <p className="text-xs text-gray-600">保存你的專屬角色結果</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-brand-black text-white flex items-center justify-center text-sm font-bold">2</div>
              <div className="flex-1">
                <p className="text-sm font-bold text-brand-black mb-1">傳送到 LINE@</p>
                <p className="text-xs text-gray-600">點擊下方按鈕開啟對話</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-brand-black text-white flex items-center justify-center text-sm font-bold">3</div>
              <div className="flex-1">
                <p className="text-sm font-bold text-brand-black mb-1">留言「登陸」</p>
                <div className="mt-2 inline-flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border border-brand-black/20 shadow-sm">
                  <span className="font-bold text-sm font-serif">登陸</span>
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      if (navigator.clipboard) {
                        navigator.clipboard.writeText('登陸');
                        const btn = e.currentTarget;
                        const originalText = btn.textContent;
                        btn.textContent = '✓';
                        setTimeout(() => btn.textContent = originalText, 1500);
                      }
                    }}
                    className="text-[10px] text-gray-400 bg-gray-100 border border-gray-200 px-1.5 py-0.5 rounded hover:bg-gray-200 transition-colors"
                  >
                    COPY
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Rewards Preview */}
          <div className="bg-white rounded-xl p-4 border-2 border-dashed border-brand-black/30">
            <p className="text-xs font-bold text-brand-black uppercase tracking-wider mb-3 text-center">你將獲得</p>
            <div className="space-y-2 text-sm text-brand-black">
              <div className="flex items-center gap-2">
                <span className="font-bold">月島小優惠</span>
                <span className="text-xs text-gray-500">（限時折扣）</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-bold">專屬角色手機桌布</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-bold">來自月島的一封信</span>
              </div>
            </div>
          </div>

          {/* Enhanced CTA Button */}
          <a
            href={LINKS.LINE_OA}
            target="_blank"
            rel="noreferrer"
            onClick={() => trackOutboundNavigation(LINKS.LINE_OA, 'result_landing_bonus_cta')}
          >
            <Button
              fullWidth
              variant="black"
              size="lg"
              className="rounded-xl shadow-[4px_4px_0px_#D4FF00] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_#D4FF00] active:shadow-none active:translate-y-[4px] transition-all duration-200"
            >
              <Stamp className="mr-2" size={20} />
              前往 LINE@ 領取登島禮包
            </Button>
          </a>

          <p className="text-[10px] text-center text-gray-500">
            ⏰ 優惠限時提供，請盡快完成領取
          </p>
        </div>
      </div>

      {/* Secondary Actions Container */}
      <div className="w-full max-w-md md:max-w-lg lg:max-w-xl space-y-3">
        <p className="text-center text-sm text-gray-500 mb-1">
          📖 集章、兌換獎勵請點右上角 <strong className="text-brand-black">護照</strong>
        </p>

        <div className="grid grid-cols-2 gap-3">
          <a
            href={mbtiResultUrl}
            target="_blank"
            rel="noreferrer"
            onClick={() => trackOutboundNavigation(mbtiResultUrl, 'result_mbti')}
          >
            <Button fullWidth variant="outline" size="lg" className="rounded-xl border-brand-black bg-white hover:bg-brand-gray h-14">
              <BrainCircuit size={18} className="mr-2" />
              深度 MBTI
            </Button>
          </a>

          <a
            href={LINKS.GOOGLE_MAPS}
            target="_blank"
            rel="noreferrer"
            onClick={() => trackOutboundNavigation(LINKS.GOOGLE_MAPS, 'result_maps')}
          >
            <Button fullWidth variant="outline" size="lg" className="rounded-xl border-brand-black bg-white hover:bg-brand-gray h-14">
              <MapPin size={18} className="mr-2" />
              前往店舖
            </Button>
          </a>

          <a
            href={LINKS.INSTAGRAM}
            target="_blank"
            rel="noreferrer"
            onClick={() => trackOutboundNavigation(LINKS.INSTAGRAM, 'result_ig')}
          >
            <Button fullWidth variant="outline" size="lg" className="rounded-xl border-brand-black bg-white hover:bg-brand-gray h-14">
              <Instagram size={18} className="mr-2" />
              追蹤 IG
            </Button>
          </a>

          <button
            onClick={() => {
              trackButtonClick('retry_quiz', 'result_page');
              onRetry();
            }}
          >
            <Button fullWidth variant="outline" size="lg" className="rounded-xl border-brand-black bg-white hover:bg-brand-gray h-14">
              <RotateCcw size={18} className="mr-2" />
              重測一次
            </Button>
          </button>
        </div>
      </div>
    </div >
  );
};

// -- Main App --

function App() {
  const [screen, setScreen] = useState<Screen>('landing');
  const [answers, setAnswers] = useState<UserAnswers>({});
  const [selectedOptions, setSelectedOptions] = useState<Option[]>([]);
  const prevScreenRef = useRef<Screen>('landing');

  // Randomly select one question set on load
  const [activeQuestionSet, setActiveQuestionSet] = useState(QUESTION_SETS[0]);

  const startQuiz = () => {
    // Track quiz start
    trackEvent('quiz_started', {
      timestamp: new Date().toISOString()
    });

    // Pick random set
    const randomSet = QUESTION_SETS[Math.floor(Math.random() * QUESTION_SETS.length)];
    setActiveQuestionSet(randomSet);

    setScreen('quiz');
    window.scrollTo(0, 0);
  };

  const finishQuiz = (userAnswers: UserAnswers, opts: Option[]) => {
    // Track quiz completion
    trackEvent('quiz_completed', {
      total_questions: opts.length,
      timestamp: new Date().toISOString()
    });

    setAnswers(userAnswers);
    setSelectedOptions(opts);
    setScreen('result');
    window.scrollTo(0, 0);
  };

  const restart = () => {
    // Track quiz restart
    trackEvent('quiz_restarted', {
      timestamp: new Date().toISOString()
    });

    setAnswers({});
    setSelectedOptions([]);
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
    const codeParam = params.get('code');
    const debugParam = params.get('debug');
    const mbtiType = params.get('mbti_type');
    const autoUnlock = params.get('auto_unlock');
    const variant = params.get('variant');

    if (!stampParam && !unlockParam && !claimParam && (!rewardParam || !codeParam) && debugParam !== '1' && !(autoUnlock === 'true' && mbtiType)) {
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

      // New QR code unlock system using `?unlock=` parameter
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
      if (rewardParam && codeParam) {
        const result = await consumeRewardClaim(codeParam, rewardParam);

        if (!result.ok) {
          console.error('Reward claim failed:', result.reason);
          trackEvent('stamp_claim_failed', { reason: result.reason, reward_id: rewardParam });

          if (result.reason === 'invalid_or_used') {
            // Check if already unlocked locally
            const currentState = JSON.parse(localStorage.getItem('moonmoon_passport') || '{}');
            if (currentState.unlockedStamps?.includes(rewardParam)) {
              stampUnlocked = true; // Already have it, just open passport
            } else {
              alert('此兌換碼無效或已被使用。');
            }
          } else {
            alert('兌換失敗，請稍後再試。');
          }
        } else {
          // Success
          unlockStamp(rewardParam);
          trackEvent('stamp_auto_unlocked', { stamp_id: rewardParam, source: 'reward_claim' });
          trackEvent('stamp_claim', { status: 'success', source: 'reward_claim', reward_id: rewardParam });
          stampUnlocked = true;
        }
      }

      // Show passport and success message after unlocking
      if (stampUnlocked) {
        // Show success message
        alert('🎉 成功解鎖印章！請查看你的護照。');

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

  const openAR = () => {
    prevScreenRef.current = screen;
    setScreen('ar');
    trackEvent('ar_scanner_opened', { from_screen: screen });
  };

  const closeAR = () => {
    setScreen(prevScreenRef.current || 'landing');
    trackEvent('ar_scanner_closed');
  };

  const handleARStampUnlocked = (stampId: string, newAchievements: string[]) => {
    trackEvent('ar_stamp_unlocked', { stamp_id: stampId, achievements: newAchievements.length });
    if (newAchievements.length > 0) {
      trackEvent('achievements_unlocked', { ids: newAchievements.join(',') });
    }
  };

  return (
    <div className="min-h-screen font-sans selection:bg-brand-lime selection:text-brand-black">
      <Header onPassportClick={openPassport} onARClick={openAR} />

      <main>
        {screen === 'landing' && <LandingScreen onStartQuiz={startQuiz} />}
        {screen === 'quiz' && (
          <QuizScreen
            questions={activeQuestionSet}
            onComplete={finishQuiz}
            onCancel={restart}
          />
        )}
        {screen === 'result' && (
          <ResultScreen
            selectedOptions={selectedOptions}
            onRetry={restart}
            onOpenPassport={openPassport}
          />
        )}
        {screen === 'passport' && <PassportScreen onClose={closePassport} />}
      </main>

      {/* AR Scanner - rendered as overlay on top of current screen */}
      {screen === 'ar' && (
        <ARScanner
          onClose={() => {
            closeAR();
            // Open passport after closing AR to show new stamps
            setTimeout(() => {
              prevScreenRef.current = screen;
              setScreen('passport');
            }, 100);
          }}
          onStampUnlocked={handleARStampUnlocked}
        />
      )}
    </div>
  );
}

export default App;
