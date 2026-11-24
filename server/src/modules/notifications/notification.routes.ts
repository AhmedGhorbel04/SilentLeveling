import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../../middleware/requireAuth.js';
import { AppError } from '../../utils/AppError.js';
import * as notificationService from './notification.service.js';

// GET  /api/notifications?unread=true   latest 50 notifications + unread count
// POST /api/notifications/:id/read      mark one as read
// POST /api/notifications/read-all      mark all as read
export const notificationRouter = Router();
notificationRouter.use(requireAuth);

notificationRouter.get('/', async (req, res) => {
  res.json(await notificationService.listNotifications(req.userId!, req.query.unread === 'true'));
});

notificationRouter.post('/read-all', async (req, res) => {
  await notificationService.markAllRead(req.userId!);
  res.status(204).end();
});

notificationRouter.post('/:id/read', async (req, res) => {
  const id = z.uuid().safeParse(req.params.id);
  if (!id.success) throw new AppError(404, 'NOTIFICATION_NOT_FOUND', 'Notification not found');
  await notificationService.markRead(req.userId!, id.data);
  res.status(204).end();
});
