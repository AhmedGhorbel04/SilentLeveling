import { Router } from 'express';
import { requireAuth } from '../../middleware/requireAuth.js';
import { validateBody } from '../../middleware/validate.js';
import { onboardingSchema } from './onboarding.schemas.js';
import { completeOnboarding } from './onboarding.service.js';

// POST /api/onboarding — focus areas, daily time and avatar; generates the first quests
export const onboardingRouter = Router();

onboardingRouter.post('/', requireAuth, validateBody(onboardingSchema), async (req, res) => {
  const user = await completeOnboarding(req.userId!, req.body);
  res.status(201).json({ user });
});
