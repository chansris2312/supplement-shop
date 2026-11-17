// Pure planner logic: answer sanitising, Gemini prompt/schema, validation, safety rules, fallback.
// No AWS calls here, so it can be unit-tested locally (see backend/scripts/test-planner.mjs).

const STRING_FIELDS = ['age', 'weight', 'height', 'sleep', 'sleepq', 'work', 'hours', 'meals', 'diet', 'veg', 'ex', 'stress', 'preg', 'meds'];
const GOALS = ['ผิวพรรณ', 'การนอนหลับ', 'พลังงาน', 'ภูมิคุ้มกัน', 'กระดูกและข้อ'];

/** Keep only known questionnaire fields (whitelist), so no name/email/id can slip through. */
export function sanitizeAnswers(raw = {}) {
  const out = {};
  for (const k of STRING_FIELDS) {
    if (raw[k] !== undefined && raw[k] !== null) out[k] = String(raw[k]).slice(0, k === 'meds' ? 500 : 40);
  }
  out.goal = Array.isArray(raw.goal) ? raw.goal.filter((g) => GOALS.includes(g)) : [];
  return out;
}

/** Medication / condition text or pregnancy forces the "see a doctor" banner. */
export const mustSeeDoctor = (a) => !!(a.meds && a.meds.trim()) || a.preg === 'ใช่';

export function bmiText(a) {
  const w = parseFloat(a.weight);
  const h = parseFloat(a.height) / 100;
  if (!(w > 0 && h > 0)) return 'ไม่ระบุ';
  const v = w / (h * h);
  const band = v < 18.5 ? 'น้ำหนักน้อย' : v < 23 ? 'ปกติ' : v < 25 ? 'น้ำหนักเกิน' : 'อ้วน';
  return `${v.toFixed(1)} (${band}, เกณฑ์คนเอเชีย)`;
}

export const PLAN_SCHEMA = {
  type: 'OBJECT',
  properties: {
    summary: { type: 'STRING' },
    recommendations: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          productId: { type: 'STRING' },
          reason: { type: 'STRING' },
          howToTake: { type: 'STRING' },
        },
        required: ['productId', 'reason', 'howToTake'],
      },
    },
    lifestyleTips: { type: 'ARRAY', items: { type: 'STRING' } },
    needsDoctor: { type: 'BOOLEAN' },
  },
  required: ['summary', 'recommendations', 'lifestyleTips', 'needsDoctor'],
};

/** Prompt contains only questionnaire answers + product list. Never name, email or user id. */
export function buildPrompt(answers, products) {
  const catalogue = products.map((p) => ({ productId: p.productId, name: p.name, cat: p.cat }));
  return [
    'คุณคือผู้ช่วยแนะนำอาหารเสริมของร้านค้าออนไลน์ ไม่ใช่แพทย์ และห้ามวินิจฉัยโรค',
    'งานของคุณ: อ่านคำตอบแบบประเมินไลฟ์สไตล์ แล้วแนะนำอาหารเสริมไม่เกิน 3 รายการ โดยเลือกได้เฉพาะจากรายการสินค้าที่ให้ไว้เท่านั้น (ใช้ productId ตามรายการ)',
    'สำหรับแต่ละรายการ ให้เหตุผลสั้น ๆ ที่อ้างอิงคำตอบของผู้ใช้ (reason) และวิธีทาน (howToTake) ที่ขึ้นต้นด้วย "ทานตามขนาดบนฉลาก" แล้วตามด้วยช่วงเวลาที่เหมาะสม',
    'summary: สรุปไลฟ์สไตล์ 1-2 ประโยค เป็นภาษาไทย',
    'lifestyleTips: เคล็ดลับปรับไลฟ์สไตล์ 3 ข้อ สั้น ๆ เป็นภาษาไทย',
    'needsDoctor: true ถ้ามียาประจำ โรคประจำตัว ตั้งครรภ์หรือให้นมบุตร',
    'ตอบเป็น JSON เท่านั้น ทุกข้อความเป็นภาษาไทย',
    '',
    'คำตอบแบบประเมิน (JSON):',
    JSON.stringify({ ...answers, bmi: bmiText(answers) }),
    '',
    'รายการสินค้าที่เลือกได้ (JSON):',
    JSON.stringify(catalogue),
  ].join('\n');
}

const isStr = (v) => typeof v === 'string' && v.trim().length > 0;

/** Shape check for the Gemini response. */
export function isValidPlan(o) {
  return Boolean(
    o &&
    typeof o === 'object' &&
    isStr(o.summary) &&
    Array.isArray(o.recommendations) &&
    o.recommendations.every((r) => r && isStr(r.productId) && isStr(r.reason) && isStr(r.howToTake)) &&
    Array.isArray(o.lifestyleTips) &&
    typeof o.needsDoctor === 'boolean'
  );
}

/** Rule-based plan: each goal -> first product of that category; pad with general health. */
export function fallbackPlan(answers, products) {
  const goals = answers.goal?.length ? answers.goal : ['สุขภาพทั่วไป'];
  const picks = [];
  for (const g of [...goals, 'สุขภาพทั่วไป']) {
    const p = products.find((x) => x.cat === g && !picks.includes(x));
    if (p && picks.length < 3) picks.push(p);
  }
  return {
    summary: `จากคำตอบของคุณ (นอน ${answers.sleep ?? 'ไม่ระบุ'}, ทำงานแบบ${answers.work ?? 'ไม่ระบุ'}, กิน ${answers.meals ?? 'ไม่ระบุ'}/วัน, ความเครียด ${answers.stress ?? '-'} จาก 5) เราเลือกอาหารเสริมตามเป้าหมายเรื่อง${goals.join(' และ ')}`,
    recommendations: picks.map((p) => ({
      productId: p.productId,
      reason: `ตรงกับเป้าหมายด้าน${p.cat}ที่คุณเลือก`,
      howToTake: 'ทานตามขนาดบนฉลาก พร้อมอาหาร',
    })),
    lifestyleTips: [
      'เข้านอนและตื่นเวลาเดิมทุกวัน งดหน้าจอก่อนนอน 1 ชั่วโมง',
      'ดื่มน้ำให้เพียงพอ และกินผักผลไม้ให้ได้ทุกมื้อ',
      'ขยับร่างกายหรือออกกำลังกายเบา ๆ อย่างน้อย 30 นาที 3 วันต่อสัปดาห์',
    ],
    needsDoctor: false,
    source: 'fallback',
  };
}

/**
 * Safety rules enforced in code (not only in the prompt):
 * - drop productIds that are not in Products, de-duplicate, max 3
 * - fall back to rule-based picks if nothing valid remains
 * - force needsDoctor when meds/conditions text exists or pregnancy = ใช่
 */
export function finalizePlan(raw, answers, products) {
  const ids = new Set(products.map((p) => p.productId));
  const seen = new Set();
  let recommendations = (raw.recommendations ?? [])
    .filter((r) => ids.has(r.productId) && !seen.has(r.productId) && seen.add(r.productId))
    .slice(0, 3)
    .map((r) => ({ productId: r.productId, reason: r.reason.trim(), howToTake: r.howToTake.trim() }));
  if (!recommendations.length) recommendations = fallbackPlan(answers, products).recommendations;

  const tips = (raw.lifestyleTips ?? []).filter(isStr).slice(0, 5);
  return {
    result: {
      summary: raw.summary.trim(),
      recommendations,
      lifestyleTips: tips.length ? tips : fallbackPlan(answers, products).lifestyleTips,
    },
    needsDoctor: raw.needsDoctor === true || mustSeeDoctor(answers),
    source: raw.source ?? 'gemini',
  };
}
