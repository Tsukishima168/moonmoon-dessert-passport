import React, { useState, useMemo, useRef, useEffect } from 'react';
import { ArrowRight, Gift, BrainCircuit, RotateCcw, Sticker, MoveRight, Stamp, ChevronUp, Sparkles, MapPin } from 'lucide-react';
import { Screen, UserAnswers, Option, DessertRecommendation } from './types';
import { QUESTION_SETS, DESSERTS, LINKS, LANDING_ILLUSTRATIONS, STICKERS } from './constants';
import { Button } from './components/Button';
import { trackEvent, trackDessertView, trackDessertFavorite, trackFilterUsage } from './analytics';

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
const Header = () => (
  <header className="fixed top-0 left-0 right-0 z-50 px-6 py-6 flex justify-between items-center pointer-events-none">
    <div className="flex items-center gap-2 pointer-events-auto">
      <img
        src="https://res.cloudinary.com/dvizdsv4m/image/upload/v1768743629/Dessert-Chinese_u8uoxt.png"
        alt="月島甜點店"
        className="h-5 md:h-6 w-auto object-contain brightness-0"
      />
    </div>

    <div className="pointer-events-auto">
      <a href={LINKS.LINE_OA} target="_blank" rel="noreferrer">
        <Button variant="outline" size="sm" className="bg-white shadow-[2px_2px_0px_black]">
          Pass
        </Button>
      </a>
    </div>
  </header>
);

// -- Screens --

