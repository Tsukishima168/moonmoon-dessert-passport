/**
 * Google Analytics 4 (GA4) Utilities
 *
 * This module provides type-safe event tracking for the MoonMoon Dessert Passport app.
 */

import { readKwAttr } from './src/lib/attribution';

const SITE_ID = 'passport';
const DEFAULT_UTM_SOURCE = 'passport';

const TARGET_SITE_BY_HOST: Record<string, string> = {
  'kiwimu.com': 'mbti_lab',
  'kiwimu-mbti.vercel.app': 'mbti_lab',
  'map.kiwimu.com': 'moon_map',
  'moon-map-original.vercel.app': 'moon_map',
  'shop.kiwimu.com': 'dessert_booking',
  'dessert-booking.vercel.app': 'dessert_booking',
  'gacha.kiwimu.com': 'gacha',
};

// R3: 站內跨站連結（from=<來源站>_<位置>）的「來源站」前綴 → site_id 對照表。
// 'hub' 對應 kiwimu.com 首頁／導覽（與 mbti 測驗同站，沿用既有 TARGET_SITE_BY_HOST 的 mbti_lab 命名）。
const FROM_PREFIX_TO_SITE: Record<string, string> = {
  mbti: 'mbti_lab',
  hub: 'mbti_lab',
  map: 'moon_map',
  shop: 'dessert_booking',
  gacha: 'gacha',
  passport: 'passport',
};

/**
 * R3：判定 source_site（sign_up/login 歸因用，source_site=mbti_lab 是測驗簽到的計數依據）。
 * 優先序：`from`（新格式） → 舊版 `utm_source` → null（呼叫端再 fallback 到 redirect_to 的 hostname）。
 * `from`／`utm_source` 只要是 'mbti' 或以 'mbti_' 開頭都視為 mbti_lab（相容舊連結 from=mbti、
 * utm_source=mbti-lab，以及未來 from=mbti_claim 等新值）。
 */
function resolveSourceSiteFromParams(params: URLSearchParams): string | null {
  const fromParam = params.get('from');
  if (fromParam) {
    const normalized = fromParam.toLowerCase();
    if (normalized === 'mbti' || normalized.startsWith('mbti_')) return 'mbti_lab';
    const prefix = normalized.split('_')[0];
    if (FROM_PREFIX_TO_SITE[prefix]) return FROM_PREFIX_TO_SITE[prefix];
    return null;
  }

  const utmSource = params.get('utm_source');
  if (utmSource) {
    const normalized = utmSource.toLowerCase().replace(/-/g, '_');
    if (normalized === 'mbti' || normalized.startsWith('mbti_')) return 'mbti_lab';
    const prefix = normalized.split('_')[0];
    if (FROM_PREFIX_TO_SITE[prefix]) return FROM_PREFIX_TO_SITE[prefix];
  }

  return null;
}

// v1.1 BLOCKER 修：kw_attr 的 `from` 是「上一個跳轉來源」，不是長期行銷歸因欄位——
// 30 天都採信會蓋掉更即時、更明確的訊號（例如 passport→kiwimu 測驗→再回來登入，
// 這時該算 mbti_lab，不該被幾天前寫入的 from=passport_xxx 蓋掉）。只在 2 小時內才採信。
const FROM_COOKIE_FRESH_MS = 2 * 60 * 60 * 1000; // 2 小時

/**
 * R3：讀 kw_attr cookie 裡的 `from`（cookie 會在 Google OAuth 整頁導覽導出導回之間存活，
 * 見 src/lib/attribution.ts），但只在 `from_ts` 是 2 小時內才採信，避免陳舊值蓋掉更即時的訊號。
 * 不讀 cookie 的 `src`（utm_source）：那是刻意 30 天不覆蓋的長期第一接觸行銷歸因，
 * 拿來判定「這次登入」的 source_site 語意不對，交給 resolveSourceSiteFromParams 走目前這次
 * 載入的網址即可。
 */
