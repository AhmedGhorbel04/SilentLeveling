import { NavLink, Outlet, useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';
import { Logo } from '../components/ui/Logo';
import { Button } from '../components/ui/Button';
import { Avatar } from '../components/Avatar';
import { LanguageSwitcher } from '../components/LanguageSwitcher';
import { useCurrentUser, useLogout } from '../features/auth/useAuth';

const PAGES = [
  { to: '/dashboard', label: 'nav.dashboard' },
  { to: '/goals', label: 'nav.goals' },
] as const;

// Layout of the logged-in part of the app
export function AppLayout() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { data: user } = useCurrentUser();
  const logout = useLogout();

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-abyss-border bg-void/70 backdrop-blur">
        <nav
          aria-label={t('common.mainNavigation')}
          className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6"
        >
          <Logo to="/dashboard" compactOnMobile />
          <div className="flex min-w-0 items-center gap-2 sm:gap-3">
            <span className="hidden items-center gap-2 text-sm font-medium text-slate-300 sm:inline-flex">
              {user?.avatarKey && <Avatar avatarKey={user.avatarKey} size={28} />}
              {user?.username}
            </span>
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
          <div className="mx-auto flex max-w-6xl gap-1 px-4 sm:px-6" role="list">
            {PAGES.map((page) => (
              <NavLink
                key={page.to}
                to={page.to}
                role="listitem"
                className={({ isActive }) =>
                  `border-b-2 px-4 py-2.5 text-sm font-semibold transition ${
                    isActive
                      ? 'border-arcane-500 text-white'
                      : 'border-transparent text-slate-400 hover:text-slate-200'
                  }`
                }
              >
                {t(page.label)}
              </NavLink>
            ))}
          </div>
        )}
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6 sm:py-10">
        <Outlet />
      </main>
    </div>
  );
}
