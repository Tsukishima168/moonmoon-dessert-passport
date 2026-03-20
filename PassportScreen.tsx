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
    Mail,
    LoaderCircle,
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
import { KiwimuAchievementModal } from './components/kiwimu/KiwimuAchievementModal';
import { KiwimuMetricCard } from './components/kiwimu/KiwimuMetricCard';
import { KiwimuPanel } from './components/kiwimu/KiwimuPanel';
import { KiwimuRewardTierCard } from './components/kiwimu/KiwimuRewardTierCard';
import { KiwimuSectionIntro } from './components/kiwimu/KiwimuSectionIntro';
import { KiwimuTabs } from './components/kiwimu/KiwimuTabs';
import { useLiff } from './src/contexts/LiffContext';
import { useSupabaseAuth } from './src/contexts/SupabaseAuthContext';
import { trackEvent } from './analytics';
import { getUserPointsByIdentity } from './src/api/points';


interface PassportScreenProps {
    onClose: () => void;
    passportCoverNumber: string;
}

const TAB_LABELS: Record<'journey' | 'rewards' | 'shop' | 'hub', string> = {
    journey: '任務',
    rewards: '集章獎勵',
    shop: '會員福利',
    hub: '宇宙足跡',
};

const PASSPORT_TABS = (Object.entries(TAB_LABELS) as Array<[
    'journey' | 'rewards' | 'shop' | 'hub',
    string
]>).map(([key, label]) => ({ key, label }));

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

