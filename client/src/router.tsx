import { createBrowserRouter } from 'react-router';
import { AuthLayout } from './layouts/AuthLayout';
import { AppLayout } from './layouts/AppLayout';
import { AdminRoute, GuestRoute, OnboardingRoute, ProtectedRoute } from './routes/guards';
import { LandingPage } from './pages/LandingPage';
import { NotFoundPage } from './pages/NotFoundPage';

// All pages of the app. Nested routes share their parent's layout or guard.
// Pages behind the login are loaded on demand (`lazy`), so the landing and auth
// pages download only the code they need.
export const router = createBrowserRouter([
  { path: '/', element: <LandingPage /> },
  {
    element: <GuestRoute />,
    children: [
      {
        element: <AuthLayout />,
        children: [
          {
            path: '/login',
            lazy: () =>
              import('./features/auth/LoginPage').then((m) => ({ Component: m.LoginPage })),
          },
          {
            path: '/register',
            lazy: () =>
              import('./features/auth/RegisterPage').then((m) => ({ Component: m.RegisterPage })),
          },
        ],
      },
    ],
  },
  {
    element: <OnboardingRoute />,
    children: [
      {
        element: <AppLayout />,
        children: [
          {
            path: '/onboarding',
            lazy: () =>
              import('./features/onboarding/OnboardingPage').then((m) => ({
                Component: m.OnboardingPage,
              })),
          },
        ],
      },
    ],
  },
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <AppLayout />,
        children: [
          {
            path: '/dashboard',
            lazy: () =>
              import('./pages/DashboardPage').then((m) => ({ Component: m.DashboardPage })),
          },
          {
            path: '/progress',
            lazy: () =>
              import('./features/progress/ProgressPage').then((m) => ({
                Component: m.ProgressPage,
              })),
          },
          {
            path: '/goals',
            lazy: () =>
              import('./features/goals/GoalsPage').then((m) => ({ Component: m.GoalsPage })),
          },
          {
            path: '/achievements',
            lazy: () =>
              import('./features/achievements/AchievementsPage').then((m) => ({
                Component: m.AchievementsPage,
              })),
          },
          {
            path: '/friends',
            lazy: () =>
              import('./features/friends/FriendsPage').then((m) => ({ Component: m.FriendsPage })),
          },
          {
            path: '/u/:username',
            lazy: () =>
              import('./features/friends/ProfilePage').then((m) => ({ Component: m.ProfilePage })),
          },
          {
            path: '/legendary',
            lazy: () =>
              import('./features/claims/LegendaryPage').then((m) => ({
                Component: m.LegendaryPage,
              })),
          },
          {
            element: <AdminRoute />,
            children: [
              {
                path: '/admin',
                lazy: () =>
                  import('./features/claims/AdminPage').then((m) => ({ Component: m.AdminPage })),
              },
            ],
          },
        ],
      },
    ],
  },
  { path: '*', element: <NotFoundPage /> },
]);
