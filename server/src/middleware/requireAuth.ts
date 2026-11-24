import type { RequestHandler } from 'express';
import { AppError } from '../utils/AppError.js';
import { AUTH_COOKIE, verifyAuthToken } from '../utils/authToken.js';

// Protects a route: only requests with a valid login cookie get through.
export const requireAuth: RequestHandler = (req, _res, next) => {
  const token: unknown = req.cookies?.[AUTH_COOKIE];
  const userId = typeof token === 'string' ? verifyAuthToken(token) : null;

  if (!userId) {
    throw new AppError(401, 'UNAUTHENTICATED', 'You must be logged in');
  }

  req.userId = userId;
  next();
};
