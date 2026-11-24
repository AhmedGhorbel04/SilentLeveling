import { apiRequest } from './client';

export type TitleRarity = 'COMMON' | 'RARE' | 'EPIC' | 'LEGENDARY' | 'MYTHIC';

export type Title = {
  id: string;
  key: string;
  name: { en: string; fr: string; ar: string };
  rarity: TitleRarity;
};

export type Achievement = {
  code: string;
  unlockedAt: string | null;
  title: Title | null;
};

export type UnlockedAchievement = { code: string; title: Title | null };

export type NotificationType =
  'ACHIEVEMENT_UNLOCKED' | 'RANK_UP' | 'PENALTY_QUEST' | 'FRIEND_REQUEST' | 'FRIEND_ACCEPTED';

export type AppNotification = {
  id: string;
  type: NotificationType;
  data: Record<string, string>;
  read: boolean;
  createdAt: string;
};

export const achievementsApi = {
  list: () => apiRequest<{ achievements: Achievement[] }>('/achievements'),
  titles: () =>
    apiRequest<{ titles: (Title & { earnedAt: string })[]; activeTitleId: string | null }>(
      '/me/titles',
    ),
  setActiveTitle: (titleId: string | null) =>
    apiRequest<void>('/me/active-title', { method: 'PUT', body: { titleId } }),
};

export const notificationsApi = {
  list: () =>
    apiRequest<{ notifications: AppNotification[]; unreadCount: number }>('/notifications'),
  markRead: (id: string) => apiRequest<void>(`/notifications/${id}/read`, { method: 'POST' }),
  markAllRead: () => apiRequest<void>('/notifications/read-all', { method: 'POST' }),
};
