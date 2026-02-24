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
    markSiteVisited
} from './passportUtils';
import BadgeJourney from './components/BadgeJourney';
import MemberHub from './components/MemberHub';
import { Button } from './components/Button';
import { useLiff } from './src/contexts/LiffContext';
import { trackEvent, trackButtonClick, trackOutboundNavigation } from './analytics';
import { getUserPoints } from './src/api/points';

interface PassportScreenProps {
    onClose: () => void;
}

const PassportScreen: React.FC<PassportScreenProps> = ({ onClose }) => {
    const [activeTab, setActiveTab] = useState<'journey' | 'rewards' | 'hub'>('journey');
    const [showAchievementModal, setShowAchievementModal] = useState<string | null>(null);
    const [unlockedCount, setUnlockedCount] = useState(0);
    const [redeemedRewards, setRedeemedRewards] = useState<string[]>([]);
    const [locationError, setLocationError] = useState<string | null>(null);
    const [isCheckingLocation, setIsCheckingLocation] = useState(false);

    const { isLoggedIn, profile } = useLiff();
    const [points, setPoints] = useState(0);

    useEffect(() => {
        const state = getPassportState();
        setUnlockedCount(getUnlockedStampCount());
        setRedeemedRewards(state.redeemedRewards);

        if (isLoggedIn && profile?.userId) {
            getUserPoints(profile.userId, true).then(p => setPoints(p));
        }
    }, [isLoggedIn, profile]);

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
                        {(['journey', 'rewards', 'hub'] as const).map(tab => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab)}
                                className={`flex-1 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all ${activeTab === tab
                                    ? 'bg-brand-lime text-brand-black shadow-[2px_2px_0px_black]'
                                    : 'text-gray-400 hover:text-brand-black'
                                    }`}
                            >
                                {tab}
                            </button>
                        ))}
                    </div>

                    {locationError && (
                        <div className="mb-6 p-4 bg-red-50 border-2 border-red-200 rounded-2xl animate-shake flex items-start gap-3">
                            <MapPin size={20} className="text-red-500 flex-shrink-0" />
                            <p className="text-xs font-bold text-red-700">{locationError}</p>
                        </div>
                    )}

                    {activeTab === 'journey' && (
                        <BadgeJourney
                            onStampUnlocked={handleStampUnlocked}
                            onGpsCheckin={handleGpsCheckin}
                            isCheckingLocation={isCheckingLocation}
                        />
                    )}

                    {activeTab === 'rewards' && (
                        <div className="space-y-4">
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
                </div>

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
