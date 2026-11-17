import { CAT_TINTS } from '../lib/constants';
import { BottleIcon } from './Icons';

type Variant = 'card' | 'rec' | 'thumb';

/**
 * Product image, or the tinted placeholder from the mockups when there is no imageUrl.
 * card  = 4:3 shop card with "ภาพสินค้า" label
 * rec   = 112px square on the result page
 * thumb = 56px square in the cart table
 */
export function ProductImage({ cat, imageUrl, name, variant }: { cat: string; imageUrl?: string; name: string; variant: Variant }) {
  const tint = CAT_TINTS[cat] ?? '#E1EEF2';
  const box =
    variant === 'card'
      ? 'aspect-[4/3] w-full'
      : variant === 'rec'
        ? 'h-[112px] w-[112px] flex-none rounded-[14px]'
        : 'h-14 w-14 flex-none rounded-[10px]';

  if (imageUrl) {
    return <img src={imageUrl} alt={name} className={`${box} object-cover`} style={{ background: tint }} loading="lazy" />;
  }

  return (
    <div className={`${box} flex flex-col items-center justify-center gap-1.5`} style={{ background: tint }}>
      {variant === 'card' && (
        <>
          <BottleIcon size={64} />
          <span className="text-xs text-[#4A5A55]">ภาพสินค้า</span>
        </>
      )}
      {variant === 'rec' && <BottleIcon size={56} strokeWidth={2.2} />}
      {variant === 'thumb' && <BottleIcon size={30} strokeWidth={3} bands={false} />}
    </div>
  );
}
