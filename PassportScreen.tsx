import React, { useRef, useState, useEffect } from 'react';
import { X, Sparkles, MapPin, Crown, Navigation, Lock, CheckCircle } from 'lucide-react';
import { STAMPS, REWARD_TIERS, ACHIEVEMENTS } from './constants';
import { Stamp } from './types';
import {
    getPassportState,
    unlockStamp,
    isStampUnlocked,
    getUnlockedStampCount,
    markRewardRedeemed,
    getUnlockedAchievements
} from './passportUtils';
import BadgeJourney from './components/BadgeJourney';
import MemberHub from './components/MemberHub';
import { trackEvent } from './analytics';
import { useLiff } from './src/contexts/LiffContext';
import { getUserPoints } from './src/api/points';

interface PassportScreenProps {
    onClose: () => void;
}

const PassportScreen: React.FC<PassportScreenProps> = ({ onClose }) => {
    const [unlockedCount, setUnlockedCount] = useState(0);
    const [redeemedRewards, setRedeemedRewards] = useState<string[]>([]);
    const [redeemHoldingId, setRedeemHoldingId] = useState<string | null>(null);
    const redeemHoldTimerRef = useRef<number | null>(null);

    // GPS Check-in state
    const [isCheckingLocation, setIsCheckingLocation] = useState(false);
    const [locationError, setLocationError] = useState<string | null>(null);
    const [showCheckinWelcome, setShowCheckinWelcome] = useState(false);

    // Achievements
    const [unlockedAchievements, setUnlockedAchievements] = useState<string[]>([]);
    const [newAchievement, setNewAchievement] = useState<string | null>(null);

    // LIFF & Points
    const { isLoggedIn, login, profile } = useLiff();
    const [points, setPoints] = useState(0);

    useEffect(() => {
        if (isLoggedIn && profile?.userId) {
            getUserPoints(profile.userId, true).then(p => setPoints(p));
        }
    }, [isLoggedIn, profile]);

    useEffect(() => {
        setUnlockedCount(getUnlockedStampCount());
        setUnlockedAchievements(getUnlockedAchievements());
        setRedeemedRewards(getPassportState().redeemedRewards || []);
    }, []);

    const processUnlock = (newAchievementIds: string[]) => {
        setUnlockedCount(getUnlockedStampCount());
        setUnlockedAchievements(getUnlockedAchievements());
        if (newAchievementIds.length > 0) {
            setNewAchievement(newAchievementIds[0]);
            trackEvent('achievement_unlocked', { achievement_id: newAchievementIds[0] });
        }
    };

    // ─── GPS Check-in Logic ───
    const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
        const R = 6371e3;
        const toRad = (deg: number) => (deg * Math.PI) / 180;
        const dLat = toRad(lat2 - lat1);
        const dLng = toRad(lng2 - lng1);
        const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
            Math.sin(dLng / 2) * Math.sin(dLng / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    };

    const handleGpsCheckin = (stamp: Stamp) => {
        if (!stamp.location) return;
        if (!navigator.geolocation) {
            setLocationError('您的瀏覽器不支援定位功能');
            return;
        }

        setIsCheckingLocation(true);
        setLocationError(null);

        navigator.geolocation.getCurrentPosition(
            (position) => {
                const { latitude, longitude } = position.coords;
                const distance = calculateDistance(
                    latitude, longitude,
                    stamp.location!.lat, stamp.location!.lng
                );

                if (distance <= stamp.location!.radius) {
                    setShowCheckinWelcome(true);
                    trackEvent('gps_checkin_success', { stamp_id: stamp.id, distance: Math.round(distance) });
                } else {
                    setLocationError(`你距離月島還有約 ${Math.round(distance)} 公尺，再靠近一點吧！`);
                    trackEvent('gps_checkin_too_far', { stamp_id: stamp.id, distance: Math.round(distance) });
                }
                setIsCheckingLocation(false);
            },
            (error) => {
                setIsCheckingLocation(false);
                switch (error.code) {
                    case error.PERMISSION_DENIED:
                        setLocationError('請允許位置存取權限 🙏');
                        break;
                    case error.POSITION_UNAVAILABLE:
                        setLocationError('無法取得位置，請確認 GPS 是否開啟');
                        break;
                    case error.TIMEOUT:
                        setLocationError('定位逾時，請再試一次');
                        break;
                    default:
                        setLocationError('發生未知錯誤，請稍後再試');
                }
                trackEvent('gps_checkin_error', { stamp_id: stamp.id, error_code: error.code });
            },
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
        );
    };

    const confirmCheckin = () => {
        const newIds = unlockStamp('shop_checkin');
        processUnlock(newIds);
        setShowCheckinWelcome(false);
        trackEvent('stamp_unlocked', { stamp_id: 'shop_checkin', method: 'gps' });
    };

    // ─── Reward Logic ───
    const handleRewardRedeem = (tierId: string) => {
        if (!redeemedRewards.includes(tierId)) {
            markRewardRedeemed(tierId);
            setRedeemedRewards(prev => [...prev, tierId]);
            trackEvent('reward_redeemed', { tier_id: tierId });
        }
    };

    const startRedeemHold = (tierId: string) => {
        if (redeemedRewards.includes(tierId)) return;
        setRedeemHoldingId(tierId);
        if (redeemHoldTimerRef.current) clearTimeout(redeemHoldTimerRef.current);
        redeemHoldTimerRef.current = window.setTimeout(() => {
            handleRewardRedeem(tierId);
            setRedeemHoldingId(null);
            redeemHoldTimerRef.current = null;
        }, 2000);
    };

    const cancelRedeemHold = () => {
        if (redeemHoldTimerRef.current) {
            clearTimeout(redeemHoldTimerRef.current);
            redeemHoldTimerRef.current = null;
        }
        setRedeemHoldingId(null);
    };

    const availableRewards = REWARD_TIERS.filter(tier => unlockedCount >= tier.requiredStamps);
    const nextReward = REWARD_TIERS.find(tier => unlockedCount < tier.requiredStamps);

    return (
        <div className="min-h-screen bg-brand-bg pt-16 md:pt-20 px-4 md:px-6 pb-12 animate-fade-in">
            {/* ─── Header ─── */}
            <div className="max-w-lg mx-auto mb-6">
                <div className="flex items-center justify-between mb-4">
                    <h1 className="text-2xl md:text-3xl font-serif font-bold text-brand-black">月島護照</h1>
                    <button
                        onClick={onClose}
                        className="w-10 h-10 rounded-full bg-white border-2 border-brand-black flex items-center justify-center hover:bg-brand-gray transition-all hover:scale-105 shadow-[2px_2px_0px_black]"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Points Display */}
                <div className="bg-white rounded-xl p-3 border-2 border-brand-black shadow-[2px_2px_0px_black] mb-4 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="p-1.5 bg-brand-black text-brand-lime rounded-full">
                            <Sparkles size={14} />
                        </div>
                        <span className="text-sm font-bold text-brand-black">會員點數</span>
                    </div>
                    {isLoggedIn ? (
                        <div className="flex items-baseline gap-1">
                            <span className="font-mono text-xl font-bold text-brand-black">{points}</span>
                            <span className="text-xs font-bold text-gray-500">P</span>
                            {profile?.displayName && (
                                <span className="text-[10px] text-gray-400 ml-2">Hi, {profile.displayName}</span>
                            )}
                        </div>
                    ) : (
                        <button
                            onClick={() => login()}
                            className="px-3 py-1.5 bg-brand-lime text-brand-black text-xs font-bold rounded-lg border border-brand-black shadow-[2px_2px_0px_black] active:translate-y-0.5 active:shadow-none transition-all"
                        >
                            登入查看
                        </button>
                    )}
                </div>

                {/* Reminder */}
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-2 text-xs text-yellow-800">
                    <strong>💡 提醒</strong>：請使用同一支手機收集印章哦
                </div>
            </div>

            {/* ─── Badge Journey (Core UX) ─── */}
            <div className="max-w-lg mx-auto mb-8">
                <BadgeJourney
                    onStampUnlocked={processUnlock}
                    onGpsCheckin={handleGpsCheckin}
                    isCheckingLocation={isCheckingLocation}
                />

                {/* GPS Location Error */}
                {locationError && (
                    <div className="mt-4 bg-red-50 border-2 border-red-200 rounded-xl p-4 flex items-start gap-3 animate-fade-in">
                        <MapPin size={20} className="text-red-400 flex-shrink-0 mt-0.5" />
                        <div className="flex-1">
                            <p className="text-sm text-red-700 font-bold mb-0.5">定位失敗</p>
                            <p className="text-xs text-red-600">{locationError}</p>
                        </div>
                        <button onClick={() => setLocationError(null)} className="text-red-400 hover:text-red-600">
                            <X size={16} />
                        </button>
                    </div>
                )}
            </div>

            {/* ─── Achievements (Compact) ─── */}
            <div className="max-w-lg mx-auto mb-8">
                <h2 className="text-lg font-bold text-brand-black mb-3 flex items-center gap-2">
                    探險成就
                    <span className="text-xs bg-brand-black text-brand-lime px-2 py-0.5 rounded-full font-bold">
                        {unlockedAchievements.length}/{ACHIEVEMENTS.length}
                    </span>
                </h2>
                <div className="flex gap-2">
                    {ACHIEVEMENTS.map(achievement => {
                        const isUnlocked = unlockedAchievements.includes(achievement.id);
                        return (
                            <div
                                key={achievement.id}
                                className={`flex-1 flex flex-col items-center text-center p-3 rounded-xl transition-all ${isUnlocked
                                        ? 'bg-white border-2 border-brand-lime shadow-[2px_2px_0px_#D4FF00]'
                                        : 'bg-gray-100 border-2 border-gray-200 opacity-50'
                                    }`}
                            >
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-1.5 ${isUnlocked ? 'bg-brand-lime text-brand-black' : 'bg-gray-200 text-gray-400'
                                    }`}>
                                    {achievement.condition.target === 1 ? '🐣' : achievement.condition.target === 5 ? '🧭' : '👑'}
                                </div>
                                <span className="text-[10px] font-bold text-brand-black leading-tight">{achievement.name}</span>
                                <span className="text-[9px] text-gray-500">{achievement.condition.target} 章</span>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* ─── Rewards ─── */}
            <div className="max-w-lg mx-auto mb-8">
                <h2 className="text-lg font-bold text-brand-black mb-3">🎁 階段獎勵</h2>

                <div className="space-y-3">
                    {REWARD_TIERS.map((reward) => {
                        const isRedeemed = redeemedRewards.includes(reward.id);
                        const isAvailable = unlockedCount >= reward.requiredStamps;

                        return (
                            <div
                                key={reward.id}
                                className={`bg-white border-2 rounded-xl p-4 transition-all ${isAvailable
                                        ? 'border-brand-black shadow-[3px_3px_0px_black]'
                                        : 'border-gray-200 opacity-50'
                                    }`}
                            >
                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-2">
                                        <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${isAvailable ? 'bg-brand-lime text-brand-black' : 'bg-gray-200 text-gray-500'
                                            }`}>
                                            {reward.requiredStamps} 章
                                        </span>
                                        <h3 className="text-sm font-bold text-brand-black">{reward.title}</h3>
                                    </div>
                                    {reward.imageUrl && (
                                        <img
                                            src={reward.imageUrl}
                                            alt={reward.title}
                                            className="w-12 h-12 object-cover rounded-lg border border-brand-black"
                                        />
                                    )}
                                </div>
                                <p className="text-xs text-gray-600 mb-2">{reward.description}</p>

                                {isAvailable && !isRedeemed && (
                                    <div className="bg-brand-lime/10 border border-brand-lime rounded-lg p-3 text-center">
                                        <p className="text-xs font-bold text-brand-black mb-2">出示此畫面給店員兌換</p>
                                        <button
                                            onPointerDown={() => startRedeemHold(reward.id)}
                                            onPointerUp={cancelRedeemHold}
                                            onPointerLeave={cancelRedeemHold}
                                            onPointerCancel={cancelRedeemHold}
                                            className="w-full bg-brand-black text-white text-xs py-2.5 rounded-lg font-bold active:bg-brand-black/80"
                                        >
                                            {redeemHoldingId === reward.id ? '按住中...（2 秒）' : '店員長按 2 秒核銷'}
                                        </button>
                                    </div>
                                )}
                                {isRedeemed && (
                                    <div className="bg-gray-100 rounded-lg p-2 text-center">
                                        <p className="text-xs font-bold text-gray-500 flex items-center justify-center gap-1">
                                            <CheckCircle size={12} /> 已兌換
                                        </p>
                                    </div>
                                )}
                                {!isAvailable && (
                                    <div className="flex items-center gap-1 text-[10px] text-gray-400">
                                        <Lock size={10} />
                                        還差 {reward.requiredStamps - unlockedCount} 章
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* ─── Member Hub (Moon Sites) ─── */}
            <div className="max-w-lg mx-auto mb-8">
                <MemberHub />
            </div>

            {/* ─── Achievement Notification Modal ─── */}
            {newAchievement && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[60] px-4 animate-fade-in">
                    <div className="bg-brand-black text-brand-lime rounded-2xl p-6 max-w-sm w-full relative text-center border-4 border-brand-lime shadow-[0_0_20px_rgba(212,255,0,0.5)]">
                        <div className="absolute -top-10 left-1/2 -translate-x-1/2">
                            <div className="w-20 h-20 bg-brand-lime rounded-full border-4 border-brand-black flex items-center justify-center shadow-[4px_4px_0px_black]">
                                <Crown size={40} className="text-brand-black" />
                            </div>
                        </div>
                        <div className="mt-8">
                            <h3 className="text-xl font-bold text-white mb-1 uppercase tracking-wider">Achievement Unlocked!</h3>
                            <h2 className="text-2xl font-bold text-brand-lime mb-2">
                                {ACHIEVEMENTS.find(a => a.id === newAchievement)?.name}
                            </h2>
                            <p className="text-sm text-gray-300 mb-6 font-sans">
                                {ACHIEVEMENTS.find(a => a.id === newAchievement)?.description}
                            </p>
                        </div>
                        <button
                            onClick={() => setNewAchievement(null)}
                            className="w-full py-3 bg-brand-lime text-brand-black rounded-xl font-bold hover:bg-brand-lime/80 transition-all shadow-[2px_2px_0px_white] active:translate-y-0.5 active:shadow-none"
                        >
                            太棒了！
                        </button>
                    </div>
                </div>
            )}

            {/* ─── GPS Check-in Welcome Modal ─── */}
            {showCheckinWelcome && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 px-4 animate-fade-in">
                    <div className="bg-white rounded-2xl max-w-md w-full overflow-hidden shadow-2xl">
                        <div className="bg-gradient-to-br from-brand-lime/30 via-brand-lime/10 to-white p-6 text-center">
                            <button
                                onClick={() => setShowCheckinWelcome(false)}
                                className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
                            >
                                <X size={20} />
                            </button>
                            <div className="w-20 h-20 bg-brand-lime/30 rounded-full flex items-center justify-center mx-auto mb-4 border-2 border-brand-black shadow-[3px_3px_0px_black]">
                                <Navigation size={36} className="text-brand-black" />
                            </div>
                            <h3 className="text-2xl font-serif font-bold text-brand-black mb-1">🎉 歡迎登陸月島！</h3>
                            <p className="text-sm text-gray-600 mb-4">你已成功抵達月島甜點店</p>
                        </div>
                        <div className="px-6 py-5">
                            <div className="bg-brand-lime/10 border-2 border-brand-lime/50 rounded-xl p-4 mb-5">
                                <h4 className="text-sm font-bold text-brand-black mb-2 flex items-center gap-2">
                                    <Sparkles size={16} /> 接下來可以...
                                </h4>
                                <ul className="text-xs text-gray-700 space-y-1.5">
                                    <li>📸 追蹤 IG 解鎖社群徽章</li>
                                    <li>🔍 尋找店內隱藏 QR Code</li>
                                    <li>🛍️ 點餐後掃描 QR 解鎖</li>
                                    <li>🎁 集滿 3 章就能兌換獎勵！</li>
                                </ul>
                            </div>
                            <button
                                onClick={confirmCheckin}
                                className="w-full py-3.5 bg-brand-black text-white rounded-xl font-bold text-base transition-all shadow-[3px_3px_0px_rgba(212,255,0,0.8)] active:translate-y-0.5 active:shadow-none"
                            >
                                🏝️ 領取「月島登陸」徽章
                            </button>
                            <p className="text-center text-[10px] text-gray-400 mt-2">請使用同一支手機完成所有任務</p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PassportScreen;
