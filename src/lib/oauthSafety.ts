const OAUTH_CALLBACK_PARAMS = ['code', 'state', 'error', 'error_description'];

function hasOAuthCallbackSignal(url: URL): boolean {
  return Boolean(url.searchParams.get('state')) ||
    url.searchParams.has('error') ||
    url.searchParams.has('error_description');
}

export function removeOAuthCallbackParamsFromCurrentUrl() {
  if (typeof window === 'undefined') {
    return;
  }

  const url = new URL(window.location.href);
  if (!hasOAuthCallbackSignal(url)) {
    return;
  }

  let changed = false;
  OAUTH_CALLBACK_PARAMS.forEach((param) => {
    if (url.searchParams.has(param)) {
      url.searchParams.delete(param);
      changed = true;
    }
  });

  if (!changed) {
    return;
  }

  const nextSearch = url.searchParams.toString();
  window.history.replaceState({}, '', `${url.pathname}${nextSearch ? `?${nextSearch}` : ''}${url.hash}`);
}

export async function releaseSameOriginServiceWorkersForOAuth() {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return;
  }

  try {
    const registrations = await navigator.serviceWorker.getRegistrations();
    const sameOriginRegistrations = registrations.filter((registration) => {
      try {
        return new URL(registration.scope).origin === window.location.origin;
      } catch {
        return false;
      }
    });

    await Promise.all(sameOriginRegistrations.map((registration) => registration.unregister()));
  } catch (error) {
    console.warn('[SupabaseAuth] Could not release service workers before OAuth:', error);
  }
}
