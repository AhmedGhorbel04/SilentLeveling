import { useEffect, useState } from 'react';

type ApiStatus = 'checking' | 'online' | 'offline';

// Temporary Milestone 0 screen: proves the frontend, the backend and the database
// are connected. It is replaced by the real landing page in Milestone 1.
export function App() {
  const [status, setStatus] = useState<ApiStatus>('checking');

  useEffect(() => {
    fetch('/api/health')
      .then((res) => setStatus(res.ok ? 'online' : 'offline'))
      .catch(() => setStatus('offline'));
  }, []);

  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <section className="w-full max-w-md rounded-xl border border-abyss-border bg-abyss p-8 shadow-glow">
        <p className="text-xs font-semibold tracking-[0.3em] text-arcane-400 uppercase">System</p>
        <h1 className="mt-2 text-3xl font-bold text-white">SilentLeveling</h1>
        <p className="mt-3 text-slate-400">Your real life. Leveled up.</p>

        <div className="mt-8 flex items-center gap-3 text-sm" role="status">
          <span
            aria-hidden="true"
            className={`size-2.5 rounded-full ${
              status === 'online'
                ? 'bg-emerald-400'
                : status === 'offline'
                  ? 'bg-rose-500'
                  : 'animate-pulse bg-slate-500'
            }`}
          />
          <span>
            API: {status === 'checking' ? 'checking…' : status === 'online' ? 'online' : 'offline'}
          </span>
        </div>
      </section>
    </main>
  );
}
