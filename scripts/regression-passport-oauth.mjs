import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');

const read = (relativePath) => fs.readFileSync(path.join(repoRoot, relativePath), 'utf8');

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
assert(authContext.includes("notifySsoBrokerComplete(getPendingRedirectTo(), 'error', authFlowError)"), 'Auth context must notify popup opener on OAuth errors');
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

console.log('OAuth, SSO broker, service-worker, and reward ledger regression checks passed.');
