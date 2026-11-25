import { timingSafeEqual } from 'node:crypto';
import { Router } from 'express';
import { z } from 'zod';
import { env } from '../../config/env.js';
import { requireAuth } from '../../middleware/requireAuth.js';
import { validateBody } from '../../middleware/validate.js';
import { AppError } from '../../utils/AppError.js';
import * as reminderService from './reminder.service.js';

// GET    /api/me/reminders          my reminder settings (+ the public push key)
// PATCH  /api/me/reminders          { enabled?, time? "HH:MM" }
// POST   /api/push/devices          register this device for notifications
// DELETE /api/push/devices          { endpoint } stop notifications on this device
// POST   /api/push/test             send a test notification to my devices
// POST   /api/cron/reminders        (scheduled job, secret) send the reminders due now

export const reminderSettingsSchema = z
  .object({
    enabled: z.boolean({ error: 'ENABLED_INVALID' }).optional(),
    time: z
      .string()
      .regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'REMINDER_TIME_INVALID')
      .optional(),
  })
  .refine((data) => data.enabled !== undefined || data.time !== undefined, 'NOTHING_TO_UPDATE');

// What the browser's PushManager gives (PushSubscription.toJSON())
export const deviceSchema = z.object({
  endpoint: z.url({ protocol: /^https$/, error: 'PUSH_ENDPOINT_INVALID' }).max(1000),
  keys: z.object(
    {
      p256dh: z.string().min(1).max(200),
      auth: z.string().min(1).max(100),
    },
    { error: 'PUSH_KEYS_INVALID' },
  ),
});

export const removeDeviceSchema = z.object({ endpoint: z.string().max(1000) });

export const reminderRouter = Router();
reminderRouter.use(requireAuth);

reminderRouter.get('/', async (req, res) => {
  res.json(await reminderService.getReminderSettings(req.userId!));
});

reminderRouter.patch('/', validateBody(reminderSettingsSchema), async (req, res) => {
  res.json(await reminderService.updateReminderSettings(req.userId!, req.body));
});

export const pushRouter = Router();
pushRouter.use(requireAuth);

pushRouter.post('/devices', validateBody(deviceSchema), async (req, res) => {
  const { endpoint, keys } = req.body as z.infer<typeof deviceSchema>;
  await reminderService.saveDevice(req.userId!, { endpoint, ...keys });
  res.status(204).end();
});

pushRouter.delete('/devices', validateBody(removeDeviceSchema), async (req, res) => {
  await reminderService.removeDevice(req.userId!, req.body.endpoint);
  res.status(204).end();
});

pushRouter.post('/test', async (req, res) => {
  res.json(await reminderService.sendTestNotification(req.userId!));
});

// Compares in constant time, so the secret can't be guessed from response times
function isCronSecret(header: string | undefined): boolean {
  if (!env.CRON_SECRET || !header?.startsWith('Bearer ')) return false;
  const given = Buffer.from(header.slice('Bearer '.length));
  const expected = Buffer.from(env.CRON_SECRET);
  return given.length === expected.length && timingSafeEqual(given, expected);
}

export const cronRouter = Router();

cronRouter.post('/reminders', async (req, res) => {
  if (!isCronSecret(req.headers.authorization)) {
    throw new AppError(401, 'UNAUTHENTICATED', 'Invalid cron secret');
  }
  res.json(await reminderService.sendDueReminders());
});
