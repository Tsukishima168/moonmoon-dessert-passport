import fs from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');

const read = (relativePath) => fs.readFileSync(path.join(repoRoot, relativePath), 'utf8');
const require = createRequire(import.meta.url);

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function assertEqual(actual, expected, label) {
  if (actual !== expected) {
    throw new Error(`${label}: expected ${expected || '(empty)'}, got ${actual || '(empty)'}`);
  }
}

function hasNonEmptyState(url) {
  return url.searchParams.getAll('state').some((value) => value.trim().length > 0);
}

function scrubSensitiveClaimParams(input) {
  const url = new URL(input, 'https://passport.kiwimu.com');
  const sensitiveParams = ['claim', 'claim_code', 'reward', 'email'];
  const hasOAuthState = hasNonEmptyState(url);
  const hasRewardClaimCode = !hasOAuthState && url.searchParams.has('code') && url.searchParams.has('reward');
  const paramsToScrub = hasRewardClaimCode ? [...sensitiveParams, 'code'] : sensitiveParams;
  paramsToScrub.forEach((param) => url.searchParams.delete(param));
  return url.search;
}

function cleanupOAuthCallbackParams(input) {
  const url = new URL(input, 'https://passport.kiwimu.com');
  const hasCodeStatePair = url.searchParams.has('code') && url.searchParams.has('state');
  const hasOAuthCallbackSignal =
    hasNonEmptyState(url) ||
    hasCodeStatePair ||
    url.searchParams.has('error') ||
    url.searchParams.has('error_description');

  if (!hasOAuthCallbackSignal) {
    return url.search;
  }

  ['code', 'state', 'error', 'error_description'].forEach((param) => url.searchParams.delete(param));
  return url.search;
}

const scrubCases = [
  ['/?code=ABC&state=XYZ', '?code=ABC&state=XYZ'],
  ['/?reward=easter&code=test', ''],
  ['/?reward=easter&code=test&state=XYZ', '?code=test&state=XYZ'],
  ['/?reward=easter&code=test&state=', '?state='],
  ['/?state=%20&reward=x&code=y', '?state=+'],
  ['/?state=&state=REAL&code=AUTH&reward=x', '?state=&state=REAL&code=AUTH'],
  ['/?claim_code=X&code=Y', '?code=Y'],
  ['/?code=ONLY', '?code=ONLY'],
  ['/?%63ode=Y&reward=x&state=s', '?code=Y&state=s'],
  ['/#code=ABC&state=XYZ', ''],
  ['/?email=foo%40bar.com', ''],
  ['/?email=foo%40bar.com&code=ONLY', '?code=ONLY'],
];

const cleanupCases = [
  ['/?code=ABC&state=XYZ', ''],
  ['/?code=ABC&state=', ''],
  ['/?code=ABC&state=%20', ''],
  ['/?code=ONLY', '?code=ONLY'],
  ['/?state=%20', '?state=%20'],
  ['/?reward=easter&code=test&state=', '?reward=easter'],
  ['/?state=&state=REAL&code=AUTH&reward=x', '?reward=x'],
  ['/?error=access_denied&error_description=Denied', ''],
  ['/?code=ABC&state=XYZ&redirect_to=https%3A%2F%2Fshop.kiwimu.com%2F', '?redirect_to=https%3A%2F%2Fshop.kiwimu.com%2F'],
  ['/#code=ABC&state=XYZ', ''],
];

for (const [input, expected] of scrubCases) {
  assertEqual(scrubSensitiveClaimParams(input), expected, `scrub ${input}`);
}

for (const [input, expected] of cleanupCases) {
  assertEqual(cleanupOAuthCallbackParams(input), expected, `cleanup ${input}`);
}

// v1.1 BLOCKER regression: source_site 判定優先序必須是
// redirect_to host -> 目前網址 from/utm_source -> kw_attr cookie 的 from（僅 2 小時內）-> 'passport'。
// 這裡鏡射 analytics.ts 的 resolveSourceSite* 邏輯做真的執行測試，不只是字串比對。
const TARGET_SITE_BY_HOST = {
  'kiwimu.com': 'mbti_lab',
  'kiwimu-mbti.vercel.app': 'mbti_lab',
  'map.kiwimu.com': 'moon_map',
  'moon-map-original.vercel.app': 'moon_map',
  'shop.kiwimu.com': 'dessert_booking',
  'dessert-booking.vercel.app': 'dessert_booking',
  'moon-dessert-booking.vercel.app': 'dessert_booking',
  'gacha.kiwimu.com': 'gacha',
  'moonmoon-gacha.vercel.app': 'gacha',
};
const FROM_PREFIX_TO_SITE = {
  mbti: 'mbti_lab',
  hub: 'mbti_lab',
  map: 'moon_map',
  shop: 'dessert_booking',
  gacha: 'gacha',
  passport: 'passport',
};
const PASSPORT_SELF_HOSTS = new Set(['passport.kiwimu.com', 'moonmoon-dessert-passport.vercel.app']);
const FROM_COOKIE_FRESH_MS = 2 * 60 * 60 * 1000;

function resolveSourceSiteFromParamsModel(params) {
  const fromParam = params.get('from');
  if (fromParam) {
    const normalized = fromParam.toLowerCase();
    if (normalized === 'mbti' || normalized.startsWith('mbti_')) return 'mbti_lab';
    const prefix = normalized.split('_')[0];
    if (FROM_PREFIX_TO_SITE[prefix]) return FROM_PREFIX_TO_SITE[prefix];
    return null;
  }
  const utmSource = params.get('utm_source');
  if (utmSource) {
    const normalized = utmSource.toLowerCase().replace(/-/g, '_');
    if (normalized === 'mbti' || normalized.startsWith('mbti_')) return 'mbti_lab';
    const prefix = normalized.split('_')[0];
    if (FROM_PREFIX_TO_SITE[prefix]) return FROM_PREFIX_TO_SITE[prefix];
  }
  return null;
}

function resolveSourceSiteFromRedirectHostModel(sourceUrl) {
  if (!sourceUrl) return null;
  try {
    const hostname = new URL(sourceUrl).hostname;
    if (PASSPORT_SELF_HOSTS.has(hostname)) return null;
    return TARGET_SITE_BY_HOST[hostname] || 'external';
  } catch {
    return null;
  }
}

function resolveSourceSiteFromFreshKwAttrFromModel(attr, now) {
  if (!attr.from || !attr.from_ts) return null;
  if (now - attr.from_ts > FROM_COOKIE_FRESH_MS) return null;
  return resolveSourceSiteFromParamsModel(new URLSearchParams({ from: attr.from }));
}

function resolveSourceSiteModel({ sourceUrl, initialSearch, kwAttr, now }) {
  const initialParams = new URLSearchParams(initialSearch || '');
  return (
    resolveSourceSiteFromRedirectHostModel(sourceUrl) ||
    resolveSourceSiteFromParamsModel(initialParams) ||
    resolveSourceSiteFromFreshKwAttrFromModel(kwAttr || {}, now) ||
    'passport'
  );
}

const NOW = Date.now();
const sourceSiteCases = [
  {
    label: 'BLOCKER 案例：redirect_to 指回 kiwimu.com 必須贏過幾天前的陳舊 cookie from',
    input: {
      sourceUrl: 'https://kiwimu.com/?redirect_to_marker=1',
      initialSearch: '',
      kwAttr: { from: 'passport_member_hub', from_ts: NOW - 3 * 24 * 60 * 60 * 1000 },
      now: NOW,
    },
    expected: 'mbti_lab',
  },
  {
    label: '沒有 redirect_to，這次網址帶 from=mbti_claim 直接採用',
    input: { sourceUrl: undefined, initialSearch: '?from=mbti_claim', kwAttr: {}, now: NOW },
    expected: 'mbti_lab',
  },
  {
    label: '沒有 redirect_to、沒有網址參數，2 小時內的 cookie from 才採信',
    input: {
      sourceUrl: undefined,
      initialSearch: '',
      kwAttr: { from: 'mbti_result', from_ts: NOW - 30 * 60 * 1000 },
      now: NOW,
    },
    expected: 'mbti_lab',
  },
  {
    label: '超過 2 小時的 cookie from 不採信，落回預設 passport',
    input: {
      sourceUrl: undefined,
      initialSearch: '',
      kwAttr: { from: 'mbti_result', from_ts: NOW - 3 * 60 * 60 * 1000 },
      now: NOW,
    },
    expected: 'passport',
  },
  {
    label: 'redirect_to 指回 passport 自己（非跨站訊號）要略過，改看網址 from',
    input: {
      sourceUrl: 'https://passport.kiwimu.com/?foo=1',
      initialSearch: '?from=gacha_store',
      kwAttr: {},
      now: NOW,
    },
    expected: 'gacha',
  },
  {
    label: '都沒有任何訊號時預設 passport',
    input: { sourceUrl: undefined, initialSearch: '', kwAttr: {}, now: NOW },
    expected: 'passport',
  },
];

