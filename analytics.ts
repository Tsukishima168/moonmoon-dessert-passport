/**
 * Google Analytics 4 (GA4) Utilities
 * 
 * This module provides type-safe event tracking for the MoonMoon Dessert Passport app.
 */

// Extend the Window interface to include gtag
declare global {
  interface Window {
    gtag?: (
      command: 'config' | 'event' | 'set',
      targetId: string,
      config?: Record<string, any>
    ) => void;
    dataLayer?: any[];
  }
}

/**
 * Send a custom event to Google Analytics
 */
export const trackEvent = (
  eventName: string,
  eventParams?: Record<string, any>
) => {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', eventName, eventParams);
  } else {
    console.warn('GA4 tracking not initialized');
  }
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
  trackEvent('outbound_click', {
    url: url,
    label: label,
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
    // Should match the ID in index.html, or just use plain 'config' if the ID is already set globally? 
    // Usually subsequent config calls update the state. Using the specific ID is safer.
    window.gtag('config', 'G-ZF71VP9Z8Y', {
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
