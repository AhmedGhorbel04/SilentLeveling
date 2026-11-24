import type { Request, Response } from 'express';
import { AppError } from '../../utils/AppError.js';
import {
  AUTH_COOKIE,
  clearAuthCookie,
  setAuthCookie,
  signAuthToken,
  verifyAuthToken,
} from '../../utils/authToken.js';
import * as authService from './auth.service.js';

// Controllers only translate between HTTP and the service: read the request,
// call the service, send the response. The logic lives in auth.service.ts.

export async function register(req: Request, res: Response) {
  const user = await authService.register(req.body);
  setAuthCookie(res, signAuthToken(user.id));
  res.status(201).json({ user });
}

export async function login(req: Request, res: Response) {
  const user = await authService.login(req.body);
  setAuthCookie(res, signAuthToken(user.id));
  res.json({ user });
}

export function logout(_req: Request, res: Response) {
  clearAuthCookie(res);
  res.status(204).end();
}

export async function me(req: Request, res: Response) {
  const user = await authService.getCurrentUser(req.userId!);
  if (!user) {
    // Valid token, but the account was deleted in the meantime
    clearAuthCookie(res);
    throw new AppError(401, 'UNAUTHENTICATED', 'You must be logged in');
  }
  res.json({ user });
}

// Like /me, but for the frontend's "who is logged in?" check: a visitor is not an
// error, so it answers 200 with user: null instead of 401 (no error in the console).
export async function session(req: Request, res: Response) {
  const token: unknown = req.cookies?.[AUTH_COOKIE];
  const userId = typeof token === 'string' ? verifyAuthToken(token) : null;
  const user = userId ? await authService.getCurrentUser(userId) : null;
  // Expired, invalid, or account deleted: remove the useless cookie
  if (!user && token !== undefined) clearAuthCookie(res);
  res.json({ user });
}
