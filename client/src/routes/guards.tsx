import { Navigate, Outlet, useLocation } from 'react-router';
import { useTranslation } from 'react-i18next';
import { FullPageSpinner } from '../components/ui/Spinner';
import { useCurrentUser } from '../features/auth/useAuth';

// Only for logged-in players who finished onboarding. Others are sent to /login
// (remembering where they wanted to go) or to /onboarding.
// Note: this only improves the experience. The real protection is on the backend,
// which checks the login cookie (and onboarding) on every protected request.
export function ProtectedRoute() {
  const { t } = useTranslation();
  const location = useLocation();
  const { data: user, isPending } = useCurrentUser();

  if (isPending) return <FullPageSpinner label={t('common.loading')} />;
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  if (!user.onboarded) return <Navigate to="/onboarding" replace />;

  return <Outlet />;
}

// The onboarding page: logged in, but not onboarded yet
export function OnboardingRoute() {
  const { t } = useTranslation();
  const { data: user, isPending } = useCurrentUser();

  if (isPending) return <FullPageSpinner label={t('common.loading')} />;
  if (!user) return <Navigate to="/login" replace />;
  if (user.onboarded) return <Navigate to="/dashboard" replace />;

  return <Outlet />;
}

// Only for visitors (login, register). Logged-in players go straight to the dashboard.
export function GuestRoute() {
  const { t } = useTranslation();
  const { data: user, isPending } = useCurrentUser();

  if (isPending) return <FullPageSpinner label={t('common.loading')} />;
  if (user) return <Navigate to="/dashboard" replace />;

  return <Outlet />;
}
