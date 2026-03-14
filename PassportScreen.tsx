import React, { useState, useEffect } from 'react';
import {
    X,
    MapPin,
    ExternalLink,
    ShieldCheck,
    Star,
    Trophy,
    Lock,
    CheckCircle2,
    Gift,
} from 'lucide-react';
import { STAMPS, REWARD_TIERS, ACHIEVEMENTS, LINKS } from './constants';
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
import { trackEvent } from './analytics';
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

type GpsDebugStatus =
    | 'success'
    | 'out_of_range'
    | 'permission_denied'
    | 'position_unavailable'
    | 'timeout'
    | 'unsupported'
    | 'error';

interface GpsDebugInfo {
    stampId: string;
    stampName: string;
    status: GpsDebugStatus;
    message: string;
    checkedAt: string;
    allowedRadiusMeters: number;
    distanceMeters?: number;
    accuracyMeters?: number;
    userLat?: number;
    userLng?: number;
    targetLat: number;
    targetLng: number;
}

const GPS_STATUS_STYLE: Record<GpsDebugStatus, string> = {
    success: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    out_of_range: 'bg-amber-100 text-amber-700 border-amber-200',
    permission_denied: 'bg-red-100 text-red-700 border-red-200',
    position_unavailable: 'bg-orange-100 text-orange-700 border-orange-200',
    timeout: 'bg-orange-100 text-orange-700 border-orange-200',
    unsupported: 'bg-gray-100 text-gray-700 border-gray-200',
    error: 'bg-red-100 text-red-700 border-red-200',
};

const GPS_STATUS_LABEL: Record<GpsDebugStatus, string> = {
    success: '判定成功',
    out_of_range: '尚未進圈',
    permission_denied: '權限被拒',
    position_unavailable: '定位不可用',
    timeout: '定位逾時',
    unsupported: '裝置不支援',
    error: '定位錯誤',
};

