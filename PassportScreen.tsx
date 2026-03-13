import React, { useRef, useState, useEffect } from 'react';
import {
    X,
    MapPin,
    Award,
    Gift,
    ChevronRight,
    CheckCircle2,
    Clock,
    ArrowRight,
    ShieldCheck,
    Star,
    Sparkles,
    Trophy,
    Navigation,
    Lock
} from 'lucide-react';
import { STAMPS, REWARD_TIERS, ACHIEVEMENTS, BRANDING, MOONMOON_SITES } from './constants';
import { Stamp } from './types';
import {
    getPassportState,
    unlockStamp,
    markRewardRedeemed,
    getUnlockedStampCount,
    calculateUserLevel,
    isStampUnlocked,
    getUnlockedAchievements,
    getVisitedSites,
    markSiteVisited,
    addPassportPoints,
} from './passportUtils';
import BadgeJourney from './components/BadgeJourney';
import MemberHub from './components/MemberHub';
import RewardShop from './components/RewardShop';
import ShopOrderHistory from './components/ShopOrderHistory';
import CheckinCard from './components/CheckinCard';
import CheckinModal from './components/CheckinModal';
import { Button } from './components/Button';
import { useLiff } from './src/contexts/LiffContext';
import { useSupabaseAuth } from './src/contexts/SupabaseAuthContext';
import { trackEvent, trackButtonClick, trackOutboundNavigation } from './analytics';
import { getUserPointsByIdentity } from './src/api/points';


interface PassportScreenProps {
    onClose: () => void;
}

const TAB_LABELS: Record<'journey' | 'rewards' | 'shop' | 'hub', string> = {
    journey: '任務',
    rewards: '集章獎勵',
    shop: '會員福利',
    hub: '宇宙足跡',
};

