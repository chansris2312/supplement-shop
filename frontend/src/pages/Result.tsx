import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, type City, type Plan } from '../api';
import { SparkleIcon } from '../components/Icons';
import { ProductImage } from '../components/ProductImage';
import { CatPill, Main, PageHeader, Spinner, outlineBtn, primaryBtn } from '../components/ui';
import { CITIES } from '../lib/constants';
import { baht, bmiOf } from '../lib/format';
import { statMeals, statStress, statWork } from '../lib/quiz';
import { useStore } from '../state/StoreContext';

const card = 'rounded-2xl border border-line bg-white';

export default function Result() {
  const [plan, setPlan] = useState<Plan | null | undefined>(undefined);

  useEffect(() => {
    api.latestPlan().then(setPlan).catch(() => setPlan(null));
  }, []);

  return (
    <>
      <PageHeader title="ผลวิเคราะห์จาก AI" action={<Link to="/quiz" className={outlineBtn}>แก้คำตอบ / ทำใหม่</Link>} />
      {plan === undefined && <Spinner label="กำลังโหลด…" />}
      {plan === null && <EmptyPlan />}
      {plan && (
        <Main className="flex flex-wrap items-start gap-6">
          <div className="flex min-w-0 flex-[999_1_560px] flex-col gap-6">
            <SummaryCard plan={plan} />
            {plan.needsDoctor && (
              <p role="alert" className="m-0 rounded-[14px] bg-warn-bg px-5 py-4 text-base font-semibold text-warn-text">
                ควรปรึกษาแพทย์หรือเภสัชกรก่อนทานอาหารเสริม
              </p>
            )}
            <Recommendations plan={plan} />
          </div>
          <div className="flex flex-[1_1_300px] flex-col gap-6">
            <WeeklySignalCard />
            <section className={`${card} flex flex-col gap-3 p-[22px]`}>
              <h2 className="m-0 text-[17px] font-semibold">ปรับไลฟ์สไตล์เพิ่มเติม</h2>
              <ul className="m-0 flex list-disc flex-col gap-2 pl-5 text-[15px] leading-[1.7]">
                {plan.result.lifestyleTips.map((t) => (
                  <li key={t}>{t}</li>
                ))}
              </ul>
            </section>
            <p className="m-0 rounded-xl bg-warn-bg px-4 py-3.5 text-[13px] leading-[1.7] text-warn-text">
              คำแนะนำนี้สร้างโดย AI ไม่ใช่คำแนะนำทางการแพทย์ หากมีโรคประจำตัว ทานยาอยู่ หรือตั้งครรภ์ ควรปรึกษาแพทย์หรือเภสัชกรก่อน
            </p>
          </div>
        </Main>
      )}
    </>
  );
}

function EmptyPlan() {
  return (
    <Main>
      <section className={`${card} flex flex-col items-center gap-3.5 p-10 text-center`}>
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-mint">
          <SparkleIcon size={32} color="#1E7F74" />
        </div>
        <h2 className="m-0 font-prompt text-2xl font-semibold">ยังไม่มีผลวิเคราะห์</h2>
        <p className="m-0 text-base leading-[1.7] text-muted">ตอบแบบประเมินไลฟ์สไตล์ 6 ขั้นตอน แล้ว AI จะแนะนำอาหารเสริมที่เหมาะกับคุณ</p>
        <Link to="/quiz" className={`${primaryBtn} mt-1.5 h-12 rounded-xl px-6`}>
          เริ่มวิเคราะห์ →
        </Link>
      </section>
    </Main>
  );
}

