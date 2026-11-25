import { apiRequest } from './client';
import type { CurrentUser } from './auth';
import type { UnlockedAchievement } from './achievements';
import type {
  AvatarKey,
  Category,
  CustomDifficulty,
  DailyMinutes,
  Difficulty,
  SkillLevel,
} from '../game/constants';

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
  description: string | null;
  milestone: { id: string; title: string; goalTitle: string } | null;
  rerollable: boolean;
};

export type TodayQuests = {
  date: string;
  daily: Quest[];
  weekly: Quest[];
  penalty: Quest[];
  custom: Quest[];
  rerollsLeft: number;
  customXpRemaining: number;
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
  achievements: UnlockedAchievement[];
};

export type OnboardingRequest = {
  focusAreas: { category: Category; level: SkillLevel }[];
  dailyMinutes: DailyMinutes;
  avatarKey: AvatarKey;
};

export type CustomQuestRequest = {
  title: string;
  description: string;
  category: Category;
  difficulty: CustomDifficulty;
  dueDate: string; // YYYY-MM-DD
  milestoneId: string | null;
};

export const questsApi = {
  today: () => apiRequest<TodayQuests>('/quests/today'),
  // completedAt: only for a quest completed offline and synced later
  complete: (id: string, completedAt?: string) =>
    apiRequest<CompleteQuestResult>(`/quests/${id}/complete`, {
      method: 'POST',
      body: completedAt ? { completedAt } : undefined,
    }),
  reroll: (id: string) =>
    apiRequest<{ quest: Quest; rerollsLeft: number }>(`/quests/${id}/reroll`, { method: 'POST' }),
  onboard: (data: OnboardingRequest) =>
    apiRequest<{ user: CurrentUser }>('/onboarding', { method: 'POST', body: data }),
  createCustom: (data: CustomQuestRequest & { id?: string }) =>
    apiRequest<{ quest: Quest }>('/quests', { method: 'POST', body: data }),
  updateCustom: ({ id, ...data }: CustomQuestRequest & { id: string }) =>
    apiRequest<{ quest: Quest }>(`/quests/${id}`, { method: 'PATCH', body: data }),
  deleteCustom: (id: string) => apiRequest<void>(`/quests/${id}`, { method: 'DELETE' }),
};
