// Execute the actual rail JSX and its effects with a browser/hook fixture.
// No auth, network, storage, points or redemption APIs are present.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';
let checks = 0;
const equal = (actual, expected, message) => { assert.deepEqual(actual, expected, message); checks++; };
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
const eventTarget = events => ({
  addEventListener: (name, handler) => events.set(name, handler),
  removeEventListener: (name, handler) => { if (events.get(name) === handler) events.delete(name); },
});
Object.assign(documentFixture, eventTarget(docEvents));
const windowFixture = { ...eventTarget(winEvents), get innerHeight() { return height; }, matchMedia: () => ({ matches: width <= 640 }) };
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
const code = ts.transpileModule(readFileSync(new URL('../components/KiwimuUniverseRail.tsx', import.meta.url), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.React, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
}).outputText;
runInNewContext(code, { exports, require: name => { assert.equal(name, 'react'); return { __esModule: true, default: React, ...hooks }; }, window: windowFixture, document: documentFixture, Node: FixtureNode, ResizeObserver: Observer });
const nodes = tree => { if (Array.isArray(tree)) return tree.flatMap(nodes); if (!tree || typeof tree !== 'object') return []; return [tree, ...nodes(tree.props?.children)]; };
const text = tree => Array.isArray(tree) ? tree.map(text).join('') : typeof tree === 'object' && tree ? text(tree.props?.children) : tree ?? '';
let currentSite = 'passport';
const render = () => { slot = 0; const tree = exports.KiwimuUniverseRail({ currentSite }); for (const node of nodes(tree)) { if (node.type === 'aside') node.props.ref.current = rail; if (node.type === 'button') node.props.ref.current = more; } pending.splice(0).forEach(fn => fn()); return tree; };
const button = tree => nodes(tree).find(n => n.type === 'button');
const panel = tree => nodes(tree).find(n => n.props?.id === 'fixture-menu');
const bases = { kiwimu: 'https://kiwimu.com/', passport: 'https://passport.kiwimu.com/', map: 'https://map.kiwimu.com/', gacha: 'https://gacha.kiwimu.com/', shop: 'https://shop.kiwimu.com/' };
for (const id of Object.keys(bases)) {
  currentSite = id; const tree = render(), links = nodes(tree).filter(n => n.type === 'a');
  equal(links.length, 6, 'Five site links plus one exhibition');
  equal(links.filter(n => n.props['aria-current'] === 'page').length, 1);
  links.slice(0, 5).forEach((link, index) => { const key = ['kiwimu', 'passport', 'map', 'gacha', 'shop'][index]; equal(link.props.href, key === id ? bases[key] : bases[key] + '?from=' + id + '_universe_rail'); });
  const forest = links[5]; equal(forest.props.href, 'https://canopy.kiwimu.com/'); equal(forest.props.target, '_blank'); equal(forest.props.rel, 'noopener noreferrer');
}
currentSite = 'passport'; let tree = render(); equal(button(tree).props['aria-controls'], undefined);
button(tree).props.onClick(); tree = render(); equal(button(tree).props['aria-expanded'], true); equal(panel(tree).props.style.maxHeight, 779);
equal(nodes(panel(tree)).filter(n => n.type === 'a').map(text), ['島嶼地圖', '遊戲中心', '森林展覽 ↗臺灣森林冠層・另開分頁']);
let prevented = false; winEvents.get('keydown')({ key: 'Escape', preventDefault: () => { prevented = true; } }); tree = render(); equal(prevented, true); equal(documentFixture.activeElement, more); equal(panel(tree), undefined); equal(button(tree).props['aria-controls'], undefined);
button(tree).props.onClick(); render(); docEvents.get('pointerdown')({ target: new FixtureNode(false) }); tree = render(); equal(panel(tree), undefined);
button(tree).props.onClick(); tree = render(); tree.props.onBlurCapture({ relatedTarget: new FixtureNode(false) }); tree = render(); equal(panel(tree), undefined);
button(tree).props.onClick(); render(); winEvents.get('blur')(); tree = render(); equal(panel(tree), undefined);
button(tree).props.onClick(); render(); railHeight = 100; bottom = 100; height = 240; observers[0].fn(); tree = render(); equal(styleValues.get('--ku-rail-height'), '100px'); equal(panel(tree).props.style.maxHeight, 124);
const forest = nodes(panel(tree)).filter(n => n.type === 'a').at(-1); documentFixture.activeElement = null; forest.props.onClick(); tree = render(); equal(panel(tree), undefined); equal(documentFixture.activeElement, more);
button(tree).props.onClick(); render(); width = 1280; winEvents.get('resize')(); tree = render(); equal(panel(tree), undefined);
slots.forEach(value => value?.cleanup?.()); equal(styleValues.get('--ku-rail-height'), '49px'); equal(winEvents.size, 0); equal(docEvents.size, 0); equal(observers[0].disconnected, true);
console.log(`Universe rail: ${checks} actual-source checks passed; external writes 0`);
