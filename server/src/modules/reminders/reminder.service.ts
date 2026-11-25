import { DateTime } from 'luxon';
import { prisma } from '../../lib/prisma.js';
import { env } from '../../config/env.js';
import { AppError } from '../../utils/AppError.js';
import { fromDbDate, localDate, toDbDate } from '../../utils/time.js';
import {
  isGone,
  pushConfigured,
  webPushSender,
  type PushPayload,
  type PushSender,
  type PushTarget,
} from './pushSender.js';

// A reminder is still sent if the scheduled job runs late (free hosting can delay
// it), but not hours later: past this window, that day's reminder is skipped
export const REMINDER_WINDOW_MINUTES = 180;

type Language = 'en' | 'fr' | 'ar';

// Push notifications are shown by the device, outside the app: they are written
// here, in the player's language
const MESSAGES: Record<
  Language,
  {
    title: string;
    left: (n: number) => string;
    fresh: string;
    streak: (n: number) => string;
    test: string;
  }
> = {
  en: {
    title: 'SilentLeveling',
    left: (n) => (n === 1 ? '1 daily quest left today.' : `${n} daily quests left today.`),
    fresh: 'Your daily quests are waiting.',
    streak: (n) => ` Keep your ${n}-day streak 🔥`,
    test: 'Reminders are on. See you at your reminder time!',
  },
  fr: {
    title: 'SilentLeveling',
    left: (n) =>
      n === 1
        ? "Il te reste 1 quête du jour aujourd'hui."
        : `Il te reste ${n} quêtes du jour aujourd'hui.`,
    fresh: "Tes quêtes du jour t'attendent.",
    streak: (n) => ` Garde ta série de ${n} jours 🔥`,
    test: "Les rappels sont activés. À tout à l'heure !",
  },
  ar: {
    title: 'SilentLeveling',
    left: (n) => (n === 1 ? 'بقيت لك مهمة يومية واحدة اليوم.' : `بقيت لك ${n} مهام يومية اليوم.`),
    fresh: 'مهامك اليومية في انتظارك.',
    streak: (n) => ` حافظ على سلسلتك من ${n} يومًا 🔥`,
    test: 'التذكيرات مفعّلة. نراك في موعد التذكير!',
  },
};

export type ReminderSettings = {
  enabled: boolean;
  time: string;
  devices: number;
  // null when the server has no push keys: the app then hides the feature
  publicKey: string | null;
};

export async function getReminderSettings(userId: string): Promise<ReminderSettings> {
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: {
      reminderEnabled: true,
      reminderTime: true,
      _count: { select: { pushDevices: true } },
    },
  });
  return {
    enabled: user.reminderEnabled,
    time: user.reminderTime,
    devices: user._count.pushDevices,
    publicKey: pushConfigured ? env.VAPID_PUBLIC_KEY! : null,
  };
}

export async function updateReminderSettings(
  userId: string,
  input: { enabled?: boolean; time?: string },
): Promise<ReminderSettings> {
  await prisma.user.update({
    where: { id: userId },
    data: {
      reminderEnabled: input.enabled,
      reminderTime: input.time,
      // A new time today: allow today's reminder at the new time
      ...(input.time !== undefined ? { lastReminderDate: null } : {}),
    },
  });
  return getReminderSettings(userId);
}

// The same device (endpoint) can move to another account: it then belongs to the
// player who subscribed last, never to both
export async function saveDevice(userId: string, device: PushTarget) {
  await prisma.pushSubscription.upsert({
    where: { endpoint: device.endpoint },
    create: { userId, ...device },
    update: { userId, p256dh: device.p256dh, auth: device.auth },
  });
}

export async function removeDevice(userId: string, endpoint: string) {
  await prisma.pushSubscription.deleteMany({ where: { userId, endpoint } });
}

// Sends to every device of a player; forgets devices that unsubscribed for good
async function sendToDevices(
  devices: (PushTarget & { id: string })[],
  payload: PushPayload,
  send: PushSender,
) {
  let delivered = 0;
  let removed = 0;
  for (const device of devices) {
    try {
      await send(device, payload);
      delivered++;
    } catch (error) {
      if (isGone(error)) {
        await prisma.pushSubscription.delete({ where: { id: device.id } }).catch(() => undefined);
        removed++;
      } else {
        console.error('Push failed', (error as Error).message);
      }
    }
  }
  return { delivered, removed };
}

export async function sendTestNotification(userId: string, send: PushSender = webPushSender) {
  if (!pushConfigured && send === webPushSender) {
    throw new AppError(503, 'PUSH_UNAVAILABLE', 'Push notifications are not configured');
  }
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: { language: true, pushDevices: true },
  });
  if (user.pushDevices.length === 0) throw new AppError(409, 'NO_PUSH_DEVICE', 'No device');
  const text = MESSAGES[user.language as Language];
  return sendToDevices(
    user.pushDevices,
    { title: text.title, body: text.test, url: '/dashboard', tag: 'test' },
    send,
  );
}

function minutesOf(time: string): number {
  const [h, m] = time.split(':').map(Number) as [number, number];
  return h * 60 + m;
}

// Called by the scheduled job every 15 minutes. For each player whose reminder time
// has come (in their own time zone) and who has not been reminded today: if daily
// quests are left, notify all their devices.
export async function sendDueReminders(now = new Date(), send: PushSender = webPushSender) {
  const players = await prisma.user.findMany({
    where: { reminderEnabled: true, onboardedAt: { not: null }, pushDevices: { some: {} } },
    select: {
      id: true,
      timezone: true,
      language: true,
      reminderTime: true,
      lastReminderDate: true,
      lastRolloverDate: true,
      currentStreak: true,
      pushDevices: true,
    },
  });

  const summary = { checked: players.length, sent: 0, skipped: 0, removedDevices: 0 };

  for (const player of players) {
    const today = localDate(player.timezone, now);
    if (player.lastReminderDate && fromDbDate(player.lastReminderDate) === today) continue;

    const local = DateTime.fromJSDate(now).setZone(player.timezone);
    const late = local.hour * 60 + local.minute - minutesOf(player.reminderTime);
    if (late < 0 || late > REMINDER_WINDOW_MINUTES) continue;

    // The day may not have started on the server yet (the player has not opened the
    // app today): their new quests exist as soon as they open it
    const dayStarted = player.lastRolloverDate && fromDbDate(player.lastRolloverDate) === today;
    const left = dayStarted
      ? await prisma.quest.count({
          where: {
            userId: player.id,
            status: 'ACTIVE',
            questDate: toDbDate(today),
            OR: [{ type: 'DAILY' }, { source: 'PENALTY' }],
          },
        })
      : null;

    // Marked first: a second job running at the same time sends nothing
    const { count } = await prisma.user.updateMany({
      where: {
        id: player.id,
        OR: [{ lastReminderDate: null }, { lastReminderDate: { not: toDbDate(today) } }],
      },
      data: { lastReminderDate: toDbDate(today) },
    });
    if (count === 0) continue;

    if (left === 0) {
      summary.skipped++; // everything done: no need to bother them
      continue;
    }

    const text = MESSAGES[player.language as Language];
    const body =
      (left === null ? text.fresh : text.left(left)) +
      (player.currentStreak > 0 ? text.streak(player.currentStreak) : '');
    const result = await sendToDevices(
      player.pushDevices,
      { title: text.title, body, url: '/dashboard', tag: 'daily-reminder' },
      send,
    );
    if (result.delivered > 0) summary.sent++;
    summary.removedDevices += result.removed;
  }

  return summary;
}
