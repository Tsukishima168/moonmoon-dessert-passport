const OAUTH_CALLBACK_PARAMS = ['code', 'state', 'error', 'error_description'];

// LINE 登入（LIFF）回跳的網址也帶 code+state，但那是給 liff.init 換 token 用的，
// init 結束後 LIFF 會自己清網址。LIFF SDK 延後載入後 init 比這裡的清理晚，
// 若在這裡先把 code/state 砍掉，LINE 登入回跳就換不到 token（passport-race3 實測）。
// Supabase 只用 Google PKCE 登入，它的回跳不會帶 liffClientId／liffRedirectUri。
const LIFF_CALLBACK_MARKERS = ['liffClientId', 'liffRedirectUri'];

function isLiffCallback(url: URL): boolean {
  return LIFF_CALLBACK_MARKERS.some((param) => url.searchParams.has(param));
}

// 真實 OAuth callback 永遠帶非空 state。`get('state')` 只看第一個值，遇到 `?state=&state=REAL`
// 之類構造 URL 會誤判為空，把它當 reward link 把 code 砍掉；而 trim 後仍為空的 state
// （`?state=%20`、`?state=%09`）也不應保護 reward code。
// 統一靠 `getAll(...).some(trim().length > 0)`。
function hasNonEmptyState(url: URL): boolean {
  return url.searchParams.getAll('state').some((value) => value.trim().length > 0);
}

// Cleanup can be more aggressive than the early scrubber: a URL containing both
// `code` and `state` is OAuth-shaped residue even when `state` is blank/invalid.
function hasCodeStatePair(url: URL): boolean {
  return url.searchParams.has('code') && url.searchParams.has('state');
}

function hasOAuthCallbackSignal(url: URL): boolean {
  return hasNonEmptyState(url) ||
    hasCodeStatePair(url) ||
    url.searchParams.has('error') ||
    url.searchParams.has('error_description');
}

export function removeOAuthCallbackParamsFromCurrentUrl() {
  if (typeof window === 'undefined') {
    return;
  }

  const url = new URL(window.location.href);
  if (isLiffCallback(url)) {
    return;
  }
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
