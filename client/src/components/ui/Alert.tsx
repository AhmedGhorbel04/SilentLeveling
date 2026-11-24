import type { ReactNode } from 'react';

export function Alert({ children }: { children: ReactNode }) {
  return (
    <div
      role="alert"
      className="rounded-md border border-rose-500/40 bg-rose-500/10 px-3 py-2.5 text-sm text-rose-300"
    >
      {children}
    </div>
  );
}
