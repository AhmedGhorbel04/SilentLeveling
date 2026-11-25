import { Link, NavLink, Outlet, useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';
import { Logo } from '../components/ui/Logo';
import { Button } from '../components/ui/Button';
import { Avatar } from '../components/Avatar';
import { LanguageSwitcher } from '../components/LanguageSwitcher';
import { OfflineBanner } from '../offline/OfflineBanner';
import { NotificationBell } from '../features/achievements/NotificationBell';
import { useCurrentUser, useLogout } from '../features/auth/useAuth';

const PAGES = [
  { to: '/dashboard', label: 'nav.dashboard' },
  { to: '/progress', label: 'nav.progress' },
  { to: '/goals', label: 'nav.goals' },
  { to: '/achievements', label: 'nav.achievements' },
  { to: '/friends', label: 'nav.friends' },
  { to: '/legendary', label: 'nav.legendary' },
] as const;

// Layout of the logged-in part of the app
export function AppLayout() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { data: user } = useCurrentUser();
  const logout = useLogout();

  return (
    <div className="flex min-h-screen flex-col">
      {/* relative z-20: the header (and the notification panel opening from it) stays above
          the page content, whose blurred and animated panels create their own layers */}
      <header className="relative z-20 border-b border-abyss-border bg-void/70 backdrop-blur">
        <nav
          aria-label={t('common.mainNavigation')}
          className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6"
        >
          <Logo to="/dashboard" compactOnMobile />
          <div className="flex min-w-0 items-center gap-2 sm:gap-3">
            {user && (
              <Link
                to={`/u/${user.username}`}
                className="hidden items-center gap-2 text-sm font-medium text-slate-300 hover:text-white sm:inline-flex"
              >
                {user.avatarKey && <Avatar avatarKey={user.avatarKey} size={28} />}
                {user.username}
              </Link>
            )}
            {user?.onboarded && <NotificationBell />}
            <LanguageSwitcher />
            <Button
              variant="ghost"
              className="whitespace-nowrap"
              isLoading={logout.isPending}
              onClick={() =>
                logout.mutate(undefined, { onSuccess: () => navigate('/', { replace: true }) })
              }
            >
              {t('common.logout')}
            </Button>
          </div>
        </nav>

        {/* Page tabs on their own row, so they fit on phones too. Hidden during onboarding. */}
        {user?.onboarded && (
          // Scrolls sideways instead of overflowing if the tabs are wider than a small phone
          <ul className="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-2 sm:px-6">
            {[
              ...PAGES,
              ...(user.role === 'ADMIN' ? [{ to: '/admin', label: 'nav.admin' } as const] : []),
            ].map((page) => (
              <li key={page.to} className="shrink-0">
                <NavLink
                  to={page.to}
                  className={({ isActive }) =>
                    `block border-b-2 px-3 py-2.5 text-sm font-semibold whitespace-nowrap transition sm:px-4 ${
                      isActive
                        ? 'border-arcane-500 text-white'
                        : 'border-transparent text-slate-400 hover:text-slate-200'
                    }`
                  }
                >
                  {t(page.label)}
                </NavLink>
              </li>
            ))}
          </ul>
        )}
      </header>
      <OfflineBanner />

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6 sm:py-10">
        <Outlet />
      </main>
    </div>
  );
}
