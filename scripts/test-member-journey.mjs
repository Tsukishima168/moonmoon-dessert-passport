import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
const source = readFileSync(new URL('../src/lib/memberJourney.ts', import.meta.url), 'utf8');
const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
const { detectIncomingSite, getNextMission, parseJourneyMode } = await import(`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`);
let assertions = 0;
for (const [from, expected] of [['mbti_v2_footer_passport','kiwimu_mbti'],['mbti_explore_passport','kiwimu_mbti'],['map_hero_checkin','moon_map'],['shop_order_passport','dessert_booking'],['gacha_member_return','gacha'],['kiwimu_mbti','kiwimu_mbti'],['moon_map','moon_map'],['dessert_booking','dessert_booking']]) {
  assert.equal(detectIncomingSite(`?from=${from}`, ''), expected); assertions++;
}
for (const [referrer, expected] of [['https://map.kiwimu.com/menu','moon_map'],['https://kiwimu.com/read/ESTJ-A','kiwimu_mbti'],['https://moon-dessert-booking.vercel.app/','dessert_booking'],['https://kiwimu.com.evil.example/','null'],['https://evil.example/?next=https://kiwimu.com','null'],['http://kiwimu.com/','null'],['not a URL','null'],['https://constructor/','null'],['https://__proto__/','null']]) {
  assert.equal(detectIncomingSite('', referrer), expected === 'null' ? null : expected); assertions++;
}
for (const invalid of ['maple','map-hero','map!','__proto__','constructor','a'.repeat(65),'']) {
  assert.equal(detectIncomingSite(`?from=${encodeURIComponent(invalid)}`, 'https://map.kiwimu.com/'), null); assertions++;
}
const stamps = [
  { id: 'shop_checkin', unlockMethod: 'gps' },
  { id: 'quiz_completed', unlockMethod: 'qr' },
  { id: 'ig_followed', unlockMethod: 'external' },
  { id: 'line_joined', unlockMethod: 'external' },
  { id: 'order_with_staff', unlockMethod: 'qr' },
  { id: 'google_review', unlockMethod: 'external' },
  { id: 'secret', unlockMethod: 'qr', isSecret: true },
];
assert.equal(getNextMission(stamps, [], 'online').id, 'quiz_completed'); assertions++;
assert.equal(getNextMission(stamps, ['quiz_completed'], 'online').id, 'ig_followed'); assertions++;
assert.equal(getNextMission(stamps, ['quiz_completed','ig_followed','line_joined'], 'online'), null); assertions++;
assert.equal(getNextMission(stamps, [], 'store').id, 'shop_checkin'); assertions++;
assert.equal(getNextMission(stamps, ['shop_checkin'], 'store').id, 'order_with_staff'); assertions++;
assert.equal(getNextMission(stamps, ['shop_checkin','order_with_staff'], 'store'), null); assertions++;
assert.equal(parseJourneyMode('store'), 'store'); assertions++;
assert.equal(parseJourneyMode('unexpected'), 'online'); assertions++;
console.log(`Member journey: ${assertions} source, hostname, mission and fallback assertions passed; no account or reward operations.`);
