/** "฿1,250" with Thai number formatting. */
export const baht = (n: number) => '฿' + n.toLocaleString('th-TH');

/** "17 พ.ย. 2569" (Thai short month, Buddhist year). */
export const thaiDate = (iso: string) =>
  new Date(iso).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Bangkok' });

/** BMI with Asian cut-offs. Returns null when weight/height are missing. */
export function bmiOf(weight?: string, height?: string) {
  const w = parseFloat(weight ?? '');
  const h = parseFloat(height ?? '') / 100;
  if (!(w > 0 && h > 0)) return null;
  const value = w / (h * h);
  const band = value < 18.5 ? 'น้ำหนักน้อย' : value < 23 ? 'ปกติ' : value < 25 ? 'น้ำหนักเกิน' : 'อ้วน';
  return { value, text: value.toFixed(1), band };
}
