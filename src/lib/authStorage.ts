const SHARED_COOKIE_DOMAIN = '.kiwimu.com';
const COOKIE_CHUNK_PREFIX = 'chunks:';
const MAX_COOKIE_CHUNK_LENGTH = 3500;
const MAX_COOKIE_CHUNKS = 20;

const IPV4_HOST_PATTERN = /^\d{1,3}(?:\.\d{1,3}){3}$/;

function canShareKiwimuCookies(hostname: string): boolean {
  return hostname === 'kiwimu.com' || hostname.endsWith('.kiwimu.com');
}

function isLocalhost(hostname: string): boolean {
  return hostname === 'localhost' || hostname === '127.0.0.1';
}

function canUseLocalRedirects(hostname: string = window.location.hostname): boolean {
  return import.meta.env.DEV && (isLocalhost(hostname) || IPV4_HOST_PATTERN.test(hostname));
}

export function resolveCookieDomain(hostname: string = window.location.hostname): string | undefined {
  if (!hostname || isLocalhost(hostname) || IPV4_HOST_PATTERN.test(hostname)) {
    return undefined;
  }

  return canShareKiwimuCookies(hostname) ? SHARED_COOKIE_DOMAIN : undefined;
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function shouldUseSecureCookies(): boolean {
  return typeof window !== 'undefined' && window.location.protocol === 'https:';
}

function readCookieRaw(name: string): string | null {
  const match = document.cookie.match(new RegExp(`(?:^|;\\s*)${escapeRegex(name)}=([^;]*)`));
  return match ? match[1] : null;
}

function writeCookieRaw(name: string, rawValue: string, domain?: string, maxAgeSec = 60 * 60 * 24 * 365) {
  const parts = [
    `${name}=${rawValue}`,
    'path=/',
    `max-age=${maxAgeSec}`,
    'SameSite=Lax',
  ];

  if (shouldUseSecureCookies()) {
    parts.push('Secure');
  }

  if (domain) {
    parts.push(`domain=${domain}`);
  }

  document.cookie = parts.join('; ');
}

function removeCookie(name: string, domain?: string) {
  const parts = [`${name}=`, 'path=/', 'max-age=0', 'SameSite=Lax'];

  if (shouldUseSecureCookies()) {
    parts.push('Secure');
  }

  if (domain) {
    parts.push(`domain=${domain}`);
  }
  document.cookie = parts.join('; ');
}

function clearCookieKey(name: string, domain?: string) {
  removeCookie(name, domain);
  for (let index = 0; index < MAX_COOKIE_CHUNKS; index += 1) {
    removeCookie(`${name}.${index}`, domain);
  }
}

function readChunkedCookie(name: string): string | null {
  const meta = readCookieRaw(name);
  if (!meta) {
    return null;
  }

  if (!meta.startsWith(COOKIE_CHUNK_PREFIX)) {
    try {
      return decodeURIComponent(meta);
    } catch {
      return null;
    }
  }

  const chunkCount = Number(meta.slice(COOKIE_CHUNK_PREFIX.length));
  if (!Number.isInteger(chunkCount) || chunkCount < 1 || chunkCount > MAX_COOKIE_CHUNKS) {
    return null;
  }

  let combined = '';
  for (let index = 0; index < chunkCount; index += 1) {
    const chunk = readCookieRaw(`${name}.${index}`);
    if (chunk == null) {
      return null;
    }
    combined += chunk;
  }

  try {
    return decodeURIComponent(combined);
  } catch {
    return null;
  }
}

function writeChunkedCookie(name: string, value: string, domain?: string) {
  const encoded = encodeURIComponent(value);
  clearCookieKey(name, domain);

  if (encoded.length <= MAX_COOKIE_CHUNK_LENGTH) {
    writeCookieRaw(name, encoded, domain);
    return;
  }

  const chunks = encoded.match(new RegExp(`.{1,${MAX_COOKIE_CHUNK_LENGTH}}`, 'g')) ?? [];
  if (chunks.length > MAX_COOKIE_CHUNKS) {
    throw new Error(`Cookie storage overflow for ${name}`);
  }

  writeCookieRaw(name, `${COOKIE_CHUNK_PREFIX}${chunks.length}`, domain);
  chunks.forEach((chunk, index) => {
    writeCookieRaw(`${name}.${index}`, chunk, domain);
  });
}

export function createCookieStorage() {
  if (typeof document === 'undefined') {
    return undefined;
  }

  const domain = resolveCookieDomain();

  return {
    getItem: (key: string): string | null => readChunkedCookie(key),
    setItem: (key: string, value: string) => writeChunkedCookie(key, value, domain),
    removeItem: (key: string) => clearCookieKey(key, domain),
  };
}

export function getOAuthRedirectUrl() {
  const configured = import.meta.env.VITE_SUPABASE_AUTH_REDIRECT_URL as string | undefined;
  if (configured) return configured;
  // Ensure trailing slash so Supabase wildcard patterns (/**) match correctly
  const origin = window.location.origin;
  return origin.endsWith('/') ? origin : `${origin}/`;
}

export function buildOAuthRedirectUrl(returnTo?: string) {
  const redirectUrl = new URL(getOAuthRedirectUrl(), window.location.origin);
  const normalizedReturnTo = typeof returnTo === 'string' ? normalizeRedirectUrl(returnTo) : null;

  if (normalizedReturnTo) {
    redirectUrl.searchParams.set('redirect_to', normalizedReturnTo);
  }

  return redirectUrl.toString();
}

const ACTIVE_REDIRECT_KEY = 'auth_redirect_to';
const PENDING_REDIRECT_KEY = 'pending_auth_redirect_to';

function normalizeRedirectUrl(url: string): string | null {
  try {
    const parsed = new URL(url, window.location.origin);
    const { hostname, protocol } = parsed;
    const localRedirectsAllowed = canUseLocalRedirects();
    const isAllowedProtocol = protocol === 'https:' || (protocol === 'http:' && localRedirectsAllowed);
    const isAllowedHost =
      canShareKiwimuCookies(hostname) ||
      (localRedirectsAllowed && (isLocalhost(hostname) || hostname === window.location.hostname));

    if (!isAllowedHost || !isAllowedProtocol) {
      return null;
    }

    return parsed.toString();
  } catch {
    return null;
  }
}

/** 儲存登入後要跳轉的網址（給跨站 SSO 用） */
export function saveRedirectTo(url: string) {
  const normalized = normalizeRedirectUrl(url);
  if (!normalized) {
    return;
  }

  try {
    sessionStorage.setItem(PENDING_REDIRECT_KEY, normalized);
  } catch {
    /* ignore */
  }
}

export function ensureRedirectTo(url: string) {
  const normalized = normalizeRedirectUrl(url);
  if (!normalized) {
    return;
  }

  try {
    const existing = sessionStorage.getItem(PENDING_REDIRECT_KEY);
    if (existing) {
      return;
    }

    sessionStorage.setItem(PENDING_REDIRECT_KEY, normalized);
  } catch {
    /* ignore */
  }
}

/** 將本次待跳轉目標提升為 OAuth 完成後要使用的目標 */
export function activateRedirectTo(): string | null {
  try {
    const pending = sessionStorage.getItem(PENDING_REDIRECT_KEY);
    sessionStorage.removeItem(PENDING_REDIRECT_KEY);

    if (!pending) {
      sessionStorage.removeItem(ACTIVE_REDIRECT_KEY);
      return null;
    }

    sessionStorage.setItem(ACTIVE_REDIRECT_KEY, pending);
    return pending;
  } catch {
    return null;
  }
}

/** 已登入狀態下，直接吃掉 pending redirect */
export function getAndClearPendingRedirectTo(): string | null {
  try {
    const url = sessionStorage.getItem(PENDING_REDIRECT_KEY);
    if (url) {
      sessionStorage.removeItem(PENDING_REDIRECT_KEY);
    }
    return url;
  } catch {
    return null;
  }
}

export function clearPendingRedirectTo() {
  try {
    sessionStorage.removeItem(PENDING_REDIRECT_KEY);
  } catch {
    /* ignore */
  }
}

/** 取出並清除暫存的跳轉網址 */
export function getAndClearRedirectTo(): string | null {
  try {
    const url = sessionStorage.getItem(ACTIVE_REDIRECT_KEY);
    if (url) {
      sessionStorage.removeItem(ACTIVE_REDIRECT_KEY);
    }
    return url;
  } catch {
    return null;
  }
}

export function clearRedirectState() {
  try {
    sessionStorage.removeItem(PENDING_REDIRECT_KEY);
    sessionStorage.removeItem(ACTIVE_REDIRECT_KEY);
  } catch {
    /* ignore */
  }
}
