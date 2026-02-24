import React, { useEffect, useState } from 'react';
import { ExternalLink, CheckCircle } from 'lucide-react';
import { MOONMOON_SITES } from '../constants';
import { getVisitedSites, markSiteVisited } from '../passportUtils';
import { trackEvent, trackOutboundNavigation } from '../analytics';

const MemberHub: React.FC = () => {
    const [visitedSites, setVisitedSites] = useState<string[]>([]);

    useEffect(() => {
        setVisitedSites(getVisitedSites());

        // Check if current page was referred from a moon site
        try {
            const referrer = document.referrer;
            const urlParams = new URLSearchParams(window.location.search);
            const fromSite = urlParams.get('from');

            if (fromSite) {
                const site = MOONMOON_SITES.find(s => s.id === fromSite);
                if (site) {
                    markSiteVisited(site.id);
                    setVisitedSites(getVisitedSites());
                }
            }

            // Check referrer URL against known sites
            if (referrer) {
                MOONMOON_SITES.forEach(site => {
                    if (referrer.includes(new URL(site.url).hostname)) {
                        markSiteVisited(site.id);
                    }
                });
                setVisitedSites(getVisitedSites());
            }
        } catch (e) {
            // URL parsing might fail, safe to ignore
        }
    }, []);

    const visitedCount = visitedSites.length;
    const totalSites = MOONMOON_SITES.length;

    const handleSiteClick = (siteId: string, url: string) => {
        markSiteVisited(siteId);
        setVisitedSites(getVisitedSites());
        trackEvent('moon_site_visited', { site_id: siteId });
        trackOutboundNavigation(url, 'member_hub');
        window.open(url, '_blank');
    };

    return (
        <div className="bg-white rounded-2xl border-2 border-brand-black shadow-[4px_4px_0px_black] overflow-hidden">
            {/* Header */}
            <div className="px-4 py-3 bg-gradient-to-r from-brand-black to-gray-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <span className="text-lg">🌙</span>
                    <h3 className="text-base font-bold text-white">我的月島足跡</h3>
                </div>
                <span className="text-xs bg-brand-lime text-brand-black px-2 py-0.5 rounded-full font-bold">
                    {visitedCount}/{totalSites}
                </span>
            </div>

            {/* Sites List */}
            <div className="p-3 space-y-2">
                {MOONMOON_SITES.map(site => {
                    const isVisited = visitedSites.includes(site.id);

                    return (
                        <button
                            key={site.id}
                            onClick={() => handleSiteClick(site.id, site.url)}
                            className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 transition-all active:scale-[0.98] text-left ${isVisited
                                    ? 'bg-brand-lime/10 border-brand-lime/30 shadow-[2px_2px_0px_rgba(212,255,0,0.3)]'
                                    : 'bg-gray-50 border-gray-200 hover:border-gray-400'
                                }`}
                        >
                            <span className="text-xl flex-shrink-0">{site.emoji}</span>
                            <div className="flex-1 min-w-0">
                                <p className={`text-sm font-bold ${isVisited ? 'text-brand-black' : 'text-gray-600'}`}>
                                    {site.name}
                                </p>
                                <p className="text-[10px] text-gray-500 truncate">{site.description}</p>
                            </div>
                            {isVisited ? (
                                <CheckCircle size={18} className="text-brand-lime-dark flex-shrink-0" />
                            ) : (
                                <ExternalLink size={14} className="text-gray-400 flex-shrink-0" />
                            )}
                        </button>
                    );
                })}
            </div>

            {/* Completion Message */}
            {visitedCount >= totalSites && (
                <div className="px-4 pb-3">
                    <div className="bg-brand-lime/20 rounded-lg p-3 text-center">
                        <p className="text-sm font-bold text-brand-black">🏆 你已探索所有月島世界！</p>
                    </div>
                </div>
            )}
            {visitedCount > 0 && visitedCount < totalSites && (
                <div className="px-4 pb-3">
                    <p className="text-[10px] text-gray-400 text-center">
                        點擊前往各站探索，回來後自動記錄足跡
                    </p>
                </div>
            )}
        </div>
    );
};

export default MemberHub;