const PassportScreen: React.FC<PassportScreenProps> = ({ onClose }) => {
    const [activeTab, setActiveTab] = useState<'journey' | 'rewards' | 'shop' | 'hub'>('journey');
    const [showAchievementModal, setShowAchievementModal] = useState<string | null>(null);
    const [showCheckinModal, setShowCheckinModal] = useState(false);
    const [unlockedCount, setUnlockedCount] = useState(0);
    const [redeemedRewards, setRedeemedRewards] = useState<string[]>([]);
    const [locationError, setLocationError] = useState<string | null>(null);
    const [isCheckingLocation, setIsCheckingLocation] = useState(false);


    const { isLoggedIn, profile } = useLiff();
    const { user, signInWithGoogle } = useSupabaseAuth();
    const [points, setPoints] = useState(0);

    const refreshPoints = React.useCallback(async () => {
        const state = getPassportState();
        const localPoints = state.points || 0;

        if (user?.id) {
            const remotePoints = await getUserPointsByIdentity({ authUserId: user.id });
            setPoints(remotePoints || localPoints);
            return;
        }

        if (profile?.userId) {
            const remotePoints = await getUserPointsByIdentity({ lineUserId: profile.userId });
            setPoints(remotePoints || localPoints);
            return;
        }

        setPoints(localPoints);
    }, [profile?.userId, user?.id]);

    useEffect(() => {
        const state = getPassportState();
        setUnlockedCount(getUnlockedStampCount());
        setRedeemedRewards(state.redeemedRewards);
        void refreshPoints();

        // LIFF-4: Listen for cross-site points from Gacha
        const handleExternalPoints = (e: Event) => {
            const evt = e as CustomEvent<{ points: number; action: string; description: string }>;
            if (!evt.detail?.points) return;
            const newBalance = addPassportPoints(evt.detail.points, evt.detail.action as any, evt.detail.description);
            setPoints(newBalance);
        };

        const handlePassportMigrated = () => {
            const newState = getPassportState();
            setUnlockedCount(newState.unlockedStamps.length);
            setRedeemedRewards(newState.redeemedRewards);
            void refreshPoints();
        };

        const handlePointsUpdated = (e: Event) => {
            const evt = e as CustomEvent<{ balance?: number }>;
            if (typeof evt.detail?.balance === 'number') {
                setPoints(evt.detail.balance);
                return;
            }
            void refreshPoints();
        };

        document.addEventListener('kiwimu:points_earned', handleExternalPoints);
        document.addEventListener('kiwimu:passport_migrated', handlePassportMigrated);
        document.addEventListener('passport-points-updated', handlePointsUpdated);

        return () => {
            document.removeEventListener('kiwimu:points_earned', handleExternalPoints);
            document.removeEventListener('kiwimu:passport_migrated', handlePassportMigrated);
            document.removeEventListener('passport-points-updated', handlePointsUpdated);
        };
    }, [isLoggedIn, profile, refreshPoints, user]);

    const handleStampUnlocked = (newAchievementIds: string[]) => {
        setUnlockedCount(getUnlockedStampCount());
        if (newAchievementIds.length > 0) {
            setShowAchievementModal(newAchievementIds[0]);
            trackEvent('achievement_unlocked', { achievement_id: newAchievementIds[0] });
        }
    };

    const handleGpsCheckin = (stamp: Stamp) => {
        if (!stamp.location) return;
        setIsCheckingLocation(true);
        setLocationError(null);

        navigator.geolocation.getCurrentPosition(
            (pos) => {
                const dist = calculateDistance(
                    pos.coords.latitude,
                    pos.coords.longitude,
                    stamp.location!.lat,
                    stamp.location!.lng
                );

                if (dist <= stamp.location!.radius) {
                    const newIds = unlockStamp(stamp.id);
                    handleStampUnlocked(newIds);
                    trackEvent('stamp_unlocked', { stamp_id: stamp.id, method: 'gps', distance: dist });

                    // GA4: passport_checkin 實體門市打卡
                    if (typeof window !== 'undefined' && window.gtag) {
                        window.gtag('event', 'passport_checkin', { location: stamp.name });
                    }
                } else {
                    setLocationError(`你距離月島還有約 ${Math.round(dist)} 公尺，再靠近一點吧！`);
                    trackEvent('stamp_unlock_failed_distance', { stamp_id: stamp.id, distance: dist });
                }
                setIsCheckingLocation(false);
            },
            (err) => {
                setLocationError('無法取得定位權限，請檢查手機設定。');
                trackEvent('stamp_unlock_failed_error', { stamp_id: stamp.id, error: err.message });
                setIsCheckingLocation(false);
            }
        );
    };

    const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
        const R = 6371e3;
        const φ1 = lat1 * Math.PI / 180;
        const φ2 = lat2 * Math.PI / 180;
        const Δφ = (lat2 - lat1) * Math.PI / 180;
        const Δλ = (lon2 - lon1) * Math.PI / 180;
        const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    };

    const userLevel = calculateUserLevel();
    const nextReward = REWARD_TIERS.find(r => unlockedCount < r.requiredStamps) || REWARD_TIERS[REWARD_TIERS.length - 1];

    return (
        <div className="fixed inset-0 z-50 bg-brand-bg md:bg-black/20 md:flex md:items-center md:justify-center overflow-hidden">
            <div className="flex flex-col w-full h-full md:max-w-md md:h-[90vh] md:rounded-[40px] bg-brand-bg shadow-2xl relative overflow-hidden animate-slide-up">

                {/* ─── Hero Header ─── */}
                <div className="bg-brand-black pt-16 pb-8 px-6 rounded-b-[40px] shadow-lg relative overflow-hidden flex-shrink-0">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-brand-lime/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl pointer-events-none" />

                    <div className="relative z-10 flex flex-col items-center">
                        <button
                            onClick={onClose}
                            className="absolute top-0 right-0 p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors"
                        >
                            <X size={20} />
                        </button>

                        <div className="w-16 h-16 rounded-2xl bg-brand-lime border-2 border-white shadow-[0_0_20px_rgba(212,255,0,0.3)] flex items-center justify-center mb-3 animate-float">
                            <Trophy size={32} className="text-brand-black" />
                        </div>

                        <h1 className="text-xl font-black text-white uppercase tracking-tighter mb-1">
                            MoonMoon Adventurer
                        </h1>

                        <div className="flex items-center gap-2 bg-white/10 backdrop-blur-md px-3 py-1 rounded-full border border-white/20 mb-4">
                            <ShieldCheck size={12} className="text-brand-lime" />
                            <span className="text-[9px] font-black text-brand-lime uppercase tracking-widest">
                                Level {userLevel}
                            </span>
                        </div>

                        <div className="flex gap-3 w-full max-w-[240px]">
                            <div className="flex-1 bg-white/5 rounded-xl p-2.5 border border-white/10 flex flex-col items-center">
                                <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">Stamps</span>
                                <span className="text-lg font-black text-white">{unlockedCount}</span>
                            </div>
                            <div className="flex-1 bg-white/5 rounded-xl p-2.5 border border-white/10 flex flex-col items-center">
                                <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">Points</span>
                                <span className="text-lg font-black text-brand-lime">{points}P</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* ─── Content Tabs ─── */}
                <div className="flex-1 overflow-y-auto px-6 py-8 scrollbar-hide">
                    {/* Tab Navigation */}
                    <div className="flex p-1 bg-brand-gray/10 rounded-2xl border-2 border-brand-black mb-8">
                        {(['journey', 'rewards', 'shop', 'hub'] as const).map(tab => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab)}
                                className={`flex-1 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${activeTab === tab
                                    ? 'bg-brand-lime text-brand-black shadow-[2px_2px_0px_black]'
                                    : 'text-gray-400 hover:text-brand-black'
                                    }`}
                            >
                                {TAB_LABELS[tab]}
                            </button>
                        ))}
                    </div>

                    {locationError && (
                        <div className="mb-6 p-4 bg-red-50 border-2 border-red-200 rounded-2xl animate-shake flex items-start gap-3">
                            <MapPin size={20} className="text-red-500 flex-shrink-0" />
                            <p className="text-xs font-bold text-red-700">{locationError}</p>
                        </div>
                    )}

                    {!user && (
                        <div className="mb-6 p-4 bg-white border-2 border-brand-black shadow-[4px_4px_0px_black] rounded-2xl flex flex-col items-center text-center gap-3">
                            <ShieldCheck size={24} className="text-brand-lime-dark" />
                            <div>
                                <h3 className="text-sm font-black text-brand-black uppercase">保存你的探險紀錄</h3>
                                <p className="text-[10px] text-gray-500 font-bold mt-1">登入以永久保存印章與積分，並在所有宇宙服務中同步。</p>
                            </div>
                            <button
                                onClick={signInWithGoogle}
                                className="w-full py-2.5 bg-brand-lime text-brand-black rounded-xl text-xs font-black uppercase tracking-wider border-2 border-brand-black shadow-[2px_2px_0px_black] active:translate-y-[2px] active:shadow-none transition-all"
                            >
                                登入 Google 帳號快速綁定
                            </button>
                        </div>
                    )}

                    {activeTab === 'journey' && (
                        <div className="space-y-4">
                            {/* ─── Daily Check-in (prominent placement) ─── */}
                            <CheckinCard
                                onOpen={() => {
                                    setShowCheckinModal(true);
                                    trackEvent('checkin_card_tapped', {});
                                }}
                            />

                            {/* ─── Stamp Journey ─── */}
                            <BadgeJourney
                                onStampUnlocked={handleStampUnlocked}
                                onGpsCheckin={handleGpsCheckin}
                                isCheckingLocation={isCheckingLocation}
                            />
                        </div>
                    )}


                    {activeTab === 'rewards' && (
                        <div className="space-y-4">
                            <div className="rounded-2xl border border-brand-black/10 bg-white p-4">
                                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Stamp Milestones</p>
                                <p className="mt-2 text-xs font-medium leading-relaxed text-gray-500">
                                    這裡是「集章里程碑獎勵」。完成探索任務累積印章後，可解鎖一次性的護照成就獎勵。
                                </p>
                            </div>
                            {REWARD_TIERS.map((reward) => {
                                const isUnlocked = unlockedCount >= reward.requiredStamps;
                                const isRedeemed = redeemedRewards.includes(reward.id);
                                return (
                                    <div
                                        key={reward.id}
                                        className={`p-4 rounded-2xl border-2 border-brand-black shadow-[4px_4px_0px_black] transition-all ${isUnlocked ? 'bg-white' : 'bg-gray-50 opacity-60'
                                            }`}
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className={`w-12 h-12 rounded-xl border-2 border-brand-black flex items-center justify-center shadow-[2px_2px_0px_black] ${isUnlocked && !isRedeemed ? 'bg-brand-lime' : 'bg-white'
                                                }`}>
                                                {isRedeemed ? <CheckCircle2 size={24} className="text-brand-lime-dark" /> : <Gift size={24} className="text-brand-black" />}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <h3 className="text-xs font-black text-brand-black truncate uppercase">{reward.title}</h3>
                                                <p className="text-[10px] text-gray-400 font-bold">{reward.requiredStamps} STAMPS REQUIRED</p>
                                            </div>
                                            {isUnlocked && !isRedeemed && (
                                                <button
                                                    onClick={() => {
                                                        markRewardRedeemed(reward.id);
                                                        setRedeemedRewards([...redeemedRewards, reward.id]);
                                                        trackEvent('reward_redeemed', { reward_id: reward.id });
                                                    }}
                                                    className="px-3 py-1.5 bg-brand-black text-white rounded-lg text-[10px] font-black uppercase border border-brand-black active:translate-y-0.5 transition-all"
                                                >
                                                    Redeem
                                                </button>
                                            )}
                                            {!isUnlocked && <Lock size={16} className="text-gray-300" />}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {activeTab === 'hub' && <MemberHub />}

                    {activeTab === 'shop' && (
                        <div className="space-y-6">
                            <ShopOrderHistory
                                userId={user?.id ?? null}
                                onLogin={signInWithGoogle}
                            />
                            <RewardShop currentPoints={points} />
                        </div>
                    )}
                </div>

                {/* ─── Checkin Modal ─── */}
                {showCheckinModal && (
                    <CheckinModal
                        onClose={() => setShowCheckinModal(false)}
                        onCheckinComplete={(balance) => {
                            setPoints(balance);
                        }}
                    />
                )}

                {/* ─── Achievement Modal ─── */}
                {showAchievementModal && (
                    <div className="fixed inset-0 z-[100] bg-brand-black/90 flex items-center justify-center p-8 backdrop-blur-sm">
                        <div className="bg-white border-4 border-brand-lime rounded-[40px] p-8 w-full max-w-sm text-center relative shadow-[0_0_50px_rgba(212,255,0,0.4)] animate-scale-up">
                            <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-24 h-24 bg-brand-lime rounded-full border-4 border-brand-black flex items-center justify-center animate-bounce shadow-xl">
                                <Star size={48} className="text-brand-black" />
                            </div>

                            <h2 className="mt-8 text-2xl font-black text-brand-black uppercase tracking-tighter">
                                New Legend!
                            </h2>
                            <p className="text-[10px] font-black text-brand-lime-dark tracking-[0.3em] uppercase mb-6">
                                Achievement Unlocked
                            </p>

                            <div className="bg-gray-100 p-4 rounded-3xl mb-8 border-2 border-brand-black/5">
                                <h3 className="text-lg font-black text-brand-black mb-1">
                                    {ACHIEVEMENTS.find(a => a.id === showAchievementModal)?.name}
                                </h3>
                                <p className="text-xs font-medium text-gray-500">
                                    {ACHIEVEMENTS.find(a => a.id === showAchievementModal)?.description}
                                </p>
                            </div>

                            <button
                                onClick={() => setShowAchievementModal(null)}
                                className="w-full py-4 bg-brand-black text-white rounded-[24px] font-black uppercase tracking-widest border-2 border-brand-black shadow-[4px_4px_0px_brand-lime] active:translate-y-1 transition-all"
                            >
                                Continue Journey
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default PassportScreen;
