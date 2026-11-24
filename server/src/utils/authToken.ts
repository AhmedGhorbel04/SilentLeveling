import jwt from 'jsonwebtoken';
import type { Response } from 'express';
import { env, isProduction } from '../config/env.js';

export const AUTH_COOKIE = 'sl_token';
const TOKEN_TTL_SECONDS = 7 * 24 * 60 * 60; // 7 days

// The token only contains the user id ("sub" = subject). It is signed, not encrypted:
// anyone can read it, but nobody can change it without the secret.
export function signAuthToken(userId: string): string {
  return jwt.sign({}, env.JWT_SECRET, {
    subject: userId,
    expiresIn: TOKEN_TTL_SECONDS,
    algorithm: 'HS256',
  });
}

// Returns the user id, or null if the token is invalid, tampered with or expired.
export function verifyAuthToken(token: string): string | null {
  try {
    const payload = jwt.verify(token, env.JWT_SECRET, { algorithms: ['HS256'] });
    return typeof payload === 'object' && typeof payload.sub === 'string' ? payload.sub : null;
  } catch {
    return null;
  }
}

// httpOnly: JavaScript in the page cannot read the cookie (protects against XSS).
// secure: only sent over HTTPS (in production).
// sameSite lax: not sent with cross-site POST requests (protects against CSRF).
const cookieOptions = {
  httpOnly: true,
  secure: isProduction,
  sameSite: 'lax',
  path: '/',
} as const;

export function setAuthCookie(res: Response, token: string): void {
  res.cookie(AUTH_COOKIE, token, { ...cookieOptions, maxAge: TOKEN_TTL_SECONDS * 1000 });
}

export function clearAuthCookie(res: Response): void {
  res.clearCookie(AUTH_COOKIE, cookieOptions);
}
