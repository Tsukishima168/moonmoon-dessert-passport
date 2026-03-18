import React, { useState, useEffect } from 'react';
import {
    ArrowRight,
    Map,
    BrainCircuit,
    CakeSlice,
    Dices,
    ExternalLink,
    CheckCircle2,
    Trophy,
    Sparkles,
    BookOpen,
} from 'lucide-react';
import { MOONMOON_SITES } from '../constants';
import { useLiff } from '../src/contexts/LiffContext';
import { getVisitedSites, markSiteVisited, getPassportState } from '../passportUtils';
import { trackEvent, trackOutboundNavigation } from '../analytics';

const IconMap: Record<string, any> = {
    BrainCircuit,
    Map,
    CakeSlice,
    Dices
};

// MBTI 類型對應甜點標籤（用於顯示，不做商業邏輯）
const MBTI_DESSERT_LABEL: Record<string, string> = {
    INTJ: '黑巧克力塔', INTP: '伯爵奶酪', ENTJ: '焦糖布丁', ENTP: '檸檬塔',
    INFJ: '抹茶生乳酪', INFP: '草莓千層', ENFJ: '焦糖蘋果派', ENFP: '蜂蜜可麗露',
    ISTJ: '經典烤布丁', ISFJ: '提拉米蘇', ESTJ: '拿破崙酥', ESFJ: '草莓蛋糕捲',
    ISTP: '海鹽可可餅', ISFP: '玫瑰荔枝凍', ESTP: '焦糖爆米花塔', ESFP: '繽紛馬卡龍',
};

