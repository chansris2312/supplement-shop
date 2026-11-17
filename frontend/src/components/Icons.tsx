/** 2px stroke line icons copied from design/app/*.dc.html */
type P = { size?: number; color?: string; className?: string };

const line = (size: number, color: string, className?: string) => ({
  width: size,
  height: size,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: color,
  strokeWidth: 2,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
  className,
});

export const LeafLogo = ({ size = 30 }: P) => (
  <svg width={size} height={size} viewBox="0 0 32 32" fill="none" stroke="#1E7F74" strokeWidth={2.2} strokeLinecap="round" aria-hidden="true">
    <path d="M6 26C6 14 14 6 26 6c0 12-8 20-20 20z" />
    <path d="M6 26l11-11" />
  </svg>
);

export const BagIcon = ({ size = 18, color = '#3E5C56', className }: P) => (
  <svg {...line(size, color, className)}>
    <path d="M6 8h12l-1 12H7z" />
    <path d="M9 8V6a3 3 0 0 1 6 0v2" />
  </svg>
);

export const ClipboardIcon = ({ size = 18, color = '#3E5C56', className }: P) => (
  <svg {...line(size, color, className)}>
    <rect x="6" y="4" width="12" height="17" rx="2" />
    <path d="M9 4h6v3H9z" />
    <path d="M9 12h6M9 16h4" />
  </svg>
);

export const SparkleIcon = ({ size = 18, color = '#3E5C56', className }: P) => (
  <svg {...line(size, color, className)}>
    <path d="M12 3l1.8 4.6L18 9.4l-4.2 1.8L12 16l-1.8-4.8L6 9.4l4.2-1.8z" />
  </svg>
);

export const CartIcon = ({ size = 18, color = '#3E5C56', className }: P) => (
  <svg {...line(size, color, className)}>
    <path d="M3 4h2l2.4 11.2a2 2 0 0 0 2 1.6h7.7a2 2 0 0 0 2-1.5L21 8H6" />
    <circle cx="10" cy="20" r="1.3" />
    <circle cx="17" cy="20" r="1.3" />
  </svg>
);

export const ClockIcon = ({ size = 18, color = '#3E5C56', className }: P) => (
  <svg {...line(size, color, className)}>
    <circle cx="12" cy="12" r="8" />
    <path d="M12 8v4l3 2" />
  </svg>
);

export const CheckIcon = ({ size = 32, color = '#1E7F74' }: P) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M5 12.5l4.5 4.5L19 7.5" />
  </svg>
);

/** Outline supplement bottle used in image placeholders. `bands` = the two label lines. */
export const BottleIcon = ({ size = 64, strokeWidth = 2, bands = true }: { size?: number; strokeWidth?: number; bands?: boolean }) => (
  <svg width={size} height={size} viewBox="0 0 64 64" fill="none" stroke="#3E4F4A" strokeWidth={strokeWidth} strokeLinejoin="round" aria-hidden="true">
    <rect x="23" y="7" width="18" height="8" rx="2" />
    <path d="M20 17h24v38a4 4 0 0 1-4 4H24a4 4 0 0 1-4-4z" />
    {bands && <path d="M20 29h24M20 45h24" />}
  </svg>
);