const PassportScreen: React.FC<PassportScreenProps> = ({ onClose }) => {
    const [activeTab, setActiveTab] = useState<'journey' | 'rewards' | 'shop' | 'hub'>('journey');
    const [showAchievementModal, setShowAchievementModal] = useState<string | null>(null);
    const [showCheckinModal, setShowCheckinModal] = useState(false);
    const [unlockedCount, setUnlockedCount] = useState(0);
    const [redeemedRewards, setRedeemedRewards] = useState<string[]>([]);
    const [locationError, setLocationError] = useState<string | null>(null);
    const [isCheckingLocation, setIsCheckingLocation] = useState(false);
    const [gpsDebug, setGpsDebug] = useState<GpsDebugInfo | null>(null);


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
            setUnlockedCount(getUnlockedStampCount());
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
        const baseDebug = {
            stampId: stamp.id,
            stampName: stamp.name,
            checkedAt: new Date().toISOString(),
            allowedRadiusMeters: stamp.location.radius,
            targetLat: stamp.location.lat,
            targetLng: stamp.location.lng,
        };

        if (typeof navigator === 'undefined' || !navigator.geolocation) {
            const message = '這台裝置不支援 GPS 定位，請改用手機瀏覽器並開啟定位服務。';
            setLocationError(message);
            setGpsDebug({
                ...baseDebug,
                status: 'unsupported',
                message,
            });
            setIsCheckingLocation(false);
            return;
        }

        navigator.geolocation.getCurrentPosition(
            (pos) => {
                const dist = calculateDistance(
                    pos.coords.latitude,
                    pos.coords.longitude,
                    stamp.location!.lat,
                    stamp.location!.lng
                );
                const accuracy = pos.coords.accuracy || 0;
                const precisionHint = accuracy > 80
                    ? ` 目前 GPS 精度約 ±${Math.round(accuracy)} 公尺，建議走到室外或打開高精準定位再試一次。`
                    : '';

                if (dist <= stamp.location!.radius) {
                    const newIds = unlockStamp(stamp.id);
                    handleStampUnlocked(newIds);
                    trackEvent('stamp_unlocked', { stamp_id: stamp.id, method: 'gps', distance: dist });
                    setGpsDebug({
                        ...baseDebug,
                        status: 'success',
                        message: `已進入 ${stamp.location!.radius} 公尺判定範圍，印章解鎖成功。`,
                        distanceMeters: dist,
                        accuracyMeters: accuracy,
                        userLat: pos.coords.latitude,
                        userLng: pos.coords.longitude,
                    });

                    // GA4: passport_checkin 實體門市打卡
                    if (typeof window !== 'undefined' && window.gtag) {
                        window.gtag('event', 'passport_checkin', { location: stamp.name });
                    }
                } else {
                    const message = `你距離月島約 ${Math.round(dist)} 公尺，需進入 ${stamp.location!.radius} 公尺內才能解鎖。${precisionHint}`;
                    setLocationError(message);
                    setGpsDebug({
                        ...baseDebug,
                        status: 'out_of_range',
                        message,
                        distanceMeters: dist,
                        accuracyMeters: accuracy,
                        userLat: pos.coords.latitude,
                        userLng: pos.coords.longitude,
                    });
                    trackEvent('stamp_unlock_failed_distance', { stamp_id: stamp.id, distance: dist });
                }
                setIsCheckingLocation(false);
            },
            (err) => {
                let status: GpsDebugStatus = 'error';
                let message = '定位失敗，請稍後再試。';

                if (err.code === err.PERMISSION_DENIED) {
                    status = 'permission_denied';
                    message = '你目前拒絕了定位權限，請到瀏覽器設定把此站點的位置權限改成「允許」。';
                } else if (err.code === err.POSITION_UNAVAILABLE) {
                    status = 'position_unavailable';
                    message = '裝置目前抓不到穩定位置，請確認已開啟定位服務，並移動到訊號較好的位置。';
                } else if (err.code === err.TIMEOUT) {
                    status = 'timeout';
                    message = '定位逾時，請確認網路與 GPS 已開啟，再重新嘗試一次。';
                }

                setLocationError(message);
                setGpsDebug({
                    ...baseDebug,
                    status,
                    message,
                });
                trackEvent('stamp_unlock_failed_error', { stamp_id: stamp.id, error: err.message });
                setIsCheckingLocation(false);
            },
            {
                enableHighAccuracy: true,
                timeout: 12000,
                maximumAge: 0,
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
    const gpsNavigationUrl = gpsDebug
        ? `https://maps.google.com/?q=${gpsDebug.targetLat},${gpsDebug.targetLng}`
        : null;

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

                            {gpsDebug && (
                                <section className="rounded-2xl border-2 border-brand-black bg-white shadow-[4px_4px_0px_black] overflow-hidden">
                                    <div className="flex items-center justify-between gap-3 border-b-2 border-brand-black px-4 py-3 bg-brand-gray/10">
                                        <div>
                                            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">GPS Debug</p>
                                            <h3 className="text-sm font-black text-brand-black">{gpsDebug.stampName} 驗證結果</h3>
                                        </div>
                                        <span className={`rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-wider ${GPS_STATUS_STYLE[gpsDebug.status]}`}>
                                            {GPS_STATUS_LABEL[gpsDebug.status]}
                                        </span>
                                    </div>

                                    <div className="space-y-3 p-4">
                                        <p className="text-xs font-medium leading-relaxed text-gray-600">{gpsDebug.message}</p>

                                        <div className="grid grid-cols-2 gap-2 text-[11px]">
                                            <div className="rounded-xl bg-brand-gray/10 px-3 py-2">
                                                <p className="font-bold uppercase tracking-wider text-gray-400">判定半徑</p>
                                                <p className="mt-1 font-semibold text-brand-black/80">{gpsDebug.allowedRadiusMeters} m</p>
                                            </div>
                                            <div className="rounded-xl bg-brand-gray/10 px-3 py-2">
                                                <p className="font-bold uppercase tracking-wider text-gray-400">最近檢查</p>
                                                <p className="mt-1 font-semibold text-brand-black/80">
                                                    {new Date(gpsDebug.checkedAt).toLocaleString('zh-TW', { hour12: false })}
                                                </p>
                                            </div>
                                            <div className="rounded-xl bg-brand-gray/10 px-3 py-2">
                                                <p className="font-bold uppercase tracking-wider text-gray-400">距離店面</p>
                                                <p className="mt-1 font-semibold text-brand-black/80">
                                                    {typeof gpsDebug.distanceMeters === 'number' ? `${Math.round(gpsDebug.distanceMeters)} m` : '尚未取得'}
                                                </p>
                                            </div>
                                            <div className="rounded-xl bg-brand-gray/10 px-3 py-2">
                                                <p className="font-bold uppercase tracking-wider text-gray-400">GPS 精度</p>
                                                <p className="mt-1 font-semibold text-brand-black/80">
                                                    {typeof gpsDebug.accuracyMeters === 'number' ? `±${Math.round(gpsDebug.accuracyMeters)} m` : '尚未取得'}
                                                </p>
                                            </div>
                                        </div>

                                        {(typeof gpsDebug.userLat === 'number' || gpsNavigationUrl) && (
                                            <div className="flex flex-wrap gap-2">
                                                {gpsNavigationUrl && (
                                                    <button
                                                        onClick={() => window.open(gpsNavigationUrl, '_blank')}
                                                        className="inline-flex items-center gap-2 rounded-full border border-brand-black bg-brand-lime px-3 py-2 text-[11px] font-black uppercase tracking-wider text-brand-black shadow-[2px_2px_0px_black] transition-all hover:bg-white"
                                                    >
                                                        開啟導航
                                                        <ExternalLink size={12} />
                                                    </button>
                                                )}
                                                <button
                                                    onClick={() => window.open(LINKS.NAVIGATION, '_blank')}
                                                    className="inline-flex items-center gap-2 rounded-full border border-brand-black bg-white px-3 py-2 text-[11px] font-black uppercase tracking-wider text-brand-black shadow-[2px_2px_0px_black] transition-all hover:bg-brand-gray"
                                                >
                                                    月島地圖
                                                    <ExternalLink size={12} />
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </section>
                            )}

                            {/* ─── Stamp Journey ─── */}
                            <BadgeJourney
                                onStampUnlocked={handleStampUnlocked}
                                onGpsCheckin={handleGpsCheckin}
                                isCheckingLocation={isCheckingLocation}
                                gpsDebug={gpsDebug}
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
