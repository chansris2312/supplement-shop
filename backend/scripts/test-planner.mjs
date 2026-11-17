// Local checks for the planner safety rules (no AWS needed): node backend/scripts/test-planner.mjs
import assert from 'node:assert/strict';
import { buildPrompt, fallbackPlan, finalizePlan, isValidPlan, sanitizeAnswers } from '../src/lib/planner.mjs';

const products = [
  { productId: 'p03', name: 'แมกนีเซียม', cat: 'การนอนหลับ', price: 350 },
  { productId: 'p04', name: 'วิตามินบีรวม', cat: 'พลังงาน', price: 320 },
  { productId: 'p05', name: 'โอเมก้า-3 น้ำมันปลา', cat: 'สุขภาพทั่วไป', price: 450 },
  { productId: 'p02', name: 'คอลลาเจนเปปไทด์', cat: 'ผิวพรรณ', price: 590 },
];

// 1. Whitelist strips anything that is not a questionnaire field
const a = sanitizeAnswers({ sleep: '5–6 ชม.', goal: ['การนอนหลับ', 'hack'], email: 'x@y.z', name: 'Somchai', userId: 'abc' });
assert.deepEqual(Object.keys(a).sort(), ['goal', 'sleep']);
assert.deepEqual(a.goal, ['การนอนหลับ']);

// 2. Prompt never contains personal data
const prompt = buildPrompt(a, products);
assert.ok(!prompt.includes('x@y.z') && !prompt.includes('Somchai'));

// 3. Unknown productIds dropped, duplicates removed, max 3
const raw = {
  summary: 'ok',
  recommendations: [
    { productId: 'p99', reason: 'r', howToTake: 'h' },
    { productId: 'p03', reason: 'r', howToTake: 'h' },
    { productId: 'p03', reason: 'r', howToTake: 'h' },
    { productId: 'p04', reason: 'r', howToTake: 'h' },
    { productId: 'p05', reason: 'r', howToTake: 'h' },
    { productId: 'p02', reason: 'r', howToTake: 'h' },
  ],
  lifestyleTips: ['a', 'b', 'c'],
  needsDoctor: false,
};
assert.ok(isValidPlan(raw));
const fin = finalizePlan(raw, a, products);
assert.deepEqual(fin.result.recommendations.map((r) => r.productId), ['p03', 'p04', 'p05']);
assert.equal(fin.needsDoctor, false);

// 4. needsDoctor forced by medication text or pregnancy
assert.equal(finalizePlan(raw, { ...a, meds: 'ยาความดัน' }, products).needsDoctor, true);
assert.equal(finalizePlan(raw, { ...a, preg: 'ใช่' }, products).needsDoctor, true);
assert.equal(finalizePlan(raw, { ...a, meds: '   ' }, products).needsDoctor, false);

// 5. All-invalid recommendations -> rule-based picks
const empty = finalizePlan({ ...raw, recommendations: [{ productId: 'zzz', reason: 'r', howToTake: 'h' }] }, a, products);
assert.equal(empty.result.recommendations[0].productId, 'p03');

// 6. Invalid shapes rejected
assert.equal(isValidPlan({ summary: '', recommendations: [], lifestyleTips: [], needsDoctor: false }), false);
assert.equal(isValidPlan(null), false);

// 7. Fallback follows goals and is valid
const fb = fallbackPlan({ goal: ['พลังงาน', 'ผิวพรรณ'] }, products);
assert.ok(isValidPlan(fb));
assert.deepEqual(fb.recommendations.map((r) => r.productId), ['p04', 'p02', 'p05']);

console.log('planner tests passed');
