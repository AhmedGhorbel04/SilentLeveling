import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { env, isProduction } from './config/env.js';
import { createAuthLimiter } from './middleware/rateLimit.js';
import { errorHandler, notFound } from './middleware/errorHandler.js';
import { healthRouter } from './modules/health/health.routes.js';
import { createAuthRouter } from './modules/auth/auth.routes.js';
import { ranksRouter } from './modules/progression/ranks.routes.js';
import { onboardingRouter } from './modules/onboarding/onboarding.routes.js';
import { questRouter } from './modules/quests/quest.routes.js';
import { dashboardRouter } from './modules/dashboard/dashboard.routes.js';
import { goalRouter, milestoneRouter } from './modules/goals/goal.routes.js';
import { achievementRouter, titleRouter } from './modules/achievements/achievement.routes.js';
import { notificationRouter } from './modules/notifications/notification.routes.js';
import { friendRouter, profileRouter, userRouter } from './modules/friends/friend.routes.js';
import { adminRouter, claimRouter, legendaryRouter } from './modules/claims/claim.routes.js';

type AppOptions = {
  // Tests lower this to check the limiter without making hundreds of requests
  authRateLimitMax?: number;
};

// Builds the Express app without starting it, so tests can import it directly.
export function createApp(options: AppOptions = {}) {
  const app = express();

  app.disable('x-powered-by');
  // In production the app runs behind the hosting provider's proxy: trust it so
  // req.ip is the real client IP (needed for rate limiting).
  if (isProduction) app.set('trust proxy', 1);

  app.use(helmet()); // security-related HTTP headers
  app.use(cors({ origin: env.CLIENT_ORIGIN, credentials: true })); // only our frontend
  app.use(express.json({ limit: '100kb' })); // parse JSON bodies, reject huge ones
  app.use(cookieParser()); // makes req.cookies available

  const authLimiter = createAuthLimiter(options.authRateLimitMax ?? env.AUTH_RATE_LIMIT_MAX);

  app.use('/api/health', healthRouter);
  app.use('/api/auth', createAuthRouter(authLimiter));
  app.use('/api/ranks', ranksRouter);
  app.use('/api/onboarding', onboardingRouter);
  app.use('/api/quests', questRouter);
  app.use('/api/me', dashboardRouter);
  app.use('/api/me', titleRouter);
  app.use('/api/achievements', achievementRouter);
  app.use('/api/notifications', notificationRouter);
  app.use('/api/friends', friendRouter);
  app.use('/api/users', userRouter);
  app.use('/api/me', profileRouter);
  app.use('/api/legendary-quests', legendaryRouter);
  app.use('/api/claims', claimRouter);
  app.use('/api/admin', adminRouter);
  app.use('/api/goals', goalRouter);
  app.use('/api/milestones', milestoneRouter);

  app.use(notFound);
  app.use(errorHandler);

  return app;
}
