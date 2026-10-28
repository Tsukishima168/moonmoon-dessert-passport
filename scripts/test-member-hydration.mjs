import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(new URL('../package.json', import.meta.url));
const ts = require('typescript');
const source = fs.readFileSync(new URL('../components/MemberHub.tsx', import.meta.url), 'utf8');
const root = ts.createSourceFile('MemberHub.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
let effect;
function walk(node) {
  if (ts.isCallExpression(node) && node.expression.getText(root) === 'useEffect'
    && node.arguments[0].getText(root).includes('const hydrateFootprints')) {
    effect = node.arguments[0];
  }
  ts.forEachChild(node, walk);
}
walk(root);
assert(effect, 'Actual MemberHub hydration effect is required');
const code = ts.transpileModule(`(${effect.getText(root)})`, {
  compilerOptions: { target: ts.ScriptTarget.ES2022 },
}).outputText;

// 用真正的 constants.tsx 取得目前的 STAMPS（google_review 已於 2026-10-28 移除）。
const constantsCode = ts.transpileModule(fs.readFileSync(new URL('../constants.tsx', import.meta.url), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
}).outputText;
const { STAMPS } = await import(`data:text/javascript;base64,${Buffer.from(constantsCode).toString('base64')}`);

function harness(unlockedStamps = []) {
  let resolveFootprints, resolveMbti;
  const writes = [];
  const stampCounts = [];
  let activeAuth = 'account-a';
  const context = {
    user: { id: 'account-a' },
    readStoredMbtiResult: () => null,
    setMbtiType: value => writes.push(['state-mbti', value]),
    getPassportState: () => ({ unlockedStamps }),
    STAMPS,
    setStampCount: count => stampCounts.push(count),
    getVisitedSites: () => [],
    loadCloudFootprints: () => new Promise(resolve => { resolveFootprints = resolve; }),
    loadCloudMbtiResult: () => new Promise(resolve => { resolveMbti = resolve; }),
    saveStoredMbtiResult: result => writes.push(['local-mbti', result.mbtiType]),
    markSiteVisited: id => writes.push(['local-footprint', id]),
    markCloudFootprint: id => writes.push(['cloud-footprint', activeAuth, id]),
    syncLocalFootprintsOnce: (id, sites) => writes.push(['local-sync-key', id, sites]),
    detectIncomingSite: () => 'moon_map',
    window: { __PASSPORT_INITIAL_SEARCH__: '?from=map_return', location: { pathname: '/' } },
    document: { referrer: '' },
    URLSearchParams,
    trackEvent() {},
    setVisitedSites: sites => writes.push(['state-footprints', sites]),
  };
  const callback = vm.runInNewContext(code, context);
  const cleanup = callback();
  return {
    writes,
    stampCounts,
    cleanup,
    switchAccount() { activeAuth = 'account-b'; },
    settle() {
      resolveFootprints(['dessert_booking']);
      resolveMbti({ mbtiType: 'INTJ' });
    },
  };
}
const flush = async () => { for (let i = 0; i < 6; i++) await Promise.resolve(); };

const stale = harness();
stale.cleanup();
stale.switchAccount();
stale.settle();
await flush();
assert.equal(stale.writes.length, 0, 'Cancelled account-A hydration must not write local, cloud, sync-key, or UI state after switching to B');

const active = harness();
active.settle();
await flush();
assert(active.writes.some(row => row[0] === 'local-mbti' && row[1] === 'INTJ'));
assert(active.writes.some(row => row[0] === 'cloud-footprint' && row[1] === 'account-a' && row[2] === 'moon_map'));
assert(active.writes.some(row => row[0] === 'local-sync-key' && row[1] === 'account-a'));
assert(active.writes.some(row => row[0] === 'state-footprints'));
active.cleanup();

// 「印章收集 N 枚」只算目前印章清單還存在的 id：舊使用者本機留著的 google_review（已移除）不能被算進去，
// 秘密徽章 egg_master_2026_q1 仍在清單內要照算，未知 id 也不計。
const legacy = harness(['shop_checkin', 'quiz_completed', 'google_review', 'egg_master_2026_q1', 'totally_unknown_stamp']);
legacy.cleanup();
assert.deepEqual(legacy.stampCounts, [3], 'Stamp count must ignore removed/unknown ids such as google_review');
const fresh = harness([]);
fresh.cleanup();
assert.deepEqual(fresh.stampCounts, [0], 'Empty passport has zero stamps');

console.log('MemberHub hydration review: 7 actual-effect assertions passed; cancelled account writes prevented, active hydration preserved. All storage/auth/network calls mocked.');
