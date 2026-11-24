import type { RequestHandler } from 'express';
import { prisma } from '../lib/prisma.js';
import { AppError } from '../utils/AppError.js';

// Use after requireAuth. The role is read from the database on every request (not
// from the token), so removing someone's admin role takes effect immediately.
export const requireAdmin: RequestHandler = async (req, _res, next) => {
  const user = await prisma.user.findUnique({ where: { id: req.userId! }, select: { role: true } });
  if (user?.role !== 'ADMIN') throw new AppError(403, 'FORBIDDEN', 'Admins only');
  next();
};
