import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');

const read = (relativePath) => fs.readFileSync(path.join(repoRoot, relativePath), 'utf8');
const economyContract = await import(
  pathToFileURL(path.join(repoRoot, 'src/api/economyContract.js')).href
);

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
  const sensitiveParams = ['claim', 'claim_code', 'reward', 'economy_claim'];
  const hasOAuthState = hasNonEmptyState(url);
  const hasRewardClaimCode = !hasOAuthState && url.searchParams.has('code') && url.searchParams.has('reward');
  const hasLegacyPointPayload = url.searchParams.get('action') === 'add_points';
  const legacyPointParams = hasLegacyPointPayload ? ['action', 'amount', 'ts'] : [];
  const paramsToScrub = hasRewardClaimCode
    ? [...sensitiveParams, ...legacyPointParams, 'code']
    : [...sensitiveParams, ...legacyPointParams];
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
  ['/?economy_claim=11111111-1111-4111-8111-111111111111&utm_source=kiwimu', '?utm_source=kiwimu'],
  ['/?action=add_points&amount=999999&source=gacha&ts=123', '?source=gacha'],
  ['/?code=ONLY', '?code=ONLY'],
  ['/?%63ode=Y&reward=x&state=s', '?code=Y&state=s'],
  ['/#code=ABC&state=XYZ', ''],
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

const validZeroEnvelope = economyContract.normalizeEconomyEnvelope({
  ok: true,
  code: 'OK',
  request_id: 'request-zero',
  data: { balance: 0, history: [] },
});
assert(validZeroEnvelope?.data.balance === 0, 'A valid remote zero must remain authoritative');
assert(economyContract.normalizeEconomyEnvelope({ ok: false, code: 'NEW_TEMPORARY_CODE', data: {} }) === null, 'Unknown Economy codes must fail closed');
assert(economyContract.normalizeEconomyEnvelope({ ok: true, code: 'OK', data: [] }) === null, 'Envelope data must be an object');
assert(economyContract.readNonNegativeLedgerInteger(0) === 0, 'Ledger zero must be valid');
for (const malformedAmount of [undefined, null, '0', Number.NaN, -1, 1.5]) {
  assert(economyContract.readNonNegativeLedgerInteger(malformedAmount) === null, `Malformed ledger amount must fail closed: ${String(malformedAmount)}`);
}
assert(economyContract.canUseEconomyWriteAuthority({ source: 'economy_v2', ownerKey: 'auth:user-a' }, 'user-a'), 'Matching v2 owner must permit the adapter write');
assert(!economyContract.canUseEconomyWriteAuthority({ source: 'economy_v2', ownerKey: 'auth:user-a' }, 'user-b'), 'A stale wallet from another account must not permit a write');
assert(!economyContract.canUseEconomyWriteAuthority({ source: 'legacy_remote', ownerKey: 'auth:user-a' }, 'user-a'), 'Legacy authority must remain read-only');
for (const terminalCode of ['NOT_ELIGIBLE', 'LIMIT_REACHED', 'EXPIRED', 'INVALID_PROOF']) {
  assert(economyContract.isTerminalPendingClaimCode(terminalCode), `${terminalCode} must be a terminal pending-claim code`);
}
for (const temporaryCode of ['AUTH_REQUIRED', 'ROLLOUT_DISABLED', 'UNAVAILABLE', 'OUT_OF_STOCK', 'NEW_TEMPORARY_CODE']) {
  assert(!economyContract.isTerminalPendingClaimCode(temporaryCode), `${temporaryCode} must retain the pending claim`);
}

