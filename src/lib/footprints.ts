import { supabase } from './supabase';

const FOOTPRINT_SYNC_KEY_PREFIX = 'kiwimu_passport_footprints_synced';

export type FootprintSiteId =
  | 'kiwimu_mbti'
  | 'passport'
  | 'moon_map'
  | 'dessert_booking'
  | 'gacha';

const EVENT_SITE_BY_FOOTPRINT_SITE: Record<FootprintSiteId, string> = {
  kiwimu_mbti: 'kiwimu',
  passport: 'passport',
  moon_map: 'map',
  dessert_booking: 'shop',
  gacha: 'gacha',
};

const FOOTPRINT_SITE_BY_EVENT_SITE: Record<string, FootprintSiteId> = {
  kiwimu: 'kiwimu_mbti',
  mbti: 'kiwimu_mbti',
  kiwimu_mbti: 'kiwimu_mbti',
  passport: 'passport',
  map: 'moon_map',
  moon_map: 'moon_map',
  shop: 'dessert_booking',
  dessert_booking: 'dessert_booking',
  gacha: 'gacha',
};

const isFootprintSiteId = (value: unknown): value is FootprintSiteId =>
  typeof value === 'string' && value in EVENT_SITE_BY_FOOTPRINT_SITE;

const safeStorage = {
  get(key: string) {
    try {
      return window.localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  set(key: string, value: string) {
    try {
      window.localStorage.setItem(key, value);
    } catch {
      // Ignore storage failures.
    }
  },
};

const toFootprintSiteId = (site: string | null, metadata: unknown): FootprintSiteId | null => {
  if (metadata && typeof metadata === 'object' && 'site_id' in metadata) {
    const siteId = (metadata as { site_id?: unknown }).site_id;
    if (isFootprintSiteId(siteId)) {
      return siteId;
    }
  }

  if (!site) {
    return null;
  }

  return FOOTPRINT_SITE_BY_EVENT_SITE[site] ?? null;
};

export async function loadCloudFootprints(): Promise<FootprintSiteId[]> {
  if (!supabase) {
    return [];
  }

  const { data, error } = await supabase
    .from('user_events')
    .select('site, metadata')
    .eq('event_type', 'site_visited')
    .order('created_at', { ascending: true });

  if (error) {
    console.warn('[footprints] load cloud footprints failed:', error.message);
    return [];
  }

  const seen = new Set<FootprintSiteId>();
  for (const row of data ?? []) {
    const siteId = toFootprintSiteId(row.site, row.metadata);
    if (siteId) {
      seen.add(siteId);
    }
  }

  return Array.from(seen);
}

export function markCloudFootprint(
  siteId: FootprintSiteId,
  metadata: Record<string, unknown> = {}
): void {
  if (!supabase) {
    return;
  }

  supabase
    .rpc('insert_user_event', {
      p_event_type: 'site_visited',
      p_site: EVENT_SITE_BY_FOOTPRINT_SITE[siteId],
      p_metadata: {
        ...metadata,
        site_id: siteId,
      },
    })
    .then(({ error }) => {
      if (error) console.warn('[footprints] mark cloud footprint failed:', error.message);
    });
}

export function syncLocalFootprintsOnce(userId: string, siteIds: string[]): void {
  const validSiteIds = siteIds.filter(isFootprintSiteId);
  if (validSiteIds.length === 0) {
    return;
  }

  const syncKey = `${FOOTPRINT_SYNC_KEY_PREFIX}:${userId}`;
  const synced = new Set((safeStorage.get(syncKey) || '').split(',').filter(Boolean));
  const nextSynced = new Set(synced);

  for (const siteId of validSiteIds) {
    if (synced.has(siteId)) {
      continue;
    }

    markCloudFootprint(siteId, { source: 'local_sync' });
    nextSynced.add(siteId);
  }

  safeStorage.set(syncKey, Array.from(nextSynced).join(','));
}