const PassportScreen: React.FC<PassportScreenProps> = ({ onClose, passportCoverNumber }) => {
    const [activeTab, setActiveTab] = useState<'journey' | 'rewards' | 'shop' | 'hub'>('journey');
    const [showAchievementModal, setShowAchievementModal] = useState<string | null>(null);
    const [showCheckinModal, setShowCheckinModal] = useState(false);
    const [unlockedCount, setUnlockedCount] = useState(0);
    const [redeemedRewards, setRedeemedRewards] = useState<string[]>([]);
    const [locationError, setLocationError] = useState<string | null>(null);
    const [isCheckingLocation, setIsCheckingLocation] = useState(false);
    const [gpsDebug, setGpsDebug] = useState<GpsDebugInfo | null>(null);


    const { isLoggedIn, profile } = useLiff();
    const { user, signInWithGoogle, signInWithMagicLink } = useSupabaseAuth();
    const [points, setPoints] = useState(0);
    const [magicEmail, setMagicEmail] = useState('');
    const [magicLinkState, setMagicLinkState] = useState<{
        tone: 'success' | 'error' | null;
        message: string;
    }>({ tone: null, message: '' });
    const [isSendingMagicLink, setIsSendingMagicLink] = useState(false);

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
    const passportHolder =
        user?.user_metadata?.full_name ||
        user?.user_metadata?.name ||
        profile?.displayName ||
        '月島旅人';
    const passportMode = user || profile ? '已啟用' : '訪客模式';
    const handleMagicLinkSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (isSendingMagicLink) {
            return;
        }

        setIsSendingMagicLink(true);
        setMagicLinkState({ tone: null, message: '' });

        const result = await signInWithMagicLink(magicEmail);

        setMagicLinkState({
            tone: result.ok ? 'success' : 'error',
            message: result.message || (result.ok ? '登入連結已寄出。' : 'Magic Link 發送失敗。'),
        });

        if (result.ok) {
            setMagicEmail('');
        }

        setIsSendingMagicLink(false);
    };

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

                        <p className="mb-1 text-[10px] font-black uppercase tracking-[0.28em] text-white/45">
                            Passport No. {passportCoverNumber}
                        </p>

                        <h1 className="text-xl font-black text-white tracking-tight mb-1">
                            Kiwimu 月島護照
                        </h1>

                        <p className="mb-4 text-[11px] font-bold text-white/60">
                            把你在月島的任務、集章與足跡都收進這裡。
                        </p>

                        <div className="mb-4 grid w-full max-w-[280px] grid-cols-3 gap-2">
                            <div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-left">
                                <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-white/35">持有人</p>
                                <p className="mt-1 truncate text-[11px] font-black text-white">{passportHolder}</p>
                            </div>
                            <div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-left">
                                <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-white/35">模式</p>
                                <p className="mt-1 text-[11px] font-black text-white">{passportMode}</p>
                            </div>
                            <div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-left">
                                <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-white/35">編號</p>
                                <p className="mt-1 text-[11px] font-black text-white">#{passportCoverNumber}</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-2 bg-white/10 backdrop-blur-md px-3 py-1 rounded-full border border-white/20 mb-4">
                            <ShieldCheck size={12} className="text-brand-lime" />
                            <span className="text-[9px] font-black text-brand-lime uppercase tracking-widest">
                                護照等級 Lv.{userLevel}
                            </span>
                        </div>

                        <div className="flex w-full max-w-[240px] gap-3">
                            <KiwimuMetricCard label="印章" value={unlockedCount} />
                            <KiwimuMetricCard label="積分" value={`${points}P`} accent="lime" />
                        </div>
                    </div>
                </div>

                {/* ─── Content Tabs ─── */}
                <div className="flex-1 overflow-y-auto px-6 py-8 scrollbar-hide">
                    <div className="mb-5 rounded-[1.75rem] border border-brand-black/10 bg-white px-4 py-3 shadow-[3px_3px_0px_black]">
                        <p className="text-[10px] font-black uppercase tracking-[0.22em] text-brand-black/35">
                            Passport Summary
                        </p>
                        <p className="mt-1 text-sm font-bold leading-relaxed text-brand-black/75">
                            從這裡查看任務進度、集章里程碑、會員福利與你的月島宇宙足跡。
                        </p>
                    </div>

                    {/* Tab Navigation */}
                    <KiwimuTabs
                        tabs={PASSPORT_TABS}
                        activeTab={activeTab}
                        onChange={setActiveTab}
                    />

                    {locationError && (
                        <div className="mb-6 p-4 bg-red-50 border-2 border-red-200 rounded-2xl animate-shake flex items-start gap-3">
                            <MapPin size={20} className="text-red-500 flex-shrink-0" />
                            <p className="text-xs font-bold text-red-700">{locationError}</p>
                        </div>
                    )}

                    {!user && (
                        <KiwimuPanel className="mb-6" padded={false}>
                            <div className="flex flex-col items-center gap-3 p-4 text-center">
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

                            <div className="flex w-full items-center gap-3">
                                <div className="h-px flex-1 bg-brand-black/10" />
                                <span className="text-[10px] font-black uppercase tracking-[0.22em] text-brand-black/35">或使用 Magic Link</span>
                                <div className="h-px flex-1 bg-brand-black/10" />
                            </div>

                            <form onSubmit={handleMagicLinkSubmit} className="w-full space-y-3 text-left">
                                <label className="block">
                                    <span className="mb-1.5 block text-[10px] font-black uppercase tracking-[0.2em] text-brand-black/45">
                                        Email
                                    </span>
                                    <div className="flex items-center gap-2 rounded-xl border-2 border-brand-black bg-white px-3 py-3 shadow-[2px_2px_0px_black]">
                                        <Mail size={16} className="text-brand-black/40" />
                                        <input
                                            type="email"
                                            value={magicEmail}
                                            onChange={(event) => setMagicEmail(event.target.value)}
                                            placeholder="name@example.com"
                                            autoComplete="email"
                                            className="w-full bg-transparent text-sm font-semibold text-brand-black outline-none placeholder:text-brand-black/30"
                                        />
                                    </div>
                                </label>

                                <button
                                    type="submit"
                                    disabled={isSendingMagicLink || !magicEmail.trim()}
                                    className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-brand-black bg-white px-4 py-3 text-xs font-black uppercase tracking-[0.2em] text-brand-black shadow-[2px_2px_0px_black] transition-all disabled:cursor-not-allowed disabled:opacity-50 active:translate-y-[2px] active:shadow-none"
                                >
                                    {isSendingMagicLink ? (
                                        <>
                                            <LoaderCircle size={14} className="animate-spin" />
                                            發送中
                                        </>
                                    ) : (
                                        <>
                                            <Mail size={14} />
                                            寄送 Magic Link
                                        </>
                                    )}
                                </button>
                            </form>

                            {magicLinkState.tone && (
                                <div
                                    className={`w-full rounded-2xl border px-3 py-2 text-left text-xs font-bold leading-relaxed ${
                                        magicLinkState.tone === 'success'
                                            ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                                            : 'border-red-200 bg-red-50 text-red-700'
                                    }`}
                                >
                                    {magicLinkState.message}
                                </div>
                            )}
                            </div>
                        </KiwimuPanel>
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
                                <KiwimuPanel
                                    padded={false}
                                    header={
                                        <div className="flex items-center justify-between gap-3 border-b-2 border-brand-black bg-brand-gray/10 px-4 py-3">
                                        <div>
                                            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">定位記錄</p>
                                            <h3 className="text-sm font-black text-brand-black">{gpsDebug.stampName}</h3>
                                        </div>
                                        <span className={`rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-wider ${GPS_STATUS_STYLE[gpsDebug.status]}`}>
                                            {GPS_STATUS_LABEL[gpsDebug.status]}
                                        </span>
                                        </div>
                                    }
                                >

                                    <div className="space-y-3 p-4">
                                        <p className="text-xs font-medium leading-relaxed text-gray-600">{gpsDebug.message}</p>

                                        <div className="grid grid-cols-2 gap-2 text-[11px]">
                                            {typeof gpsDebug.distanceMeters === 'number' && (
                                                <div className="rounded-xl bg-brand-gray/10 px-3 py-2">
                                                    <p className="font-bold uppercase tracking-wider text-gray-400">距離月島</p>
                                                    <p className="mt-1 font-semibold text-brand-black/80">{Math.round(gpsDebug.distanceMeters)} m</p>
                                                </div>
                                            )}
                                            <div className="rounded-xl bg-brand-gray/10 px-3 py-2">
                                                <p className="font-bold uppercase tracking-wider text-gray-400">需進入範圍</p>
                                                <p className="mt-1 font-semibold text-brand-black/80">{gpsDebug.allowedRadiusMeters} m 內</p>
                                            </div>
                                        </div>

                                        {gpsDebug.status !== 'success' && (
                                            <div className="flex flex-wrap gap-2">
                                                <button
                                                    onClick={() => window.open(LINKS.NAVIGATION, '_blank')}
                                                    className="inline-flex items-center gap-2 rounded-full border border-brand-black bg-brand-lime px-3 py-2 text-[11px] font-black uppercase tracking-wider text-brand-black shadow-[2px_2px_0px_black] transition-all hover:bg-white"
                                                >
                                                    導航前往月島
                                                    <ExternalLink size={12} />
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </KiwimuPanel>
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
                            <KiwimuSectionIntro eyebrow="Stamp Milestones">
                                <p>
                                    這裡是「集章里程碑獎勵」。完成探索任務累積印章後，可解鎖一次性的護照成就獎勵。
                                </p>
                            </KiwimuSectionIntro>
                            {REWARD_TIERS.map((reward) => {
                                const isUnlocked = unlockedCount >= reward.requiredStamps;
                                const isRedeemed = redeemedRewards.includes(reward.id);
                                return (
                                    <KiwimuRewardTierCard
                                        key={reward.id}
                                        title={reward.title}
                                        requiredStamps={reward.requiredStamps}
                                        isUnlocked={isUnlocked}
                                        isRedeemed={isRedeemed}
                                        onRedeem={
                                            isUnlocked && !isRedeemed
                                                ? () => {
                                                      markRewardRedeemed(reward.id);
                                                      setRedeemedRewards([...redeemedRewards, reward.id]);
                                                      trackEvent('reward_redeemed', { reward_id: reward.id });
                                                  }
                                                : undefined
                                        }
                                    />
                                );
                            })}
                        </div>
                    )}

                    {activeTab === 'hub' && <MemberHub />}

                    {activeTab === 'shop' && (
                        <div className="space-y-6">
                            {/* 遊戲中心導流卡 */}
                            <a
                                href="https://gacha.kiwimu.com"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="block bg-gradient-to-r from-violet-50 to-purple-50 rounded-2xl border border-purple-200 p-4 no-underline"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 rounded-xl bg-white border border-purple-200 flex items-center justify-center text-2xl shrink-0 shadow-sm">
                                        🎮
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-0.5">
                                            <h3 className="text-sm font-black text-stone-800">月島遊戲中心</h3>
                                            <span className="text-[10px] font-bold bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">NEW</span>
                                        </div>
                                        <p className="text-xs text-stone-500">每日搖珠機 + 幸運轉盤，賺積分、換驚喜</p>
                                    </div>
                                    <ExternalLink className="w-4 h-4 text-stone-400 shrink-0" />
                                </div>
                            </a>
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
                    <KiwimuAchievementModal
                        title={ACHIEVEMENTS.find(a => a.id === showAchievementModal)?.name ?? ''}
                        description={ACHIEVEMENTS.find(a => a.id === showAchievementModal)?.description ?? ''}
                        onClose={() => setShowAchievementModal(null)}
                    />
                )}
            </div>
        </div>
    );
};

export default PassportScreen;
