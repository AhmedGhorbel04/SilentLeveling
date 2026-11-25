import request from 'supertest';
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { createApp } from '../../src/app.js';
import { prisma } from '../../src/lib/prisma.js';
import { completeOnboarding } from '../../src/modules/onboarding/onboarding.service.js';
import { completeQuest, getTodayQuests } from '../../src/modules/quests/quest.service.js';
import {
  saveDevice,
  sendDueReminders,
  updateReminderSettings,
} from '../../src/modules/reminders/reminder.service.js';
import type { PushSender } from '../../src/modules/reminders/pushSender.js';
import { signAuthToken } from '../../src/utils/authToken.js';
import { resetDatabase } from '../helpers/database.js';
import { createTestUser } from '../helpers/users.js';

// Tunis is UTC+1 in November: 19:00 UTC is 20:00 there
const MORNING = new Date('2026-11-24T08:00:00Z');
const AT_20H_TUNIS = new Date('2026-11-24T19:00:00Z');
const device = (n = 1) => ({
  endpoint: `https://push.example.com/device-${n}`,
  p256dh: 'p256dh-key',
  auth: 'auth-key',
});

async function remindedPlayer({ visitedToday = true } = {}) {
  const user = await createTestUser({ timezone: 'Africa/Tunis' });
  await completeOnboarding(
    user.id,
    {
      focusAreas: [{ category: 'READING', level: 'BEGINNER' }],
      dailyMinutes: 30,
      avatarKey: 'sigil-1',
    },
    visitedToday ? MORNING : new Date('2026-11-23T08:00:00Z'),
  );
  await updateReminderSettings(user.id, { enabled: true, time: '20:00' });
  await saveDevice(user.id, device());
  return user;
}

function fakeSender() {
  return vi.fn<PushSender>(async () => undefined);
}

beforeEach(async () => {
  await resetDatabase();
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe('sending due reminders', () => {
  it("notifies at the player's local time with the quests left, once per day", async () => {
    const user = await remindedPlayer();
    const { daily } = await getTodayQuests(user.id, MORNING);
    await completeQuest(user.id, daily[0]!.id, MORNING);
    const send = fakeSender();

    const summary = await sendDueReminders(AT_20H_TUNIS, send);

    expect(summary.sent).toBe(1);
    expect(send).toHaveBeenCalledWith(
      expect.objectContaining({ endpoint: device().endpoint }),
      expect.objectContaining({
        body: `${daily.length - 1} daily quest${daily.length - 1 === 1 ? '' : 's'} left today.`,
        url: '/dashboard',
      }),
    );

    // The job runs again 15 minutes later: nothing new
    await sendDueReminders(new Date(AT_20H_TUNIS.getTime() + 15 * 60_000), send);
    expect(send).toHaveBeenCalledTimes(1);
  });

  it('waits for the reminder time, and gives up when the job is hours late', async () => {
    await remindedPlayer();
    const send = fakeSender();

    await sendDueReminders(new Date('2026-11-24T18:45:00Z'), send); // 19:45 in Tunis
    await sendDueReminders(new Date('2026-11-24T22:30:00Z'), send); // 23:30, 3h30 late
    expect(send).not.toHaveBeenCalled();
  });

  it('sends nothing when all daily quests are done', async () => {
    const user = await remindedPlayer();
    const { daily } = await getTodayQuests(user.id, MORNING);
    for (const quest of daily) await completeQuest(user.id, quest.id, MORNING);
    const send = fakeSender();

    const summary = await sendDueReminders(AT_20H_TUNIS, send);

    expect(send).not.toHaveBeenCalled();
    expect(summary.skipped).toBe(1);
  });

  it("says the quests are waiting when the player hasn't opened the app today", async () => {
    await remindedPlayer({ visitedToday: false });
    const send = fakeSender();

    await sendDueReminders(AT_20H_TUNIS, send);

    expect(send.mock.calls[0]![1].body).toBe('Your daily quests are waiting.');
  });

  it("writes in the player's language and mentions the streak", async () => {
    const user = await remindedPlayer({ visitedToday: false });
    await prisma.user.update({
      where: { id: user.id },
      data: { language: 'fr', currentStreak: 6 },
    });
    const send = fakeSender();

    await sendDueReminders(AT_20H_TUNIS, send);

    expect(send.mock.calls[0]![1].body).toBe(
      "Tes quêtes du jour t'attendent. Garde ta série de 6 jours 🔥",
    );
  });

  it('forgets a device the push service says is gone', async () => {
    const user = await remindedPlayer({ visitedToday: false });
    await saveDevice(user.id, device(2));
    const send = vi.fn<PushSender>(async (target) => {
      if (target.endpoint.endsWith('device-1'))
        throw Object.assign(new Error('Gone'), { statusCode: 410 });
    });

    const summary = await sendDueReminders(AT_20H_TUNIS, send);

    expect(summary).toMatchObject({ sent: 1, removedDevices: 1 });
    const left = await prisma.pushSubscription.findMany({ where: { userId: user.id } });
    expect(left.map((d) => d.endpoint)).toEqual([device(2).endpoint]);
  });

  it('ignores players with reminders off or without a device', async () => {
    const off = await remindedPlayer();
    await updateReminderSettings(off.id, { enabled: false });
    const noDevice = await remindedPlayer();
    await prisma.pushSubscription.deleteMany({ where: { userId: noDevice.id } });

    const summary = await sendDueReminders(AT_20H_TUNIS, fakeSender());

    expect(summary.checked).toBe(0);
  });
});

describe('reminder routes', () => {
  it('saves settings and devices, and moves a device to the account that subscribed last', async () => {
    const app = createApp();
    const first = await createTestUser();
    const second = await createTestUser();
    const as = (user: { id: string }) => `sl_token=${signAuthToken(user.id)}`;
    const subscription = {
      endpoint: 'https://fcm.googleapis.com/fcm/send/abc',
      keys: { p256dh: 'BPx', auth: 'xyz' },
    };

    const bad = await request(app)
      .patch('/api/me/reminders')
      .set('Cookie', as(first))
      .send({ time: '25:00' });
    expect(bad.body.error.details).toEqual({ time: 'REMINDER_TIME_INVALID' });

    const settings = await request(app)
      .patch('/api/me/reminders')
      .set('Cookie', as(first))
      .send({ enabled: true, time: '07:30' });
    expect(settings.body).toMatchObject({ enabled: true, time: '07:30', devices: 0 });

    await request(app).post('/api/push/devices').set('Cookie', as(first)).send(subscription);
    await request(app).post('/api/push/devices').set('Cookie', as(second)).send(subscription);
    const owners = await prisma.pushSubscription.findMany();
    expect(owners.map((d) => d.userId)).toEqual([second.id]);

    await request(app)
      .delete('/api/push/devices')
      .set('Cookie', as(second))
      .send({ endpoint: subscription.endpoint });
    expect(await prisma.pushSubscription.count()).toBe(0);

    const httpEndpoint = await request(app)
      .post('/api/push/devices')
      .set('Cookie', as(first))
      .send({ ...subscription, endpoint: 'http://insecure.example.com' });
    expect(httpEndpoint.status).toBe(400);
  });

  it('refuses the scheduled job without the secret', async () => {
    const res = await request(createApp())
      .post('/api/cron/reminders')
      .set('Authorization', 'Bearer wrong');

    expect(res.status).toBe(401);
  });
});
