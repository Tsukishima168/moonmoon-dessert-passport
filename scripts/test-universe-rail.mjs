// Executes the actual kit rail JSX and its effects with a browser/hook fixture (no real React or DOM).
// Drop-in replacement for passport's scripts/test-universe-rail.mjs (same fixture, updated for the kit):
//   cp tests/test-universe-rail.kit.mjs <passport>/scripts/test-universe-rail.mjs
// Standalone run from the kit folder:
//   node tests/test-universe-rail.kit.mjs --component ./KiwimuUniverseRail.tsx --toolchain <repo with node_modules>
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { runInNewContext } from 'node:vm';

const arg = (name) => { const i = process.argv.indexOf(name); return i > -1 ? process.argv[i + 1] : undefined; };
const componentPath = arg('--component') || new URL('../components/KiwimuUniverseRail.tsx', import.meta.url).pathname;
const toolchain = arg('--toolchain') || process.env.KIT_TOOLCHAIN_FROM || process.cwd();
const ts = createRequire(path.join(path.resolve(toolchain), 'package.json'))('typescript');

let checks = 0;
const equal = (actual, expected, message) => { assert.deepEqual(actual, expected, message); checks++; };
const ok = (value, message) => { assert.ok(value, message); checks++; };

class FixtureNode { constructor(inside = false) { this.inside = inside; } }
let width = 390, height = 844, railHeight = 49, bottom = 49;
const styleValues = new Map([['--ku-rail-height', '49px']]);
const documentFixture = { activeElement: null, documentElement: { style: {
  getPropertyValue: key => styleValues.get(key) || '',
  setProperty: (key, value) => styleValues.set(key, value), removeProperty: key => styleValues.delete(key),
} } };
const rail = Object.assign(new FixtureNode(true), {
  getBoundingClientRect: () => ({ height: railHeight, bottom }), contains: node => node?.inside === true,
});
const more = Object.assign(new FixtureNode(true), { focus: () => { documentFixture.activeElement = more; } });
const winEvents = new Map(), docEvents = new Map();
const eventTarget = (events) => ({
  addEventListener: (name, handler, options) => events.set(name, { handler, capture: options === true || options?.capture === true }),
  removeEventListener: (name, handler) => { if (events.get(name)?.handler === handler) events.delete(name); },
});
Object.assign(documentFixture, eventTarget(docEvents));
const windowFixture = { ...eventTarget(winEvents), get innerWidth() { return width; }, get innerHeight() { return height; }, matchMedia: () => ({ matches: width <= 640 }) };
const observers = [];
class Observer { constructor(fn) { this.fn = fn; observers.push(this); } observe() {} disconnect() { this.disconnected = true; } }
const slots = []; let slot = 0; const pending = [];
const React = { createElement: (type, props, ...children) => ({ type, props: { ...props, children } }) };
const hooks = {
  useRef: value => { const i = slot++; return slots[i] ||= { current: value }; },
  useId: () => { slot++; return 'fixture-menu'; },
  useState: initial => { const i = slot++; if (!(i in slots)) slots[i] = initial; return [slots[i], next => { slots[i] = typeof next === 'function' ? next(slots[i]) : next; }]; },
  useEffect: (callback, deps) => { const i = slot++, previous = slots[i]; if (!previous || deps.some((value, index) => value !== previous.deps[index])) { pending.push(() => { previous?.cleanup?.(); slots[i] = { deps, cleanup: callback() }; }); } },
};
const exports = {};
const code = ts.transpileModule(readFileSync(componentPath, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.React, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
}).outputText;
runInNewContext(code, { exports, require: name => { assert.equal(name, 'react'); return { __esModule: true, default: React, ...hooks }; }, window: windowFixture, document: documentFixture, Node: FixtureNode, ResizeObserver: Observer });

