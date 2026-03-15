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
} from 'lucide-react';
import { MOONMOON_SITES } from '../constants';
import { useLiff } from '../src/contexts/LiffContext';
import { getVisitedSites, markSiteVisited } from '../passportUtils';
import { trackEvent, trackOutboundNavigation } from '../analytics';
import { Stamp } from '../types';

const IconMap: Record<string, any> = {
    BrainCircuit,
    Map,
    CakeSlice,
    Dices
};

const MemberHub: React.FC = () => {
    const [visitedSites, setVisitedSites] = useState<string[]>([]);
    const { profile } = useLiff();

    useEffect(() => {
        // 1. Get visited sites from localStorage
        const saved = getVisitedSites();
        setVisitedSites(saved);

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

            {/* Sites List */}
            <div className="p-3 bg-gray-50/50">
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
