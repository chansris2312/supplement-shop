import { MOCK_CART, MOCK_ME, MOCK_ORDERS, MOCK_PLAN, MOCK_PRODUCTS } from '../mock/data';
import { PRICE_RANGES, SHIPPING } from '../lib/constants';
import type { Answers, Api, CartItem, Me, Order, Plan, Product } from './types';

/** In-memory backend used when VITE_USE_MOCK=true. State resets on page reload. */
const db = {
  products: MOCK_PRODUCTS.map((p) => ({ ...p })),
  cart: MOCK_CART.map((c) => ({ ...c })),
  orders: MOCK_ORDERS.map((o) => ({ ...o })),
  plan: structuredClone(MOCK_PLAN) as Plan | null,
  me: { ...MOCK_ME } as Me,
};

const wait = <T>(value: T, ms = 150) => new Promise<T>((r) => setTimeout(() => r(structuredClone(value)), ms));

const GOAL_TO_CAT: Record<string, string> = {
  'ผิวพรรณ': 'ผิวพรรณ',
  'การนอนหลับ': 'การนอนหลับ',
  'พลังงาน': 'พลังงาน',
  'ภูมิคุ้มกัน': 'ภูมิคุ้มกัน',
  'กระดูกและข้อ': 'กระดูกและข้อ',
};

/** Same idea as the backend fallback: goal -> category, max 3 products. */
function ruleBasedPlan(a: Answers): Plan {
  const cats = (a.goal?.length ? a.goal : ['สุขภาพทั่วไป']).map((g) => GOAL_TO_CAT[g] ?? 'สุขภาพทั่วไป');
  const picks: Product[] = [];
  for (const c of cats) {
    const p = db.products.find((x) => x.cat === c && !picks.includes(x));
    if (p && picks.length < 3) picks.push(p);
  }
  if (picks.length < 3) {
    const extra = db.products.find((x) => x.cat === 'สุขภาพทั่วไป' && !picks.includes(x));
    if (extra) picks.push(extra);
  }
  const needsDoctor = !!a.meds?.trim() || a.preg === 'ใช่';
  return {
    createdAt: new Date().toISOString(),
    answers: a,
    needsDoctor,
    result: {
      summary: `คุณนอน${a.sleep ?? 'ไม่ระบุ'}ต่อคืน ลักษณะงาน${a.work ?? 'ไม่ระบุ'} กินวันละ ${a.meals ?? '-'} ความเครียด ${a.stress ?? '-'} จาก 5 เป้าหมายคือ${(a.goal ?? ['สุขภาพทั่วไป']).join(' และ ')} (ผลจำลองในโหมดเดโม)`,
      recommendations: picks.map((p) => ({
        productId: p.productId,
        reason: `ตรงกับเป้าหมายเรื่อง${p.cat}ของคุณ`,
        howToTake: 'ทานตามขนาดบนฉลาก พร้อมอาหาร',
      })),
      lifestyleTips: [
        'เข้านอนและตื่นเวลาเดิมทุกวัน งดหน้าจอก่อนนอน',
        'ดื่มน้ำให้เพียงพอ อย่างน้อยวันละ 8 แก้ว',
        'ออกกำลังกายเบา ๆ อย่างน้อย 30 นาที 3 วันต่อสัปดาห์',
      ],
    },
  };
}

export const mockApi: Api = {
  async listProducts(q = {}) {
    const range = PRICE_RANGES.find((r) => r.id === q.price) ?? PRICE_RANGES[0];
    const term = (q.q ?? '').trim().toLowerCase();
    let list = db.products.filter(
      (p) => (!q.cat || q.cat === 'ทั้งหมด' || p.cat === q.cat) && range.ok(p.price) && (!term || p.name.toLowerCase().includes(term)),
    );
    if (q.sort === 'low') list = [...list].sort((a, b) => a.price - b.price);
    if (q.sort === 'high') list = [...list].sort((a, b) => b.price - a.price);
    return wait(list);
  },
  async getProduct(id) {
    const p = db.products.find((x) => x.productId === id);
    if (!p) throw new Error('not found');
    return wait(p);
  },
  async saveProduct(input) {
    const existing = input.productId ? db.products.find((x) => x.productId === input.productId) : undefined;
    if (existing) {
      Object.assign(existing, input);
      return wait(existing);
    }
    const next = 'p' + String(db.products.length + 1).padStart(2, '0');
    const p = { ...input, productId: next } as Product;
    db.products.push(p);
    return wait(p);
  },
  async createUpload() {
    // No S3 in mock mode: the Admin page shows the file as a local object URL instead.
    return wait({ uploadUrl: '', imageUrl: '' });
  },
  getCart: () => wait(db.cart),
  async putCart(items: CartItem[]) {
    db.cart = items.filter((i) => i.qty > 0).map((i) => ({ ...i }));
    return wait(db.cart, 50);
  },
  async createOrder() {
    if (!db.cart.length) throw new Error('ตะกร้าว่าง');
    const items = db.cart.map((c) => {
      const p = db.products.find((x) => x.productId === c.productId)!;
      p.stock -= c.qty;
      return { productId: p.productId, name: p.name, qty: c.qty, price: p.price };
    });
    const subtotal = items.reduce((t, i) => t + i.price * i.qty, 0);
    const n = db.orders.length + 1;
    const order: Order = {
      orderId: 'NM-' + String(n).padStart(4, '0'),
      status: 'done',
      items,
      subtotal,
      shipping: SHIPPING,
      total: subtotal + SHIPPING,
      createdAt: new Date().toISOString(),
    };
    db.orders.unshift(order);
    db.cart = [];
    return wait(order, 400);
  },
  listOrders: () => wait(db.orders),
  async submitQuiz(answers) {
    db.plan = ruleBasedPlan(answers);
    return wait(db.plan, 1200);
  },
  latestPlan: () => wait(db.plan),
  getMe: () => wait(db.me),
  async putMe(patch) {
    const optIn = patch.weeklySignal === true && !db.me.weeklySignal;
    db.me = { ...db.me, ...patch, pendingConfirmation: optIn };
    return wait(db.me);
  },
};