const nodes = tree => { if (Array.isArray(tree)) return tree.flatMap(nodes); if (!tree || typeof tree !== 'object') return []; return [tree, ...nodes(tree.props?.children)]; };
const text = tree => Array.isArray(tree) ? tree.map(text).join('') : typeof tree === 'object' && tree ? text(tree.props?.children) : tree ?? '';
let props = { currentSite: 'passport' };
const reset = (next) => {
  slots.length = 0; slot = 0; pending.length = 0; winEvents.clear(); docEvents.clear(); observers.length = 0;
  styleValues.clear(); styleValues.set('--ku-rail-height', '49px');
  width = 390; height = 844; railHeight = 49; bottom = 49; documentFixture.activeElement = null; props = next;
};
const render = () => { slot = 0; const tree = exports.KiwimuUniverseRail(props); for (const node of nodes(tree)) { if (node.type === 'aside') node.props.ref.current = rail; if (node.type === 'button') node.props.ref.current = more; } pending.splice(0).forEach(fn => fn()); return tree; };
const button = tree => nodes(tree).find(n => n.type === 'button');
const panel = tree => nodes(tree).find(n => n.props?.id === 'fixture-menu');
const anchors = tree => nodes(tree).filter(n => n.type === 'a');
const flush = () => new Promise(resolve => setTimeout(resolve, 0));
const bases = { kiwimu: 'https://kiwimu.com/', passport: 'https://passport.kiwimu.com/', map: 'https://map.kiwimu.com/', gacha: 'https://gacha.kiwimu.com/', shop: 'https://shop.kiwimu.com/' };
const order = ['kiwimu', 'passport', 'map', 'gacha', 'shop'];

// 1. Six links per site, hrefs keep the current contract, forest opens a new tab safely.
for (const id of order) {
  reset({ currentSite: id }); const tree = render(), links = anchors(tree);
  equal(links.length, 6, 'Five site links plus one exhibition');
  equal(links.filter(n => n.props['aria-current'] === 'page').length, 1);
  links.slice(0, 5).forEach((link, index) => { const key = order[index]; equal(link.props.href, key === id ? bases[key] : bases[key] + '?from=' + id + '_universe_rail'); });
  const forest = links[5]; equal(forest.props.href, 'https://canopy.kiwimu.com/'); equal(forest.props.target, '_blank'); equal(forest.props.rel, 'noopener noreferrer');
}
// kiwimu keeps tagging every link (including its own) with its own from value.
reset({ currentSite: 'kiwimu', fromParam: 'mbti_universe_nav', tagCurrentSite: true });
equal(anchors(render()).map(n => n.props.href), [...order.map(key => bases[key] + '?from=mbti_universe_nav'), 'https://canopy.kiwimu.com/']);
reset({ currentSite: 'map', fromParam: 'Bad Value!' });
equal(anchors(render())[0].props.href, 'https://kiwimu.com/?from=map_universe_rail', 'an invalid fromParam falls back to the default');

// 2. The "更多" button names the current site when map/gacha live inside it.
for (const [id, label] of [['map', '島嶼地圖'], ['gacha', '遊戲中心']]) {
  reset({ currentSite: id }); let tree = render(); let b = button(tree);
  equal(text(b), `${label} ＋`); equal(b.props['aria-label'], `更多站點，目前在${label}`); equal(b.props.className, 'ku-universe-rail__more is-current'); equal(b.props['aria-expanded'], false);
  ok(nodes(tree).find(n => n.type === 'nav').props.className.includes('ku-universe-rail__nav--more-current'));
  b.props.onClick(); tree = render(); b = button(tree); equal(text(b), `${label} −`); equal(b.props['aria-expanded'], true); equal(b.props['aria-label'], `更多站點，目前在${label}`);
}
for (const id of ['kiwimu', 'passport', 'shop']) {
  reset({ currentSite: id }); const tree = render(), b = button(tree);
  equal(text(b), '更多 ＋'); equal(b.props['aria-label'], undefined); equal(b.props.className, 'ku-universe-rail__more');
  ok(!nodes(tree).find(n => n.type === 'nav').props.className.includes('--more-current'));
}

