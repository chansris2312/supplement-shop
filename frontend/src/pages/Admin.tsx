import { useState, type FormEvent } from 'react';
import { api, type Category, type Product } from '../api';
import { ProductImage } from '../components/ProductImage';
import { Main, PageHeader } from '../components/ui';
import { config } from '../config';
import { CATEGORIES } from '../lib/constants';
import { baht } from '../lib/format';
import { useStore } from '../state/StoreContext';

const input = 'box-border h-11 w-full rounded-[10px] border border-field bg-white px-3.5 text-[15px] text-ink';
const label = 'text-sm font-medium';
const th = 'px-5 py-3.5 font-semibold';
const td = 'px-5 py-3';

/** Uploads an image: presigned S3 PUT on AWS, a local object URL in mock mode. */
async function uploadImage(file: File): Promise<string> {
  if (config.useMock) return URL.createObjectURL(file);
  const { uploadUrl, imageUrl } = await api.createUpload(file.name, file.type);
  const res = await fetch(uploadUrl, { method: 'PUT', headers: { 'Content-Type': file.type }, body: file });
  if (!res.ok) throw new Error('อัปโหลดรูปไม่สำเร็จ');
  return imageUrl;
}

export default function Admin() {
  const { products, refreshProducts, showToast } = useStore();
  const [name, setName] = useState('');
  const [cat, setCat] = useState<Category>(CATEGORIES[0]);
  const [price, setPrice] = useState('');
  const [stock, setStock] = useState('50');
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const imageUrl = file ? await uploadImage(file) : undefined;
      await api.saveProduct({ name: name.trim(), cat, price: Number(price), stock: Number(stock), imageUrl });
      await refreshProducts();
      setName('');
      setPrice('');
      setStock('50');
      setFile(null);
      (e.target as HTMLFormElement).reset();
      showToast('เพิ่มสินค้าแล้ว');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'บันทึกไม่สำเร็จ');
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <PageHeader title="จัดการสินค้า" action={<span className="text-sm text-muted">สำหรับผู้ดูแลระบบ (กลุ่ม admin)</span>} />
      <Main className="flex flex-wrap items-start gap-6">
        <form onSubmit={onSubmit} className="flex flex-[1_1_300px] flex-col gap-4 rounded-2xl border border-line bg-white p-6">
          <h2 className="m-0 font-prompt text-[19px] font-semibold">เพิ่มสินค้าใหม่</h2>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="pname" className={label}>ชื่อสินค้า</label>
            <input id="pname" required value={name} onChange={(e) => setName(e.target.value)} className={input} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="pcat" className={label}>ประเภท</label>
            <select id="pcat" value={cat} onChange={(e) => setCat(e.target.value as Category)} className={input}>
              {CATEGORIES.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="pprice" className={label}>ราคา (บาท)</label>
              <input id="pprice" type="number" min={1} required value={price} onChange={(e) => setPrice(e.target.value)} className={input} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="pstock" className={label}>สต็อก</label>
              <input id="pstock" type="number" min={0} required value={stock} onChange={(e) => setStock(e.target.value)} className={input} />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="pimg" className={label}>รูปสินค้า (ไม่บังคับ)</label>
            <input id="pimg" type="file" accept="image/png,image/jpeg,image/webp" onChange={(e) => setFile(e.target.files?.[0] ?? null)} className="text-sm" />
          </div>
          {error && <p className="m-0 rounded-[10px] bg-warn-bg px-3 py-2.5 text-sm text-warn-text">{error}</p>}
          <button type="submit" disabled={saving} className="h-12 rounded-xl bg-primary text-base font-semibold text-white hover:bg-primary-hover disabled:opacity-70">
            {saving ? 'กำลังบันทึก…' : 'บันทึกสินค้า'}
          </button>
        </form>

        <section aria-label="สินค้าทั้งหมด" className="min-w-0 flex-[999_1_560px] overflow-x-auto rounded-2xl border border-line bg-white">
          <table className="w-full min-w-[640px] border-collapse text-[15px]">
            <thead>
              <tr className="bg-thead text-left">
                <th scope="col" className={th}>สินค้า</th>
                <th scope="col" className={th}>ประเภท</th>
                <th scope="col" className={`${th} text-right`}>ราคา</th>
                <th scope="col" className={th}>สต็อก</th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <ProductRow key={p.productId} p={p} />
              ))}
            </tbody>
          </table>
        </section>
      </Main>
    </>
  );
}

/** One table row with an inline stock editor (POST /api/products upserts by productId). */
function ProductRow({ p }: { p: Product }) {
  const { refreshProducts, showToast } = useStore();
  const [stock, setStock] = useState(String(p.stock));
  const dirty = Number(stock) !== p.stock;

  async function save() {
    await api.saveProduct({ ...p, stock: Number(stock) });
    await refreshProducts();
    showToast('อัปเดตสต็อกแล้ว');
  }

  return (
    <tr className="border-t border-line">
      <td className={td}>
        <div className="flex items-center gap-3">
          <ProductImage cat={p.cat} imageUrl={p.imageUrl} name={p.name} variant="thumb" />
          <div className="flex flex-col">
            <span className="font-semibold">{p.name}</span>
            <span className="text-xs text-muted">{p.productId}</span>
          </div>
        </div>
      </td>
      <td className={td}>{p.cat}</td>
      <td className={`${td} text-right font-prompt font-semibold`}>{baht(p.price)}</td>
      <td className={td}>
        <div className="flex items-center gap-2">
          <input
            type="number"
            min={0}
            aria-label={`สต็อก ${p.name}`}
            value={stock}
            onChange={(e) => setStock(e.target.value)}
            className={`box-border h-11 w-20 rounded-[10px] border px-2.5 text-[15px] ${p.stock < 10 ? 'border-danger text-danger' : 'border-field text-ink'}`}
          />
          {dirty && (
            <button type="button" onClick={save} className="h-11 rounded-[10px] bg-primary px-3 text-sm font-semibold text-white hover:bg-primary-hover">
              บันทึก
            </button>
          )}
        </div>
      </td>
    </tr>
  );
}
