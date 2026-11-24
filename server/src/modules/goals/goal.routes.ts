import { Router, type Request } from 'express';
import { z } from 'zod';
import { requireAuth } from '../../middleware/requireAuth.js';
import { validateBody } from '../../middleware/validate.js';
import { AppError } from '../../utils/AppError.js';
import * as goalService from './goal.service.js';
import {
  createGoalSchema,
  createMilestoneSchema,
  updateGoalSchema,
  updateMilestoneSchema,
} from './goal.schemas.js';

// GET    /api/goals                      the player's goals with milestones and progress
// POST   /api/goals                      create a goal (optionally with milestones)
// PATCH  /api/goals/:id                  edit, complete, abandon or reopen a goal
// DELETE /api/goals/:id                  delete a goal and its milestones
// POST   /api/goals/:id/milestones       add a milestone at the end
// PATCH  /api/milestones/:id             rename, (un)complete or move a milestone
// DELETE /api/milestones/:id             delete a milestone

function uuidParam(req: Request, notFoundCode: string): string {
  const result = z.uuid().safeParse(req.params.id);
  if (!result.success) throw new AppError(404, notFoundCode, 'Not found');
  return result.data;
}

export const goalRouter = Router();
goalRouter.use(requireAuth);

goalRouter.get('/', async (req, res) => {
  res.json({ goals: await goalService.listGoals(req.userId!) });
});

goalRouter.post('/', validateBody(createGoalSchema), async (req, res) => {
  res.status(201).json({ goal: await goalService.createGoal(req.userId!, req.body) });
});

goalRouter.patch('/:id', validateBody(updateGoalSchema), async (req, res) => {
  const id = uuidParam(req, 'GOAL_NOT_FOUND');
  res.json({ goal: await goalService.updateGoal(req.userId!, id, req.body) });
});

goalRouter.delete('/:id', async (req, res) => {
  await goalService.deleteGoal(req.userId!, uuidParam(req, 'GOAL_NOT_FOUND'));
  res.status(204).end();
});

goalRouter.post('/:id/milestones', validateBody(createMilestoneSchema), async (req, res) => {
  const id = uuidParam(req, 'GOAL_NOT_FOUND');
  res.status(201).json({ goal: await goalService.addMilestone(req.userId!, id, req.body.title) });
});

export const milestoneRouter = Router();
milestoneRouter.use(requireAuth);

milestoneRouter.patch('/:id', validateBody(updateMilestoneSchema), async (req, res) => {
  const id = uuidParam(req, 'MILESTONE_NOT_FOUND');
  res.json({ goal: await goalService.updateMilestone(req.userId!, id, req.body) });
});

milestoneRouter.delete('/:id', async (req, res) => {
  const id = uuidParam(req, 'MILESTONE_NOT_FOUND');
  res.json({ goal: await goalService.deleteMilestone(req.userId!, id) });
});
