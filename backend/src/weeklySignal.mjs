// "Wellness Signal" — runs every Monday 08:00 Asia/Bangkok (EventBridge Scheduler).
// 1) users with weeklySignal = true  2) PM2.5 once per distinct city  3) Gemini writes a 3-line note
// 4) publish to SNS with message attribute userId (each email subscription filters on its own userId).
// Manual test: Lambda console > Test with {} (all users) or {"userId": "<cognito sub>"} (one user).
import { PublishCommand, SNSClient } from '@aws-sdk/client-sns';
import { latestPlan, listOrders, listProducts, scanAll, TABLES } from './lib/db.mjs';
import { generateValidated } from './lib/gemini.mjs';
import { latestPm25, pm25Level } from './lib/openaq.mjs';
import { DISCLAIMER } from './lib/catalog.mjs';

const sns = new SNSClient({});
const REFILL_DAYS = 25;
const DAY_MS = 24 * 60 * 60 * 1000;

const NOTE_SCHEMA = {
  type: 'OBJECT',
  properties: {
    airQuality: { type: 'STRING' },
    lifestyleTip: { type: 'STRING' },
    refillReminder: { type: 'STRING' },
  },
  required: ['airQuality', 'lifestyleTip', 'refillReminder'],
};

const airText = (city, air) =>
  air
    ? `PM2.5 ล่าสุดใน${city} ${air.value} ${air.unit} (${pm25Level(air.value)})`
    : `ไม่มีข้อมูล PM2.5 ล่าสุดของ${city}ในสัปดาห์นี้`;

/** Builds the 3 lines with Gemini; falls back to a fixed template if Gemini fails. */
async function writeNote({ city, air, plan, productNames, daysSinceOrder }) {
  const needsRefill = daysSinceOrder !== null && daysSinceOrder > REFILL_DAYS;
  const facts = {
    city,
    pm25: air ? { value: air.value, unit: air.unit, level: pm25Level(air.value) } : 'ไม่มีข้อมูล',
    lifestyleSummary: plan?.result?.summary ?? 'ไม่มีข้อมูล',
    previousTips: plan?.result?.lifestyleTips ?? [],
    recommendedProducts: productNames,
    daysSinceLastOrder: daysSinceOrder ?? 'ยังไม่เคยสั่งซื้อ',
    needsRefill,
  };
  const prompt = [
    'คุณคือผู้ช่วยด้านไลฟ์สไตล์ของร้านอาหารเสริมออนไลน์ ไม่ใช่แพทย์',
    'เขียนอีเมลสั้น 3 บรรทัดเป็นภาษาไทย ตอบเป็น JSON เท่านั้น:',
    'airQuality: 1 ประโยคเรื่องคุณภาพอากาศ (PM2.5) ในเมืองนี้สัปดาห์นี้ พร้อมคำแนะนำสั้น ๆ (เช่น ใส่หน้ากากเมื่อค่าสูง) ถ้าไม่มีข้อมูลให้บอกว่าไม่มีข้อมูล',
    'lifestyleTip: เคล็ดลับไลฟ์สไตล์ 1 ข้อ ที่เข้ากับข้อมูลผู้ใช้',
    'refillReminder: ถ้า needsRefill เป็น true ให้เตือนว่าอาจใกล้ถึงเวลาซื้อสินค้าซ้ำ ถ้าไม่ใช่ให้ส่งข้อความว่าง ""',
    'ห้ามวินิจฉัยโรคหรือแนะนำขนาดยา',
    '',
    JSON.stringify(facts),
  ].join('\n');

  const valid = (o) => o && typeof o.airQuality === 'string' && o.airQuality && typeof o.lifestyleTip === 'string' && o.lifestyleTip;
  const note = await generateValidated({ prompt, schema: NOTE_SCHEMA, temperature: 0.6 }, valid);

  return {
    air: note?.airQuality || airText(city, air),
    tip: note?.lifestyleTip || plan?.result?.lifestyleTips?.[0] || 'นอนหลับให้ได้ 7–8 ชั่วโมง และดื่มน้ำให้เพียงพอ',
    refill: needsRefill ? note?.refillReminder || `สั่งซื้อครั้งล่าสุดเมื่อ ${daysSinceOrder} วันก่อน อาจใกล้ถึงเวลาซื้อซ้ำแล้ว` : '',
    usedGemini: !!note,
  };
}