function resolveSourceSiteFromFreshKwAttrFrom(): string | null {
  try {
    const attr = readKwAttr();
    if (!attr.from || !attr.from_ts) return null;
    if (Date.now() - attr.from_ts > FROM_COOKIE_FRESH_MS) return null;
    const fakeParams = new URLSearchParams();
    fakeParams.set('from', attr.from);
    return resolveSourceSiteFromParams(fakeParams);
  } catch {
    return null;
  }
}

// passport 自己的網域／舊別名：redirect_to 指回這裡代表「使用者原本就在 passport 上」，
// 不是跨站訊號，遇到要當作沒有 redirect_to 一樣繼續往下 fallback。
const PASSPORT_SELF_HOSTS = new Set(['passport.kiwimu.com', 'moonmoon-dessert-passport.vercel.app']);

/**
 * R3：跨站 SSO broker 的 redirect_to 目標網域 → source_site。這是「哪一站發起了這次登入」
 * 最明確、最即時的訊號（例如 shop 的登入按鈕把使用者導來 passport，redirect_to 的 host 就是
 * shop.kiwimu.com），優先權應該最高——比任何 cookie 都更能代表「這一次」登入的來源。
 */
function resolveSourceSiteFromRedirectHost(sourceUrl?: string): string | null {
  if (!sourceUrl) return null;
  try {
    const hostname = new URL(sourceUrl).hostname;
    if (PASSPORT_SELF_HOSTS.has(hostname)) return null;
    return TARGET_SITE_BY_HOST[hostname] || 'external';
  } catch {
    return null;
  }
}

const withSiteId = (params?: Record<string, any>) => ({
  site_id: SITE_ID,
  ...(params || {})
});

// Extend the Window interface to include gtag
declare global {
  interface Window {
    __GA4_ID__?: string;
    __PASSPORT_INITIAL_SEARCH__?: string;
    gtag?: (
      command: 'config' | 'event' | 'set',
      targetId: string,
      config?: Record<string, any>
    ) => void;
    dataLayer?: any[];
  }
}

const getGa4Id = (): string => {
  if (typeof window === 'undefined') return 'G-DM6F27KL8B';
  return window.__GA4_ID__ || 'G-DM6F27KL8B';
};

/**
 * Send a custom event to Google Analytics
 */
export const trackEvent = (
  eventName: string,
  eventParams?: Record<string, any>
) => {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', eventName, withSiteId(eventParams));
  } else {
    console.warn('GA4 tracking not initialized');
  }
};

export type UtmParams = {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  utm_term?: string;
};

function compactUtmParams(params: UtmParams): Record<string, string> {
  const cleaned: Record<string, string> = {};
  Object.entries(params).forEach(([key, value]) => {
    if (value) cleaned[key] = value;
  });
  return cleaned;
}

export const getUtmParamsFromUrl = (input?: string): UtmParams => {
  if (typeof window === 'undefined') return {};

  try {
    if (!input) {
      const params = new URLSearchParams(window.location.search);
      return {
        utm_source: params.get('utm_source') || undefined,
        utm_medium: params.get('utm_medium') || undefined,
        utm_campaign: params.get('utm_campaign') || undefined,
        utm_content: params.get('utm_content') || undefined,
        utm_term: params.get('utm_term') || undefined,
      };
    }

    if (input.startsWith('?')) {
      const params = new URLSearchParams(input);
      return {
        utm_source: params.get('utm_source') || undefined,
        utm_medium: params.get('utm_medium') || undefined,
        utm_campaign: params.get('utm_campaign') || undefined,
        utm_content: params.get('utm_content') || undefined,
        utm_term: params.get('utm_term') || undefined,
      };
    }

    const params = new URL(input).searchParams;
    return {
      utm_source: params.get('utm_source') || undefined,
      utm_medium: params.get('utm_medium') || undefined,
      utm_campaign: params.get('utm_campaign') || undefined,
      utm_content: params.get('utm_content') || undefined,
      utm_term: params.get('utm_term') || undefined,
    };
  } catch {
    return {};
  }
};

