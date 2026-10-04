/**
 * Gacha → Passport 積分同步守門員。
 *
 * 純邏輯、零 import（不碰 DOM／React／Supabase），所有外部依賴都由呼叫端注入，
 * 因此 scripts/regression-passport-oauth.mjs 能把這支檔案轉譯後「真的執行」來測，
 * 不用靠字串比對或手寫鏡像。
 *
 * 背景：舊版 `?action=add_points&amount=<任意>&source=<任意>&ts=<任意>` 完全沒有驗證，
 * 任何人貼一條網址就能憑空加積分。現在的規則（2026-10-04，Penso 決定「補送超量 = 入帳到上限、
 * 視為同步完成、超出部分作廢」）：
 *   拒絕（不入帳、不寫 ACK，Gacha 端保留待同步量）——只有「來源或格式不對」：
 *     1. document.referrer 的 origin 不是 Gacha 正式站；
 *     2. amount 不是嚴格十進位正整數（不吃 "12abc"／"1e3"／"+5"／"0"），或缺 source／ts。
 *   通過後：
 *     3. ts 已處理過 = 重複，只補 ACK、不重複入帳；
 *     4. 否則入帳 min(amount, MAX_PER_SYNC, 滾動 24 小時剩餘額度)，並一律寫 ACK
 *        （Gacha 游標前進，多出來的部分作廢）；超量時回傳 capped: true。
 * 網址一律清掉，被拒絕時回傳 reason 供呼叫端送 `points_sync_rejected`（不含金額／device_id）。
 *
 * 限制（誠實聲明）：這仍是純前端的「防手滑／防貼網址」防線。懂開發者工具的人能直接改
 * localStorage，或在 gacha 網域的 console 導頁取得合法 referrer。真正的解法是把積分入帳
 * 搬到伺服器端（簽章或 RPC），這支檔案只負責把「憑空加分」的成本與上限壓下來。
 */

/**
 * 允許發起同步的來源 origin（只比 origin，不比路徑）。
 * 刻意不收 moonmoon-gacha.vercel.app：ACK cookie 的 domain 是 .kiwimu.com，vercel 別名讀不到，
 * Gacha 游標永遠不會前進，同一批積分會被重複入帳（每天最多再領一次）。
 */
export const POINTS_SYNC_ALLOWED_REFERRER_ORIGINS: readonly string[] = ['https://gacha.kiwimu.com'];

/**
 * 單次同步最多入帳量。
 * Gacha 每天只能抽一次，單抽最高 200（月光球，權重 2%）；Gacha 送來的 amount 是「游標之後所有
 * gacha_earn 的總和」，所以偶爾跳過同步的人會一次補送多天。400 = 單抽最高值的 2 倍，
 * 也約等於 21 天平均手氣（平均每抽 18.5）的補送量。超過 400 的部分不會被拒絕，而是入帳 400、
 * 視為同步完成、多的作廢（Penso 2026-10-04 決定：長期沒同步的人損失小，換來游標一定前進）。
 */
export const MAX_PER_SYNC = 400;

/**
 * 滾動 24 小時內累計入帳上限。
 * 日常合法上限是一次抽獎 <= 200；600 = 一次完整補送（<= 400）再加當天一次月光球（200）。
 * 額度用完後再來的同步入帳 0、仍視為完成（寫 ACK），所以不會有「待同步量卡住」的問題。
 */
export const MAX_PER_DAY = 600;

export const POINTS_SYNC_WINDOW_MS = 24 * 60 * 60 * 1000;

/** 最後一次成功處理的 ts（重複防護，沿用舊 key）。 */
export const POINTS_SYNC_LAST_TS_KEY = 'moonmoon_points_last_sync_ts';
/** 滾動 24 小時的入帳流水：[{ at: 入帳時間 ms, amount }]。 */
export const POINTS_SYNC_LEDGER_KEY = 'moonmoon_points_sync_ledger';

const SYNC_TS_PATTERN = /^[0-9]{1,16}$/;
const SYNC_AMOUNT_PATTERN = /^(0|[1-9][0-9]*)$/;

export type PointsSyncRejectReason = 'params_invalid' | 'referrer' | 'amount_invalid';

