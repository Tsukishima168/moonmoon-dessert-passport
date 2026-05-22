const OAUTH_CALLBACK_PARAMS = ['code', 'state', 'error', 'error_description'];

// 真實 OAuth callback 永遠帶非空 state。`get('state')` 只看第一個值，遇到 `?state=&state=REAL`
// 之類構造 URL 會誤判為空，把它當 reward link 把 code 砍掉；而 trim 後仍為空的 state
// （`?state=%20`、`?state=%09`）也應該視為「沒有 state」，否則會留下殘渣。
// 統一靠 `getAll(...).some(trim().length > 0)`。
function hasNonEmptyState(url: URL): boolean {
  return url.searchParams.getAll('state').some((value) => value.trim().length > 0);
}

function hasOAuthCallbackSignal(url: URL): boolean {
  return hasNonEmptyState(url) ||
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
