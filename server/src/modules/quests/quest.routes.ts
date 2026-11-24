import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import { requireAuth } from '../../middleware/requireAuth.js';
import { AppError } from '../../utils/AppError.js';
import * as questService from './quest.service.js';

// GET  /api/quests/today          today's daily, this week's weekly and penalty quests
// POST /api/quests/:id/complete   complete a quest, returns the XP and level result
// POST /api/quests/:id/reroll     replace a daily quest (3 per day)
export const questRouter = Router();

questRouter.use(requireAuth);

// An id that is not a UUID cannot exist: answer 404 instead of letting the
// database reject the malformed value with a 500
function questIdFrom(req: Request): string {
  const result = z.uuid().safeParse(req.params.id);
  if (!result.success) throw new AppError(404, 'QUEST_NOT_FOUND', 'Quest not found');
  return result.data;
}

questRouter.get('/today', async (req: Request, res: Response) => {
  res.json(await questService.getTodayQuests(req.userId!));
});

questRouter.post('/:id/complete', async (req: Request, res: Response) => {
  res.json(await questService.completeQuest(req.userId!, questIdFrom(req)));
});

questRouter.post('/:id/reroll', async (req: Request, res: Response) => {
  res.json(await questService.rerollQuest(req.userId!, questIdFrom(req)));
});
