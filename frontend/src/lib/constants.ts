import type { Category, City } from '../api/types';

export const CATEGORIES: Category[] = ['ผิวพรรณ', 'การนอนหลับ', 'พลังงาน', 'ภูมิคุ้มกัน', 'กระดูกและข้อ', 'สุขภาพทั่วไป'];

export const CAT_TINTS: Record<string, string> = {
  'ผิวพรรณ': '#F6E7E4',
  'การนอนหลับ': '#E7E8F4',
  'พลังงาน': '#F6EEDB',
  'ภูมิคุ้มกัน': '#E2F1E8',
  'กระดูกและข้อ': '#ECEAE4',
  'สุขภาพทั่วไป': '#E1EEF2',
};

export const CITIES: City[] = ['กรุงเทพมหานคร', 'เชียงใหม่', 'ขอนแก่น', 'ภูเก็ต'];

export const SHIPPING = 40;

export const PRICE_RANGES = [
  { id: 'all', label: 'ทุกราคา', ok: (_p: number) => true },
  { id: 'lt300', label: 'ต่ำกว่า ฿300', ok: (p: number) => p < 300 },
  { id: 'mid', label: '฿300 – ฿500', ok: (p: number) => p >= 300 && p <= 500 },
  { id: 'gt500', label: 'มากกว่า ฿500', ok: (p: number) => p > 500 },
];
