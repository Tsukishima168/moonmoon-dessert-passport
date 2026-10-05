import React, { useState, useEffect } from 'react';
import {
    Map,
    BrainCircuit,
    CakeSlice,
    Dices,
    Trophy,
    Sparkles,
    BookOpen,
} from 'lucide-react';
import { PUBLIC_MOONMOON_SITES, DESSERTS } from '../constants';
import { useLiff } from '../src/contexts/LiffContext';
import { useSupabaseAuth } from '../src/contexts/SupabaseAuthContext';
import { getVisitedSites, markSiteVisited, getPassportState } from '../passportUtils';
import { trackEvent, trackOutboundNavigation } from '../analytics';
import {
    loadCloudFootprints,
    markCloudFootprint,
    syncLocalFootprintsOnce,
} from '../src/lib/footprints';
import {
    loadCloudMbtiResult,
    readStoredMbtiResult,
    saveStoredMbtiResult,
} from '../src/lib/mbtiResult';
import { KiwimuHubMilestoneCard } from './kiwimu/KiwimuHubMilestoneCard';
import { KiwimuPanel } from './kiwimu/KiwimuPanel';
import { KiwimuSiteCard } from './kiwimu/KiwimuSiteCard';
import { detectIncomingSite } from '../src/lib/memberJourney';

const IconMap: Record<string, any> = {
    BrainCircuit,
    BookOpen,
    Map,
    CakeSlice,
    Dices
};

// 從 DESSERTS 動態查找甜點名稱，確保與 constants.tsx 同步
const getMbtiDessertLabel = (mbtiType: string): string =>
    DESSERTS.find(d => d.mbti === mbtiType)?.name ?? mbtiType;

interface MemberHubProps {
    onProfileSnapshotChange?: (snapshot: {
        mbtiType: string | null;
        visitedSiteCount: number;
        stampCount: number;
    }) => void;
}

