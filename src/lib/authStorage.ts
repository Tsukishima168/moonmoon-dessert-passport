const SHARED_COOKIE_DOMAIN = '.kiwimu.com';

const IPV4_HOST_PATTERN = /^\d{1,3}(?:\.\d{1,3}){3}$/;

function canShareKiwimuCookies(hostname: string): boolean {
  return hostname === 'kiwimu.com' || hostname.endsWith('.kiwimu.com');
}

export function resolveCookieDomain(hostname: string = window.location.hostname): string | undefined {
  if (!hostname || hostname === 'localhost' || hostname === '127.0.0.1' || IPV4_HOST_PATTERN.test(hostname)) {
    return undefined;
  }

  return canShareKiwimuCookies(hostname) ? SHARED_COOKIE_DOMAIN : undefined;
}

function readCookie(name: string): string | null {
  const match = document.cookie.match(new RegExp(`(^| )${name}=([^;]+)`));
  return match ? decodeURIComponent(match[2]) : null;
}

function writeCookie(name: string, value: string, domain?: string, maxAgeSec = 60 * 60 * 24 * 365) {
  const parts = [
    `${name}=${encodeURIComponent(value)}`,
    'path=/',
    `max-age=${maxAgeSec}`,
    'SameSite=Lax',
  ];

  if (domain) {
    parts.push(`domain=${domain}`);
  }

  document.cookie = parts.join('; ');
}

function removeCookie(name: string, domain?: string) {
  const parts = [`${name}=`, 'path=/', 'max-age=0'];
  if (domain) {
    parts.push(`domain=${domain}`);
  }
  document.cookie = parts.join('; ');
}

export function createCookieStorage() {
  if (typeof document === 'undefined') {
    return undefined;
  }

  const domain = resolveCookieDomain();

  return {
    getItem: (key: string): string | null => readCookie(key),
    setItem: (key: string, value: string) => writeCookie(key, value, domain),
    removeItem: (key: string) => removeCookie(key, domain),
  };
}

export function getOAuthRedirectUrl() {
  const configured = import.meta.env.VITE_SUPABASE_AUTH_REDIRECT_URL as string | undefined;
  return configured || window.location.origin;
}
