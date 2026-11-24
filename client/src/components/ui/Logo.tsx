import { Link } from 'react-router';

// Original wordmark: two rising chevrons + the name. The name is always shown
// left-to-right, even in the Arabic interface, because it is a brand name.
// `compactOnMobile` shows only the icon on small screens (crowded headers).
export function Logo({
  to = '/',
  compactOnMobile = false,
}: {
  to?: string;
  compactOnMobile?: boolean;
}) {
  return (
    <Link
      to={to}
      className="group inline-flex shrink-0 items-center gap-2.5"
      dir="ltr"
      aria-label="SilentLeveling"
    >
      <svg viewBox="0 0 32 32" className="size-8" aria-hidden="true">
        <defs>
          <linearGradient id="logo-gradient" x1="0" y1="1" x2="1" y2="0">
            <stop offset="0" stopColor="#3b82f6" />
            <stop offset="1" stopColor="#a78bfa" />
          </linearGradient>
        </defs>
        <rect width="32" height="32" rx="7" fill="#0b1026" stroke="#1c2547" />
        <path
          d="M8 21 L16 13 L24 21"
          fill="none"
          stroke="url(#logo-gradient)"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M11 25 L16 20 L21 25"
          fill="none"
          stroke="url(#logo-gradient)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity="0.55"
        />
      </svg>
      <span
        className={`font-display text-xl font-bold tracking-wide text-white group-hover:text-arcane-300 ${
          compactOnMobile ? 'hidden sm:inline' : ''
        }`}
      >
        Silent<span className="text-arcane-400 group-hover:text-arcane-300">Leveling</span>
      </span>
    </Link>
  );
}
