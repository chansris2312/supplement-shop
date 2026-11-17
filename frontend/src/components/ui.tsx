import type { ReactNode } from 'react';

/** Small mint category pill. */
export const CatPill = ({ children }: { children: ReactNode }) => (
  <span className="self-start rounded-full bg-mint px-2.5 py-[3px] text-xs font-semibold text-primary">{children}</span>
);

/** Page header under the navbar: h1 left, action right. */
export function PageHeader({ title, action }: { title: string; action?: ReactNode }) {
  return (
    <header className="flex flex-wrap items-center justify-between gap-4 bg-transparent px-4 pt-6 sm:px-8">
      <h1 className="m-0 font-prompt text-2xl font-semibold">{title}</h1>
      {action}
    </header>
  );
}

/** Main content area padding. */
export const Main = ({ children, className = '' }: { children: ReactNode; className?: string }) => (
  <main className={`px-4 pb-12 pt-7 sm:px-8 ${className}`}>{children}</main>
);

export const card = 'rounded-2xl border border-line bg-white';

export const primaryBtn =
  'inline-flex items-center justify-center rounded-[10px] bg-primary px-5 font-semibold text-white no-underline hover:bg-primary-hover hover:text-white';

export const outlineBtn =
  'inline-flex h-11 items-center rounded-[10px] border border-field bg-white px-4 text-[15px] text-ink no-underline hover:border-primary';

export function Toast({ message }: { message: string | null }) {
  return (
    <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-6 z-50 flex justify-center px-4">
      {message && (
        <div className="rounded-full bg-nav px-5 py-3 text-[15px] font-medium text-white shadow-lg">{message}</div>
      )}
    </div>
  );
}

export function Spinner({ label }: { label: string }) {
  return (
    <div role="status" className="flex items-center justify-center gap-3 p-10 text-muted">
      <span className="h-5 w-5 animate-spin rounded-full border-2 border-line border-t-primary" />
      {label}
    </div>
  );
}
