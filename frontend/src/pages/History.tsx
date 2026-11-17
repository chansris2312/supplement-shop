import { Fragment, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api, type Order } from '../api';
import { Main, PageHeader, Spinner } from '../components/ui';
import { baht, thaiDate } from '../lib/format';
import { useStore } from '../state/StoreContext';

const th = 'px-5 py-3.5 font-semibold';
const td = 'px-5 py-4';
const kpi = 'flex flex-col gap-1 rounded-2xl border border-line bg-white px-5 py-[18px]';

export default function History() {
  const { addToCart } = useStore();
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [open, setOpen] = useState<string | null>(null);

  useEffect(() => {
    api
      .listOrders()
      .then((list) => {
        setOrders(list);
        setOpen(list[0]?.orderId ?? null); // newest row starts expanded, as in the mockup
      })
      .catch(() => setOrders([]));
  }, []);

  const reorder = (o: Order) => {
    addToCart(o.items.map((i) => ({ productId: i.productId, qty: i.qty })));
    navigate('/cart');
  };

  return (
    <>
      <PageHeader title="ประวัติการซื้อ" action={<Link to="/" className="text-[15px]">เลือกซื้อสินค้า →</Link>} />
      {!orders ? (
        <Spinner label="กำลังโหลด…" />
      ) : (
        <Main className="flex flex-col gap-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className={kpi}>
              <span className="text-sm text-muted">คำสั่งซื้อทั้งหมด</span>
              <span className="font-prompt text-[28px] font-semibold">{orders.length} ครั้ง</span>
            </div>
            <div className={kpi}>
              <span className="text-sm text-muted">ยอดซื้อรวม</span>
              <span className="font-prompt text-[28px] font-semibold">{baht(orders.reduce((t, o) => t + o.total, 0))}</span>
            </div>
            <div className={kpi}>
              <span className="text-sm text-muted">สั่งซื้อล่าสุด</span>
              <span className="font-prompt text-[28px] font-semibold">{orders[0] ? thaiDate(orders[0].createdAt) : '—'}</span>
            </div>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-line bg-white">
            <table className="w-full min-w-[760px] border-collapse text-[15px]">
              <thead>
                <tr className="bg-thead text-left">
                  <th scope="col" className={th}>เลขที่คำสั่งซื้อ</th>
                  <th scope="col" className={th}>วันที่</th>
                  <th scope="col" className={th}>รายการ</th>
                  <th scope="col" className={`${th} text-right`}>ยอดรวม</th>
                  <th scope="col" className={th}>สถานะ</th>
                  <th scope="col" className={th}>
                    <span className="absolute h-px w-px overflow-hidden [clip:rect(0_0_0_0)]">รายละเอียด</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {orders.map((o) => {
                  const isOpen = open === o.orderId;
                  return (
                    <Fragment key={o.orderId}>
                      <tr className="border-t border-line align-top">
                        <td className={`${td} font-semibold`}>#{o.orderId}</td>
                        <td className={`${td} whitespace-nowrap text-muted`}>{thaiDate(o.createdAt)}</td>
                        <td className={`${td} leading-[1.7]`}>
                          {o.items.map((i) => (
                            <div key={i.productId}>
                              {i.name} × {i.qty}
                            </div>
                          ))}
                        </td>
                        <td className={`${td} whitespace-nowrap text-right font-prompt font-semibold`}>{baht(o.total)}</td>
                        <td className={td}>
                          <span className="inline-block rounded-full bg-mint px-3 py-1 text-[13px] font-semibold text-primary">สั่งซื้อสำเร็จ</span>
                        </td>
                        <td className="px-5 py-2 text-right">
                          <button
                            type="button"
                            aria-expanded={isOpen}
                            onClick={() => setOpen(isOpen ? null : o.orderId)}
                            className="h-11 rounded-[10px] border border-field bg-white px-3.5 text-sm text-ink hover:border-primary"
                          >
                            {isOpen ? 'ซ่อน' : 'รายละเอียด'}
                          </button>
                        </td>
                      </tr>
                      {isOpen && (
                        <tr className="bg-[#F8FAF9]">
                          <td colSpan={6} className="px-5 pb-[18px] pt-1">
                            <div className="flex flex-wrap items-center gap-6 text-sm leading-[1.7] text-[#3E4F4A]">
                              <span>
                                <span className="font-semibold">ราคาสินค้า:</span> {baht(o.subtotal)}
                              </span>
                              <span>
                                <span className="font-semibold">ค่าจัดส่ง:</span> {baht(o.shipping)}
                              </span>
                              <span>
                                <span className="font-semibold">ชำระเงิน:</span> แบบจำลอง (เดโม)
                              </span>
                              <button type="button" onClick={() => reorder(o)} className="min-h-11 border-none bg-transparent p-0 font-semibold text-primary underline hover:text-primary-hover">
                                สั่งซื้ออีกครั้ง
                              </button>
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
            {orders.length === 0 && <p className="m-0 p-10 text-center text-base text-muted">ยังไม่มีคำสั่งซื้อ</p>}
          </div>
        </Main>
      )}
    </>
  );
}