export const buildUtmUrl = (
  baseUrl: string,
  options: {
    source?: string;
    medium: string;
    campaign?: string;
    content?: string;
    term?: string;
    additionalParams?: Record<string, string>;
  }
): string => {
  const url = new URL(baseUrl);
  const utmSource = options.source || DEFAULT_UTM_SOURCE;

  url.searchParams.set('utm_source', utmSource);
  url.searchParams.set('utm_medium', options.medium);
  if (options.campaign) url.searchParams.set('utm_campaign', options.campaign);
  if (options.content) url.searchParams.set('utm_content', options.content);
  if (options.term) url.searchParams.set('utm_term', options.term);

  if (options.additionalParams) {
    Object.entries(options.additionalParams).forEach(([key, value]) => {
      url.searchParams.set(key, value);
    });
  }

  return url.toString();
};

// R3: 站內跨站連結（指向其他 *.kiwimu.com 站）不用 utm_*，改用單一參數
// from=<來源站>_<位置>（只小寫英數與底線）。
const FROM_PARAM_PATTERN = /^[a-z0-9_]+$/;

export const buildFromUrl = (
  baseUrl: string,
  from: string,
  additionalParams?: Record<string, string>,
): string => {
  const url = new URL(baseUrl);

  if (FROM_PARAM_PATTERN.test(from)) {
    url.searchParams.set('from', from);
  }

  if (additionalParams) {
    Object.entries(additionalParams).forEach(([key, value]) => {
      url.searchParams.set(key, value);
    });
  }

  return url.toString();
};

export const trackUtmLanding = (input?: string) => {
  const initialSearch = input || (typeof window !== 'undefined' ? window.__PASSPORT_INITIAL_SEARCH__ : undefined);
  const utmParams = getUtmParamsFromUrl(initialSearch);
  if (!Object.values(utmParams).some(Boolean)) return;

  trackEvent('utm_landing', compactUtmParams(utmParams));
};

/**
 * Track an SSO auth conversion. Passport is the 5-site identity provider, so a
 * sign-in here is the ecosystem's login/sign_up conversion. Fires the GA4
 * recommended `sign_up` (first-time) or `login` (returning) event, tagged with
 * the originating site (source_site) and any preserved utm.
 *
 * v1.1 修 BLOCKER：source_site 判定優先序改為——
 *   1. 跨站 SSO broker 的 redirect_to 目標網域（哪一站發起這次登入，最明確、最即時）
 *   2. 目前這次載入網址上的 from／utm_source（這次 pageload 自己的訊號）
 *   3. kw_attr cookie 的 from，且僅在 2 小時內才採信（避免陳舊 from 蓋掉上面兩層）
 *   4. 'passport'（都沒有時的預設值）
 * 舊版曾經讓 cookie 優先於 redirect_to，會讓「passport → kiwimu 測驗 → 回來登入」這種
 * 案例被幾天前的 from 蓋成 source_site=passport，而不是正確的 mbti_lab。
 */
export const trackAuthConversion = (isNewUser: boolean, sourceUrl?: string) => {
  const initialParams = new URLSearchParams(
    typeof window !== 'undefined' ? window.__PASSPORT_INITIAL_SEARCH__ || window.location.search : '',
  );

  let sourceSite =
    resolveSourceSiteFromRedirectHost(sourceUrl) ||
    resolveSourceSiteFromParams(initialParams) ||
    resolveSourceSiteFromFreshKwAttrFrom();

  if (!sourceSite) sourceSite = 'passport';

  const utmParams = compactUtmParams(
    getUtmParamsFromUrl(typeof window !== 'undefined' ? window.__PASSPORT_INITIAL_SEARCH__ : undefined),
  );
  trackEvent(isNewUser ? 'sign_up' : 'login', {
    method: 'google',
    source_site: sourceSite,
    ...utmParams,
  });
};

