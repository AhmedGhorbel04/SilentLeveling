import { Outlet, useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';
import { Logo } from '../components/ui/Logo';
import { Button } from '../components/ui/Button';
import { LanguageSwitcher } from '../components/LanguageSwitcher';
import { useCurrentUser, useLogout } from '../features/auth/useAuth';

// Layout of the logged-in part of the app. The navigation grows in later milestones.
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
            <span className="hidden text-sm font-medium text-slate-300 sm:inline">
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
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6 sm:py-10">
        <Outlet />
      </main>
    </div>
  );
}
