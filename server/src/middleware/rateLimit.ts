import { rateLimit } from 'express-rate-limit';
import { AppError } from '../utils/AppError.js';

// Limits login/register attempts per IP address to slow down password guessing.
// A new limiter (with its own counter) is created per app, which keeps tests independent.
export function createAuthLimiter(maxAttempts: number) {
  return rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    limit: maxAttempts,
    standardHeaders: 'draft-8', // tells the client when it can retry
    legacyHeaders: false,
    handler: (_req, _res, next) => {
      next(new AppError(429, 'TOO_MANY_REQUESTS', 'Too many attempts, try again later'));
    },
  });
}