for (const { label, input, expected } of sourceSiteCases) {
  assertEqual(resolveSourceSiteModel(input), expected, label);
}

const analyticsTs = read('analytics.ts');
assert(analyticsTs.includes('function resolveSourceSiteFromRedirectHost('), 'analytics.ts must resolve source_site from redirect_to host');
assert(analyticsTs.includes('function resolveSourceSiteFromFreshKwAttrFrom('), 'analytics.ts must gate cookie from by freshness');
assert(analyticsTs.includes('FROM_COOKIE_FRESH_MS = 2 * 60 * 60 * 1000'), 'analytics.ts cookie from freshness window changed from 2 hours');
assert(
  analyticsTs.includes(
    'resolveSourceSiteFromRedirectHost(sourceUrl) ||\n    resolveSourceSiteFromParams(initialParams) ||\n    resolveSourceSiteFromFreshKwAttrFrom();',
  ),
  'trackAuthConversion source_site priority order changed (must be redirect_to host -> URL from/utm -> fresh cookie from -> passport)',
);

const stateGuard = "searchParams.getAll('state').some((value) => value.trim().length > 0)";
const indexHtml = read('index.html');
const appTsx = read('App.tsx');
const oauthSafety = read('src/lib/oauthSafety.ts');
const authContext = read('src/contexts/SupabaseAuthContext.tsx');
const ssoBroker = read('src/lib/ssoBroker.ts');
const rewardShop = read('components/RewardShop.tsx');
const rewardsApi = read('src/api/rewards.ts');
const rewardLedgerMigration = read('supabase/migrations/20260621111241_reward_redemption_ledger.sql');

assert(indexHtml.includes("const sensitiveParams = ['claim', 'claim_code', 'reward', 'email'];"), 'index.html sensitiveParams changed');
assert(indexHtml.includes(stateGuard), 'index.html state guard must use getAll + trim');
assert(appTsx.includes(stateGuard), 'App.tsx state guard must mirror index.html');
assert(oauthSafety.includes("url.searchParams.has('code') && url.searchParams.has('state')"), 'oauthSafety must clean code+state residue');
assert(ssoBroker.includes("return params.get('presentation') || params.get('sso_presentation') || params.get('mode');"), 'SSO broker must accept presentation/sso_presentation/mode params');
assert(ssoBroker.includes('return mode === SSO_BROKER_MODE_POPUP;'), 'SSO broker must only take over presentation=popup, not redirect fallback (mode=sso alone)');
assert(ssoBroker.includes("params.delete('presentation');"), 'SSO broker must scrub presentation param');
assert(ssoBroker.includes("params.delete('mode');"), 'SSO broker must scrub mode param');
assert(ssoBroker.includes('targetOrigin = new URL(redirectTo).origin;'), 'SSO broker must derive postMessage targetOrigin from redirectTo');
assert(ssoBroker.includes('window.opener.postMessage(payload, targetOrigin);'), 'SSO broker must post completion only to redirectTo origin');
assert(ssoBroker.includes('clearSsoBrokerMode();'), 'SSO broker must clear popup mode after completion');
assert(ssoBroker.includes('window.location.replace(redirectTo);'), 'SSO broker close fallback must return to redirectTo');
assert(appTsx.includes('const isInitialSsoBrokerEntry = () => isSsoBrokerMode(getInitialUrlParams());'), 'App must detect SSO broker entry from initial URL');
assert(appTsx.includes('{isBrokerEntry ? (') && appTsx.includes('<SsoBrokerScreen />'), 'App must render SSO broker screen only for broker entries');
assert(authContext.includes('saveSsoBrokerMode(incomingSsoMode);'), 'Auth context must persist popup broker mode before OAuth');
assert(authContext.includes('removeSsoBrokerParams(params);'), 'Auth context must remove broker-only params from visible URL');
assert(authContext.includes("notifySsoBrokerComplete(getPendingRedirectTo(), 'error', authFlowCustomerMessage)"), 'Auth context must notify popup opener on OAuth errors with the customer-facing message');
assert(!/notifySsoBrokerComplete\([^)]*\bauthFlowError\b/.test(authContext), 'Auth context must never pass the raw OAuth authFlowError into notifySsoBrokerComplete (cross-site leak)');
assert(
  authContext.indexOf("console.error('[SupabaseAuth] OAuth callback failed:', authFlowError)") !== -1 &&
    authContext.indexOf("console.error('[SupabaseAuth] OAuth callback failed:', authFlowError)") <
      authContext.indexOf("notifySsoBrokerComplete(getPendingRedirectTo(), 'error', authFlowCustomerMessage)"),
  'Auth context must log the raw OAuth error locally before the popup broker branch returns',
);
assert(authContext.includes('if (notifySsoBrokerComplete(pendingRedirect))'), 'Auth context must notify popup opener before pending redirect navigation');
assert(authContext.includes('if (notifySsoBrokerComplete(redirectTo))'), 'Auth context must notify popup opener before stored redirect navigation');
assert(rewardLedgerMigration.includes('CREATE TABLE IF NOT EXISTS public.reward_redemptions'), 'Reward ledger table must exist');
assert(rewardLedgerMigration.includes('ALTER TABLE public.reward_redemptions ENABLE ROW LEVEL SECURITY;'), 'Reward ledger must enable RLS');
assert(rewardLedgerMigration.includes('CREATE POLICY reward_redemptions_select_own'), 'Reward ledger must restrict direct reads to owner');
assert(rewardLedgerMigration.includes('REVOKE ALL ON TABLE public.reward_redemptions FROM anon, authenticated;'), 'Reward ledger must revoke direct client writes');
assert(rewardLedgerMigration.includes('CREATE OR REPLACE FUNCTION public.redeem_reward_item'), 'Reward redeem RPC must exist');
assert(rewardLedgerMigration.includes('GRANT EXECUTE ON FUNCTION public.redeem_reward_item(TEXT, INTEGER) TO authenticated;'), 'Reward redeem RPC must be authenticated only');
assert(rewardLedgerMigration.includes('CREATE OR REPLACE FUNCTION public.fulfill_reward_redemption_staff'), 'Staff reward fulfillment RPC must exist');
assert(rewardsApi.includes("supabase.rpc('redeem_reward_item'"), 'Rewards API must redeem via RPC');
assert(rewardShop.includes('redeemRewardItem({'), 'RewardShop must call the server redemption RPC');
assert(!rewardShop.includes('redeemItem(pendingReward.id)'), 'RewardShop must not deduct points locally before server redemption');

// ─────────────────────────────────────────────────────────────────────────────
// 安全回歸：debug=1 後門 / add_points 憑空加分 / 同步參數洩漏進 GA4
// ─────────────────────────────────────────────────────────────────────────────

