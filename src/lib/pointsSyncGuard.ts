/**
 * Gacha → Passport 積分同步守門員。
 *
 * 純邏輯、零 import（不碰 DOM／React／Supabase），所有外部依賴都由呼叫端注入，
 * 因此 scripts/regression-passport-oauth.mjs 能把這支檔案轉譯後「真的執行」來測，
 * 不用靠字串比對或手寫鏡像。
 *
 * 背景：舊版 `?action=add_points&amount=<任意>&source=<任意>&ts=<任意>` 完全沒有驗證，
 * 任何人貼一條網址就能憑空加積分。現在一筆同步必須「全部」成立才入帳：
 *   1. document.referrer 的 origin 是 Gacha 正式站或其 vercel 別名；
 *   2. amount 是 1..MAX_PER_SYNC 的整數（嚴格十進位字串，不吃 "12abc"／"1e3"／"+5"）；
 *   3. 滾動 24 小時內已同步入帳的總量 + 這筆 <= MAX_PER_DAY；
 *   4. ts 沒處理過（沿用舊的重複防護）。
 * 被拒絕的同步不入帳、不寫 ACK cookie（Gacha 端不會誤以為已同步而推進游標），
 * 但網址一律清掉，並回傳 reason 供呼叫端送 `points_sync_rejected`（不含金額／device_id）。
 *
 * 限制（誠實聲明）：這仍是純前端的「防手滑／防貼網址」防線。懂開發者工具的人能直接改
 * localStorage，或在 gacha 網域的 console 導頁取得合法 referrer。真正的解法是把積分入帳
 * 搬到伺服器端（簽章或 RPC），這支檔案只負責把「憑空加分」的成本與上限壓下來。
 */

/** 允許發起同步的來源 origin（只比 origin，不比路徑）。 */
export const POINTS_SYNC_ALLOWED_REFERRER_ORIGINS: readonly string[] = [
  'https://gacha.kiwimu.com',
  'https://moonmoon-gacha.vercel.app',
];

/**
 * 單次同步上限。
 * Gacha 每天只能抽一次，單抽最高 200（月光球，權重 2%）；Gacha 的同步量是「游標之後所有
 * gacha_earn 的總和」，所以偶爾跳過同步的人會一次補送多天。400 = 單抽最高值的 2 倍，
 * 也約等於 21 天平均手氣（平均每抽 18.5）的補送量。
 */
export const MAX_PER_SYNC = 400;

/**
 * 滾動 24 小時內累計入帳上限。
 * 日常合法上限是一次抽獎 <= 200；600 = 一次完整補送（<= 400）再加當天一次月光球（200）。
 * 超過的同步會被拒，且因為不寫 ACK，Gacha 端的待同步積分會保留到隔天再補。
 */
export const MAX_PER_DAY = 600;

export const POINTS_SYNC_WINDOW_MS = 24 * 60 * 60 * 1000;

/** 最後一次成功處理的 ts（重複防護，沿用舊 key）。 */
export const POINTS_SYNC_LAST_TS_KEY = 'moonmoon_points_last_sync_ts';
/** 滾動 24 小時的入帳流水：[{ at: 入帳時間 ms, amount }]。 */
export const POINTS_SYNC_LEDGER_KEY = 'moonmoon_points_sync_ledger';

const SYNC_TS_PATTERN = /^[0-9]{1,16}$/;
const SYNC_AMOUNT_PATTERN = /^(0|[1-9][0-9]*)$/;

export type PointsSyncRejectReason =
  | 'params_invalid'
  | 'referrer'
  | 'amount_invalid'
  | 'amount_over_cap'
  | 'daily_cap';

export interface PointsSyncLedgerEntry {
  at: number;
  amount: number;
}

export type PointsSyncDecision =
  | { status: 'accept'; amount: number }
  | { status: 'duplicate' }
  | { status: 'reject'; reason: PointsSyncRejectReason };

export type IncomingPointsSyncResult =
  | { credited: number }
  | { rejected: PointsSyncRejectReason }
  | null;

export function isAllowedSyncReferrer(referrer: string | null | undefined): boolean {
  if (!referrer) return false;
  try {
    const url = new URL(referrer);
    return url.protocol === 'https:' && POINTS_SYNC_ALLOWED_REFERRER_ORIGINS.includes(url.origin);
  } catch {
    return false;
  }
}

const isLedgerEntry = (value: unknown): value is PointsSyncLedgerEntry => {
  if (!value || typeof value !== 'object') return false;
  const { at, amount } = value as Record<string, unknown>;
  return (
    typeof at === 'number' &&
    Number.isFinite(at) &&
    typeof amount === 'number' &&
    Number.isFinite(amount) &&
    amount > 0
  );
};