export interface PointsSyncLedgerEntry {
  at: number;
  amount: number;
}

export type PointsSyncDecision =
  /** amount = 實際入帳量（可能 < 請求量，甚至 0）；capped = 請求量被截斷。 */
  | { status: 'accept'; amount: number; capped: boolean }
  | { status: 'duplicate' }
  | { status: 'reject'; reason: PointsSyncRejectReason };

export type IncomingPointsSyncResult =
  | { credited: number; capped: boolean }
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
 * 判斷順序固定：referrer -> amount 格式 -> 重複 ts -> 截斷後入帳量。
 * 重複 ts 放在截斷前面：合法使用者重複點同一個連結時，只補 ACK、不再入帳。
 * 超過單次或日額度不是拒絕理由（見檔頭），只會讓入帳量被截斷。
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
  const requested = Number(input.amountRaw);
  if (requested < 1) {
    return { status: 'reject', reason: 'amount_invalid' };
  }

  if (input.isDuplicate) {
    return { status: 'duplicate' };
  }

  const remainingToday = Math.max(0, MAX_PER_DAY - sumSyncedWithinWindow(input.ledger, input.now));
  const credit = Math.min(requested, MAX_PER_SYNC, remainingToday);
  return { status: 'accept', amount: credit, capped: credit < requested };
}

/**
 * 從 query 字串拿掉同步參數（action／amount／source／ts／device_id），其餘（from、utm_* …）保留。
 * 用來在處理完之後清 window.__PASSPORT_INITIAL_SEARCH__，避免 App 重新掛載時再處理一次。
 */
export function stripPointsSyncParams(search: string): string {
  const params = new URLSearchParams(search);
  ['action', 'amount', 'source', 'ts', 'device_id'].forEach((param) => params.delete(param));
  const next = params.toString();
  return next ? `?${next}` : '';
}

export interface PointsSyncDeps {
  /** 進站當下的原始 query（index.html 在清網址前存的 window.__PASSPORT_INITIAL_SEARCH__）。 */
  search: string;
  referrer: string;
  now: number;
  storage: Pick<Storage, 'getItem' | 'setItem'>;
  /** 實際入帳（addPassportPoints）。 */
  credit: (amount: number) => void;
  /** 寫跨站 ACK cookie，讓 Gacha 推進同步游標。只有「通過驗證的同步」（含被截斷、含重複 ts）會呼叫。 */
  writeAck: (ts: string) => void;
  /** 清掉網址上的同步參數。成功、重複、拒絕都會呼叫。 */
  cleanUrl: () => void;
  /** 把同步參數從 window.__PASSPORT_INITIAL_SEARCH__ 拿掉（stripPointsSyncParams）。與 cleanUrl 同時機呼叫。 */
  clearInitialSearch: () => void;
}

export function processIncomingPointsSync(deps: PointsSyncDeps): IncomingPointsSyncResult {
  const params = new URLSearchParams(deps.search);
  if (params.get('action') !== 'add_points') return null;

  // 從這裡開始就是「一次同步嘗試」：不論結果，網址與原始 query 都要清掉，避免重放。
  const finish = () => {
    deps.cleanUrl();
    deps.clearInitialSearch();
  };

  const amountRaw = params.get('amount');
  const source = params.get('source');
  const ts = params.get('ts');

  if (!amountRaw || !source || !ts || !SYNC_TS_PATTERN.test(ts)) {
    finish();
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
    finish();
    return { rejected: decision.reason };
  }

  if (decision.status === 'duplicate') {
    deps.writeAck(ts);
    finish();
    return null;
  }

  if (decision.amount > 0) {
    // 先記流水再入帳：儲存空間出問題時寧可少加，也不要讓日上限形同虛設。
    const nextLedger = [...pruneSyncLedger(ledger, deps.now), { at: deps.now, amount: decision.amount }];
    deps.storage.setItem(POINTS_SYNC_LEDGER_KEY, JSON.stringify(nextLedger));
    deps.credit(decision.amount);
  }
  deps.storage.setItem(POINTS_SYNC_LAST_TS_KEY, ts);
  deps.writeAck(ts);
  finish();

  return { credited: decision.amount, capped: decision.capped };
}
