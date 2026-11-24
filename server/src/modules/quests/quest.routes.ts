import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import { requireAuth } from '../../middleware/requireAuth.js';
import { validateBody } from '../../middleware/validate.js';
import { AppError } from '../../utils/AppError.js';
import * as questService from './quest.service.js';
import * as customQuestService from './customQuest.service.js';
import { createCustomQuestSchema, updateCustomQuestSchema } from './customQuest.schemas.js';

// GET    /api/quests/today          today's daily, weekly, penalty and custom quests
// POST   /api/quests                create a custom quest
// PATCH  /api/quests/:id            edit an active custom quest
// DELETE /api/quests/:id            delete an active custom quest
// POST   /api/quests/:id/complete   complete a quest, returns the XP and level result
// POST   /api/quests/:id/reroll     replace a daily quest (3 per day)
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

questRouter.post('/', validateBody(createCustomQuestSchema), async (req, res) => {
  const quest = await customQuestService.createCustomQuest(req.userId!, req.body);
  res.status(201).json({ quest });
});

questRouter.patch('/:id', validateBody(updateCustomQuestSchema), async (req, res) => {
  const quest = await customQuestService.updateCustomQuest(req.userId!, questIdFrom(req), req.body);
  res.json({ quest });
});

questRouter.delete('/:id', async (req, res) => {
  await customQuestService.deleteCustomQuest(req.userId!, questIdFrom(req));
  res.status(204).end();
});

questRouter.post('/:id/complete', async (req: Request, res: Response) => {
  res.json(await questService.completeQuest(req.userId!, questIdFrom(req)));
});

questRouter.post('/:id/reroll', async (req: Request, res: Response) => {
  res.json(await questService.rerollQuest(req.userId!, questIdFrom(req)));
});
