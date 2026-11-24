import { Router, type RequestHandler } from 'express';
import { validateBody } from '../../middleware/validate.js';
import { requireAuth } from '../../middleware/requireAuth.js';
import { loginSchema, registerSchema } from './auth.schemas.js';
import * as authController from './auth.controller.js';

// POST /api/auth/register   create an account and log in
// POST /api/auth/login      log in with email or username
// POST /api/auth/logout     log out (clears the cookie)
// GET  /api/auth/me         the logged-in player
export function createAuthRouter(authLimiter: RequestHandler) {
  const router = Router();

  router.post('/register', authLimiter, validateBody(registerSchema), authController.register);
  router.post('/login', authLimiter, validateBody(loginSchema), authController.login);
  router.post('/logout', authController.logout);
  router.get('/me', requireAuth, authController.me);

  return router;
}
