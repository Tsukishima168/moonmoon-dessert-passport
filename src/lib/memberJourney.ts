import type { Stamp } from '../../types';
import type { FootprintSiteId } from './footprints';

export type JourneyMode = 'online' | 'store';

const SOURCE_ALIASES: Record<string, FootprintSiteId> = {
  mbti: 'kiwimu_mbti', hub: 'kiwimu_mbti', kiwimu: 'kiwimu_mbti',
  kiwimu_mbti: 'kiwimu_mbti', mbti_lab: 'kiwimu_mbti',
  passport: 'passport', map: 'moon_map', moon_map: 'moon_map',
  shop: 'dessert_booking', dessert_booking: 'dessert_booking',
  gacha: 'gacha',
};

const SITE_BY_HOST: Record<string, FootprintSiteId> = {
  'kiwimu.com': 'kiwimu_mbti', 'kiwimu-mbti.vercel.app': 'kiwimu_mbti',
  'passport.kiwimu.com': 'passport', 'moonmoon-dessert-passport.vercel.app': 'passport',
  'map.kiwimu.com': 'moon_map', 'moon-map-original.vercel.app': 'moon_map',
  'shop.kiwimu.com': 'dessert_booking', 'moon-dessert-booking.vercel.app': 'dessert_booking',
  'gacha.kiwimu.com': 'gacha', 'moonmoon-gacha.vercel.app': 'gacha',
};

/** Entry attribution is an exploration footprint, never proof for points or rewards. */
export function detectIncomingSite(search: string, referrer: string): FootprintSiteId | null {
  const from = new URLSearchParams(search).get('from');
  if (from !== null) {
    if (!/^[a-z0-9_]{1,64}$/.test(from)) return null;
    // Longest alias first preserves old moon_map / dessert_booking links.
    const alias = Object.keys(SOURCE_ALIASES)
      .sort((a, b) => b.length - a.length)
      .find(key => from === key || from.startsWith(`${key}_`));
    return alias ? SOURCE_ALIASES[alias] : null;
  }
  try {
    const url = new URL(referrer);
    return url.protocol === 'https:' && Object.hasOwn(SITE_BY_HOST, url.hostname)
      ? SITE_BY_HOST[url.hostname]
      : null;
  } catch {
    return null;
  }
}

export function parseJourneyMode(value: string | null): JourneyMode {
  return value === 'store' ? 'store' : 'online';
}

export function getNextMission(stamps: Stamp[], unlocked: string[], mode: JourneyMode): Stamp | null {
  return stamps.find(stamp => {
    // Review requests stay voluntary; do not promote them in the reward journey.
    if (stamp.isSecret || stamp.id === 'google_review' || unlocked.includes(stamp.id)) return false;
    const online = stamp.id === 'quiz_completed' || stamp.unlockMethod === 'external';
    return mode === 'online' ? online : !online;
  }) ?? null;
}
