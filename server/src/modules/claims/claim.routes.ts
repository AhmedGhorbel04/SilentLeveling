import { Router, type Request } from 'express';
import { z } from 'zod';
import { requireAuth } from '../../middleware/requireAuth.js';
import { requireAdmin } from '../../middleware/requireAdmin.js';
import { validateBody } from '../../middleware/validate.js';
import { AppError } from '../../utils/AppError.js';
import * as claimService from './claim.service.js';
import { approveClaimSchema, rejectClaimSchema, submitClaimSchema } from './claim.schemas.js';

// GET  /api/legendary-quests                     catalog, with my claim status for each
// GET  /api/claims/mine                          my claims
// POST /api/claims                               submit a claim
// GET  /api/admin/claims?status=PENDING          (admin) claims to review
// POST /api/admin/claims/:id/approve             (admin) { xp, tier, titleId? | newTitle?, note? }
// POST /api/admin/claims/:id/reject              (admin) { reason }
// GET  /api/admin/legendary-quests               (admin) whole catalog
// PATCH /api/admin/legendary-quests/:id          (admin) { active }
// GET  /api/admin/titles                         (admin) titles that can be awarded

function idFrom(req: Request, notFoundCode: string): string {
  const result = z.uuid().safeParse(req.params.id);
  if (!result.success) throw new AppError(404, notFoundCode, 'Not found');
  return result.data;
}

export const legendaryRouter = Router();
legendaryRouter.use(requireAuth);
legendaryRouter.get('/', async (req, res) => {
  res.json({ quests: await claimService.listLegendaryQuests(req.userId!) });
});

export const claimRouter = Router();
claimRouter.use(requireAuth);
claimRouter.get('/mine', async (req, res) => {
  res.json({ claims: await claimService.listMyClaims(req.userId!) });
});
claimRouter.post('/', validateBody(submitClaimSchema), async (req, res) => {
  res.status(201).json({ claim: await claimService.submitClaim(req.userId!, req.body) });
});

export const adminRouter = Router();
adminRouter.use(requireAuth, requireAdmin);

adminRouter.get('/claims', async (req, res) => {
  const status = z
    .enum(['PENDING', 'APPROVED', 'REJECTED'])
    .catch('PENDING')
    .parse(req.query.status);
  res.json({ claims: await claimService.listClaimsForReview(status) });
});

adminRouter.post('/claims/:id/approve', validateBody(approveClaimSchema), async (req, res) => {
  const result = await claimService.approveClaim(
    req.userId!,
    idFrom(req, 'CLAIM_NOT_FOUND'),
    req.body,
  );
  res.json(result);
});

adminRouter.post('/claims/:id/reject', validateBody(rejectClaimSchema), async (req, res) => {
  await claimService.rejectClaim(req.userId!, idFrom(req, 'CLAIM_NOT_FOUND'), req.body.reason);
  res.status(204).end();
});

adminRouter.get('/legendary-quests', async (_req, res) => {
  res.json({ quests: await claimService.listCatalogForAdmin() });
});

adminRouter.patch(
  '/legendary-quests/:id',
  validateBody(z.object({ active: z.boolean({ error: 'REQUIRED' }) })),
  async (req, res) => {
    await claimService.setLegendaryQuestActive(
      idFrom(req, 'LEGENDARY_QUEST_NOT_FOUND'),
      req.body.active,
    );
    res.status(204).end();
  },
);

adminRouter.get('/titles', async (_req, res) => {
  res.json({ titles: await claimService.listTitlesForAdmin() });
});