/**
 * Track dessert card view
 */
export const trackDessertView = (dessertId: string, dessertName: string) => {
  trackEvent('dessert_view', {
    dessert_id: dessertId,
    dessert_name: dessertName,
  });
};

/**
 * Track when user favorites a dessert
 */
export const trackDessertFavorite = (dessertId: string, dessertName: string) => {
  trackEvent('dessert_favorite', {
    dessert_id: dessertId,
    dessert_name: dessertName,
    action: 'add',
  });
};

/**
 * Track when user unfavorites a dessert
 */
export const trackDessertUnfavorite = (dessertId: string, dessertName: string) => {
  trackEvent('dessert_unfavorite', {
    dessert_id: dessertId,
    dessert_name: dessertName,
    action: 'remove',
  });
};

/**
 * Track store menu view
 */
export const trackStoreMenuView = (storeId: string, storeName: string) => {
  trackEvent('store_menu_view', {
    store_id: storeId,
    store_name: storeName,
  });
};

/**
 * Track filter usage
 */
export const trackFilterUsage = (filterType: string, filterValue: string) => {
  trackEvent('filter_applied', {
    filter_type: filterType,
    filter_value: filterValue,
  });
};

/**
 * Track search usage
 */
export const trackSearch = (searchTerm: string, resultsCount: number) => {
  trackEvent('search', {
    search_term: searchTerm,
    results_count: resultsCount,
  });
};

/**
 * Track page view (manual tracking if needed)
 */
/**
 * Track button click
 */
export const trackButtonClick = (buttonName: string, location: string) => {
  trackEvent('button_click', {
    button_name: buttonName,
    location: location,
  });
};

/**
 * Track outbound link navigation.
 * R5: outbound_click 參數固定帶 target_site、link_name、entry_surface、destination_type，
 * transport_type: 'beacon'（點擊後常常立刻跳頁，beacon 確保事件送得出去）。
 * `label` 沿用作 link_name，維持既有呼叫端相容；entrySurface/destinationType 為新增選填參數。
 */
export const trackOutboundNavigation = (
  url: string,
  label: string,
  options?: { entrySurface?: string; destinationType?: string },
) => {
  let targetSite = 'external';
  try {
    const host = new URL(url).hostname;
    targetSite = TARGET_SITE_BY_HOST[host] || 'external';
  } catch {
    targetSite = 'external';
  }

  const utmParams = compactUtmParams(getUtmParamsFromUrl(url));
  const destinationType = options?.destinationType || (targetSite === 'external' ? 'external' : 'internal');

  trackEvent('outbound_click', {
    source_site: SITE_ID,
    target_site: targetSite,
    link_name: label,
    entry_surface: options?.entrySurface,
    destination_type: destinationType,
    label: label,
    url: url,
    ...utmParams,
    transport_type: 'beacon',
  });
  // Optional: open window here if we wanted to control navigation, but usually we just track before click propagates or use separate handler
};

/**
 * Track time spent on a screen
 */
export const trackTimeSpent = (screenName: string, seconds: number) => {
  trackEvent('time_spent', {
    screen_name: screenName,
    duration_seconds: seconds,
  });
};

/**
 * Track page view (manual tracking for SPA)
 */
export const trackPageView = (pagePath: string, pageTitle: string) => {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('config', getGa4Id(), {
      page_path: pagePath,
      page_title: pageTitle,
    });
  }
};

/**
 * Track entrance source (e.g. 門口 QR 掃描) — 用於區分「從大門進入」的流量
 * 請在 App 載入時依 URL 參數呼叫，GA4 可依此事件統計門口進入人數。
 */
export const trackEntranceSource = (source: string, medium: string, campaign?: string) => {
  trackEvent('entrance_scan', {
    entrance_source: source,
    entrance_medium: medium,
    ...(campaign && { entrance_campaign: campaign }),
  });
};