function SummaryCard({ plan }: { plan: Plan }) {
  const a = plan.answers;
  const bmi = bmiOf(a.weight, a.height);
  const stats = [
    ['การนอน', a.sleep ?? '—'],
    ['การทำงาน', statWork(a.work)],
    ['มื้ออาหาร', statMeals(a.meals)],
    ['ความเครียด', statStress(a.stress)],
    ['BMI', bmi ? `${bmi.text} · ${bmi.band}` : '—'],
  ];
  return (
    <section className={`${card} flex flex-col gap-[18px] p-6`}>
      <div className="flex items-start gap-3.5">
        <div className="flex h-11 w-11 flex-none items-center justify-center rounded-xl bg-mint">
          <SparkleIcon size={24} color="#1E7F74" />
        </div>
        <div className="flex flex-col gap-1.5">
          <h2 className="m-0 font-prompt text-[19px] font-semibold">สรุปไลฟ์สไตล์ของคุณ</h2>
          <p className="m-0 text-base leading-[1.8]">{plan.result.summary}</p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-5">
        {stats.map(([label, value]) => (
          <div key={label} className="flex flex-col gap-0.5 rounded-xl bg-page px-3.5 py-3">
            <span className="text-[13px] text-muted">{label}</span>
            <span className="text-base font-semibold">{value}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

function Recommendations({ plan }: { plan: Plan }) {
  const { productById, cart, addToCart } = useStore();
  const inCart = (id: string) => cart.some((c) => c.productId === id);
  const recs = plan.result.recommendations.flatMap((r) => {
    const p = productById(r.productId);
    return p ? [{ ...r, p }] : [];
  });
  const missing = recs.filter((r) => !inCart(r.productId));

  return (
    <section aria-labelledby="recs" className={`${card} flex flex-col px-6 pb-4 pt-2`}>
      <div className="flex flex-wrap items-center justify-between gap-3 py-4">
        <h2 id="recs" className="m-0 font-prompt text-[19px] font-semibold">
          อาหารเสริมที่ AI แนะนำ
        </h2>
        <button
          type="button"
          onClick={() => missing.length && addToCart(missing.map((r) => ({ productId: r.productId, qty: 1 })))}
          className="h-11 rounded-[10px] border border-primary bg-white px-[18px] text-[15px] font-semibold text-primary hover:bg-mint"
        >
          {missing.length ? `ใส่ทั้งหมดลงตะกร้า (${missing.length})` : 'ใส่ครบทุกชิ้นแล้ว ✓'}
        </button>
      </div>
      {recs.map(({ p, reason, howToTake }) => {
        const added = inCart(p.productId);
        return (
          <article key={p.productId} className="flex flex-wrap items-start gap-5 border-t border-line py-[18px]">
            <ProductImage cat={p.cat} imageUrl={p.imageUrl} name={p.name} variant="rec" />
            <div className="flex min-w-0 flex-[1_1_300px] flex-col gap-2">
              <div className="flex flex-wrap items-center gap-2.5">
                <h3 className="m-0 text-lg font-semibold">{p.name}</h3>
                <CatPill>{p.cat}</CatPill>
              </div>
              <p className="m-0 text-[15px] leading-[1.7]">
                <span className="font-semibold">ทำไมถึงแนะนำ: </span>
                {reason}
              </p>
              <p className="m-0 text-[15px] leading-[1.7] text-[#3E4F4A]">
                <span className="font-semibold">วิธีทาน: </span>
                {howToTake}
              </p>
            </div>
            <div className="flex flex-[0_0_168px] flex-col items-stretch gap-2.5">
              <span className="text-right font-prompt text-xl font-semibold">{baht(p.price)}</span>
              <button
                type="button"
                onClick={() => !added && addToCart([{ productId: p.productId, qty: 1 }])}
                className={
                  'h-11 rounded-[10px] text-[15px] font-semibold ' +
                  (added ? 'border border-primary bg-mint text-primary' : 'border-none bg-primary text-white hover:bg-primary-hover')
                }
              >
                {added ? 'อยู่ในตะกร้าแล้ว' : 'ใส่ตะกร้า'}
              </button>
              <Link to={'/?q=' + encodeURIComponent(p.name)} className="flex h-10 items-center justify-center rounded-[10px] text-sm text-primary underline">
                ดูรายละเอียดสินค้า
              </Link>
            </div>
          </article>
        );
      })}
    </section>
  );
}

function WeeklySignalCard() {
  const { me, updateMe } = useStore();
  const [askConfirm, setAskConfirm] = useState(false);
  const on = !!me?.weeklySignal;

  async function toggle() {
    const saved = await updateMe({ weeklySignal: !on });
    setAskConfirm(!on && !!saved?.weeklySignal);
  }

  return (
    <section className="flex flex-col gap-3 rounded-2xl border border-signal-line bg-signal-bg p-[22px] text-nav">
      <div className="flex items-center justify-between gap-3">
        <h2 className="m-0 text-[17px] font-semibold text-nav">สัญญาณสุขภาพรายสัปดาห์</h2>
        <button
          type="button"
          role="switch"
          aria-checked={on}
          aria-label="เปิดหรือปิดอีเมลรายสัปดาห์"
          onClick={toggle}
          disabled={!me}
          className={
            // 44px tall hit area around the 30px visual track
            'flex h-11 flex-none items-center border-none bg-transparent p-0'
          }
        >
          <span className={'flex h-[30px] w-[52px] rounded-full p-[3px] transition-colors ' + (on ? 'justify-end bg-primary' : 'justify-start bg-[#A9BDB8]')}>
            <span className="block h-6 w-6 rounded-full bg-white" />
          </span>
        </button>
      </div>
      <p className="m-0 text-sm leading-[1.7] text-[#2F4F49]">
        ทุกวันจันทร์ 08:00 AI จะส่งอีเมลสรุปคุณภาพอากาศ (PM2.5) ในเมืองของคุณ พร้อมเคล็ดลับประจำสัปดาห์และเตือนเมื่อใกล้ถึงเวลาซื้อซ้ำ
      </p>
      {askConfirm && (
        <p role="status" className="m-0 rounded-[10px] bg-white px-3 py-2.5 text-[13px] font-semibold leading-[1.6] text-primary-dark">
          กรุณายืนยันอีเมลจาก AWS ในกล่องจดหมายของคุณ
        </p>
      )}
      <label htmlFor="city" className="text-[13px] text-icon">
        เมืองของคุณ
      </label>
      <select
        id="city"
        value={me?.city ?? 'กรุงเทพมหานคร'}
        disabled={!me}
        onChange={(e) => updateMe({ city: e.target.value as City })}
        className="h-11 rounded-[10px] border border-field bg-white px-3 text-[15px] text-nav"
      >
        {CITIES.map((c) => (
          <option key={c}>{c}</option>
        ))}
      </select>
    </section>
  );
}