// 把真正的 src/lib/pointsSyncGuard.ts 轉譯後實跑（Node 20 CI 也能跑，不依賴原生 TS 支援；
// 該檔刻意零 import，所以可以直接當 data: module 載入）。
async function loadTsModule(relativePath, instanceSalt = '') {
  const ts = require('typescript');
  const { outputText } = ts.transpileModule(read(relativePath), {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
  });
  // instanceSalt 讓同一支檔案能載入成互不共用模組狀態的獨立實例（deliveryGate 有模組層級的 pending 集合）。
  return import(`data:text/javascript;base64,${Buffer.from(`${outputText}\n// ${instanceSalt}`).toString('base64')}`);
}

const guard = await loadTsModule('src/lib/pointsSyncGuard.ts');
const { MAX_PER_SYNC, MAX_PER_DAY, POINTS_SYNC_WINDOW_MS, POINTS_SYNC_LEDGER_KEY, POINTS_SYNC_LAST_TS_KEY } = guard;

assert(Number.isInteger(MAX_PER_SYNC) && MAX_PER_SYNC > 0, 'MAX_PER_SYNC must be a positive integer');
assert(Number.isInteger(MAX_PER_DAY) && MAX_PER_DAY >= MAX_PER_SYNC, 'MAX_PER_DAY must be >= MAX_PER_SYNC');
// Gacha 單抽最高 200（月光球）。上限若被誤調到單抽最高值以下，合法同步會被擋；若放太高則失去意義。
assert(MAX_PER_SYNC >= 200 && MAX_PER_SYNC <= 1000, 'MAX_PER_SYNC outside the sane band for Gacha (single draw max is 200)');
assert(MAX_PER_DAY <= 2000, 'MAX_PER_DAY too high to be a meaningful abuse cap');

const GACHA_REFERRER = 'https://gacha.kiwimu.com/';
// vercel 別名讀不到 .kiwimu.com 的 ACK cookie（Gacha 游標不會前進、會被無限重複入帳），所以不在允許清單內。
const GACHA_ALIAS_REFERRER = 'https://moonmoon-gacha.vercel.app/some/path?x=1';
const T0 = Date.UTC(2026, 9, 4, 12, 0, 0);

function makeSyncHarness() {
  const store = new Map();
  const harness = {
    credited: [],
    acks: [],
    cleaned: 0,
    searchCleared: 0,
    storage: {
      getItem: (key) => (store.has(key) ? store.get(key) : null),
      setItem: (key, value) => void store.set(key, String(value)),
    },
    run({ query, referrer = GACHA_REFERRER, now = T0 }) {
      return guard.processIncomingPointsSync({
        search: query,
        referrer,
        now,
        storage: harness.storage,
        credit: (amount) => harness.credited.push(amount),
        writeAck: (ts) => harness.acks.push(ts),
        cleanUrl: () => {
          harness.cleaned += 1;
        },
        clearInitialSearch: () => {
          harness.searchCleared += 1;
        },
      });
    },
  };
  return harness;
}

const syncQuery = ({ amount = '50', ts = '1790000000000', source = 'gacha', action = 'add_points' } = {}) =>
  `?action=${action}&amount=${amount}&source=${source}&device_id=11111111-2222-3333-4444-555555555555&ts=${ts}&from=gacha_store`;

// 1) 合法的 Gacha 同步要能入帳（正式站與 vercel 別名都算），並寫 ACK、清網址、記流水
for (const referrer of [GACHA_REFERRER, 'https://gacha.kiwimu.com', 'https://gacha.kiwimu.com/some/path?x=1']) {
  const h = makeSyncHarness();
  const result = h.run({ query: syncQuery(), referrer });
  assertEqual(JSON.stringify(result), '{"credited":50,"capped":false}', `valid gacha sync from ${referrer} must credit 50`);
  assertEqual(JSON.stringify(h.credited), '[50]', `credit calls for ${referrer}`);
  assertEqual(JSON.stringify(h.acks), '["1790000000000"]', `ACK for accepted sync ${referrer}`);
  assertEqual(String(h.cleaned), '1', `URL cleaned for accepted sync ${referrer}`);
  assertEqual(String(h.searchCleared), '1', `initial search cleared for accepted sync ${referrer}`);
  assertEqual(h.storage.getItem(POINTS_SYNC_LAST_TS_KEY), '1790000000000', 'accepted sync must remember ts');
  assertEqual(String(guard.parseSyncLedger(h.storage.getItem(POINTS_SYNC_LEDGER_KEY)).length), '1', 'accepted sync must add a ledger entry');
}

// 2) 沒有 referrer／外站 referrer／長得像但不是 gacha 的 referrer 一律拒絕，且不入帳、不寫 ACK
const badReferrers = [
  '',
  GACHA_ALIAS_REFERRER,
  'https://evil.example/',
  'https://gacha.kiwimu.com.evil.example/',
  'https://evil.example/?next=https://gacha.kiwimu.com/',
  'https://gacha.kiwimu.com@evil.example/',
  'http://gacha.kiwimu.com/',
  'https://gacha.kiwimu.com:8443/',
  'https://shop.kiwimu.com/',
  'https://passport.kiwimu.com/',
  'https://kiwimu.com/',
  'not a url',
];
for (const referrer of badReferrers) {
  const h = makeSyncHarness();
  const result = h.run({ query: syncQuery(), referrer });
  assertEqual(JSON.stringify(result), '{"rejected":"referrer"}', `referrer ${JSON.stringify(referrer)} must be rejected`);
  assertEqual(JSON.stringify(h.credited), '[]', `no credit for referrer ${JSON.stringify(referrer)}`);
  assertEqual(JSON.stringify(h.acks), '[]', `no ACK for rejected referrer ${JSON.stringify(referrer)}`);
  assertEqual(String(h.cleaned), '1', `URL still cleaned for rejected referrer ${JSON.stringify(referrer)}`);
  assertEqual(String(h.searchCleared), '1', `initial search still cleared for rejected referrer ${JSON.stringify(referrer)}`);
  assertEqual(String(h.storage.getItem(POINTS_SYNC_LAST_TS_KEY)), 'null', 'rejected sync must not record ts');
  assertEqual(String(h.storage.getItem(POINTS_SYNC_LEDGER_KEY)), 'null', 'rejected sync must not touch the ledger');
}

// 3) 金額：嚴格整數 1..MAX_PER_SYNC
for (const amount of ['0', '-5', '1.5', '1e3', '+5', '12abc', '%205', '05', 'NaN', 'Infinity', '0x10']) {
  const h = makeSyncHarness();
  const result = h.run({ query: syncQuery({ amount }) });
  assertEqual(JSON.stringify(result), '{"rejected":"amount_invalid"}', `amount ${amount} must be invalid`);
  assertEqual(JSON.stringify(h.credited), '[]', `no credit for amount ${amount}`);
}
// 超過單次上限不是拒絕：入帳 MAX_PER_SYNC、視為同步完成（寫 ACK，多的作廢）、事件標 capped
for (const amount of [String(MAX_PER_SYNC + 1), '99999999', '9'.repeat(400)]) {
  const h = makeSyncHarness();
  const result = h.run({ query: syncQuery({ amount }) });
  assertEqual(JSON.stringify(result), `{"credited":${MAX_PER_SYNC},"capped":true}`, `amount ${amount.slice(0, 12)} must be truncated to the per-sync cap`);
  assertEqual(JSON.stringify(h.credited), `[${MAX_PER_SYNC}]`, 'over-cap sync must credit exactly the cap');
  assertEqual(JSON.stringify(h.acks), '["1790000000000"]', 'over-cap sync must still write the ACK (excess is forfeited)');
  assertEqual(h.storage.getItem(POINTS_SYNC_LAST_TS_KEY), '1790000000000', 'over-cap sync must record ts');
}
for (const amount of ['1', String(MAX_PER_SYNC)]) {
  const h = makeSyncHarness();
  const result = h.run({ query: syncQuery({ amount }) });
  assertEqual(JSON.stringify(result), `{"credited":${amount},"capped":false}`, `boundary amount ${amount} must be accepted untruncated`);
}

// 4) 缺參數／ts 格式不對 = params_invalid；不是 add_points = 完全不碰（null 且不清網址）
for (const query of [
  '?action=add_points&source=gacha&ts=1790000000000',
  '?action=add_points&amount=50&ts=1790000000000',
  '?action=add_points&amount=50&source=gacha',
  '?action=add_points&amount=50&source=gacha&ts=abc',
  '?action=add_points&amount=50&source=gacha&ts=-1',
  '?action=add_points&amount=50&source=gacha&ts=12345678901234567',
]) {
  const h = makeSyncHarness();
  assertEqual(JSON.stringify(h.run({ query })), '{"rejected":"params_invalid"}', `params must be invalid: ${query}`);
  assertEqual(JSON.stringify(h.credited), '[]', `no credit for ${query}`);
}
{
  const h = makeSyncHarness();
  assertEqual(String(h.run({ query: '?action=something_else&amount=50&source=gacha&ts=1' })), 'null', 'non add_points action must be ignored');
  assertEqual(String(h.run({ query: '' })), 'null', 'empty query must be ignored');
  assertEqual(String(h.cleaned), '0', 'ignored queries must not touch the URL');
}

// 5) 滾動 24 小時總量：入帳量截斷到剩餘額度（額度用完入帳 0 但仍寫 ACK），視窗過去後恢復
{
  const h = makeSyncHarness();
  let ts = 1790000000000;
  const attempt = (amount, now) => h.run({ query: syncQuery({ amount: String(amount), ts: String(ts++) }), now });
  let total = 0;
  while (total + MAX_PER_SYNC <= MAX_PER_DAY) {
    assertEqual(JSON.stringify(attempt(MAX_PER_SYNC, T0)), `{"credited":${MAX_PER_SYNC},"capped":false}`, 'sync within day cap must be accepted');
    total += MAX_PER_SYNC;
  }
  const remaining = MAX_PER_DAY - total;
  if (remaining > 0) {
    assertEqual(JSON.stringify(attempt(remaining + 1, T0)), `{"credited":${remaining},"capped":true}`, 'sync that overflows the day cap must credit only the remaining allowance');
    total += remaining;
    assertEqual(String(h.acks.length), String(ts - 1790000000000), 'every truncated sync must still write an ACK');
  }
  assertEqual(String(total), String(MAX_PER_DAY), 'accepted total must equal MAX_PER_DAY');
  const creditsBeforeExhausted = h.credited.length;
  const ackBeforeExhausted = h.acks.length;
  assertEqual(JSON.stringify(attempt(50, T0)), '{"credited":0,"capped":true}', 'once the allowance is exhausted a sync credits 0 but completes');
  assertEqual(String(h.credited.length), String(creditsBeforeExhausted), 'exhausted allowance must not call credit');
  assertEqual(String(h.acks.length), String(ackBeforeExhausted + 1), 'exhausted allowance must still write the ACK so Gacha moves its cursor');
  assertEqual(JSON.stringify(attempt(50, T0 + POINTS_SYNC_WINDOW_MS - 1)), '{"credited":0,"capped":true}', 'still exhausted 1ms before the window closes');
  assertEqual(JSON.stringify(attempt(50, T0 + POINTS_SYNC_WINDOW_MS)), '{"credited":50,"capped":false}', 'allowance must come back once the 24h window has passed');
  assertEqual(String(h.credited.reduce((a, b) => a + b, 0)), String(total + 50), 'total credited must match what was actually credited');
}

// 6) 重複 ts：沿用舊行為（補 ACK、清網址、回 null、不重複入帳）；但外站 referrer 的重複請求不能拿到 ACK
{
  const h = makeSyncHarness();
  assertEqual(JSON.stringify(h.run({ query: syncQuery() })), '{"credited":50,"capped":false}', 'first sync credits');
  assertEqual(String(h.run({ query: syncQuery() })), 'null', 'duplicate ts must return null');
  assertEqual(JSON.stringify(h.credited), '[50]', 'duplicate ts must not credit twice');
  assertEqual(JSON.stringify(h.acks), '["1790000000000","1790000000000"]', 'duplicate ts must re-write the ACK');
  assertEqual(
    JSON.stringify(h.run({ query: syncQuery(), referrer: 'https://evil.example/' })),
    '{"rejected":"referrer"}',
    'duplicate ts from a foreign referrer must still be rejected',
  );
  assertEqual(String(h.acks.length), '2', 'foreign duplicate must not write an ACK');
}

// 7) 被拒絕不會「毒化」之後的合法同步；壞掉的流水資料視為空
{
  const h = makeSyncHarness();
  h.run({ query: syncQuery(), referrer: '' });
  assertEqual(JSON.stringify(h.run({ query: syncQuery() })), '{"credited":50,"capped":false}', 'valid sync after a rejected one must still credit');

  const corrupt = makeSyncHarness();
  corrupt.storage.setItem(POINTS_SYNC_LEDGER_KEY, '{not json');
  assertEqual(JSON.stringify(corrupt.run({ query: syncQuery() })), '{"credited":50,"capped":false}', 'corrupt ledger must be treated as empty');
  corrupt.storage.setItem(POINTS_SYNC_LEDGER_KEY, JSON.stringify([{ at: 'x', amount: 'y' }, null, 5, { at: T0, amount: -100 }]));
  assertEqual(JSON.stringify(corrupt.run({ query: syncQuery({ ts: '1790000000001' }) })), '{"credited":50,"capped":false}', 'malformed ledger entries must be ignored, not trusted');
}

// 8) 真的執行 index.html 的早期 scrubber：同步參數不得留在網址（GA4 page_location 來源），
//    但原始 query 要保留在 window.__PASSPORT_INITIAL_SEARCH__ 給 App 讀；OAuth／claim 邏輯不能被誤傷
function runEarlyScrubber(href) {
  const code = [...indexHtml.matchAll(/<script>\s*([\s\S]*?)<\/script>/g)]
    .map((match) => match[1])
    .find((body) => body.includes('__PASSPORT_INITIAL_SEARCH__'));
  assert(code, 'index.html early scrubber script not found');

  const location = new URL(href);
  const replaced = [];
  const meta = { setAttribute() {} };
  const windowStub = {
    location,
    history: { replaceState: (_state, _title, next) => replaced.push(next) },
  };
  const documentStub = {
    head: { appendChild() {} },
    querySelector: () => meta,
    createElement: () => meta,
  };
  vm.runInNewContext(code, { window: windowStub, document: documentStub, URL });
  return {
    initialSearch: windowStub.__PASSPORT_INITIAL_SEARCH__,
    replaced,
    finalSearch: replaced.length ? new URL(replaced[replaced.length - 1], href).search : location.search,
  };
}

{
  const original = syncQuery();
  const scrubbed = runEarlyScrubber(`https://passport.kiwimu.com/${original}`);
  assertEqual(scrubbed.initialSearch, original, 'scrubber must preserve the original query in __PASSPORT_INITIAL_SEARCH__');
  for (const param of ['action', 'amount', 'source', 'ts', 'device_id']) {
    assert(!new URLSearchParams(scrubbed.finalSearch).has(param), `scrubber must remove ${param} before GA4 reads the URL`);
  }
  assertEqual(scrubbed.finalSearch, '', 'sync-only URL must end up with an empty query');

  const mixed = runEarlyScrubber('https://passport.kiwimu.com/?tab=rewards&action=add_points&amount=7&ts=9&device_id=abc&source=gacha');
  assertEqual(mixed.finalSearch, '?tab=rewards', 'scrubber must keep unrelated params');

  assertEqual(runEarlyScrubber('https://passport.kiwimu.com/?amount=5').finalSearch, '', 'bare amount must be scrubbed');
  assertEqual(runEarlyScrubber('https://passport.kiwimu.com/?ts=5&device_id=abc').finalSearch, '', 'bare ts/device_id must be scrubbed');
  assertEqual(runEarlyScrubber('https://passport.kiwimu.com/?action=other').replaced.length, 0, 'non add_points action must be left alone');

  // 既有 OAuth／claim 行為不變
  assertEqual(runEarlyScrubber('https://passport.kiwimu.com/?code=ABC&state=XYZ').replaced.length, 0, 'OAuth code+state must not be scrubbed');
  assertEqual(runEarlyScrubber('https://passport.kiwimu.com/?reward=easter&code=test').finalSearch, '', 'reward claim code must still be scrubbed');
  assertEqual(runEarlyScrubber('https://passport.kiwimu.com/?claim=abc').finalSearch, '', 'claim must still be scrubbed');
  assertEqual(runEarlyScrubber('https://passport.kiwimu.com/?email=a%40b.com').finalSearch, '', 'email must still be scrubbed');
}

// 8b) 處理完要把同步參數從 __PASSPORT_INITIAL_SEARCH__ 拿掉（避免 remount 重放），但保留 from／utm 歸因
assertEqual(
  guard.stripPointsSyncParams('?action=add_points&amount=5&source=gacha&ts=1&device_id=x&from=gacha_store&utm_source=a'),
  '?from=gacha_store&utm_source=a',
  'stripPointsSyncParams must keep attribution params',
);
assertEqual(guard.stripPointsSyncParams(syncQuery()), '?from=gacha_store', 'stripPointsSyncParams must drop every sync param');
assertEqual(guard.stripPointsSyncParams('?action=add_points&amount=5&source=gacha&ts=1&device_id=x'), '', 'stripPointsSyncParams of a sync-only query is empty');
assertEqual(guard.stripPointsSyncParams(''), '', 'stripPointsSyncParams of an empty query is empty');

// 8c) GA4 sign_up／login 送達閘門：關 popup／導頁前要等事件送完，最久 maxWait，不會卡住使用者
{
  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  const runGate = async (gate, { maxWaitMs, before }) => {
    const startedAt = Date.now();
    const runs = [];
    before?.();
    gate.runAfterPendingDelivery(() => runs.push(Date.now() - startedAt), maxWaitMs);
    return { runs, startedAt, sleep };
  };

  assertEqual(String((await loadTsModule('src/lib/deliveryGate.ts', 'const')).DELIVERY_MAX_WAIT_MS), '1500', 'delivery gate max wait must stay 1500ms');

  // (a) 沒有 pending：不延遲（只讓出一個 tick），且是非同步執行
  {
    const gate = await loadTsModule('src/lib/deliveryGate.ts', 'a');
    const { runs } = await runGate(gate, { maxWaitMs: 500 });
    assertEqual(String(runs.length), '0', 'gate must not run synchronously');
    await sleep(60);
    assertEqual(String(runs.length), '1', 'gate with nothing pending must run right away');
    assert(runs[0] < 50, `gate with nothing pending ran too late (${runs[0]}ms)`);
  }

  // (b) pending 在 maxWait 之前完成：等到完成才執行，且只執行一次
  {
    const gate = await loadTsModule('src/lib/deliveryGate.ts', 'b');
    const { runs } = await runGate(gate, { maxWaitMs: 800, before: () => gate.registerPendingDelivery(sleep(150)) });
    await sleep(60);
    assertEqual(String(runs.length), '0', 'gate must wait while a delivery is in flight');
    await sleep(250);
    assertEqual(String(runs.length), '1', 'gate must run exactly once after the delivery completes');
    assert(runs[0] >= 140 && runs[0] < 600, `gate should run when the delivery completes, not at the timeout (${runs[0]}ms)`);
  }

  // (c) pending 永遠不完成：到 maxWait 照樣執行
  {
    const gate = await loadTsModule('src/lib/deliveryGate.ts', 'c');
    const { runs } = await runGate(gate, { maxWaitMs: 200, before: () => gate.registerPendingDelivery(new Promise(() => {})) });
    await sleep(120);
    assertEqual(String(runs.length), '0', 'gate must still be waiting before the timeout');
    await sleep(250);
    assertEqual(String(runs.length), '1', 'gate must give up and run at the timeout');
    assert(runs[0] >= 190 && runs[0] < 600, `gate should run at the timeout (${runs[0]}ms)`);
  }

  // (d) 模擬 supabase-js 的順序：導頁決策先排隊，SIGNED_IN（註冊 pending）在 setTimeout(0) 才發生，
  //     閘門仍要等到那筆 pending 完成
  {
    const gate = await loadTsModule('src/lib/deliveryGate.ts', 'd');
    const { runs } = await runGate(gate, {
      maxWaitMs: 800,
      before: () => setTimeout(() => gate.registerPendingDelivery(sleep(150)), 0),
    });
    await sleep(80);
    assertEqual(String(runs.length), '0', 'a delivery registered one tick later must still hold the redirect');
    await sleep(250);
    assertEqual(String(runs.length), '1', 'redirect must run once after the late-registered delivery completes');
  }

  // (e) pending 失敗（reject）也算完成，不能卡住也不能產生 unhandled rejection
  {
    const gate = await loadTsModule('src/lib/deliveryGate.ts', 'e');
    let unhandled = 0;
    const onUnhandled = () => {
      unhandled += 1;
    };
    process.on('unhandledRejection', onUnhandled);
    const { runs } = await runGate(gate, {
      maxWaitMs: 800,
      before: () => gate.registerPendingDelivery(sleep(30).then(() => Promise.reject(new Error('boom')))),
    });
    await sleep(200);
    process.off('unhandledRejection', onUnhandled);
    assertEqual(String(runs.length), '1', 'a failed delivery must release the gate');
    assertEqual(String(unhandled), '0', 'a failed delivery must not leak an unhandled rejection');
  }
}

// 9) 原始碼層面的鎖：debug 只在 DEV、同步讀原始 query、拒絕事件不帶金額
assert(
  appTsx.includes("const isDebugAllStamps = import.meta.env.DEV && params.get('debug') === '1';"),
  'App.tsx debug=1 all-stamps branch must be gated by import.meta.env.DEV',
);
assert(!appTsx.includes('debugParam'), 'App.tsx must not read the debug param outside the DEV gate');
assert(
  appTsx.includes("trackEventWhenReady('points_sync_rejected', { reason: result.rejected });"),
  'App.tsx must report rejected syncs with reason only (no amount/device_id)',
);
const passportUtilsTs = read('passportUtils.ts');
assert(passportUtilsTs.includes('__PASSPORT_INITIAL_SEARCH__'), 'handleIncomingPointsSync must read the pre-scrub query');
assert(passportUtilsTs.includes('processIncomingPointsSync({'), 'handleIncomingPointsSync must delegate to the guard');
assert(passportUtilsTs.includes('`max-age=${30 * 24 * 60 * 60}`'), 'ACK cookie must live 30 days (Gacha deletes it when read)');
assert(passportUtilsTs.includes('clearInitialSearch: () => {') && passportUtilsTs.includes('stripPointsSyncParams(getInitialUrlSearch())'), 'handled syncs must be removed from __PASSPORT_INITIAL_SEARCH__');
assert(
  appTsx.includes("'points_sync_received',") && !appTsx.includes("trackEvent('points_sync_received'"),
  'points_sync_received must go through trackEventWhenReady',
);
assert(!appTsx.includes("dispatchEvent(new CustomEvent('kiwimu:points_earned'"), 'App must not re-dispatch kiwimu:points_earned after a sync (PassportScreen would credit it a second time)');
assert(!passportUtilsTs.includes("params.get('amount')"), 'passportUtils must not parse the amount outside the guard');
// sign_up／login 必須「真的送到」才能離開頁面
const analyticsSource = read('analytics.ts');
const authReliable = analyticsSource.slice(analyticsSource.indexOf('export const trackAuthConversion'));
assert(authReliable.includes("trackEventReliably(isNewUser ? 'sign_up' : 'login', {"), 'trackAuthConversion must send sign_up/login through the reliable path');
assert(authReliable.includes('registerPendingDelivery(delivery);'), 'trackAuthConversion must register its delivery with the gate');
assert(analyticsSource.includes("transport_type: 'beacon',") && analyticsSource.includes('event_callback: finish,'), 'reliable events must use beacon transport and event_callback');
assert(analyticsSource.includes('DELIVERY_MAX_WAIT_MS') && analyticsSource.includes('const cap = window.setTimeout(finish, maxWaitMs);'), 'reliable events must cap their wait');
assert(
  ssoBroker.indexOf('runAfterPendingDelivery(() => {') > 0 &&
    ssoBroker.indexOf('runAfterPendingDelivery(() => {') < ssoBroker.indexOf('window.close();'),
  'SSO popup close must wait for the pending GA4 delivery',
);
assert(
  ssoBroker.indexOf('runAfterPendingDelivery(() => {') < ssoBroker.indexOf('window.opener.postMessage(payload, targetOrigin);'),
  'SSO opener notification must wait too: the opener may close the popup immediately',
);
assert(!read('vite.config.ts').includes('GEMINI_API_KEY'), 'Passport must not inject server Gemini credentials into its client bundle');
assert(
  (authContext.match(/runAfterPendingDelivery\(\(\) => \{/g) || []).length === 2 &&
    authContext.includes('window.location.href = pendingRedirect;') &&
    authContext.includes('window.location.href = redirectTo;'),
  'both post-login redirects must wait for the pending GA4 delivery',
);
assert(
  authContext.indexOf('trackAuthConversion(isNewUser, getPendingRedirectTo() ?? undefined);') <
    authContext.indexOf('handleSignedInUser(currentUser);\n\n      if (currentUser) {'),
  'auth conversion must still be tracked before the SIGNED_IN handler may redirect',
);
assert(
  indexHtml.includes("const pointsSyncParams = ['amount', 'device_id', 'ts'];") &&
    indexHtml.includes("pointsSyncParams.push('action')") &&
    indexHtml.includes('pointsSyncParams.forEach((param) => url.searchParams.delete(param));'),
  'index.html must scrub points sync params',
);
assert(indexHtml.includes("'source',"), 'index.html trackingParams must keep scrubbing source');

// 實跑 SSO broker：來源站收到 postMessage 會立即關窗，事件仍須先送達。
{
  const ts = require('typescript');
  const compile = (source) => ts.transpileModule(source, {compilerOptions: {module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022}}).outputText;
  const dataUrl = (source) => `data:text/javascript;base64,${Buffer.from(source).toString('base64')}`;
  const gateUrl = dataUrl(compile(read('src/lib/deliveryGate.ts')) + '\n// broker-order');
  const gate = await import(gateUrl);
  const broker = await import(dataUrl(compile(ssoBroker).replace("'./deliveryGate'", JSON.stringify(gateUrl))));
  const originalWindow = globalThis.window;
  const originalStorage = globalThis.sessionStorage;
  const events = [];
  let release;
  let closeDone;
  const closed = new Promise((resolve) => { closeDone = resolve; });
  try {
    globalThis.sessionStorage = {getItem: () => 'popup', removeItem: () => events.push('mode-cleared')};
    globalThis.window = {
      opener: {closed: false, postMessage: (_payload, origin) => {events.push(`notify:${origin}`);}},
      setTimeout, close: () => {events.push('close'); closeDone();},
      location: {replace: () => events.push('redirect')},
    };
    gate.registerPendingDelivery(new Promise((resolve) => {release = () => {events.push('delivered'); resolve();};}));
    assert(broker.notifySsoBrokerComplete('https://kiwimu.com/read/ESTJ-A'), 'broker must accept a valid popup');
    await new Promise((resolve) => setTimeout(resolve, 20));
    assert(events.length === 0, 'opener must not be notified while auth delivery is pending');
    release();
    await closed;
    assert(events.indexOf('delivered') < events.indexOf('notify:https://kiwimu.com'), 'delivery must precede opener notification');
    assert(events.filter((event) => event.startsWith('notify:')).length === 1, 'SSO must notify once');
    assert(events.indexOf('notify:https://kiwimu.com') < events.indexOf('close'), 'SSO must notify before self close');
  } finally {
    globalThis.window = originalWindow;
    globalThis.sessionStorage = originalStorage;
  }
}

// adjust_points 鎖定 migration（草稿，尚未套用；套用由 coordinator 決定）：關鍵條款不得被改掉
const adjustPointsMigration = read('supabase/migrations/20261004150000_adjust_points_lockdown.sql');
for (const [needle, label] of [
  ['create or replace function public.adjust_points(p_amount integer, p_reason text)', 'same signature'],
  ['set search_path = public', 'pinned search_path'],
  ["p_reason !~ '^daily_checkin_day_[0-9]+$'", 'reason allowlist'],
  ['p_amount < 1 or p_amount > c_max_daily_award', 'amount bounds'],
  ['c_max_daily_award constant integer := 5;', 'max award matches STREAK_BONUS_TABLE (Day 7 = 5)'],
  ["'Asia/Taipei'", 'Taipei calendar day'],
  ['for update', 'per-user serialization'],
  ['revoke execute on function public.adjust_points(integer, text) from public, anon;', 'revoke public/anon'],
  ['grant execute on function public.adjust_points(integer, text) to authenticated, service_role;', 'grant authenticated/service_role'],
]) {
  assert(adjustPointsMigration.includes(needle), `adjust_points migration lost clause: ${label}`);
}
assert(read('types/gamification-types.ts').includes('7: 5, // Day 7 大獎'), 'STREAK_BONUS_TABLE max changed: update c_max_daily_award in the adjust_points migration');

// profiles 受保護欄位 trigger migration（草稿，尚未套用）：關鍵條款不得被改掉
const profilesGuardMigration = read('supabase/migrations/20261004160000_profiles_server_managed_columns_guard.sql');
for (const [needle, label] of [
  ["if current_user in ('postgres', 'service_role', 'supabase_admin') then", 'privileged roles pass'],
  ['before insert or update of points, total_points, tier, v2_unlocked_at on public.profiles', 'trigger events/columns'],
  ['new.points := 0;', 'INSERT coerces points to 0'],
  ['if new.points is distinct from old.points then', 'UPDATE rejects points changes'],
  ["using errcode = '42501'", 'insufficient_privilege errcode'],
  ['revoke execute on function public.guard_profiles_server_managed_columns() from public, anon, authenticated;', 'trigger fn not directly callable'],
]) {
  assert(profilesGuardMigration.includes(needle), `profiles guard migration lost clause: ${label}`);
}
assert(!/security\s+definer/i.test(profilesGuardMigration.replace(/--.*$/gm, '')), 'profiles guard trigger function must stay SECURITY INVOKER (current_user must be the caller)');

// profiles 身分欄位守衛 + 已驗證 LINE 綁定 + get_own_profile_by_line_id（草稿，尚未套用）：關鍵條款不得被改掉
const identityGuardMigration = read('supabase/migrations/20261004190000_profiles_identity_columns_guard.sql');
const identityGuardSql = identityGuardMigration.replace(/--.*$/gm, '');
const sqlSection = (sql, startNeedle, endNeedle) => {
  const start = sql.indexOf(startNeedle);
  assert(start >= 0, `migration section missing: ${startNeedle}`);
  const end = endNeedle ? sql.indexOf(endNeedle, start + startNeedle.length) : sql.length;
  return sql.slice(start, end < 0 ? sql.length : end);
};
const identityGuardFn = sqlSection(identityGuardSql, 'create or replace function public.guard_profiles_server_managed_columns()', 'create or replace function public.bind_line_user_id');
const bindFn = sqlSection(identityGuardSql, 'create or replace function public.bind_line_user_id', 'create or replace function public.get_own_profile_by_line_id');
const ownProfileFn = sqlSection(identityGuardSql, 'create or replace function public.get_own_profile_by_line_id', null);
for (const [needle, label] of [
  ["if current_user in ('postgres', 'service_role', 'supabase_admin') then", 'privileged roles still pass'],
  ['new.google_id := null;', 'INSERT coerces google_id'],
  ['new.line_user_id := null;', 'INSERT coerces line_user_id'],
  ["new.auth_provider := 'google';", 'INSERT coerces auth_provider to the column default'],
  ['new.email := case when v_uid is not null and new.id = v_uid then v_jwt_email else null end;', 'INSERT email comes from the signed JWT, never the payload'],
  ['if new.google_id is distinct from old.google_id then', 'UPDATE rejects google_id changes'],
  ['if new.auth_provider is distinct from old.auth_provider then', 'UPDATE rejects auth_provider changes'],
  ['if new.line_user_id is distinct from old.line_user_id then', 'UPDATE rejects line_user_id changes'],
  ['if new.email is distinct from old.email then', 'UPDATE rejects email changes'],
  ['lower(btrim(new.email)) = lower(v_jwt_email)', 'email may only be set to the caller\'s own verified JWT email'],
  ['if new.points is distinct from old.points then', 'balance guards from 160000 are kept'],
  ["using errcode = '42501'", 'insufficient_privilege errcode'],
]) {
  assert(identityGuardFn.includes(needle), `identity guard lost clause: ${label}`);
}
assert(!/user_metadata/i.test(identityGuardFn), 'identity guard must never trust user_metadata (user-editable)');
assert(!/security\s+definer/i.test(identityGuardFn), 'identity guard trigger function must stay SECURITY INVOKER (current_user must be the caller)');
assert(
  /before insert or update of points, total_points, tier, v2_unlocked_at,\s+email, google_id, auth_provider, line_user_id\s+on public\.profiles/.test(identityGuardSql),
  'trigger must cover balance AND identity columns',
);
assert(identityGuardSql.includes('revoke execute on function public.guard_profiles_server_managed_columns() from public, anon, authenticated;'), 'guard fn must stay non-callable');
assert(identityGuardSql.includes('create unique index if not exists profiles_line_user_id_key') && identityGuardSql.includes('where line_user_id is not null'), 'one LINE id per profile (partial unique index)');
for (const [needle, label] of [
  ['security definer', 'definer'],
  ["p_line_user_id !~ '^U[0-9A-Za-z]{32}$'", 'LINE userId format check'],
  ['for update', 'row lock'],
  ["'profile_bound_to_other_line'", 'no silent re-binding'],
  ["'line_id_in_use'", 'unique LINE id conflict reported'],
]) {
  assert(bindFn.includes(needle), `bind_line_user_id lost clause: ${label}`);
}
assert(identityGuardSql.includes('revoke all on function public.bind_line_user_id(uuid, text) from public, anon, authenticated;'), 'bind_line_user_id must be revoked from every client role');
assert(identityGuardSql.includes('grant execute on function public.bind_line_user_id(uuid, text) to service_role;'), 'bind_line_user_id must be service_role only');
assert(!/grant execute on function public\.bind_line_user_id[^;]*(authenticated|anon)/.test(identityGuardSql), 'bind_line_user_id must never be granted to anon/authenticated');
for (const [needle, label] of [
  ['v_uid uuid := auth.uid();', 'caller identity'],
  ["'auth_required'", 'unauthenticated callers get nothing'],
  ['and id = v_uid', 'only the caller\'s own row can be returned'],
  ['revoke all on function public.get_own_profile_by_line_id(text) from public;', 'PUBLIC grant removed'],
]) {
  assert(ownProfileFn.includes(needle), `get_own_profile_by_line_id lost clause: ${label}`);
}
assert(!/\bemail\b|\bphone\b|google_id|line_user_id,/.test(ownProfileFn.slice(ownProfileFn.indexOf('select id,'), ownProfileFn.indexOf('from public.profiles'))), 'get_own_profile_by_line_id must keep its non-sensitive column whitelist');

// 實跑 api/_lib/lineBind.ts（零 import，與 Vercel 無關）：用假的 fetch 驗證「先驗 Supabase 登入者、再驗 LINE ID token、最後才用 service_role 寫入」。
{
  const { handleLineBind, LINE_VERIFY_URL } = await loadTsModule('api/_lib/lineBind.ts', 'line-bind');
  const USER_ID = '11111111-2222-4333-8444-555555555555';
  const LINE_SUB = 'U0123456789abcdef0123456789abcdef';
  const CHANNEL = '2009156462';
  const SERVICE_KEY = 'service-role-key-SECRET';
  const baseEnv = {
    VITE_SUPABASE_URL: 'https://example.supabase.co',
    VITE_SUPABASE_ANON_KEY: 'anon-key',
    VITE_LIFF_ID: `${CHANNEL}-AbCdEfGh`,
    SUPABASE_SERVICE_ROLE_KEY: SERVICE_KEY,
  };
  const goodClaims = () => ({ iss: 'https://access.line.me', sub: LINE_SUB, aud: CHANNEL, exp: Math.floor(Date.now() / 1000) + 600 });
  const jsonResponse = (status, body) => ({ ok: status >= 200 && status < 300, status, json: async () => body });
  const makeFetch = ({ user = { status: 200, body: { id: USER_ID } }, line = { status: 200, body: goodClaims() }, rpc = { status: 200, body: { ok: true } } } = {}) => {
    const calls = [];
    const fn = async (url, init = {}) => {
      calls.push({ url: String(url), init });
      if (String(url).endsWith('/auth/v1/user')) {
        if (user instanceof Error) throw user;
        return jsonResponse(user.status, user.body);
      }
      if (String(url) === LINE_VERIFY_URL) {
        if (line instanceof Error) throw line;
        return jsonResponse(line.status, line.body);
      }
      if (String(url).endsWith('/rest/v1/rpc/bind_line_user_id')) {
        if (rpc instanceof Error) throw rpc;
        return jsonResponse(rpc.status, rpc.body);
      }
      throw new Error(`unexpected fetch ${url}`);
    };
    return { fn, calls };
  };
  const run = async (overrides = {}, input = {}) => {
    const mock = makeFetch(overrides.fetch);
    const logs = [];
    const result = await handleLineBind(
      { method: 'POST', authorizationHeader: 'Bearer user-access-token', body: { idToken: 'line-id-token' }, ...input },
      { env: overrides.env ?? baseEnv, fetchImpl: mock.fn, logError: (m) => logs.push(m) },
    );
    return { result, calls: mock.calls, logs };
  };
  const hits = (calls, needle) => calls.filter((c) => c.url.includes(needle));

  // 基本守門
  assertEqual(String((await run({}, { method: 'GET' })).result.status), '405', 'GET must be rejected');
  {
    const r = await run({}, { authorizationHeader: undefined });
    assertEqual(String(r.result.status), '401', 'missing bearer must be 401');
    assertEqual(String(r.calls.length), '0', 'no upstream call before auth header is present');
  }
  assertEqual(String((await run({}, { body: {} })).result.status), '400', 'missing idToken must be 400');
  assertEqual(String((await run({}, { body: 'not json' })).result.status), '400', 'garbage body must be 400');
  assertEqual(String((await run({}, { body: { idToken: 'x'.repeat(5000) } })).result.status), '400', 'oversized idToken must be 400');
  {
    const r = await run({ env: { ...baseEnv, SUPABASE_SERVICE_ROLE_KEY: undefined } });
    assertEqual(String(r.result.status), '503', 'missing service key must be 503');
    assertEqual(r.result.body.error, 'server_not_configured', 'config error code');
    assertEqual(String(r.calls.length), '0', 'misconfigured server must not call any upstream');
    assert(r.logs.some((m) => m.includes('SUPABASE_SERVICE_ROLE_KEY')) && !r.logs.join('').includes(SERVICE_KEY), 'log names the missing var, never a value');
  }
  assertEqual(String((await run({ env: { ...baseEnv, VITE_LIFF_ID: undefined } })).result.status), '503', 'unknown LINE channel must be 503');

  // 驗證順序：Supabase 登入者 -> LINE token -> 寫入；前一關失敗就不能進下一關
  {
    const r = await run({ fetch: { user: { status: 401, body: {} } } });
    assertEqual(String(r.result.status), '401', 'bad Supabase session must be 401');
    assertEqual(r.result.body.error, 'invalid_session', 'bad session code');
    assertEqual(String(hits(r.calls, 'api.line.me').length + hits(r.calls, '/rpc/').length), '0', 'LINE verify and write must not run for a bad session');
  }
  assertEqual(String((await run({ fetch: { user: { status: 200, body: { id: USER_ID, is_anonymous: true } } } })).result.status), '401', 'anonymous Supabase users must be rejected');
  assertEqual(String((await run({ fetch: { user: { status: 200, body: { id: 'not-a-uuid' } } } })).result.status), '401', 'non-uuid user id must be rejected');
  for (const [label, claims, status] of [
    ['LINE verify rejects token', null, 400],
    ['aud mismatch', { ...goodClaims(), aud: '999' }, 200],
    ['iss mismatch', { ...goodClaims(), iss: 'https://evil.example' }, 200],
    ['expired', { ...goodClaims(), exp: Math.floor(Date.now() / 1000) - 5 }, 200],
    ['bad sub format', { ...goodClaims(), sub: 'U123' }, 200],
    ['missing sub', { ...goodClaims(), sub: undefined }, 200],
  ]) {
    const r = await run({ fetch: { line: { status, body: claims ?? { error: 'invalid_request' } } } });
    assertEqual(String(r.result.status), '401', `${label} must be 401`);
    assertEqual(r.result.body.error, 'invalid_line_token', `${label} code`);
    assertEqual(String(hits(r.calls, '/rpc/').length), '0', `${label} must not reach the DB write`);
  }

  // 成功路徑：寫入的 LINE id 只能來自 LINE 驗證結果，user id 只能來自 Supabase；body 裡的任何自我宣稱都被忽略
  {
    const r = await run({}, { body: { idToken: 'line-id-token', lineUserId: 'Uattacker0000000000000000000000000', userId: '99999999-9999-4999-8999-999999999999', p_line_user_id: 'Uattacker0000000000000000000000000' } });
    assertEqual(String(r.result.status), '200', 'happy path must be 200');
    assertEqual(String(r.result.body.ok), 'true', 'happy path ok');
    const userCall = hits(r.calls, '/auth/v1/user')[0];
    assertEqual(userCall.init.headers.Authorization, 'Bearer user-access-token', 'Supabase lookup must use the caller\'s own token');
    assertEqual(userCall.init.headers.apikey, 'anon-key', 'Supabase lookup uses the anon key, not the service key');
    const lineCall = hits(r.calls, 'api.line.me')[0];
    const form = new URLSearchParams(lineCall.init.body);
    assertEqual(form.get('id_token'), 'line-id-token', 'LINE verify receives the client\'s ID token');
    assertEqual(form.get('client_id'), CHANNEL, 'LINE verify client_id comes from server config (VITE_LIFF_ID prefix), not the request');
    assert(!JSON.stringify(lineCall).includes(SERVICE_KEY), 'service key must never be sent to LINE');
    const rpcCall = hits(r.calls, '/rest/v1/rpc/bind_line_user_id')[0];
    assertEqual(rpcCall.init.headers.apikey, SERVICE_KEY, 'write uses the service key');
    const sent = JSON.parse(rpcCall.init.body);
    assertEqual(sent.p_user_id, USER_ID, 'user id comes from Supabase, not the body');
    assertEqual(sent.p_line_user_id, LINE_SUB, 'LINE id comes from the verified token, not the body');
    assert(!JSON.stringify(r.result).includes(SERVICE_KEY) && !JSON.stringify(r.result).includes(LINE_SUB), 'response must not echo secrets or the LINE id');
    const order = r.calls.map((c) => (c.url.includes('/auth/v1/user') ? 'user' : c.url.includes('api.line.me') ? 'line' : 'rpc')).join(',');
    assertEqual(order, 'user,line,rpc', 'verification order');
  }
  assertEqual(
    new URLSearchParams((await run({ env: { ...baseEnv, LINE_LOGIN_CHANNEL_ID: '1234567890' } })).calls.find((c) => c.url.includes('api.line.me')).init.body).get('client_id'),
    '1234567890',
    'LINE_LOGIN_CHANNEL_ID overrides the VITE_LIFF_ID prefix',
  );
  // DB 回報的衝突要原樣對應狀態碼
  for (const [rpcBody, status, error] of [
    [{ ok: false, error: 'line_id_in_use' }, '409', 'line_id_in_use'],
    [{ ok: false, error: 'profile_bound_to_other_line' }, '409', 'profile_bound_to_other_line'],
    [{ ok: false, error: 'profile_not_found' }, '404', 'profile_not_found'],
    [{ ok: false, error: 'invalid_input' }, '400', 'invalid_request'],
    [{ ok: false, error: 'something_new' }, '502', 'bind_failed'],
  ]) {
    const r = await run({ fetch: { rpc: { status: 200, body: rpcBody } } });
    assertEqual(String(r.result.status), status, `rpc ${rpcBody.error} status`);
    assertEqual(r.result.body.error, error, `rpc ${rpcBody.error} code`);
  }
  {
    const r = await run({ fetch: { rpc: { status: 200, body: { ok: true, already_bound: true } } } });
    assertEqual(`${r.result.status}/${r.result.body.already_bound}`, '200/true', 'idempotent re-bind is a success');
  }
  assertEqual(String((await run({ fetch: { rpc: { status: 401, body: { message: 'bad key' } } } })).result.status), '502', 'DB permission failure is a 502, not a success');
  assertEqual(String((await run({ fetch: { line: new Error('boom') } })).result.status), '502', 'LINE outage must be 502');
  assertEqual(String((await run({ fetch: { user: new Error('boom') } })).result.status), '502', 'Supabase outage must be 502');
}
const lineBindWrapper = read('api/line-bind.ts');
assert(lineBindWrapper.includes("from './_lib/lineBind.js'"), 'api/line-bind.ts must import the core with a .js extension (type: module + Vercel)');
assert(lineBindWrapper.includes("res.setHeader('Cache-Control', 'no-store');"), 'line-bind responses must not be cached');
assert(!lineBindWrapper.includes('Access-Control-Allow-Origin'), 'line-bind must stay same-origin (no CORS)');
{
  // 秘密不得進任何前端程式碼
  const clientSideFiles = ['App.tsx', 'PassportScreen.tsx', 'passportUtils.ts', 'analytics.ts', 'rewardClaim.ts', 'mbtiClaim.ts', 'vite.config.ts', 'src/api/lineBind.ts', 'src/lib/supabase.ts', 'src/contexts/LiffContext.tsx'];
  for (const file of clientSideFiles) {
    assert(!read(file).includes('SERVICE_ROLE'), `${file} must not reference the service-role key`);
  }
  assert(!read('src/api/lineBind.ts').includes('profile.userId') && !read('src/api/lineBind.ts').includes("from('profiles')"), 'client bind helper must only forward the LIFF ID token to the server');
}

// redeem_reward_item device_id 修正 migration（草稿，尚未套用）：只多一欄，其餘行為不得被改掉
const redeemFixMigration = read('supabase/migrations/20261004200000_redeem_reward_item_device_id.sql');
const redeemFixSql = redeemFixMigration.replace(/--.*$/gm, '');
for (const [needle, label] of [
  ['CREATE OR REPLACE FUNCTION public.redeem_reward_item(p_reward_id text, p_expected_points_cost integer DEFAULT NULL::integer)', 'same signature'],
  ['SECURITY DEFINER', 'definer'],
  ["SET search_path TO 'pg_catalog', 'public'", 'pinned search_path'],
  ['INSERT INTO public.point_transactions (user_id, device_id, points, action, description, source)', 'ledger insert names device_id (NOT NULL, no default)'],
  ["'server:redeem_reward_item',", 'device_id marker for RPC-generated ledger rows'],
  ['AND COALESCE(points, 0) >= v_item.points_cost', 'atomic balance check + row lock in one UPDATE'],
  ["'insufficient_points'", 'insufficient points error'],
  ["'reward_price_changed'", 'expected-cost mismatch error'],
  ["'reward_unavailable'", 'inactive/unknown reward error'],
  ["'profile_not_found'", 'missing profile error'],
  ["'auth_required'", 'unauthenticated error'],
  ['FOR v_attempt IN 1..5 LOOP', 'redemption code retry loop'],
  ['WHEN unique_violation THEN', 'redemption code collision retry'],
  ['INSERT INTO public.reward_redemptions', 'redemption row'],
  ['revoke execute on function public.redeem_reward_item(text, integer) from public, anon;', 'revoke public/anon'],
  ['grant execute on function public.redeem_reward_item(text, integer) to authenticated, service_role;', 'grant authenticated/service_role'],
]) {
  assert(redeemFixSql.includes(needle), `redeem_reward_item migration lost clause: ${label}`);
}
assert(!/fulfill_reward_redemption_staff/.test(redeemFixSql), 'redeem fix must not touch the staff fulfilment path');
// 前端必須對 RPC 會回的每一種失敗代碼都有說明，不能落到泛用的「兌換失敗」
for (const code of [...redeemFixSql.matchAll(/'error',\s*'([a-z_]+)'/g)].map((m) => m[1])) {
  assert(new RegExp(`\\b${code}:\\s*'`).test(rewardShop), `RewardShop has no user-facing message for redeem error "${code}"`);
}
assert(rewardsApi.includes("new Error(result.error || 'reward_redeem_failed')"), 'rewards API must surface the RPC error code to the UI');
// 前端福利清單（constants.tsx）必須與 DB 種子（ledger migration）的 id／點數／分類一致，否則會是 reward_unavailable／reward_price_changed
{
  const constantsSource = read('constants.tsx');
  const itemsBlock = constantsSource.slice(constantsSource.indexOf('REDEEMABLE_ITEMS'));
  const uiItems = [...itemsBlock.slice(0, itemsBlock.indexOf('];')).matchAll(/id:\s*'([a-z_]+)'[\s\S]*?pointsCost:\s*(\d+),\s*category:\s*'(\w+)'/g)]
    .map((m) => `${m[1]}|${m[2]}|${m[3]}`).sort();
  const seededItems = [...rewardLedgerMigration.matchAll(/\('([a-z_]+)',\s*'[^']*',\s*'[^']*',\s*(\d+),\s*'(\w+)',\s*'show-screen',\s*TRUE/g)]
    .map((m) => `${m[1]}|${m[2]}|${m[3]}`).sort();
  assert(seededItems.length === 10, `reward_items seed should list 10 rows, found ${seededItems.length}`);
  assertEqual(uiItems.join(','), seededItems.join(','), 'REDEEMABLE_ITEMS must match the reward_items seed (id|points|category)');
}

const swPath = path.join(repoRoot, 'dist', 'sw.js');
assert(fs.existsSync(swPath), 'dist/sw.js is missing; run npm run build before npm test');

const sw = fs.readFileSync(swPath, 'utf8');
const queryNetworkOnlyIndex = sw.search(/"navigate"===\w+\.mode&&\w+\.search\.length>0,new \w+\.NetworkOnly/);
const htmlNetworkFirstIndex = sw.indexOf('cacheName:"passport-html"');

assert(sw.includes('self.skipWaiting()'), 'sw.js must call skipWaiting');
assert(sw.includes('clientsClaim()'), 'sw.js must call clientsClaim');
assert(sw.includes('denylist:[/\\?/]'), 'sw.js NavigationRoute must denylist any query string');
assert(queryNetworkOnlyIndex >= 0, 'sw.js must route query navigations to NetworkOnly');
assert(htmlNetworkFirstIndex >= 0, 'sw.js must keep passport-html NetworkFirst cache for non-query navigations');
assert(queryNetworkOnlyIndex < htmlNetworkFirstIndex, 'query NetworkOnly route must be registered before passport-html cache marker');
assert(sw.includes('networkTimeoutSeconds:3'), 'passport-html NetworkFirst timeout changed');
assert(sw.includes('maxEntries:10'), 'passport-html maxEntries changed');
assert(!sw.includes('\\bcode='), 'sw.js must not regress to enumerated code denylist');

// production bundle 不得含 debug 後門（import.meta.env.DEV 在 vite build 為 false，整段應被 tree-shake）
const distAssetsDir = path.join(repoRoot, 'dist', 'assets');
assert(fs.existsSync(distAssetsDir), 'dist/assets is missing; run npm run build before npm test');
const distBundle = fs
  .readdirSync(distAssetsDir)
  .filter((file) => file.endsWith('.js'))
  .map((file) => fs.readFileSync(path.join(distAssetsDir, file), 'utf8'))
  .join('\n');
assert(!distBundle.includes('debug_passport_unlocked'), 'production bundle must not contain the debug=1 unlock-all-stamps branch');
assert(!distBundle.includes('Failed to set debug passport state'), 'production bundle must not contain the debug=1 handler');
assert(distBundle.includes('points_sync_rejected'), 'production bundle must report rejected points syncs');
assert(!distBundle.includes('SUPABASE_SERVICE_ROLE_KEY') && !distBundle.includes('SERVICE_ROLE'), 'production bundle must never contain the service-role key name or value');
assert(distBundle.includes('gacha.kiwimu.com'), 'production bundle must carry the points sync referrer allowlist');

console.log('OAuth, SSO broker, service-worker, reward ledger, points-sync guard, and debug-backdoor regression checks passed.');