export function parseSyncLedger(raw: string | null | undefined): PointsSyncLedgerEntry[] {
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter(isLedgerEntry) : [];
  } catch {
    return [];
  }
}

/** 只留 24 小時視窗內的流水；時間在「未來」的項目（時鐘被調過）保守地算在視窗內。 */
export function pruneSyncLedger(ledger: PointsSyncLedgerEntry[], now: number): PointsSyncLedgerEntry[] {
  return ledger.filter((entry) => now - entry.at < POINTS_SYNC_WINDOW_MS);
}

export function sumSyncedWithinWindow(ledger: PointsSyncLedgerEntry[], now: number): number {
  return pruneSyncLedger(ledger, now).reduce((total, entry) => total + entry.amount, 0);
}

/**
 * 判斷順序固定：referrer -> amount 格式 -> 單次上限 -> 重複 ts -> 日上限。
 * 重複 ts 放在日上限前面：合法使用者重複點同一個連結時，應該被當成「已處理」補 ACK，
 * 而不是被誤判成超量。
 */
export function decidePointsSync(input: {
  referrer: string | null | undefined;
  amountRaw: string | null | undefined;
  ledger: PointsSyncLedgerEntry[];
  now: number;
  isDuplicate: boolean;
}): PointsSyncDecision {
  if (!isAllowedSyncReferrer(input.referrer)) {
    return { status: 'reject', reason: 'referrer' };
  }

  if (typeof input.amountRaw !== 'string' || !SYNC_AMOUNT_PATTERN.test(input.amountRaw)) {
    return { status: 'reject', reason: 'amount_invalid' };
  }
  const amount = Number(input.amountRaw);
  if (amount < 1) {
    return { status: 'reject', reason: 'amount_invalid' };
  }
  if (amount > MAX_PER_SYNC) {
    return { status: 'reject', reason: 'amount_over_cap' };
  }

  if (input.isDuplicate) {
    return { status: 'duplicate' };
  }

  if (sumSyncedWithinWindow(input.ledger, input.now) + amount > MAX_PER_DAY) {
    return { status: 'reject', reason: 'daily_cap' };
  }

  return { status: 'accept', amount };
}

export interface PointsSyncDeps {
  /** 進站當下的原始 query（index.html 在清網址前存的 window.__PASSPORT_INITIAL_SEARCH__）。 */
  search: string;
  referrer: string;
  now: number;
  storage: Pick<Storage, 'getItem' | 'setItem'>;
  /** 實際入帳（addPassportPoints）。 */
  credit: (amount: number) => void;
  /** 寫跨站 ACK cookie，讓 Gacha 推進同步游標。只有「已入帳」或「重複 ts」會呼叫。 */
  writeAck: (ts: string) => void;
  /** 清掉網址上的同步參數。成功、重複、拒絕都會呼叫。 */
  cleanUrl: () => void;
}

export function processIncomingPointsSync(deps: PointsSyncDeps): IncomingPointsSyncResult {
  const params = new URLSearchParams(deps.search);
  if (params.get('action') !== 'add_points') return null;

  const amountRaw = params.get('amount');
  const source = params.get('source');
  const ts = params.get('ts');

  if (!amountRaw || !source || !ts || !SYNC_TS_PATTERN.test(ts)) {
    deps.cleanUrl();
    return { rejected: 'params_invalid' };
  }

  const ledger = parseSyncLedger(deps.storage.getItem(POINTS_SYNC_LEDGER_KEY));
  const decision = decidePointsSync({
    referrer: deps.referrer,
    amountRaw,
    ledger,
    now: deps.now,
    isDuplicate: deps.storage.getItem(POINTS_SYNC_LAST_TS_KEY) === ts,
  });

  if (decision.status === 'reject') {
    deps.cleanUrl();
    return { rejected: decision.reason };
  }

  if (decision.status === 'duplicate') {
    deps.writeAck(ts);
    deps.cleanUrl();
    return null;
  }

  // 先記流水再入帳：儲存空間出問題時寧可少加，也不要讓日上限形同虛設。
  const nextLedger = [...pruneSyncLedger(ledger, deps.now), { at: deps.now, amount: decision.amount }];
  deps.storage.setItem(POINTS_SYNC_LEDGER_KEY, JSON.stringify(nextLedger));
  deps.credit(decision.amount);
  deps.storage.setItem(POINTS_SYNC_LAST_TS_KEY, ts);
  deps.writeAck(ts);
  deps.cleanUrl();

  return { credited: decision.amount };
}
