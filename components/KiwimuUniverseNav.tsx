import React from 'react';
import {
  ArrowUpRight,
  BookOpen,
  BrainCircuit,
  CakeSlice,
  Dices,
  Map,
} from 'lucide-react';
import { PUBLIC_MOONMOON_SITES } from '../constants';
import { buildUtmUrl, trackEvent, trackOutboundNavigation } from '../analytics';
import {
  createKiwimuUniverseNavigationDetails,
  type KiwimuUniverseSiteId,
} from './KiwimuUniverseRail';
import { useSupabaseAuth } from '../src/contexts/SupabaseAuthContext';

const IconMap: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
  BrainCircuit,
  BookOpen,
  Map,
  CakeSlice,
  Dices,
};

interface KiwimuUniverseNavProps {
  currentSiteId?: string;
  surface: string;
  compact?: boolean;
}

const UNIVERSE_SITE_ID_BY_LEGACY_ID: Record<string, KiwimuUniverseSiteId> = {
  kiwimu_mbti: 'kiwimu',
  passport: 'passport',
  moon_map: 'map',
  gacha: 'gacha',
  dessert_booking: 'shop',
};

export const KiwimuUniverseNav: React.FC<KiwimuUniverseNavProps> = ({
  currentSiteId = 'passport',
  surface,
  compact = false,
}) => {
  const { user, loading } = useSupabaseAuth();

  const handleClick = (siteId: string, href: string) => {
    const sourceSite = UNIVERSE_SITE_ID_BY_LEGACY_ID[currentSiteId] || 'passport';
    const targetSite = UNIVERSE_SITE_ID_BY_LEGACY_ID[siteId];

    trackOutboundNavigation(href, `universe_nav_${surface}_${siteId}`);
    if (targetSite) {
      trackEvent(
        'universe_nav_click',
        createKiwimuUniverseNavigationDetails(
          sourceSite,
          targetSite,
          loading ? 'unknown' : user ? 'authenticated' : 'anonymous',
          surface,
        ),
      );
    }
  };

  return (
    <nav
      aria-label="Kiwimu Universe"
      className={`rounded-[1.4rem] border border-brand-black/10 bg-white/86 p-3 shadow-[0_14px_34px_rgba(17,17,17,0.08)] backdrop-blur-md ${
        compact ? '' : 'md:p-4'
      }`}
    >
      <div className="mb-3 flex items-center justify-between gap-3 px-1">
        <div>
          <p className="text-[9px] font-black uppercase tracking-[0.24em] text-brand-black/32">
            Kiwimu Universe
          </p>
          <h2 className="mt-1 text-sm font-black tracking-tight text-brand-black">
            公開入口
          </h2>
        </div>
        <span className="rounded-full border border-brand-black/10 bg-brand-lime/70 px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.16em] text-brand-black">
          Hub
        </span>
      </div>

      <div className={compact ? 'no-scrollbar flex gap-2 overflow-x-auto pb-1' : 'grid grid-cols-2 gap-2 sm:grid-cols-4'}>
        {PUBLIC_MOONMOON_SITES.map((site) => {
          const isCurrent = site.id === currentSiteId;
          const Icon = IconMap[site.iconType] || BrainCircuit;
          const href = buildUtmUrl(site.url, {
            medium: 'passport_universe_nav',
            campaign: 'kiwimu_universe',
            content: site.id,
            additionalParams: { from: 'passport' },
          });

          if (isCurrent) {
            return (
              <div
                key={site.id}
                className={`${compact ? 'min-w-[132px]' : ''} min-h-[86px] rounded-2xl border-2 border-brand-black bg-brand-black p-3 text-white shadow-[2px_2px_0px_black]`}
              >
                <div className="flex items-start justify-between gap-2">
                  <Icon size={18} className="shrink-0 text-brand-lime" />
                  <span className="rounded-full border border-white/15 px-2 py-0.5 text-[8px] font-black uppercase tracking-[0.14em] text-white/58">
                    Now
                  </span>
                </div>
                <p className="mt-3 text-[11px] font-black leading-tight">{site.name}</p>
                <p className="mt-1 line-clamp-2 text-[9px] font-medium leading-snug text-white/55">
                  {site.description}
                </p>
              </div>
            );
          }

          return (
            <a
              key={site.id}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => handleClick(site.id, href)}
              className={`group ${compact ? 'min-w-[132px]' : ''} min-h-[86px] rounded-2xl border border-brand-black/10 bg-white p-3 text-brand-black transition-all hover:-translate-y-0.5 hover:border-brand-black hover:shadow-[2px_2px_0px_black]`}
            >
              <div className="flex items-start justify-between gap-2">
                <Icon size={18} className="shrink-0 text-brand-black/70 group-hover:text-brand-black" />
                <ArrowUpRight size={14} className="shrink-0 text-brand-black/28 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-brand-black" />
              </div>
              <p className="mt-3 text-[11px] font-black leading-tight">{site.name}</p>
              <p className="mt-1 line-clamp-2 text-[9px] font-medium leading-snug text-brand-black/42">
                {site.description}
              </p>
            </a>
          );
        })}
      </div>
    </nav>
  );
};
