import { Router, type Request } from 'express';
import { z } from 'zod';
import { requireAuth } from '../../middleware/requireAuth.js';
import { validateBody } from '../../middleware/validate.js';
import { AppError } from '../../utils/AppError.js';
import * as friendService from './friend.service.js';
import * as profileService from './profile.service.js';

// GET    /api/friends                         friend list
// GET    /api/friends/requests                incoming and outgoing requests
// POST   /api/friends/requests                send a request { username }
// POST   /api/friends/requests/:id/accept     accept a request sent to me
// DELETE /api/friends/requests/:id            decline (received) or cancel (sent)
// DELETE /api/friends/:username               remove a friend
// GET    /api/friends/ranking?period=weekly|all
// GET    /api/users/:username                 full profile for friends, mini card otherwise
// PATCH  /api/me/profile                      edit my bio

function requestIdFrom(req: Request): string {
  const result = z.uuid().safeParse(req.params.id);
  if (!result.success) throw new AppError(404, 'REQUEST_NOT_FOUND', 'Friend request not found');
  return result.data;
}

export const friendRouter = Router();
friendRouter.use(requireAuth);

friendRouter.get('/', async (req, res) => {
  res.json({ friends: await friendService.listFriends(req.userId!) });
});

friendRouter.get('/requests', async (req, res) => {
  res.json(await friendService.listRequests(req.userId!));
});

export const sendRequestSchema = z.object({
  username: z.string({ error: 'REQUIRED' }).trim().min(1, 'REQUIRED').max(20, 'USER_NOT_FOUND'),
});

friendRouter.post('/requests', validateBody(sendRequestSchema), async (req, res) => {
  const result = await friendService.sendRequest(req.userId!, req.body.username);
  res.status(result.status === 'PENDING' ? 201 : 200).json(result);
});

friendRouter.post('/requests/:id/accept', async (req, res) => {
  await friendService.acceptRequest(req.userId!, requestIdFrom(req));
  res.status(204).end();
});

friendRouter.delete('/requests/:id', async (req, res) => {
  await friendService.deleteRequest(req.userId!, requestIdFrom(req));
  res.status(204).end();
});

friendRouter.get('/ranking', async (req, res) => {
  const period = req.query.period === 'all' ? 'all' : 'weekly';
  res.json({ period, players: await friendService.friendsRanking(req.userId!, period) });
});

friendRouter.delete('/:username', async (req, res) => {
  await friendService.removeFriend(req.userId!, String(req.params.username));
  res.status(204).end();
});

export const userRouter = Router();
userRouter.use(requireAuth);

userRouter.get('/:username', async (req, res) => {
  res.json(await profileService.getProfile(req.userId!, String(req.params.username)));
});

export const profileRouter = Router();
profileRouter.use(requireAuth);

export const bioSchema = z.object({
  bio: z
    .string()
    .trim()
    .max(160, 'BIO_TOO_LONG')
    .transform((text) => (text === '' ? null : text))
    .nullable(),
});

profileRouter.patch('/profile', validateBody(bioSchema), async (req, res) => {
  await profileService.updateBio(req.userId!, req.body.bio);
  res.status(204).end();
});
