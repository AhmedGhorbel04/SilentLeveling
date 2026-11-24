import { prisma } from '../../lib/prisma.js';
import type { NotificationType, Prisma } from '../../generated/prisma/client.js';
import { AppError } from '../../utils/AppError.js';

type Tx = Prisma.TransactionClient;

export type NotificationDto = {
  id: string;
  type: NotificationType;
  data: Record<string, unknown>;
  read: boolean;
  createdAt: Date;
};

// Created inside the transaction of the event that caused it, so a notification
// never exists for something that was rolled back
export async function notify(
  tx: Tx,
  userId: string,
  type: NotificationType,
  data: Record<string, string> = {},
): Promise<void> {
  await tx.notification.create({ data: { userId, type, data } });
}

const LIST_LIMIT = 50;

export async function listNotifications(
  userId: string,
  onlyUnread: boolean,
): Promise<{ notifications: NotificationDto[]; unreadCount: number }> {
  const [notifications, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where: { userId, ...(onlyUnread ? { readAt: null } : {}) },
      orderBy: { createdAt: 'desc' },
      take: LIST_LIMIT,
    }),
    prisma.notification.count({ where: { userId, readAt: null } }),
  ]);

  return {
    notifications: notifications.map((n) => ({
      id: n.id,
      type: n.type,
      data: n.data as Record<string, unknown>,
      read: n.readAt !== null,
      createdAt: n.createdAt,
    })),
    unreadCount,
  };
}

export async function markRead(userId: string, notificationId: string): Promise<void> {
  // updateMany with userId: another player's notification simply matches nothing
  const { count } = await prisma.notification.updateMany({
    where: { id: notificationId, userId, readAt: null },
    data: { readAt: new Date() },
  });
  if (count === 0) {
    const exists = await prisma.notification.count({ where: { id: notificationId, userId } });
    if (!exists) throw new AppError(404, 'NOTIFICATION_NOT_FOUND', 'Notification not found');
  }
}

export async function markAllRead(userId: string): Promise<void> {
  await prisma.notification.updateMany({
    where: { userId, readAt: null },
    data: { readAt: new Date() },
  });
}
