import React, { useState, useEffect } from 'react';
import {
    MapPin,
    ExternalLink,
    ShieldCheck,
    ArrowLeft,
    ChevronDown,
    Settings,
    CalendarDays,
    ArrowRight,
    LogOut,
} from 'lucide-react';
import { STAMPS, REWARD_TIERS, ACHIEVEMENTS, LINKS, PUBLIC_MOONMOON_SITES } from './constants';
import { Stamp } from './types';
import { PassportTab } from './types';
import {
    getPassportState,
    unlockStamp,
    getUnlockedStampCount,
    calculateUserLevel,
    getVisitedSites,
    addPassportPoints,
    canCheckinToday,
    getLocalCheckinStreak,
} from './passportUtils';
import BadgeJourney from './components/BadgeJourney';
import PassportHomeDashboard from './components/PassportHomeDashboard';
import MemberHub from './components/MemberHub';
import ProfileCenter from './components/ProfileCenter';
import CheckinCard from './components/CheckinCard';
import CheckinModal from './components/CheckinModal';
import { KiwimuAchievementModal } from './components/kiwimu/KiwimuAchievementModal';
import { KiwimuPanel } from './components/kiwimu/KiwimuPanel';
import { KiwimuRewardTierCard } from './components/kiwimu/KiwimuRewardTierCard';
import { KiwimuSectionIntro } from './components/kiwimu/KiwimuSectionIntro';
import { KiwimuTabs } from './components/kiwimu/KiwimuTabs';
import { useLiff } from './src/contexts/LiffContext';
import { useSupabaseAuth } from './src/contexts/SupabaseAuthContext';
import { trackEvent } from './analytics';
import {
    loadProfileCenterDraft,
    saveProfileCenterDraftToProfile,
} from './src/api/profileCenter';
import { getUserPointsByIdentity } from './src/api/points';
import {
    ProfileCenterDraft,
    ProfileCenterSyncStatus,
    saveProfileCenterDraft,
} from './src/lib/profileCenter';
import { readStoredMbtiResult } from './src/lib/mbtiResult';
import { parseJourneyMode, type JourneyMode } from './src/lib/memberJourney';


interface PassportScreenProps {
    onClose: () => void;
    passportCoverNumber: string;
    initialTab?: PassportTab;
    onTabChange?: (tab: PassportTab) => void;
}

const normalizePublicPassportTab = (tab: string | null | undefined): PassportTab => (
    tab === 'journey' || tab === 'rewards' ? tab : 'hub'
);

const TAB_LABELS: Partial<Record<PassportTab, string>> = {
    hub: '會員首頁',
    journey: '我的集章',
};

const PASSPORT_TABS = (Object.entries(TAB_LABELS) as Array<[PassportTab, string]>).map(([key, label]) => ({ key, label }));

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