const LandingScreen: React.FC<{ onStartQuiz: () => void }> = ({ onStartQuiz }) => {
  const [showMenu, setShowMenu] = useState(false);
  const touchStartY = useRef(0);

  const illustration = useMemo(() => {
    if (!LANDING_ILLUSTRATIONS || LANDING_ILLUSTRATIONS.length === 0) return null;
    const randomIndex = Math.floor(Math.random() * LANDING_ILLUSTRATIONS.length);
    return LANDING_ILLUSTRATIONS[randomIndex];
  }, []);

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
      {/* Center container for desktop */}
      <div className="h-full w-full max-w-[1400px] mx-auto flex flex-col relative">
        <div style={{ transform: `translate(${mousePos.x * -1}px, ${mousePos.y * -1}px)`, transition: 'transform 0.1s ease-out' }}>
          <StickerBadge text="Moon Moon" rotate={-12} className="top-24 left-6 md:left-[15%] lg:left-[20%]" variant="white" />
        </div>
        <div style={{ transform: `translate(${mousePos.x}px, ${mousePos.y}px)`, transition: 'transform 0.1s ease-out' }}>
          <StickerBadge text="Dessert" rotate={15} className="top-32 right-6 md:right-[15%] lg:right-[20%]" variant="lime" />
        </div>
        <div style={{ transform: `translate(${mousePos.x * 0.5}px, ${mousePos.y * 0.5}px)`, transition: 'transform 0.1s ease-out' }}>
          <StickerBadge text="Exhibition" rotate={-5} className="bottom-[40%] left-4 z-0 opacity-50 md:opacity-100" variant="lime" />
        </div>

        <div className="flex-none pt-28 md:pt-32 px-4 z-10 pointer-events-none relative flex flex-col items-center">
          <div className="text-center space-y-2 mb-2">
            <h1 className="text-6xl md:text-8xl font-serif leading-[0.9] text-brand-black">
              Don't<br />
              Hesitate<br />
              to <span className="italic relative">
                Eat!
                <svg className="absolute w-full h-3 -bottom-1 left-0 text-brand-lime -z-10" viewBox="0 0 100 10" preserveAspectRatio="none">
                  <path d="M0 5 Q 50 10 100 5" stroke="currentColor" strokeWidth="8" fill="none" />
                </svg>
              </span>
            </h1>
          </div>
        </div>

        <div className={`absolute bottom-0 md:-bottom-10 lg:-bottom-20 left-1/2 -translate-x-1/2 w-full max-w-[500px] md:max-w-[700px] lg:max-w-[900px] flex justify-center z-0 animate-fade-in pointer-events-none transition-all duration-700 ${showMenu ? 'scale-95 opacity-80 blur-[2px]' : 'scale-100 opacity-100 blur-0'}`}>
          {illustration ? (
            <img
              src={illustration}
              alt="Mascot"
              className="w-full h-auto object-contain drop-shadow-2xl max-h-[50vh] md:max-h-[60vh]"
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

              <p className="font-sans font-medium text-brand-black mb-6 text-sm leading-relaxed">
                Not just a bakery, but a soul gallery. <br />
                Find your <span className="font-bold underline decoration-brand-lime decoration-4 underline-offset-2">destined flavor</span> in the exhibition.
              </p>

              <div className="flex flex-col gap-3">
                <Button onClick={onStartQuiz} variant="black" size="lg" fullWidth className="rounded-full shadow-lg text-base h-14 group hover:scale-[1.02] transition-all duration-300">
                  Enter Exhibition
                  <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </Button>
                <div className="flex gap-2">
                  <a href={LINKS.MBTI_TEST} className="flex-1 block">
                    <Button variant="secondary" size="sm" fullWidth className="bg-white/80 border-transparent hover:border-black shadow-sm h-10">MBTI</Button>
                  </a>
                  <a href={LINKS.LINE_OA} className="flex-1 block">
                    <Button variant="secondary" size="sm" fullWidth className="bg-white/80 border-transparent hover:border-black shadow-sm h-10">Line</Button>
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
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
  onRetry: () => void
}> = ({ selectedOptions, onRetry }) => {

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

    return { dessertResult: selection, stickerResult: sticker };
  }, [selectedOptions]);

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
              獲得<span className="bg-brand-lime px-1">「{stickerResult.name}」</span>貼紙
            </p>
          </div>
        </div>
      </div>

      {/* Secondary Result: The Dessert (Soul Food) */}
      <div className="w-full max-w-md md:max-w-lg lg:max-w-xl bg-white/50 border border-black/10 rounded-2xl p-4 md:p-5 mb-8 flex items-center gap-4">
        <img src={dessertResult.imageUrl} className="w-16 h-16 rounded-lg object-cover border border-black grayscale" alt={dessertResult.name} />
        <div>
          <p className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Soul Food Recommendation</p>
          <p className="font-bold text-sm text-brand-black">{dessertResult.name}</p>
          <p className="text-xs text-gray-500 mt-1">搭配飲品：{recommendedDrink}</p>
        </div>
      </div>

      <div className="w-full max-w-md md:max-w-lg lg:max-w-xl space-y-3">
        <a href={LINKS.LINE_OA} target="_blank" rel="noreferrer" className="block">
          <Button fullWidth variant="black" size="lg" className="rounded-xl shadow-[4px_4px_0px_#D4FF00] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_#D4FF00] active:shadow-none active:translate-y-[4px]">
            <Stamp className="mr-2" size={18} />
            加 LINE 領取「登島紀念」與折扣
          </Button>
        </a>

        <div className="flex gap-2">
          <a href={LINKS.MBTI_TEST} target="_blank" rel="noreferrer" className="flex-1 block group">
            <div className="bg-white border border-brand-black rounded-xl px-2 py-3 text-center hover:bg-brand-gray transition-colors h-full flex flex-col justify-center items-center">
              <BrainCircuit size={16} className="mb-1" />
              <span className="text-[10px] md:text-xs font-bold block leading-tight">深度<br />MBTI</span>
            </div>
          </a>

          <a href={LINKS.GOOGLE_MAPS} target="_blank" rel="noreferrer" className="flex-1 block group">
            <div className="bg-white border border-brand-black rounded-xl px-2 py-3 text-center hover:bg-brand-gray transition-colors h-full flex flex-col justify-center items-center">
              <MapPin size={16} className="mb-1" />
              <span className="text-[10px] md:text-xs font-bold block leading-tight">前往<br />店舖</span>
            </div>
          </a>

          <button
            onClick={onRetry}
            className="flex-1 bg-white border border-brand-black rounded-xl px-2 py-3 text-center hover:bg-brand-gray transition-colors h-full flex flex-col justify-center items-center"
          >
            <RotateCcw size={16} className="mb-1" />
            <span className="text-[10px] md:text-xs font-bold block leading-tight">重測<br />一次</span>
          </button>
        </div>
      </div>
    </div>
  );
};

// -- Main App --

function App() {
  const [screen, setScreen] = useState<Screen>('landing');
  const [answers, setAnswers] = useState<UserAnswers>({});
  const [selectedOptions, setSelectedOptions] = useState<Option[]>([]);

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

  return (
    <div className="min-h-screen font-sans selection:bg-brand-lime selection:text-brand-black">
      <Header />

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
          />
        )}
      </main>
    </div>
  );
}

export default App;