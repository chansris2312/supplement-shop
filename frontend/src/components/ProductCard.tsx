import type { Product } from '../api';
import { baht } from '../lib/format';
import { ProductImage } from './ProductImage';
import { CatPill } from './ui';

export function ProductCard({ p, onAdd }: { p: Product; onAdd: () => void }) {
  const soldOut = p.stock <= 0;
  return (
    <article className="flex flex-col overflow-hidden rounded-[14px] border border-line bg-white">
      <ProductImage cat={p.cat} imageUrl={p.imageUrl} name={p.name} variant="card" />
      <div className="flex flex-grow flex-col gap-2 p-3.5">
        <CatPill>{p.cat}</CatPill>
        <h3 className="m-0 flex-grow text-base font-semibold leading-[1.45]">{p.name}</h3>
        <div className="flex items-center justify-between gap-2">
          <span className="font-prompt text-lg font-semibold">{baht(p.price)}</span>
          <button
            type="button"
            onClick={onAdd}
            disabled={soldOut}
            aria-label={`ใส่ ${p.name} ลงตะกร้า`}
            className="h-11 rounded-[10px] bg-primary px-3.5 text-sm font-semibold text-white hover:bg-primary-hover disabled:cursor-not-allowed disabled:bg-line disabled:text-[#4A5A55]"
          >
            {soldOut ? 'สินค้าหมด' : '+ ตะกร้า'}
          </button>
        </div>
      </div>
    </article>
  );
}
