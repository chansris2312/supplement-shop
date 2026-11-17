import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api, type Product } from '../api';
import { SparkleIcon } from '../components/Icons';
import { ProductCard } from '../components/ProductCard';
import { Main, PageHeader, primaryBtn } from '../components/ui';
import { CATEGORIES, PRICE_RANGES } from '../lib/constants';
import { useStore } from '../state/StoreContext';

const ALL = 'ทั้งหมด';

const filterBtn = (on: boolean) =>
  'flex min-h-11 items-center justify-between rounded-[10px] px-3.5 text-left text-[15px] ' +
  (on ? 'border border-primary bg-primary font-semibold text-white' : 'border border-line bg-white text-ink hover:border-field');

export default function Shop() {
  const { products: all, addToCart } = useStore();
  const [params] = useSearchParams();
  const [cat, setCat] = useState(ALL);
  const [price, setPrice] = useState('all');
  const [q, setQ] = useState(params.get('q') ?? '');
  const [sort, setSort] = useState('rec');
  const [list, setList] = useState<Product[] | null>(null);

  // Keep the search box in sync when arriving via "ดูรายละเอียดสินค้า"
  useEffect(() => {
    const fromUrl = params.get('q');
    if (fromUrl !== null) setQ(fromUrl);
  }, [params]);

  // Filtering happens on the API (GET /api/products?cat&q&price&sort). Debounced for typing.
  useEffect(() => {
    let cancelled = false;
    const t = setTimeout(() => {
      api
        .listProducts({ cat: cat === ALL ? undefined : cat, q: q.trim() || undefined, price, sort })
        .then((items) => !cancelled && setList(items))
        .catch(console.error);
    }, 200);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [cat, price, q, sort, all]);

  const reset = () => {
    setCat(ALL);
    setPrice('all');
    setQ('');
  };

  const count = (c: string) => (c === ALL ? all.length : all.filter((p) => p.cat === c).length);

  return (
    <>
      <PageHeader
        title="ร้านค้า"
        action={
          <input
            type="search"
            aria-label="ค้นหาสินค้า"
            placeholder="ค้นหาสินค้า เช่น คอลลาเจน"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="box-border h-11 w-[320px] max-w-full rounded-[10px] border border-field bg-page px-3.5 text-[15px] text-ink"
          />
        }
      />
      <Main className="flex flex-col gap-6">
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-[14px] bg-mint px-5 py-4">
          <div className="flex items-center gap-3">
            <SparkleIcon size={24} color="#1E7F74" />
            <span className="text-base text-primary-dark">ไม่แน่ใจว่าควรทานอะไร? ให้ AI ช่วยเลือกจากไลฟ์สไตล์ของคุณ</span>
          </div>
          <Link to="/quiz" className={`${primaryBtn} h-11 text-[15px]`}>
            เริ่มวิเคราะห์ →
          </Link>
        </div>

        <div className="flex flex-wrap items-start gap-6">
          <section aria-label="ตัวกรอง" className="flex flex-[1_1_220px] flex-col gap-5 rounded-2xl border border-line bg-white p-5">
            <div className="flex flex-col gap-2">
              <h2 className="mb-1 mt-0 text-[15px] font-semibold">ประเภท</h2>
              {[ALL, ...CATEGORIES].map((c) => (
                <button key={c} type="button" aria-pressed={c === cat} onClick={() => setCat(c)} className={filterBtn(c === cat)}>
                  <span>{c}</span>
                  <span className="text-[13px] opacity-80">{count(c)}</span>
                </button>
              ))}
            </div>
            <div className="flex flex-col gap-2">
              <h2 className="mb-1 mt-0 text-[15px] font-semibold">ช่วงราคา</h2>
              {PRICE_RANGES.map((r) => (
                <button key={r.id} type="button" aria-pressed={r.id === price} onClick={() => setPrice(r.id)} className={filterBtn(r.id === price)}>
                  <span>{r.label}</span>
                </button>
              ))}
            </div>
            <button type="button" onClick={reset} className="h-11 rounded-[10px] border border-field bg-white text-sm text-ink hover:border-primary">
              ล้างตัวกรอง
            </button>
          </section>

          <section aria-label="รายการสินค้า" className="flex min-w-0 flex-[999_1_600px] flex-col gap-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="m-0 text-[15px] text-muted">{list?.length ?? 0} รายการ</p>
              <div className="flex items-center gap-2.5">
                <label htmlFor="sort" className="text-sm text-muted">
                  เรียงตาม
                </label>
                <select
                  id="sort"
                  value={sort}
                  onChange={(e) => setSort(e.target.value)}
                  className="h-11 rounded-[10px] border border-field bg-white px-3 text-[15px] text-ink"
                >
                  <option value="rec">แนะนำ</option>
                  <option value="low">ราคา: ต่ำ → สูง</option>
                  <option value="high">ราคา: สูง → ต่ำ</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 min-[1100px]:grid-cols-4">
              {list?.map((p) => (
                <ProductCard key={p.productId} p={p} onAdd={() => addToCart([{ productId: p.productId, qty: 1 }])} />
              ))}
            </div>

            {list && list.length === 0 && (
              <p className="m-0 rounded-[14px] border border-dashed border-field bg-white p-10 text-center text-base text-muted">
                ไม่พบสินค้าที่ตรงกับตัวกรอง
              </p>
            )}
          </section>
        </div>
      </Main>
    </>
  );
}
