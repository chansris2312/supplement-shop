import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { CheckIcon } from '../components/Icons';
import { ProductImage } from '../components/ProductImage';
import { Main, PageHeader, primaryBtn } from '../components/ui';
import { SHIPPING } from '../lib/constants';
import { baht } from '../lib/format';
import { useStore } from '../state/StoreContext';

const th = 'px-5 py-3.5 font-semibold';
const td = 'px-5 py-4';
const srOnly = 'absolute h-px w-px overflow-hidden [clip:rect(0_0_0_0)]';

export default function Cart() {
  const { cart, productById, setQty, removeFromCart, reloadCart, refreshProducts } = useStore();
  const [ordered, setOrdered] = useState(false);
  const [placing, setPlacing] = useState(false);
  const [error, setError] = useState('');

  const items = cart.flatMap((c) => {
    const p = productById(c.productId);
    return p ? [{ ...c, p }] : [];
  });
  const count = items.reduce((t, x) => t + x.qty, 0);
  const sub = items.reduce((t, x) => t + x.p.price * x.qty, 0);
  const ship = items.length ? SHIPPING : 0;
  const empty = items.length === 0;

  async function order() {
    if (empty || placing) return;
    setPlacing(true);
    setError('');
    try {
      await api.createOrder();
      await Promise.all([reloadCart(), refreshProducts()]);
      setOrdered(true);
    } catch (e) {
      console.error(e);
      setError(e instanceof Error && e.message ? e.message : 'สั่งซื้อไม่สำเร็จ กรุณาลองใหม่');
    } finally {
      setPlacing(false);
    }
  }

  return (
    <>
      <PageHeader title="ตะกร้าสินค้า" action={<Link to="/" className="text-[15px]">← เลือกซื้อสินค้าต่อ</Link>} />
      <Main className="flex flex-col gap-6">
        {ordered ? (
          <section className="flex flex-col items-center gap-3.5 rounded-2xl border border-line bg-white p-10 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-mint">
              <CheckIcon />
            </div>
            <h2 className="m-0 font-prompt text-2xl font-semibold">สั่งซื้อสำเร็จ</h2>
            <p className="m-0 text-base leading-[1.7] text-muted">บันทึกคำสั่งซื้อไว้ในประวัติการซื้อแล้ว และล้างรายการในตะกร้าเรียบร้อย</p>
            <Link to="/history" className={`${primaryBtn} mt-1.5 h-12 rounded-xl px-6`}>
              ดูประวัติการซื้อ
            </Link>
          </section>
        ) : (
          <div className="flex flex-wrap items-start gap-6">
            <section aria-label="รายการในตะกร้า" className="min-w-0 flex-[999_1_560px] overflow-x-auto rounded-2xl border border-line bg-white">
              <table className="w-full min-w-[640px] border-collapse text-[15px]">
                <thead>
                  <tr className="bg-thead text-left">
                    <th scope="col" className={th}>สินค้า</th>
                    <th scope="col" className={`${th} text-right`}>ราคา/ชิ้น</th>
                    <th scope="col" className={`${th} text-center`}>จำนวน</th>
                    <th scope="col" className={`${th} text-right`}>รวม</th>
                    <th scope="col" className="px-5 py-3.5">
                      <span className={srOnly}>ลบ</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {items.map(({ p, qty }) => (
                    <tr key={p.productId} className="border-t border-line">
                      <td className={td}>
                        <div className="flex items-center gap-3.5">
                          <ProductImage cat={p.cat} imageUrl={p.imageUrl} name={p.name} variant="thumb" />
                          <span className="font-semibold">{p.name}</span>
                        </div>
                      </td>
                      <td className={`${td} text-right`}>{baht(p.price)}</td>
                      <td className={td}>
                        <div role="group" aria-label={`จำนวน ${p.name}`} className="mx-auto flex w-fit items-center overflow-hidden rounded-[10px] border border-field">
                          <button type="button" aria-label="ลดจำนวน" onClick={() => setQty(p.productId, qty - 1)} className="h-11 w-11 border-none bg-white text-xl text-ink hover:bg-page">
                            −
                          </button>
                          <span className="min-w-9 text-center font-semibold">{qty}</span>
                          <button type="button" aria-label="เพิ่มจำนวน" onClick={() => setQty(p.productId, qty + 1)} className="h-11 w-11 border-none bg-white text-xl text-ink hover:bg-page">
                            +
                          </button>
                        </div>
                      </td>
                      <td className={`${td} text-right font-prompt font-semibold`}>{baht(p.price * qty)}</td>
                      <td className={`${td} text-right`}>
                        <button type="button" aria-label={`ลบ ${p.name} ออกจากตะกร้า`} onClick={() => removeFromCart(p.productId)} className="h-11 border-none bg-transparent px-3 text-sm text-danger hover:underline">
                          ลบ
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {empty && <p className="m-0 p-10 text-center text-base text-muted">ยังไม่มีสินค้าในตะกร้า</p>}
            </section>

            <aside aria-label="สรุปคำสั่งซื้อ" className="flex flex-[1_1_300px] flex-col gap-3.5 rounded-2xl border border-line bg-white p-6">
              <h2 className="m-0 font-prompt text-[19px] font-semibold">สรุปคำสั่งซื้อ</h2>
              <Row label="จำนวนสินค้า" value={`${count} ชิ้น`} />
              <Row label="ราคาสินค้า" value={baht(sub)} />
              <Row label="ค่าจัดส่ง" value={baht(ship)} />
              <div className="h-px bg-line" />
              <div className="flex items-baseline justify-between">
                <span className="text-base font-semibold">รวมทั้งหมด</span>
                <span className="font-prompt text-[26px] font-semibold">{baht(sub + ship)}</span>
              </div>
              {error && <p className="m-0 rounded-[10px] bg-warn-bg px-3 py-2.5 text-sm text-warn-text">{error}</p>}
              <button
                type="button"
                onClick={order}
                disabled={empty || placing}
                className="h-[52px] rounded-xl border-none bg-primary text-[17px] font-semibold text-white hover:bg-primary-hover disabled:cursor-not-allowed disabled:bg-line disabled:text-[#4A5A55]"
              >
                {placing ? 'กำลังสั่งซื้อ…' : 'สั่งซื้อ'}
              </button>
              <p className="m-0 text-[13px] leading-[1.6] text-muted">ชำระเงินแบบจำลองสำหรับเดโม เมื่อกดสั่งซื้อ รายการจะไปอยู่ในประวัติการซื้อ</p>
            </aside>
          </div>
        )}
      </Main>
    </>
  );
}

const Row = ({ label, value }: { label: string; value: string }) => (
  <div className="flex justify-between text-[15px]">
    <span className="text-muted">{label}</span>
    <span>{value}</span>
  </div>
);