// 3. Open / close behaviour.
reset({ currentSite: 'passport' }); let tree = render(); equal(button(tree).props['aria-controls'], undefined);
button(tree).props.onClick(); tree = render(); equal(button(tree).props['aria-expanded'], true); equal(panel(tree).props.style.maxHeight, 779);
equal(tree.props.className, 'ku-universe-rail is-menu-open');
equal(anchors(panel(tree)).map(text), ['島嶼地圖', '遊戲中心', '森林展覽 ↗臺灣森林冠層・另開分頁']);
equal(docEvents.get('keydown').capture, true, 'Esc is handled on document in the capture phase');
equal(winEvents.has('keydown'), false);
let prevented = false, stopped = false;
docEvents.get('keydown').handler({ key: 'Escape', preventDefault: () => { prevented = true; }, stopPropagation: () => { stopped = true; } });
tree = render(); equal(prevented, true); equal(stopped, true); equal(documentFixture.activeElement, more); equal(panel(tree), undefined); equal(button(tree).props['aria-controls'], undefined);
equal(docEvents.has('keydown'), false, 'no Esc listener while the menu is closed');
button(tree).props.onClick(); render(); docEvents.get('pointerdown').handler({ target: new FixtureNode(false) }); tree = render(); equal(panel(tree), undefined);
button(tree).props.onClick(); tree = render(); tree.props.onBlurCapture({ relatedTarget: new FixtureNode(false) }); tree = render(); equal(panel(tree), undefined);
button(tree).props.onClick(); render(); winEvents.get('blur').handler(); tree = render(); equal(panel(tree), undefined);
button(tree).props.onClick(); render(); railHeight = 100; bottom = 100; height = 240; observers[0].fn(); tree = render(); equal(styleValues.get('--ku-rail-height'), '100px'); equal(panel(tree).props.style.maxHeight, 124);
const forest = anchors(panel(tree)).at(-1); documentFixture.activeElement = null; forest.props.onClick(); tree = render(); equal(panel(tree), undefined); equal(documentFixture.activeElement, more);
button(tree).props.onClick(); render(); width = 1280; winEvents.get('resize').handler(); tree = render(); equal(panel(tree), undefined);
slots.forEach(value => value?.cleanup?.()); equal(styleValues.get('--ku-rail-height'), '49px'); equal(winEvents.size, 0); equal(docEvents.size, 0); equal(observers[0].disconnected, true);

