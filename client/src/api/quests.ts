import { apiRequest } from './client';
import type { CurrentUser } from './auth';
import type { AvatarKey, Category, DailyMinutes, Difficulty, SkillLevel } from '../game/constants';

export type Quest = {
  id: string;
  source: 'SYSTEM' | 'CUSTOM' | 'PENALTY';
  type: 'DAILY' | 'WEEKLY' | 'ONE_TIME';
  category: Category;
  difficulty: Difficulty;
  minutes: number | null;
  xpReward: number;
  xpAwarded: number | null;
  status: 'ACTIVE' | 'COMPLETED' | 'FAILED' | 'REPLACED';
  questDate: string;
  dueAt: string;
  completedAt: string | null;
  title: { en: string; fr: string; ar: string };
  rerollable: boolean;
};

export type TodayQuests = {
  date: string;
  daily: Quest[];
  weekly: Quest[];
  penalty: Quest[];
  rerollsLeft: number;
};

export type CompleteQuestResult = {
  quest: Quest;
  xpGained: number;
  totalXp: number;
  progress: { level: number; xpIntoLevel: number; xpForNextLevel: number; percent: number };
  levelBefore: number;
  levelAfter: number;
  leveledUp: boolean;
  rankBefore: string;
  rankAfter: string;
  rankedUp: boolean;
  streak: number;
  streakRestored: boolean;
  skillLevelUp: { category: Category; level: SkillLevel } | null;
};

export type OnboardingRequest = {
  focusAreas: { category: Category; level: SkillLevel }[];
  dailyMinutes: DailyMinutes;
  avatarKey: AvatarKey;
};

export const questsApi = {
  today: () => apiRequest<TodayQuests>('/quests/today'),
  complete: (id: string) =>
    apiRequest<CompleteQuestResult>(`/quests/${id}/complete`, { method: 'POST' }),
  reroll: (id: string) =>
    apiRequest<{ quest: Quest; rerollsLeft: number }>(`/quests/${id}/reroll`, { method: 'POST' }),
  onboard: (data: OnboardingRequest) =>
    apiRequest<{ user: CurrentUser }>('/onboarding', { method: 'POST', body: data }),
};
