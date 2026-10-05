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

function harness() {
  let resolveFootprints, resolveMbti;
  const writes = [];
  let activeAuth = 'account-a';
  const context = {
    user: { id: 'account-a' },
    readStoredMbtiResult: () => null,
    setMbtiType: value => writes.push(['state-mbti', value]),
    getPassportState: () => ({ unlockedStamps: [] }),
    setStampCount() {},
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

console.log('MemberHub hydration review: 5 actual-effect assertions passed; cancelled account writes prevented, active hydration preserved. All storage/auth/network calls mocked.');