// 4. Tracking: every link reports a full universe_nav_click payload and never blocks navigation.
const EVENT_KEYS = ['destination_type', 'entry_surface', 'link_name', 'login_status', 'source_site', 'surface', 'target_site', 'transport_type', 'viewport', 'viewport_category', 'viewport_height', 'viewport_width'];
const labels = { kiwimu: 'MBTI', passport: 'Passport', map: 'Map', gacha: 'Gacha', shop: 'Shop' };
const events = [];
reset({ currentSite: 'map', onTrack: (name, details) => events.push([name, details]), getLoginStatus: async () => 'authenticated' });
tree = render(); await flush();
for (const link of anchors(tree)) { let blocked = false; link.props.onClick({ preventDefault: () => { blocked = true; } }); equal(blocked, false, 'tracking never calls preventDefault'); }
equal(events.length, 6); ok(events.every(([name]) => name === 'universe_nav_click'));
equal(events.map(([, d]) => d.target_site), [...order, 'canopy']);
events.forEach(([, d], index) => {
  equal(Object.keys(d).sort(), EVENT_KEYS);
  equal([d.source_site, d.viewport, d.viewport_width, d.viewport_height, d.viewport_category, d.login_status, d.surface, d.entry_surface, d.transport_type], ['map', '390x844', 390, 844, 'mobile', 'authenticated', 'universe_rail', 'universe_rail', 'beacon']);
  equal([d.link_name, d.destination_type], index < 5 ? [labels[order[index]], 'cross_site_nav'] : ['Canopy', 'external']);
});
width = 800; events.length = 0; anchors(tree)[0].props.onClick({}); equal(events[0][1].viewport_category, 'tablet');
width = 1440; events.length = 0; anchors(tree)[0].props.onClick({}); equal(events[0][1].viewport_category, 'desktop');
// In-panel links track too, then close the menu.
width = 390; events.length = 0; button(tree).props.onClick(); tree = render(); anchors(panel(tree))[1].props.onClick({}); equal(events[0][1].target_site, 'gacha'); tree = render(); equal(panel(tree), undefined);
// Login status: unknown without an adapter, read once, garbage or failure degrades to unknown.
for (const [adapter, expected] of [
  [undefined, 'unknown'], [() => 'anonymous', 'anonymous'], [async () => 'authenticated', 'authenticated'],
  [() => { throw new Error('boom'); }, 'unknown'], [async () => { throw new Error('boom'); }, 'unknown'], [async () => 'maybe', 'unknown'],
]) {
  events.length = 0; reset({ currentSite: 'shop', onTrack: (name, details) => events.push(details), getLoginStatus: adapter });
  tree = render(); await flush(); anchors(tree)[0].props.onClick({}); equal(events[0].login_status, expected);
}
let calls = 0; reset({ currentSite: 'shop', getLoginStatus: () => { calls++; return 'anonymous'; } }); render(); render(); render(); equal(calls, 1, 'login status is read once and cached');
// Analytics failure must not break the click, sync or async.
reset({ currentSite: 'gacha', onTrack: () => { throw new Error('gtag exploded'); } }); tree = render();
anchors(tree).forEach(link => link.props.onClick({})); equal(true, true, 'a throwing onTrack does not propagate');
const unhandled = []; const onUnhandled = (reason) => unhandled.push(reason); process.on('unhandledRejection', onUnhandled);
reset({ currentSite: 'gacha', onTrack: async () => { throw new Error('async gtag exploded'); } }); tree = render(); anchors(tree)[0].props.onClick({}); await flush(); await flush();
process.off('unhandledRejection', onUnhandled); equal(unhandled.length, 0, 'a rejecting onTrack leaves no unhandled rejection');

// 5. Pure helpers.
const { buildUniverseHref, createKiwimuUniverseNavigationDetails, readSupabaseLoginStatus } = exports;
equal(buildUniverseHref('canopy', 'passport', { fromParam: 'x' }), 'https://canopy.kiwimu.com/');
equal(buildUniverseHref('map', 'passport', { fromParam: 'abc_1' }), 'https://map.kiwimu.com/?from=abc_1');
for (const [w, category] of [[0, 'unknown'], [640, 'mobile'], [641, 'tablet'], [1024, 'tablet'], [1025, 'desktop']]) {
  width = w; equal(createKiwimuUniverseNavigationDetails('map', 'shop', 'anonymous').viewport_category, category);
}
equal(createKiwimuUniverseNavigationDetails('map', 'shop', 'anonymous', 'custom_surface').entry_surface, 'custom_surface');
const session = (result) => ({ auth: { getSession: async () => result } });
equal(await readSupabaseLoginStatus(null), 'unknown'); equal(await readSupabaseLoginStatus(undefined), 'unknown');
equal(await readSupabaseLoginStatus(session({ data: { session: { user: { id: '1' } } }, error: null })), 'authenticated');
equal(await readSupabaseLoginStatus(session({ data: { session: null }, error: null })), 'anonymous');
equal(await readSupabaseLoginStatus(session({ data: { session: { user: null } }, error: null })), 'anonymous');
equal(await readSupabaseLoginStatus(session({ data: { session: null }, error: new Error('x') })), 'unknown');
equal(await readSupabaseLoginStatus({ auth: { getSession: async () => { throw new Error('x'); } } }), 'unknown');
equal(await readSupabaseLoginStatus({ auth: { getSession: () => { throw new Error('x'); } } }), 'unknown');

console.log(`Universe rail (kit): ${checks} actual-source checks passed; external writes 0`);