const MemberHub: React.FC<MemberHubProps> = ({ onProfileSnapshotChange }) => {
    const [visitedSites, setVisitedSites] = useState<string[]>([]);
    const [mbtiType, setMbtiType] = useState<string | null>(null);
    const [stampCount, setStampCount] = useState(0);
    const { profile } = useLiff();
    const { user } = useSupabaseAuth();

    useEffect(() => {
        let isActive = true;

        const storedMbti = readStoredMbtiResult();
        if (storedMbti) setMbtiType(storedMbti.mbtiType);

        // 2. Get stamp count
        const state = getPassportState();
        setStampCount(state.unlockedStamps.length);

        const hydrateFootprints = async () => {
            const saved = getVisitedSites();
            const [cloud, cloudMbti] = user?.id
                ? await Promise.all([
                    loadCloudFootprints(),
                    loadCloudMbtiResult(user.id),
                ])
                : [[], null] as const;
            if (!isActive) return;
            const merged = new Set<string>([...saved, ...cloud]);
            const nextMbtiType = cloudMbti?.mbtiType ?? storedMbti?.mbtiType ?? null;

            if (cloudMbti) {
                saveStoredMbtiResult(cloudMbti);
            }

            if (!merged.has('passport')) {
                markSiteVisited('passport');
                markCloudFootprint('passport', { source: 'member_hub', path: window.location.pathname });
                merged.add('passport');
            }

            const search = window.__PASSPORT_INITIAL_SEARCH__ ?? window.location.search;
            const incomingSite = detectIncomingSite(search, document.referrer);
            if (incomingSite && !merged.has(incomingSite)) {
                const source = new URLSearchParams(search).has('from') ? 'url_param' : 'referrer';
                markSiteVisited(incomingSite);
                void markCloudFootprint(incomingSite, { source, path: window.location.pathname });
                merged.add(incomingSite);
                trackEvent('moon_site_visit_detected', { site_id: incomingSite, source });
            }

            const nextVisitedSites = Array.from(merged);
            nextVisitedSites.forEach(siteId => markSiteVisited(siteId));

            if (user?.id) {
                syncLocalFootprintsOnce(user.id, nextVisitedSites);
            }

            if (isActive) {
                setVisitedSites(nextVisitedSites);
                setMbtiType(nextMbtiType);
            }
        };

        void hydrateFootprints();

        return () => {
            isActive = false;
        };
    }, [user?.id]);

    useEffect(() => {
        const publicVisitedCount = visitedSites.filter((siteId) =>
            PUBLIC_MOONMOON_SITES.some((site) => site.id === siteId)
        ).length;

        onProfileSnapshotChange?.({
            mbtiType,
            visitedSiteCount: publicVisitedCount,
            stampCount,
        });
    }, [mbtiType, onProfileSnapshotChange, stampCount, visitedSites.length]);

    const handleSiteClick = (siteId: string, url: string) => {
        // If user clicks a site from the passport, we track and potentially mark
        // Although visit is usually confirmed when they come BACK from that site
        trackOutboundNavigation(url, `member_hub_${siteId}`, {
            entrySurface: 'passport_member_hub',
            destinationType: 'internal',
        });
        trackEvent('moon_site_click', { site_id: siteId });

        if (profile?.userId) {
            // Activity tracking removed
        }

        // R3: 站內跨站連結不用 utm_*，改用單一參數 from=<來源站>_<位置>，
        // 讓目標站可辨識來源（例如 passport 的 source_site 判定）。
        const outboundUrl = new URL(url);
        outboundUrl.searchParams.set('from', 'passport_member_hub');
        window.open(outboundUrl.toString(), '_blank');
    };

    const publicVisitedSites = visitedSites.filter((siteId) =>
        PUBLIC_MOONMOON_SITES.some((site) => site.id === siteId)
    );
    const completionRate = (publicVisitedSites.length / PUBLIC_MOONMOON_SITES.length) * 100;

    return (
        <KiwimuPanel padded={false} className="border-brand-black/20 shadow-[2px_2px_0px_rgba(0,0,0,0.35)]">
            {/* Header Bar */}
            <div className="border-b border-brand-black/10 bg-white px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-2 text-brand-black">
                    <div className="flex h-8 w-8 items-center justify-center rounded-xl border border-brand-black/10 bg-brand-lime/40">
                        <Trophy size={15} className="text-brand-black" />
                    </div>
                    <h2 className="text-sm font-bold tracking-tight uppercase">月島足跡</h2>
                </div>
                <div className="bg-brand-gray/10 px-2 py-0.5 rounded-full border border-brand-black/10">
                    <span className="text-[12px] font-black text-brand-black uppercase">
                        {publicVisitedSites.length === PUBLIC_MOONMOON_SITES.length ? '已完成' : `${publicVisitedSites.length}/${PUBLIC_MOONMOON_SITES.length}`}
                    </span>
                </div>
            </div>

            {/* Progress Bar (Subtle) */}
            <div className="h-1 w-full bg-gray-100">
                <div
                    className="h-full bg-brand-lime transition-all duration-1000"
                    style={{ width: `${completionRate}%` }}
                />
            </div>

            {/* User Footprint Cards */}
            {(mbtiType || stampCount > 0) && (
                <div className="p-3 pb-0 bg-gray-50/50 border-b border-gray-100">
                    <p className="text-[12px] font-black uppercase tracking-[0.2em] text-gray-600 mb-2 px-1">你的成就記錄</p>
                    <div className="grid grid-cols-2 gap-2 mb-3">
                        {mbtiType && (
                            <KiwimuHubMilestoneCard
                                icon={<BrainCircuit size={16} className="text-brand-black" />}
                                eyebrow="靈魂甜點"
                                title={mbtiType}
                                subtitle={getMbtiDessertLabel(mbtiType)}
                            />
                        )}
                        {stampCount > 0 && (
                            <KiwimuHubMilestoneCard
                                icon={<BookOpen size={16} className="text-brand-black" />}
                                eyebrow="印章收集"
                                title={`${stampCount} 枚`}
                                subtitle="任務足跡"
                            />
                        )}
                    </div>
                </div>
            )}

            {/* Sites List */}
            <div className="p-3 bg-gray-50/50">
                <p className="text-[12px] font-black uppercase tracking-[0.2em] text-gray-600 mb-2 px-1">宇宙探索進度</p>
                <div className="grid grid-cols-1 gap-2.5">
                    {PUBLIC_MOONMOON_SITES.map((site) => {
                        const isVisited = visitedSites.includes(site.id);
                        const IconComponent = IconMap[site.iconType] || BrainCircuit;

                        return (
                            <KiwimuSiteCard
                                key={site.id}
                                icon={<IconComponent size={20} />}
                                name={site.name}
                                description={site.description}
                                visited={isVisited}
                                onClick={() => handleSiteClick(site.id, site.url)}
                            />
                        );
                    })}
                </div>

                {/* Completion Message */}
                {publicVisitedSites.length === PUBLIC_MOONMOON_SITES.length && (
                    <div className="mt-4 p-3 rounded-xl bg-brand-lime/10 border border-brand-lime/30 flex items-center gap-2.5">
                        <Sparkles size={16} className="text-brand-lime-dark" />
                        <p className="text-[12px] font-bold text-brand-lime-dark uppercase">
                            你已完成目前開放的探索足跡。足跡不代表已集章或取得兌換資格。
                        </p>
                    </div>
                )}
            </div>
        </KiwimuPanel>
    );
};

export default MemberHub;
