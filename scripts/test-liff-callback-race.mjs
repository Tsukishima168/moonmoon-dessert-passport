// LINE 登入回跳競賽的回歸測試（不連網、不開瀏覽器）。
// 背景：LIFF SDK 延後載入後 liff.init 比 SupabaseAuthContext 的 removeOAuthCallbackParamsFromCurrentUrl 晚；
// 後者若把 LIFF 回跳網址的 code/state 先刪掉，liff.init 就換不到 token。
// 這裡實際執行 oauthSafety.ts：LIFF 回跳網址必須原封不動，Supabase 自己的回跳仍要清乾淨。
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';

const src = readFileSync(new URL('../src/lib/oauthSafety.ts', import.meta.url), 'utf8');
const js = ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
let seq = 0;
async function run(href, fn = 'removeOAuthCallbackParamsFromCurrentUrl') {
  const calls = [];
  const u = new URL(href);
  globalThis.window = {
    location: { href, pathname: u.pathname, search: u.search, hash: u.hash },
    history: { replaceState: (_s, _t, next) => calls.push(next) },
  };
  const mod = await import(`data:text/javascript;base64,${Buffer.from(`${js}\n//${seq++}`).toString('base64')}`);
  mod[fn]();
  return calls;
}

const base = 'https://passport.kiwimu.com/';
const liffQuery = 'liffClientId=1234567890&liffRedirectUri=https%3A%2F%2Fpassport.kiwimu.com%2F';

// 1. LINE 登入回跳：不得改網址（code/state 要留給 liff.init）
assert.deepEqual(await run(`${base}?code=abc&state=xyz&${liffQuery}`), [], 'LIFF callback URL must not be scrubbed');
assert.deepEqual(await run(`${base}?code=abc&state=xyz&liffClientId=1`), [], 'liffClientId alone must protect the callback');
assert.deepEqual(await run(`${base}?code=abc&state=xyz&liffRedirectUri=x`), [], 'liffRedirectUri alone must protect the callback');

// 2. Supabase（Google PKCE）自己的回跳：照舊清掉
assert.deepEqual(await run(`${base}?code=abc&state=xyz`), ['/'], 'Supabase callback residue must still be cleaned');
assert.deepEqual(await run(`${base}?code=abc&state=xyz&from=map`), ['/?from=map'], 'unrelated params must survive');
assert.deepEqual(await run(`${base}?error=access_denied&error_description=x`), ['/'], 'error callback must still be cleaned');

// 3. 沒有回跳訊號：不動
assert.deepEqual(await run(`${base}?from=map`), []);

// 3b. liff.init 結束後：回跳參數清掉、其他參數保留（LIFF 自己不會清 query 的 code/state）
const clean = 'removeLiffCallbackParamsFromCurrentUrl';
assert.deepEqual(await run(`${base}?tab=stamps&code=abc&state=xyz&${liffQuery}`, clean), ['/?tab=stamps'], 'after init: LIFF params gone, tab kept');
assert.deepEqual(await run(`${base}?code=abc&state=xyz&error=e&error_description=d&${liffQuery}`, clean), ['/']);
assert.deepEqual(await run(`${base}?tab=stamps`, clean), [], 'nothing to clean -> untouched');
assert.deepEqual(await run(`${base}?code=abc&state=xyz`, clean), [], 'after init: a Supabase (non-LIFF) callback must be left for Supabase');
const ctxSrc = readFileSync(new URL('../src/contexts/LiffContext.tsx', import.meta.url), 'utf8');
assert.ok(/finally\s*\{[^}]*removeLiffCallbackParamsFromCurrentUrl\(\)/.test(ctxSrc), 'LiffContext must clean the URL in a finally after liff.init');

// 4. needsLiffNow 要涵蓋 Android 從 LINE 跳出的 liffIsEscapedFromApp
const ctx = readFileSync(new URL('../src/contexts/LiffContext.tsx', import.meta.url), 'utf8');
assert.ok(ctx.includes("q.has('liffIsEscapedFromApp')"), 'needsLiffNow must cover liffIsEscapedFromApp');

console.log('LIFF callback race: LIFF URLs untouched, Supabase residue still cleaned, liffIsEscapedFromApp covered.');
