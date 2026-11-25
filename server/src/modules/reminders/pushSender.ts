import * as webpush from 'web-push';
import { env } from '../../config/env.js';

export type PushTarget = { endpoint: string; p256dh: string; auth: string };
export type PushPayload = { title: string; body: string; url: string; tag: string };

// Sends one notification to one device. Throws an error with `statusCode` when the
// push service refuses it: 404 or 410 means the device unsubscribed for good.
export type PushSender = (target: PushTarget, payload: PushPayload) => Promise<void>;

export const pushConfigured = Boolean(env.VAPID_PUBLIC_KEY && env.VAPID_PRIVATE_KEY);

if (pushConfigured) {
  webpush.setVapidDetails(env.VAPID_SUBJECT, env.VAPID_PUBLIC_KEY!, env.VAPID_PRIVATE_KEY!);
}

export const webPushSender: PushSender = async (target, payload) => {
  await webpush.sendNotification(
    { endpoint: target.endpoint, keys: { p256dh: target.p256dh, auth: target.auth } },
    JSON.stringify(payload),
    { TTL: 4 * 60 * 60 }, // a reminder older than 4 hours is useless: drop it
  );
};

export function isGone(error: unknown): boolean {
  const status = (error as { statusCode?: number })?.statusCode;
  return status === 404 || status === 410;
}
