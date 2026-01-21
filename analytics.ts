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
export const trackPageView = (pagePath: string, pageTitle: string) => {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('config', 'GA_MEASUREMENT_ID', {
      page_path: pagePath,
      page_title: pageTitle,
    });
  }
};
