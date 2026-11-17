import { useEffect, useRef, useState, type ComponentType } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { useStore } from '../state/StoreContext';
import { BagIcon, CartIcon, ClipboardIcon, ClockIcon, LeafLogo, SparkleIcon } from './Icons';

const LINKS: { to: string; label: string; Icon: ComponentType<{ color?: string }> }[] = [
  { to: '/', label: 'ร้านค้า', Icon: BagIcon },
  { to: '/quiz', label: 'วิเคราะห์ไลฟ์สไตล์', Icon: ClipboardIcon },
  { to: '/result', label: 'ผลวิเคราะห์จาก AI', Icon: SparkleIcon },
  { to: '/cart', label: 'ตะกร้า', Icon: CartIcon },
  { to: '/history', label: 'ประวัติการซื้อ', Icon: ClockIcon },
];

export function Navbar() {
  const { user, requireLogin } = useAuth();
  const { cartCount, me } = useStore();

  return (
    <header className="border-b border-line bg-white">
      <div className="flex flex-wrap items-center justify-between gap-4 px-4 py-3 sm:px-8">
        <Link to="/" className="flex items-center gap-2.5 text-nav no-underline">
          <LeafLogo />
          <span className="font-prompt text-[21px] font-semibold">NutriMate</span>
        </Link>

        <nav aria-label="เมนูหลัก" className="flex flex-wrap items-center gap-1">
          {LINKS.map(({ to, label, Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                'flex items-center gap-2 rounded-full px-3.5 py-2.5 text-[15px] no-underline ' +
                (isActive ? 'bg-mint font-semibold text-primary-dark' : 'text-nav hover:bg-page')
              }
            >
              {({ isActive }) => (
                <>
                  <Icon color={isActive ? '#155E56' : '#3E5C56'} />
                  {label}
                  {to === '/cart' && (
                    <span className="box-border min-w-[22px] rounded-full bg-primary px-[7px] py-px text-center text-xs font-semibold text-white">
                      {cartCount}
                    </span>
                  )}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          {user ? (
            <>
              {me && (
                <span className="inline-flex items-center gap-2 rounded-full bg-mint px-3.5 py-2 text-[13px] font-semibold text-primary-dark">
                  <span className="h-2 w-2 rounded-full bg-primary" />
                  อีเมลสุขภาพรายสัปดาห์ · {me.weeklySignal ? 'เปิด' : 'ปิด'}
                </span>
              )}
              <AvatarMenu />
            </>
          ) : (
            <button
              type="button"
              onClick={requireLogin}
              className="h-11 rounded-[10px] bg-primary px-5 text-[15px] font-semibold text-white hover:bg-primary-hover"
            >
              เข้าสู่ระบบ
            </button>
          )}
        </div>
      </div>
    </header>
  );
}

function AvatarMenu() {
  const { user, signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click / Escape
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  if (!user) return null;
  const letter = (user.name || user.email || '?').trim().charAt(0).toUpperCase();
  const item = 'flex min-h-11 w-full items-center rounded-lg px-3 text-left text-[15px] text-ink no-underline hover:bg-page';

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-label={'บัญชีผู้ใช้ ' + (user.name || user.email)}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="flex h-[38px] w-[38px] items-center justify-center rounded-full bg-avatar font-semibold text-primary-dark"
      >
        {letter}
      </button>
      {open && (
        <div role="menu" className="absolute right-0 top-[46px] z-40 w-56 rounded-xl border border-line bg-white p-1.5 shadow-lg">
          <p className="truncate px-3 py-2 text-[13px] text-muted">{user.email}</p>
          {user.isAdmin && (
            <Link role="menuitem" to="/admin" className={item} onClick={() => setOpen(false)}>
              จัดการสินค้า (แอดมิน)
            </Link>
          )}
          <button role="menuitem" type="button" className={item} onClick={signOut}>
            ออกจากระบบ
          </button>
        </div>
      )}
    </div>
  );
}
