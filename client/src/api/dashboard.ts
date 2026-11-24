import { apiRequest } from './client';
import type { Title } from './achievements';

type RankInfo = { code: string; label: string };

// Mirrors the Dashboard type returned by GET /api/me/dashboard
export type Dashboard = {
  username: string;
  avatarKey: string | null;
  activeTitle: Title | null;
  totalXp: number;
  progress: { level: number; xpIntoLevel: number; xpForNextLevel: number; percent: number };
  rank: RankInfo;
  nextRank: (RankInfo & { minLevel: number }) | null;
  rankLockedBy: { legendary: number; mythic: number } | null;
  stats: { strength: number; intelligence: number; discipline: number; consistency: number };
  streak: { current: number; best: number };
  disciplineRate: number | null;
  customXp: { earnedToday: number; dailyCap: number };
};

export type XpDay = { date: string; xp: number };
export type CalendarDay = {
  date: string;
  questsTotal: number;
  questsCompleted: number;
  allCompleted: boolean;
};

export const dashboardApi = {
  get: () => apiRequest<Dashboard>('/me/dashboard'),
  xpHistory: (days: number) => apiRequest<{ days: XpDay[] }>(`/me/xp-history?days=${days}`),
  calendar: (month: string) => apiRequest<{ days: CalendarDay[] }>(`/me/calendar?month=${month}`),
};