function emailBody(note, city, air) {
  return [
    'สวัสดีจาก NutriMate — สัญญาณสุขภาพประจำสัปดาห์',
    '',
    `1) คุณภาพอากาศ: ${note.air}`,
    air ? `   (ข้อมูล OpenAQ สถานี ${air.locationName ?? city})` : '',
    `2) เคล็ดลับประจำสัปดาห์: ${note.tip}`,
    `3) เตือนซื้อซ้ำ: ${note.refill || 'ยังไม่ถึงเวลาซื้อซ้ำ'}`,
    '',
    '—',
    DISCLAIMER,
    `ต้องการหยุดรับอีเมลนี้? เข้าเว็บไซต์ ${process.env.SITE_URL}/result แล้วปิดสวิตช์ "สัญญาณสุขภาพรายสัปดาห์" หรือกดลิงก์ unsubscribe ด้านล่างอีเมลนี้`,
  ]
    .filter((l) => l !== '')
    .join('\n');
}

export const handler = async (event = {}) => {
  const started = Date.now();
  let users = await scanAll({
    TableName: TABLES.users,
    FilterExpression: 'weeklySignal = :t',
    ExpressionAttributeValues: { ':t': true },
  });
  if (event.userId) users = users.filter((u) => u.userId === event.userId);

  // One PM2.5 lookup per distinct city, cached for this run
  const cities = [...new Set(users.map((u) => u.city || 'กรุงเทพมหานคร'))];
  const airByCity = new Map();
  for (const city of cities) {
    try {
      airByCity.set(city, await latestPm25(city));
    } catch (err) {
      console.warn(JSON.stringify({ msg: 'openaq failed', city, error: String(err) }));
      airByCity.set(city, null);
    }
  }

  const products = new Map((await listProducts()).map((p) => [p.productId, p.name]));
  let sent = 0;
  let geminiNotes = 0;
  const failures = [];

  for (const u of users) {
    try {
      const city = u.city || 'กรุงเทพมหานคร';
      const air = airByCity.get(city);
      const [plan, orders] = await Promise.all([latestPlan(u.userId), listOrders(u.userId)]);
      const lastOrder = orders[0]?.createdAt;
      const daysSinceOrder = lastOrder ? Math.floor((Date.now() - Date.parse(lastOrder)) / DAY_MS) : null;
      const productNames = (plan?.result?.recommendations ?? []).map((r) => products.get(r.productId)).filter(Boolean);

      const note = await writeNote({ city, air, plan, productNames, daysSinceOrder });
      if (note.usedGemini) geminiNotes++;

      await sns.send(
        new PublishCommand({
          TopicArn: process.env.SIGNAL_TOPIC_ARN,
          Subject: 'NutriMate Wellness Signal - weekly health note',
          Message: emailBody(note, city, air),
          MessageAttributes: { userId: { DataType: 'String', StringValue: u.userId } },
        }),
      );
      sent++;
    } catch (err) {
      failures.push(u.userId);
      console.error(JSON.stringify({ msg: 'user failed', userId: u.userId, error: String(err) }));
    }
  }

  const summary = {
    msg: 'weeklySignal summary',
    usersProcessed: users.length,
    emailsPublished: sent,
    geminiNotes,
    cities: Object.fromEntries([...airByCity].map(([c, a]) => [c, a ? a.value : 'no data'])),
    failures: failures.length,
    ms: Date.now() - started,
  };
  console.log(JSON.stringify(summary));
  return summary;
};
