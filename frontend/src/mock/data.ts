import type { CartItem, Me, Order, Plan, Product } from '../api/types';

/** Same 12 products as CLAUDE.md section 7 and backend/scripts/seed.mjs */
export const MOCK_PRODUCTS: Product[] = [
  { productId: 'p01', name: 'วิตามินซี 1000 มก.', cat: 'ภูมิคุ้มกัน', price: 290, stock: 50 },
  { productId: 'p02', name: 'คอลลาเจนเปปไทด์', cat: 'ผิวพรรณ', price: 590, stock: 50 },
  { productId: 'p03', name: 'แมกนีเซียม', cat: 'การนอนหลับ', price: 350, stock: 50 },
  { productId: 'p04', name: 'วิตามินบีรวม', cat: 'พลังงาน', price: 320, stock: 50 },
  { productId: 'p05', name: 'โอเมก้า-3 น้ำมันปลา', cat: 'สุขภาพทั่วไป', price: 450, stock: 50 },
  { productId: 'p06', name: 'วิตามินดี 3', cat: 'กระดูกและข้อ', price: 390, stock: 50 },
  { productId: 'p07', name: 'ซิงค์', cat: 'ภูมิคุ้มกัน', price: 250, stock: 50 },
  { productId: 'p08', name: 'ไบโอติน', cat: 'ผิวพรรณ', price: 390, stock: 50 },
  { productId: 'p09', name: 'โพรไบโอติก', cat: 'สุขภาพทั่วไป', price: 520, stock: 50 },
  { productId: 'p10', name: 'แคลเซียม + วิตามินเค 2', cat: 'กระดูกและข้อ', price: 480, stock: 50 },
  { productId: 'p11', name: 'กลูตาไธโอน', cat: 'ผิวพรรณ', price: 690, stock: 50 },
  { productId: 'p12', name: 'ธาตุเหล็ก', cat: 'พลังงาน', price: 220, stock: 50 },
];

/** Cart from Cart.dc.html */
export const MOCK_CART: CartItem[] = [
  { productId: 'p03', qty: 1 },
  { productId: 'p04', qty: 1 },
];

type Line = [productId: string, name: string, qty: number, price: number];

const order = (n: number, date: string, lines: Line[]): Order => {
  const subtotal = lines.reduce((t, l) => t + l[2] * l[3], 0);
  return {
    orderId: 'NM-' + String(n).padStart(4, '0'),
    status: 'done',
    items: lines.map(([productId, name, qty, price]) => ({ productId, name, qty, price })),
    subtotal,
    shipping: 40,
    total: subtotal + 40,
    createdAt: date,
  };
};

/** Orders from History.dc.html (newest first) */
export const MOCK_ORDERS: Order[] = [
  order(3, '2026-11-17T10:15:00+07:00', [['p03', 'แมกนีเซียม', 1, 350], ['p04', 'วิตามินบีรวม', 1, 320]]),
  order(2, '2026-11-02T14:30:00+07:00', [['p02', 'คอลลาเจนเปปไทด์', 2, 590]]),
  order(1, '2026-10-20T09:05:00+07:00', [['p01', 'วิตามินซี 1000 มก.', 1, 290], ['p07', 'ซิงค์', 1, 250]]),
];

/** Plan from Result.dc.html; answers from Quiz.dc.html */
export const MOCK_PLAN: Plan = {
  createdAt: '2026-11-17T09:00:00+07:00',
  answers: {
    age: '24', weight: '62', height: '168',
    sleep: '5–6 ชม.', work: 'นั่งโต๊ะเป็นหลัก', meals: '2 มื้อ', stress: '4',
    goal: ['การนอนหลับ', 'พลังงาน'], meds: '',
  },
  result: {
    summary: 'คุณนอนเฉลี่ย 5–6 ชั่วโมงต่อคืน นั่งทำงานเป็นหลัก กินวันละ 2 มื้อ และมีความเครียดค่อนข้างสูง (4 จาก 5) เป้าหมายคือนอนหลับดีขึ้นและมีพลังงานระหว่างวัน',
    recommendations: [
      { productId: 'p03', reason: 'คุณนอนเพียง 5–6 ชั่วโมงและมีความเครียดสูง ตรงกับเป้าหมายเรื่องการนอน', howToTake: 'ทานตามขนาดบนฉลาก ช่วงเย็นหรือก่อนนอน' },
      { productId: 'p04', reason: 'คุณกินวันละ 2 มื้อ และอยากมีพลังงานระหว่างวันมากขึ้น', howToTake: 'ทานตามขนาดบนฉลาก หลังอาหารเช้า' },
      { productId: 'p05', reason: 'เสริมจากการกินไม่ครบ 3 มื้อและกินปลาไม่บ่อย', howToTake: 'ทานตามขนาดบนฉลาก พร้อมอาหาร' },
    ],
    lifestyleTips: [
      'เข้านอนและตื่นเวลาเดิมทุกวัน งดหน้าจอก่อนนอน',
      'ลุกเดินหรือยืดเหยียดทุก 1 ชั่วโมงระหว่างนั่งทำงาน',
      'เพิ่มมื้อเช้าเล็ก ๆ ให้ครบ 3 มื้อ',
    ],
  },
  needsDoctor: false,
};

export const MOCK_ME: Me = { email: 'demo@example.com', city: 'กรุงเทพมหานคร', weeklySignal: true };

/** Mock signed-in user (avatar letter "ผ" as in the mockups). Admin so /admin can be tried. */
export const MOCK_USER = { name: 'ผู้ใช้ตัวอย่าง', email: 'demo@example.com', isAdmin: true };
