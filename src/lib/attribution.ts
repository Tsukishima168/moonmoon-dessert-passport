/**
 * attribution.ts — R4 第一接觸歸因 cookie `kw_attr`（五站共用契約）
 *
 * Passport 在這份契約裡是 writer（+ 內部 reader，供 R3 的 source_site 判定使用）：
 * - 只在 hostname 結尾是 kiwimu.com 時「寫入」；讀取則任何環境都可（cookie 不存在時安全回傳空物件）
 * - domain=.kiwimu.com; path=/; max-age=2592000 (30 天); SameSite=Lax; Secure
 * - < 1KB，不得含個資
 * - passport 不產生 orders，不需要 getOrderAttribution 這類 reader；`mbti`/`mbti_ts` 只由
 *   kiwimu.com 測驗結果頁覆寫，本檔不在 passport 站寫入 mbti，只在需要時讀出（例如未來 UI 要顯示）。
 *
 * 寫入規則（與 map / shop / gacha 一致）：
 *  - 任何站載入時，網址有 utm_source 且沒有 from → 若 cookie 內尚無 src（或 ts 超過 30 天）才寫入
 *    src/med/cmp/cnt/trm/land/ts（第一接觸，不覆蓋既有的第一接觸資料）。
 *  - 任何站載入時，網址有 from → 覆寫 from、from_ts。
 *
 * 用途：analytics.ts 的 trackAuthConversion() 讀這份 cookie 來判定 source_site
 * （例如 mbti_lab 測驗簽到），因為 cookie 在 Google OAuth 導回導去的整頁導覽之間仍會存在，
 * 比存在 JS 記憶體裡的初始網址參數更可靠。
 */

const COOKIE_NAME = 'kw_attr';
const COOKIE_DOMAIN = '.kiwimu.com';
const COOKIE_MAX_AGE_SEC = 60 * 60 * 24 * 30; // 30 天
const FIRST_TOUCH_STALE_MS = 30 * 24 * 60 * 60 * 1000; // 30 天

export interface KwAttr {
  src?: string;
  med?: string;
  cmp?: string;
  cnt?: string;
  trm?: string;
  land?: string;
  ts?: number;
  mbti?: string;
  mbti_ts?: number;
  from?: string;
  from_ts?: number;
}

function isProdKiwimuHost(hostname: string): boolean {
  return hostname === 'kiwimu.com' || hostname.endsWith('.kiwimu.com');
}

function readCookieRaw(name: string): string | null {
  if (typeof document === 'undefined') return null;
  try {
    const match = document.cookie.match(new RegExp(`(?:^|;\\s*)${name}=([^;]*)`));
    return match ? match[1] : null;
  } catch {
    return null;
  }
}

/** 讀 kw_attr cookie；壞掉／不存在時一律回傳空物件，不丟例外。 */
export function readKwAttr(): KwAttr {
  const raw = readCookieRaw(COOKIE_NAME);
  if (!raw) return {};
  try {
    const parsed = JSON.parse(decodeURIComponent(raw));
    return parsed && typeof parsed === 'object' ? (parsed as KwAttr) : {};
  } catch {
    return {};
  }
}

function writeKwAttr(attr: KwAttr): void {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  if (!isProdKiwimuHost(window.location.hostname)) return;

  try {
    const value = encodeURIComponent(JSON.stringify(attr));
    const parts = [
      `${COOKIE_NAME}=${value}`,
      `domain=${COOKIE_DOMAIN}`,
      'path=/',
      `max-age=${COOKIE_MAX_AGE_SEC}`,
      'SameSite=Lax',
      'Secure',
    ];
    document.cookie = parts.join('; ');
  } catch {
    // cookie 寫入失敗（例如值過長、瀏覽器封鎖）— 靜默略過，不影響主流程
  }
}

/**
 * 頁面載入時呼叫一次：依 R4 規則同步 kw_attr cookie。
 * 只在 *.kiwimu.com 正式網域寫入；其他環境（localhost、預覽網址）不寫入。
 */
export function syncAttributionFromUrl(search?: string): void {
  if (typeof window === 'undefined') return;
  if (!isProdKiwimuHost(window.location.hostname)) return;

  let params: URLSearchParams;
  try {
    params = new URLSearchParams(search ?? window.location.search);
  } catch {
    return;
  }

  const fromParam = params.get('from');
  const utmSource = params.get('utm_source');
  const now = Date.now();
  const current = readKwAttr();

  // 網址有 from → 覆寫 from / from_ts（優先權高於 utm_source 判斷）
  if (fromParam) {
    writeKwAttr({ ...current, from: fromParam, from_ts: now });
    return;
  }

  // 網址有 utm_source 且沒有 from → 只在尚無第一接觸資料，或已超過 30 天時才寫入
  if (utmSource) {
    const isStale = !current.ts || now - current.ts > FIRST_TOUCH_STALE_MS;
    if (!current.src || isStale) {
      writeKwAttr({
        ...current,
        src: utmSource,
        med: params.get('utm_medium') || undefined,
        cmp: params.get('utm_campaign') || undefined,
        cnt: params.get('utm_content') || undefined,
        trm: params.get('utm_term') || undefined,
        land: window.location.hostname,
        ts: now,
      });
    }
  }
}
