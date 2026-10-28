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
// 集章總數＝7（2026-10-28 店主決定拿掉「Google 評論」章：Google 規定不得以獎勵換評論）。
// 章數、獎勵門檻、成就門檻必須一起動，這裡鎖住：少改任何一處就會出現「永遠達不到」的目標。
const constantsCode = ts.transpileModule(readFileSync(new URL('../constants.tsx', import.meta.url), 'utf8'), { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText;
const { STAMPS, REWARD_TIERS, ACHIEVEMENTS } = await import(`data:text/javascript;base64,${Buffer.from(constantsCode).toString('base64')}`);
const journeyStamps = STAMPS.filter(stamp => !stamp.isSecret);
assert.equal(journeyStamps.length, 7); assertions++;
assert.equal(STAMPS.some(stamp => stamp.id === 'google_review'), false); assertions++;
assert.equal(STAMPS.some(stamp => /g\.page|google\.com\/maps|\/review/.test(stamp.externalLink ?? '')), false); assertions++;
assert.equal(Math.max(...REWARD_TIERS.map(tier => tier.requiredStamps)), journeyStamps.length); assertions++;
assert.equal(REWARD_TIERS.some(tier => tier.requiredStamps > journeyStamps.length), false); assertions++;
assert.equal(REWARD_TIERS.some(tier => tier.id === 'tier_8'), true); assertions++; // id 不改名：既有使用者的 redeemedRewards 以它記錄
assert.equal(ACHIEVEMENTS.find(a => a.id === 'island_guardian').condition.target, journeyStamps.length); assertions++;
assert.equal(ACHIEVEMENTS.some(a => a.condition.target > journeyStamps.length), false); assertions++;
assert.equal(ACHIEVEMENTS.some(a => /\b8\b/.test(a.description)), false); assertions++;
// 島主限定徽章：map 後端要集滿 9 顆彩蛋（api/rewards/claim.ts、progress.ts VALID_EGG_IDS 1..9）才發碼。
assert.match(STAMPS.find(stamp => stamp.id === 'egg_master_2026_q1').description, /9 顆彩蛋/); assertions++;
console.log(`Member journey: ${assertions} source, hostname, mission and fallback assertions passed; no account or reward operations.`);
