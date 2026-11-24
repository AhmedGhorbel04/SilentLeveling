import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../../middleware/requireAuth.js';
import { AppError } from '../../utils/AppError.js';
import { getDashboard } from './dashboard.service.js';
import { getCalendar, getXpHistory } from './history.service.js';

const historyQuery = z.object({ days: z.coerce.number().int().min(7).max(90).default(30) });
const calendarQuery = z.object({
  month: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'MONTH_INVALID'),
});

function parseQuery<T>(schema: z.ZodType<T>, query: unknown): T {
  const result = schema.safeParse(query);
  if (!result.success) {
    throw new AppError(400, 'VALIDATION_ERROR', 'Invalid query', {
      [String(result.error.issues[0]!.path[0])]: result.error.issues[0]!.message,
    });
  }
  return result.data;
}

// GET /api/me/dashboard — level, XP bar, rank, stats, streak, discipline rate
export const dashboardRouter = Router();

dashboardRouter.get('/dashboard', requireAuth, async (req, res) => {
  res.json(await getDashboard(req.userId!));
});

// GET /api/me/xp-history?days=30 — XP per day for the chart
dashboardRouter.get('/xp-history', requireAuth, async (req, res) => {
  const { days } = parseQuery(historyQuery, req.query);
  res.json({ days: await getXpHistory(req.userId!, days) });
});

// GET /api/me/calendar?month=2026-11 — daily logs of a month
dashboardRouter.get('/calendar', requireAuth, async (req, res) => {
  const { month } = parseQuery(calendarQuery, req.query);
  res.json({ days: await getCalendar(req.userId!, month) });
});