const stateGuard = "searchParams.getAll('state').some((value) => value.trim().length > 0)";
const indexHtml = read('index.html');
const appTsx = read('App.tsx');
const oauthSafety = read('src/lib/oauthSafety.ts');
const authContext = read('src/contexts/SupabaseAuthContext.tsx');
const ssoBroker = read('src/lib/ssoBroker.ts');
const rewardShop = read('components/RewardShop.tsx');
const rewardsApi = read('src/api/rewards.ts');
const economyApi = read('src/api/economy.ts');
const passportScreen = read('PassportScreen.tsx');
const checkinModal = read('components/CheckinModal.tsx');
const checkinCard = read('components/CheckinCard.tsx');
const pointsApi = read('src/api/points.ts');
const passportUtils = read('passportUtils.ts');
const rewardLedgerMigration = read('supabase/migrations/20260621111241_reward_redemption_ledger.sql');

assert(indexHtml.includes("const sensitiveParams = ['claim', 'claim_code', 'reward', 'economy_claim'];"), 'index.html sensitiveParams changed');
assert(indexHtml.includes("const hasLegacyPointPayload = url.searchParams.get('action') === 'add_points';"), 'index.html must detect legacy amount payloads before app boot');
assert(indexHtml.includes("initialSearchForApp.delete('economy_claim');"), 'Economy claim must be removed from the app initial-search global');
assert(indexHtml.indexOf("initialSearchForApp.delete('economy_claim');") < indexHtml.indexOf('window.__PASSPORT_INITIAL_SEARCH__ ='), 'Economy claim must be removed before publishing initial search');
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
assert(economyApi.includes("supabase.rpc('economy_get_wallet'"), 'Passport wallet must read Economy v2 through RPC');
assert(economyApi.includes("supabase.rpc('economy_submit_event'"), 'Passport check-in must submit the canonical event contract');
assert(economyApi.includes("supabase.rpc('economy_claim_pending'"), 'Passport must claim pending activities through RPC');
assert(economyApi.includes("envelope?.code !== 'ROLLOUT_DISABLED'"), 'Legacy wallet fallback must require an explicit rollout denial');
assert(economyApi.includes('canUseEconomyWriteAuthority(authority, identity.authUserId)'), 'Check-in must require matching Economy v2 read authority');
assert(!economyApi.includes('performLegacyCheckin'), 'Check-in must not fall back to a legacy point write');
assert(!economyApi.includes('adjustPointsByIdentity'), 'Economy adapter must not call an amount-bearing legacy RPC');
assert(!pointsApi.includes("supabase.rpc('adjust_points'"), 'Passport client must not ship the legacy amount-bearing adjustment helper');
assert(!passportScreen.includes('remotePoints || localPoints'), 'A remote zero must never fall back to local points');
assert(!passportScreen.includes("evt.detail?.balance"), 'Client events must not set an official wallet balance');
assert(passportScreen.includes('setConfirmedCheckinUtcDay(getUtcDay(new Date()))'), 'Server-confirmed check-in must lock the current UTC day before refresh');
assert(passportScreen.includes('result.ownerKey !== walletOwnerKeyRef.current'), 'Stale check-in results must not update a different account wallet');
assert(!checkinModal.includes('performDailyCheckin'), 'Check-in UI must not call the local-first legacy helper');
assert(!checkinModal.includes('adjustPointsByIdentity'), 'Check-in UI must not choose its own point award');
assert(checkinModal.includes('網路連線中斷'), 'Thrown check-in failures must show a user-visible message');
assert(checkinCard.includes('requiresLogin'), 'Signed-out check-in must remain clickable and route to login');
assert(appTsx.includes('isTerminalPendingClaimCode(result.code)'), 'Pending claims must clear only through an explicit terminal allowlist');
assert(appTsx.includes("'[economy] Pending claim request failed:'"), 'Thrown pending-claim requests must show a handled UX path');
const incomingSyncBody = passportUtils.slice(passportUtils.indexOf('export function handleIncomingPointsSync'));
assert(!incomingSyncBody.includes('addPassportPoints(pointsAmount'), 'Legacy URL amounts must not award local points');

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

console.log('OAuth, SSO broker, service-worker, reward ledger, and Economy adapter regression checks passed.');
