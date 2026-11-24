import { useId } from 'react';
import type { AvatarKey } from '../game/constants';

// Original preset avatars: geometric "sigils" drawn in SVG, each with its own
// frame shape, inner mark and colors. No image files, no copyrighted artwork.

type Sigil = { from: string; to: string; frame: string; mark: string };

const FRAMES = {
  hexagon: 'M32 4 56 18v28L32 60 8 46V18Z',
  diamond: 'M32 3 61 32 32 61 3 32Z',
  circle: 'M32 4a28 28 0 1 0 0.01 0Z',
  shield: 'M32 4 56 12v18c0 15-10 26-24 30C18 56 8 45 8 30V12Z',
};

const SIGILS: Record<AvatarKey, Sigil> = {
  'sigil-1': { from: '#7c3aed', to: '#3b82f6', frame: FRAMES.hexagon, mark: 'M22 38 32 22l10 16Z' },
  'sigil-2': { from: '#3b82f6', to: '#06b6d4', frame: FRAMES.diamond, mark: 'M32 20v24M20 32h24' },
  'sigil-3': {
    from: '#a855f7',
    to: '#ec4899',
    frame: FRAMES.circle,
    mark: 'M22 40 32 24l10 16M26 34h12',
  },
  'sigil-4': { from: '#6366f1', to: '#8b5cf6', frame: FRAMES.shield, mark: 'M24 30l8 8 10-14' },
  'sigil-5': {
    from: '#0ea5e9',
    to: '#6366f1',
    frame: FRAMES.hexagon,
    mark: 'M22 26h20M22 32h20M22 38h20',
  },
  'sigil-6': {
    from: '#f59e0b',
    to: '#ef4444',
    frame: FRAMES.diamond,
    mark: 'M32 22a10 10 0 1 0 0.01 0Z',
  },
  'sigil-7': {
    from: '#10b981',
    to: '#3b82f6',
    frame: FRAMES.circle,
    mark: 'M24 38l8-16 8 16M28 30h8',
  },
  'sigil-8': {
    from: '#e11d48',
    to: '#7c3aed',
    frame: FRAMES.shield,
    mark: 'M32 20l4 8 9 1-7 6 2 9-8-5-8 5 2-9-7-6 9-1Z',
  },
};

export function Avatar({
  avatarKey,
  size = 48,
  label,
}: {
  avatarKey: string | null;
  size?: number;
  label?: string;
}) {
  const sigil = SIGILS[(avatarKey as AvatarKey) ?? 'sigil-1'] ?? SIGILS['sigil-1'];
  // Unique per rendered avatar: if two avatars shared an id and the first one were
  // hidden (display: none), the browser would use its gradient and draw nothing
  const gradientId = useId();

  return (
    <svg
      viewBox="0 0 64 64"
      width={size}
      height={size}
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={sigil.from} />
          <stop offset="1" stopColor={sigil.to} />
        </linearGradient>
      </defs>
      <path d={sigil.frame} fill="#0b1026" stroke={`url(#${gradientId})`} strokeWidth="3" />
      <path
        d={sigil.mark}
        fill="none"
        stroke={`url(#${gradientId})`}
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
