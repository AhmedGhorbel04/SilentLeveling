import { Router } from 'express';
import { requireAuth } from '../../middleware/requireAuth.js';
import { getDashboard } from './dashboard.service.js';

// GET /api/me/dashboard — level, XP bar, rank, stats, streak, discipline rate
export const dashboardRouter = Router();

dashboardRouter.get('/dashboard', requireAuth, async (req, res) => {
  res.json(await getDashboard(req.userId!));
});
