import { Outlet } from 'react-router';
import { Logo } from '../components/ui/Logo';
import { LanguageSwitcher } from '../components/LanguageSwitcher';

// Centered card used by the login and register pages
export function AuthLayout() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-5">
        <Logo />
        <LanguageSwitcher />
      </header>

      <main className="flex flex-1 items-center justify-center px-4 pb-16">
        <div className="system-panel w-full max-w-md animate-fade-up p-8 shadow-glow sm:p-10">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