const PassportScreen: React.FC<PassportScreenProps> = ({
    onClose,
    passportCoverNumber,
    initialTab = 'hub',
    onTabChange,
}) => {
    const [activeTab, setActiveTab] = useState<PassportTab>(normalizePublicPassportTab(initialTab));
    const [journeyMode, setJourneyMode] = useState<JourneyMode>(() => parseJourneyMode(
        new URLSearchParams(window.__PASSPORT_INITIAL_SEARCH__ ?? window.location.search).get('journey_mode')
    ));
    const goToJourney = (mode: JourneyMode = 'online') => {
        setJourneyMode(mode);
        setActiveTab('journey');
        const url = new URL(window.location.href);
        url.searchParams.set('tab', 'journey');
        url.searchParams.set('journey_mode', mode);
        window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`);
        trackEvent('passport_journey_mode_selected', { journey_mode: mode });
    };
    const [showAchievementModal, setShowAchievementModal] = useState<string | null>(null);
    const [showCheckinModal, setShowCheckinModal] = useState(false);
    const [unlockedCount, setUnlockedCount] = useState(0);
    const [redeemedRewards, setRedeemedRewards] = useState<string[]>([]);
    const [canDailyCheckin, setCanDailyCheckin] = useState(canCheckinToday);
    const [checkinStreak, setCheckinStreak] = useState(getLocalCheckinStreak);
    const [locationError, setLocationError] = useState<string | null>(null);
    const [isCheckingLocation, setIsCheckingLocation] = useState(false);
    const [gpsDebug, setGpsDebug] = useState<GpsDebugInfo | null>(null);


    const { isLoggedIn, profile } = useLiff();
    const { user, loading: authLoading, signInWithGoogle, signOut } = useSupabaseAuth();
    const [signingOut, setSigningOut] = useState(false);
    const [points, setPoints] = useState(0);
    const [hubProfileSnapshot, setHubProfileSnapshot] = useState<{
        mbtiType: string | null;
        visitedSiteCount: number;
    }>({ mbtiType: null, visitedSiteCount: getVisitedSites().length });
    const [profileCenterDraft, setProfileCenterDraft] = useState<ProfileCenterDraft>({
        displayName: '月島旅人',
        isMbtiPublic: false,
        isFootprintPublic: false,
        favoriteCharacterId: 'kiwimu',
        passportTitleId: 'locked',
    });
    const [isProfileCenterHydrated, setIsProfileCenterHydrated] = useState(false);
    const [profileCenterSyncStatus, setProfileCenterSyncStatus] = useState<ProfileCenterSyncStatus>({
        tone: 'idle',
        message: '正在確認會員資料同步狀態。',
    });

    const handleHubProfileSnapshotChange = React.useCallback((snapshot: {
        mbtiType: string | null;
        visitedSiteCount: number;
    }) => {
        setHubProfileSnapshot((current) => {
            if (
                current.mbtiType === snapshot.mbtiType &&
                current.visitedSiteCount === snapshot.visitedSiteCount
            ) {
                return current;
            }

            return {
                mbtiType: snapshot.mbtiType,
                visitedSiteCount: snapshot.visitedSiteCount,
            };
        });
    }, []);

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
        setCanDailyCheckin(canCheckinToday());
        setCheckinStreak(getLocalCheckinStreak());
        const storedMbti = readStoredMbtiResult();
        setHubProfileSnapshot({
            mbtiType: storedMbti?.mbtiType ?? null,
            visitedSiteCount: getVisitedSites().length,
        });
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

        const handleDailyCheckin = () => {
            setCanDailyCheckin(canCheckinToday());
            setCheckinStreak(getLocalCheckinStreak());
        };

        document.addEventListener('kiwimu:points_earned', handleExternalPoints);
        document.addEventListener('kiwimu:passport_migrated', handlePassportMigrated);
        document.addEventListener('passport-points-updated', handlePointsUpdated);
        document.addEventListener('daily-checkin', handleDailyCheckin);

        return () => {
            document.removeEventListener('kiwimu:points_earned', handleExternalPoints);
            document.removeEventListener('kiwimu:passport_migrated', handlePassportMigrated);
            document.removeEventListener('passport-points-updated', handlePointsUpdated);
            document.removeEventListener('daily-checkin', handleDailyCheckin);
        };
    }, [isLoggedIn, profile, refreshPoints, user]);

    useEffect(() => {
        let isActive = true;

        const hydrateProfileCenter = async () => {
            const authDisplayName =
                user?.user_metadata?.full_name ||
                user?.user_metadata?.name ||
                null;
            const liffDisplayName = profile?.displayName || null;

            const result = await loadProfileCenterDraft({
                authUserId: user?.id || null,
                lineUserId: profile?.userId || null,
                authDisplayName,
                liffDisplayName,
            });

            if (!isActive) return;
            setProfileCenterDraft(result.draft);
            setProfileCenterSyncStatus(result.syncStatus);
            setIsProfileCenterHydrated(true);
        };

        setIsProfileCenterHydrated(false);
        void hydrateProfileCenter();

        return () => {
            isActive = false;
        };
    }, [profile?.displayName, profile?.userId, user?.id, user?.user_metadata?.full_name, user?.user_metadata?.name]);

    useEffect(() => {
        setActiveTab(normalizePublicPassportTab(initialTab));
    }, [initialTab]);

    useEffect(() => {
        if (activeTab === 'shop') {
            setActiveTab('hub');
            return;
        }

        onTabChange?.(activeTab);
    }, [activeTab, onTabChange]);

    useEffect(() => {
        if (!isProfileCenterHydrated) return;
        saveProfileCenterDraft(profileCenterDraft);

        if (!user?.id) return;

        setProfileCenterSyncStatus({
            tone: 'syncing',
            message: '正在保存會員資料...',
        });

        const timer = window.setTimeout(() => {
            void saveProfileCenterDraftToProfile({
                authUserId: user.id,
                lineUserId: profile?.userId || null,
                draft: profileCenterDraft,
            }).then((result) => {
                setProfileCenterSyncStatus(result.syncStatus);
            });
        }, 500);

        return () => {
            window.clearTimeout(timer);
        };
    }, [isProfileCenterHydrated, profile?.userId, profileCenterDraft, user?.id]);

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
    const fallbackPassportHolder =
        user?.user_metadata?.full_name ||
        user?.user_metadata?.name ||
        profile?.displayName ||
        '月島旅人';
    const passportHolder = profileCenterDraft.displayName.trim() || fallbackPassportHolder;
    const passportMode = user ? '已啟用' : '訪客模式';
    const nextRewardTier =
        REWARD_TIERS.find((reward) => !redeemedRewards.includes(reward.id)) || null;
    const handleOpenCheckin = () => {
        setShowCheckinModal(true);
        trackEvent('checkin_card_tapped', { source: activeTab });
    };
    return (
        <div className="member-center">
            <div className="member-shell">
                <header className="member-header">
                    <div><p className="member-eyebrow">KIWIMU PASSPORT</p><h1>月島・會員中心</h1></div>
                    <button type="button" className="member-back" onClick={onClose}><ArrowLeft size={16} aria-hidden="true" />月島首頁</button>
                </header>
                <div className="member-content">
                    <KiwimuTabs tabs={PASSPORT_TABS} activeTab={activeTab} onChange={setActiveTab} />
                    {activeTab === 'rewards' && <div className="member-section-heading"><div><p className="member-eyebrow">STAMP REWARDS</p><h2>集章獎勵說明</h2></div><button type="button" className="member-link" onClick={() => setActiveTab('hub')}>回會員首頁<ArrowLeft size={16} aria-hidden="true" /></button></div>}
                    {locationError && (
                        <div className="mb-6 p-4 bg-red-50 border-2 border-red-200 rounded-2xl animate-shake flex items-start gap-3">
                            <MapPin size={20} className="text-red-500 shrink-0" />
                            <p className="text-xs font-bold text-red-700">{locationError}</p>
                        </div>
                    )}

                    {!user && activeTab === 'rewards' && (
                        <KiwimuPanel className="mb-6" padded={false}>
                            <div className="flex flex-col items-center gap-3 p-4 text-center">
                            <ShieldCheck size={24} className="text-brand-lime-dark" />
                            <div>
                                <h3 className="text-sm font-black text-brand-black uppercase">登入後查看會員紀錄</h3>
                                <p className="text-[12px] text-gray-500 font-bold mt-1">登入後可查看會員資料與訂單；探索印章先保留在此裝置，實體獎勵兌換尚未開放。</p>
                            </div>
                            <button
                                disabled={authLoading}
                                onClick={() => void signInWithGoogle()}
                                className="w-full py-2.5 bg-brand-lime text-brand-black rounded-xl text-xs font-black uppercase tracking-wider border-2 border-brand-black shadow-[2px_2px_0px_black] active:translate-y-[2px] active:shadow-none transition-all"
                            >
                                {authLoading ? '確認登入狀態中…' : '使用 Google 登入'}
                            </button>
                            </div>
                        </KiwimuPanel>
                    )}

                    {activeTab === 'journey' && (
                        <div className="space-y-4">
                            {/* ─── Daily Check-in (prominent placement) ─── */}
                            {user ? <CheckinCard onOpen={handleOpenCheckin} /> : <div className="member-guest-checkin"><CalendarDays size={19} aria-hidden="true" /><span>登入會員後，可開啟每日簽到。</span><button type="button" className="member-link" disabled={authLoading} onClick={() => void signInWithGoogle()}>{authLoading ? '確認中…' : 'Google 登入'}<ArrowRight size={15} aria-hidden="true" /></button></div>}

                            {gpsDebug && (
                                <KiwimuPanel
                                    padded={false}
                                    header={
                                        <div className="flex items-center justify-between gap-3 border-b-2 border-brand-black bg-brand-gray/10 px-4 py-3">
                                        <div>
                                            <p className="text-[12px] font-black uppercase tracking-[0.2em] text-gray-600">定位記錄</p>
                                            <h3 className="text-sm font-black text-brand-black">{gpsDebug.stampName}</h3>
                                        </div>
                                        <span className={`rounded-full border px-2.5 py-1 text-[12px] font-black uppercase tracking-wider ${GPS_STATUS_STYLE[gpsDebug.status]}`}>
                                            {GPS_STATUS_LABEL[gpsDebug.status]}
                                        </span>
                                        </div>
                                    }
                                >

                                    <div className="space-y-3 p-4">
                                        <p className="text-xs font-medium leading-relaxed text-gray-600">{gpsDebug.message}</p>

                                        <div className="grid grid-cols-2 gap-2 text-[12px]">
                                            {typeof gpsDebug.distanceMeters === 'number' && (
                                                <div className="rounded-xl bg-brand-gray/10 px-3 py-2">
                                                    <p className="font-bold uppercase tracking-wider text-gray-600">距離月島</p>
                                                    <p className="mt-1 font-semibold text-brand-black/80">{Math.round(gpsDebug.distanceMeters)} m</p>
                                                </div>
                                            )}
                                            <div className="rounded-xl bg-brand-gray/10 px-3 py-2">
                                                <p className="font-bold uppercase tracking-wider text-gray-600">需進入範圍</p>
                                                <p className="mt-1 font-semibold text-brand-black/80">{gpsDebug.allowedRadiusMeters} m 內</p>
                                            </div>
                                        </div>

                                        {gpsDebug.status !== 'success' && (
                                            <div className="flex flex-wrap gap-2">
                                                <button
                                                    onClick={() => window.open(LINKS.NAVIGATION, '_blank')}
                                                    className="inline-flex items-center gap-2 rounded-full border border-brand-black bg-brand-lime px-3 py-2 text-[12px] font-black uppercase tracking-wider text-brand-black shadow-[2px_2px_0px_black] transition-all hover:bg-white"
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
                                mode={journeyMode}
                                onModeChange={goToJourney}
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
                                    查看集章里程碑。實體獎勵兌換尚未開放；集滿章數不代表已領取。
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
                                    />
                                );
                            })}
                        </div>
                    )}

                    {activeTab === 'hub' && (
                        <div className="space-y-4">

                            <PassportHomeDashboard
                                displayName={passportHolder}
                                passportCoverNumber={passportCoverNumber}
                                passportMode={passportMode}
                                userLevel={userLevel}
                                points={points}
                                unlockedCount={unlockedCount}
                                visitedSiteCount={hubProfileSnapshot.visitedSiteCount}
                                visitedSiteTotal={PUBLIC_MOONMOON_SITES.length}
                                mbtiType={hubProfileSnapshot.mbtiType}
                                hasIdentity={Boolean(user?.id)}
                                userId={user?.id ?? null}
                                canCheckin={canDailyCheckin}
                                checkinStreak={checkinStreak}
                                nextReward={
                                    nextRewardTier
                                        ? {
                                              title: nextRewardTier.title,
                                              requiredStamps: nextRewardTier.requiredStamps,
                                              remainingStamps: Math.max(
                                                  nextRewardTier.requiredStamps - unlockedCount,
                                                  0
                                              ),
                                              isReady: unlockedCount >= nextRewardTier.requiredStamps,
                                          }
                                        : null
                                }
                                onOpenCheckin={handleOpenCheckin}
                                onGoJourney={goToJourney}
                                onGoRewards={() => setActiveTab('rewards')}
                                onLogin={signInWithGoogle}
                                authLoading={authLoading}
                            />
                            {(user || profile) && (profileCenterSyncStatus.tone === 'warning' || profileCenterSyncStatus.tone === 'error') && (
                                <p role={profileCenterSyncStatus.tone === 'error' ? 'alert' : 'status'} className={`member-sync-message ${profileCenterSyncStatus.tone === 'error' ? 'is-error' : ''}`}>{profileCenterSyncStatus.message}</p>
                            )}
                            <details className="member-disclosure member-settings">
                                <summary><span className="member-summary-title"><Settings size={20} aria-hidden="true" />帳號設定與探索紀錄</span><span className="member-summary-meta" role="status">{{ idle: '確認中', syncing: '保存中', success: '已同步', warning: '僅此裝置', error: '未保存' }[profileCenterSyncStatus.tone]}</span><ChevronDown size={18} aria-hidden="true" /></summary>
                                <div className="member-settings-content">
                                {user && <div className="member-account-actions"><p>目前使用 Google 會員帳號。</p><button type="button" className="member-button" disabled={signingOut} onClick={async () => { setSigningOut(true); try { await signOut(); } finally { setSigningOut(false); } }}><LogOut size={16} aria-hidden="true" />{signingOut ? '登出中…' : '登出這個帳號'}</button></div>}
                                <ProfileCenter
                                    draft={profileCenterDraft}
                                    mbtiType={hubProfileSnapshot.mbtiType}
                                    visitedSiteCount={hubProfileSnapshot.visitedSiteCount}
                                    hasIdentity={Boolean(user || profile)}
                                    syncStatus={profileCenterSyncStatus}
                                    onChange={setProfileCenterDraft}
                                />
                                <MemberHub
                                    onProfileSnapshotChange={handleHubProfileSnapshotChange}
                                />
                                </div>
                            </details>
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
