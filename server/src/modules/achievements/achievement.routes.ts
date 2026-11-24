import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../../middleware/requireAuth.js';
import { validateBody } from '../../middleware/validate.js';
import * as achievementService from './achievement.service.js';

// GET /api/achievements          all achievements, with unlock date when unlocked
// GET /api/me/titles             earned titles and the active one
// PUT /api/me/active-title       choose the title shown next to the username
export const achievementRouter = Router();
achievementRouter.use(requireAuth);

achievementRouter.get('/', async (req, res) => {
  res.json({ achievements: await achievementService.listAchievements(req.userId!) });
});

export const titleRouter = Router();
titleRouter.use(requireAuth);

titleRouter.get('/titles', async (req, res) => {
  res.json(await achievementService.listEarnedTitles(req.userId!));
});

const activeTitleSchema = z.object({
  titleId: z.uuid('TITLE_NOT_EARNED').nullable(), // null = show no title
});

titleRouter.put('/active-title', validateBody(activeTitleSchema), async (req, res) => {
  await achievementService.setActiveTitle(req.userId!, req.body.titleId);
  res.status(204).end();
});
