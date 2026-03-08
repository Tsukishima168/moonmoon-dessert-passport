/**
 * Google Analytics 4 (GA4) Utilities
 * 
 * This module provides type-safe event tracking for the MoonMoon Dessert Passport app.
 */

const SITE_ID = 'passport';
const DEFAULT_UTM_SOURCE = 'passport';

const TARGET_SITE_BY_HOST: Record<string, string> = {
  'kiwimu.com': 'mbti_lab',
  'kiwimu-mbti.vercel.app': 'mbti_lab',
  'map.kiwimu.com': 'moon_map',
  'shop.kiwimu.com': 'dessert_booking',
};

const withSiteId = (params?: Record<string, any>) => ({
  site_id: SITE_ID,
  ...(params || {})
});

// Extend the Window interface to include gtag
declare global {
  interface Window {
    __GA4_ID__?: string;
    gtag?: (
      command: 'config' | 'event' | 'set',
      targetId: string,
      config?: Record<string, any>
    ) => void;
    dataLayer?: any[];
  }
}

const getGa4Id = (): string => {
  if (typeof window === 'undefined') return 'G-ZF71VP9Z8Y';
  return window.__GA4_ID__ || 'G-ZF71VP9Z8Y';
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

export const trackUtmLanding = () => {
  const utmParams = getUtmParamsFromUrl();
  if (!Object.values(utmParams).some(Boolean)) return;

  trackEvent('utm_landing', compactUtmParams(utmParams));
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
 * Track outbound link navigation
 */
export const trackOutboundNavigation = (url: string, label: string) => {
  let targetSite = 'external';
  try {
    const host = new URL(url).hostname;
    targetSite = TARGET_SITE_BY_HOST[host] || 'external';
  } catch {
    targetSite = 'external';
  }

  const utmParams = compactUtmParams(getUtmParamsFromUrl(url));

  trackEvent('outbound_click', {
    source_site: SITE_ID,
    target_site: targetSite,
    label: label,
    url: url,
    ...utmParams,
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
