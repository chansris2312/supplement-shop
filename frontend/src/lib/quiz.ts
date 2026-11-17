import type { Answers } from '../api/types';

export interface Question {
  id: keyof Answers;
  short: string;
  label: string;
  opts: string[];
  multi?: boolean;
}

export interface Step {
  title: string;
  qs: Question[];
}

/** Steps and options exactly as in design/app/Quiz.dc.html */
export const STEPS: Step[] = [
  { title: 'ข้อมูลร่างกาย', qs: [] },
  {
    title: 'การนอนหลับ',
    qs: [
      { id: 'sleep', short: 'การนอน', label: 'นอนกี่ชั่วโมงต่อคืน', opts: ['น้อยกว่า 5 ชม.', '5–6 ชม.', '7–8 ชม.', 'มากกว่า 8 ชม.'] },
      { id: 'sleepq', short: 'คุณภาพการนอน', label: 'คุณภาพการนอน', opts: ['หลับยาก', 'ตื่นกลางดึกบ่อย', 'หลับสบาย'] },
    ],
  },
  {
    title: 'การทำงาน',
    qs: [
      { id: 'work', short: 'ลักษณะงาน', label: 'ลักษณะงานส่วนใหญ่', opts: ['นั่งโต๊ะเป็นหลัก', 'ยืนหรือเดินบ่อย', 'ใช้แรงงาน', 'ทำงานเป็นกะ / กะดึก'] },
      { id: 'hours', short: 'ชั่วโมงทำงาน', label: 'ชั่วโมงทำงานต่อวัน', opts: ['น้อยกว่า 8 ชม.', '8–10 ชม.', 'มากกว่า 10 ชม.'] },
    ],
  },
  {
    title: 'อาหารการกิน',
    qs: [
      { id: 'meals', short: 'มื้ออาหาร', label: 'กินอาหารกี่มื้อต่อวัน', opts: ['1 มื้อ', '2 มื้อ', '3 มื้อ', '4 มื้อขึ้นไป'] },
      { id: 'diet', short: 'รูปแบบการกิน', label: 'รูปแบบการกิน', opts: ['ทั่วไป', 'มังสวิรัติ', 'วีแกน', 'คาร์บต่ำ / คีโต'] },
      { id: 'veg', short: 'ผักผลไม้', label: 'กินผักและผลไม้', opts: ['แทบไม่กิน', 'บางมื้อ', 'ทุกมื้อ'] },
    ],
  },
  {
    title: 'ออกกำลังกายและความเครียด',
    qs: [
      { id: 'ex', short: 'ออกกำลังกาย', label: 'ออกกำลังกายกี่วันต่อสัปดาห์', opts: ['ไม่ออกเลย', '1–2 วัน', '3–4 วัน', '5 วันขึ้นไป'] },
      { id: 'stress', short: 'ความเครียด', label: 'ระดับความเครียด (1 = น้อย, 5 = มาก)', opts: ['1', '2', '3', '4', '5'] },
    ],
  },
  {
    title: 'เป้าหมายและสุขภาพ',
    qs: [
      { id: 'goal', short: 'เป้าหมาย', label: 'อยากดูแลเรื่องไหน (เลือกได้หลายข้อ)', multi: true, opts: ['ผิวพรรณ', 'การนอนหลับ', 'พลังงาน', 'ภูมิคุ้มกัน', 'กระดูกและข้อ'] },
      { id: 'preg', short: 'ตั้งครรภ์/ให้นมบุตร', label: 'ตั้งครรภ์หรือให้นมบุตร', opts: ['ใช่', 'ไม่ใช่', 'ไม่เกี่ยวข้อง'] },
    ],
  },
];

/** Short labels for the stat tiles on the result page. */
const WORK_SHORT: Record<string, string> = {
  'นั่งโต๊ะเป็นหลัก': 'นั่งโต๊ะ',
  'ยืนหรือเดินบ่อย': 'ยืน/เดิน',
  'ใช้แรงงาน': 'ใช้แรงงาน',
  'ทำงานเป็นกะ / กะดึก': 'ทำงานกะ',
};

export const statWork = (v?: string) => (v ? WORK_SHORT[v] ?? v : '—');
export const statMeals = (v?: string) => (v ? (v === '4 มื้อขึ้นไป' ? '4+ มื้อ/วัน' : v + '/วัน') : '—');
export const statStress = (v?: string) => (v ? v + ' จาก 5' : '—');