const MemberHub: React.FC = () => {
    const [visitedSites, setVisitedSites] = useState<string[]>([]);
    const [mbtiType, setMbtiType] = useState<string | null>(null);
    const [stampCount, setStampCount] = useState(0);
    const { profile } = useLiff();

    useEffect(() => {
        // 1. Get visited sites from localStorage
        const saved = getVisitedSites();
        setVisitedSites(saved);

        // 2. Read MBTI result from localStorage (written by kiwimu.com redirect)
        try {
            const storedMbti = localStorage.getItem('user_mbti_result');
            if (storedMbti) setMbtiType(storedMbti.toUpperCase());
        } catch { /* ignore */ }

        // 3. Get stamp count
        const state = getPassportState();
        setStampCount(state.unlockedStamps.length);

        // 2. Multi-channel detection for site visits
        const currentUrl = window.location.href;
        const urlParams = new URLSearchParams(window.location.search);
        const referrer = document.referrer;
        const fromParam = urlParams.get('from');

        // Logic: Identify which Moon site the user is coming from
        MOONMOON_SITES.forEach(site => {
            if (
                (fromParam === site.id) ||
                (referrer && site.url && referrer.includes(new URL(site.url).hostname))
            ) {
                if (!saved.includes(site.id)) {
                    markSiteVisited(site.id);
                    setVisitedSites(prev => [...prev, site.id]);
                    trackEvent('moon_site_visit_detected', { site_id: site.id, source: fromParam ? 'url_param' : 'referrer' });
                }
            }
        });
    }, []);

    const handleSiteClick = (siteId: string, url: string) => {
        // If user clicks a site from the passport, we track and potentially mark
        // Although visit is usually confirmed when they come BACK from that site
        trackOutboundNavigation(url, `member_hub_${siteId}`);
        trackEvent('moon_site_click', { site_id: siteId });

        if (profile?.userId) {
            // Activity tracking removed
        }

        // Add ?from=passport to ensure the other site can detect it if needed
        const outboundUrl = new URL(url);
        outboundUrl.searchParams.set('from', 'passport');
        window.open(outboundUrl.toString(), '_blank');
    };

    const completionRate = (visitedSites.length / MOONMOON_SITES.length) * 100;

    return (
        <div className="bg-white rounded-2xl border-2 border-brand-black shadow-[4px_4px_0px_black] overflow-hidden">
            {/* Header Bar */}
            <div className="bg-brand-black px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-2 text-white">
                    <Trophy size={16} className="text-brand-lime" />
                    <h2 className="text-sm font-bold tracking-tight uppercase">月島足跡探險</h2>
                </div>
                <div className="bg-brand-lime px-2 py-0.5 rounded-full border border-brand-black">
                    <span className="text-[10px] font-black text-brand-black uppercase">
                        {visitedSites.length === MOONMOON_SITES.length ? 'Mastered' : `${visitedSites.length}/${MOONMOON_SITES.length}`}
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
                    <p className="text-[9px] font-black uppercase tracking-[0.2em] text-gray-400 mb-2 px-1">你的成就記錄</p>
                    <div className="grid grid-cols-2 gap-2 mb-3">
                        {mbtiType && (
                            <div className="flex items-center gap-2.5 bg-white rounded-xl border-2 border-brand-black p-2.5 shadow-[2px_2px_0px_black]">
                                <div className="w-8 h-8 rounded-lg bg-brand-lime border border-brand-black flex items-center justify-center flex-shrink-0">
                                    <BrainCircuit size={16} className="text-brand-black" />
                                </div>
                                <div className="min-w-0">
                                    <p className="text-[9px] font-bold text-gray-400 uppercase">靈魂甜點</p>
                                    <p className="text-xs font-black text-brand-black">{mbtiType}</p>
                                    {MBTI_DESSERT_LABEL[mbtiType] && (
                                        <p className="text-[9px] text-gray-500 truncate">{MBTI_DESSERT_LABEL[mbtiType]}</p>
                                    )}
                                </div>
                            </div>
                        )}
                        {stampCount > 0 && (
                            <div className="flex items-center gap-2.5 bg-white rounded-xl border-2 border-brand-black p-2.5 shadow-[2px_2px_0px_black]">
                                <div className="w-8 h-8 rounded-lg bg-brand-lime border border-brand-black flex items-center justify-center flex-shrink-0">
                                    <BookOpen size={16} className="text-brand-black" />
                                </div>
                                <div>
                                    <p className="text-[9px] font-bold text-gray-400 uppercase">印章收集</p>
                                    <p className="text-xs font-black text-brand-black">{stampCount} 枚</p>
                                    <p className="text-[9px] text-gray-500">任務足跡</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Sites List */}
            <div className="p-3 bg-gray-50/50">
                <p className="text-[9px] font-black uppercase tracking-[0.2em] text-gray-400 mb-2 px-1">宇宙探索進度</p>
                <div className="grid grid-cols-1 gap-2.5">
                    {MOONMOON_SITES.map((site) => {
                        const isVisited = visitedSites.includes(site.id);
                        const IconComponent = IconMap[site.iconType] || BrainCircuit;

                        return (
                            <button
                                key={site.id}
                                onClick={() => handleSiteClick(site.id, site.url)}
                                className={`flex items-center gap-3 p-3 rounded-xl border-2 transition-all active:scale-[0.98] ${isVisited
                                    ? 'bg-white border-brand-black/10'
                                    : 'bg-white border-brand-black shadow-[2px_2px_0px_black] hover:bg-brand-gray/5'
                                    }`}
                            >
                                <div className={`w-10 h-10 rounded-lg flex items-center justify-center border ${isVisited
                                    ? 'bg-brand-lime/10 border-brand-lime/20 text-brand-black/40'
                                    : 'bg-brand-lime border-brand-black text-brand-black'
                                    }`}>
                                    <IconComponent size={20} />
                                </div>

                                <div className="flex-1 text-left">
                                    <h3 className={`text-xs font-bold ${isVisited ? 'text-brand-black/40' : 'text-brand-black'}`}>
                                        {site.name}
                                    </h3>
                                    <p className="text-[10px] text-gray-400 font-medium">{site.description}</p>
                                </div>

                                <div className="flex items-center justify-center">
                                    {isVisited ? (
                                        <CheckCircle2 size={18} className="text-brand-lime-dark" />
                                    ) : (
                                        <ArrowRight size={16} className="text-brand-black" />
                                    )}
                                </div>
                            </button>
                        );
                    })}
                </div>

                {/* Completion Message */}
                {visitedSites.length === MOONMOON_SITES.length && (
                    <div className="mt-4 p-3 rounded-xl bg-brand-lime/10 border border-brand-lime/30 flex items-center gap-2.5">
                        <Sparkles size={16} className="text-brand-lime-dark" />
                        <p className="text-[10px] font-bold text-brand-lime-dark uppercase">
                            You've explored the entire Moon ecosystem!
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default MemberHub;
