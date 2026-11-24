import { createBrowserRouter } from 'react-router';
import { AuthLayout } from './layouts/AuthLayout';
import { AppLayout } from './layouts/AppLayout';
import { GuestRoute, OnboardingRoute, ProtectedRoute } from './routes/guards';
import { LandingPage } from './pages/LandingPage';
import { LoginPage } from './features/auth/LoginPage';
import { RegisterPage } from './features/auth/RegisterPage';
import { OnboardingPage } from './features/onboarding/OnboardingPage';
import { DashboardPage } from './pages/DashboardPage';
import { GoalsPage } from './features/goals/GoalsPage';
import { AchievementsPage } from './features/achievements/AchievementsPage';
import { NotFoundPage } from './pages/NotFoundPage';

// All pages of the app. Nested routes share their parent's layout or guard.
export const router = createBrowserRouter([
  { path: '/', element: <LandingPage /> },
  {
    element: <GuestRoute />,
    children: [
      {
        element: <AuthLayout />,
        children: [
          { path: '/login', element: <LoginPage /> },
          { path: '/register', element: <RegisterPage /> },
        ],
      },
    ],
  },
  {
    element: <OnboardingRoute />,
    children: [
      {
        element: <AppLayout />,
        children: [{ path: '/onboarding', element: <OnboardingPage /> }],
      },
    ],
  },
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <AppLayout />,
        children: [
          { path: '/dashboard', element: <DashboardPage /> },
          { path: '/goals', element: <GoalsPage /> },
          { path: '/achievements', element: <AchievementsPage /> },
        ],
      },
    ],
  },
  { path: '*', element: <NotFoundPage /> },
]);
