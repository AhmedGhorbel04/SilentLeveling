// Every tunable number of the game, in one place (SRS §3).
// Changing a value here changes the game; the logic in the other files stays the same.

export const DIFFICULTIES = ['EASY', 'NORMAL', 'HARD', 'EXTREME'] as const;
export type Difficulty = (typeof DIFFICULTIES)[number];

export const QUEST_TYPES = ['DAILY', 'WEEKLY', 'ONE_TIME'] as const;
export type QuestType = (typeof QUEST_TYPES)[number];

export const CATEGORIES = [
  'FITNESS',
  'STUDIES',
  'LANGUAGES',
  'READING',
  'CAREER',
  'HEALTH',
] as const;
export type Category = (typeof CATEGORIES)[number];

export type StatName = 'strength' | 'intelligence' | 'discipline' | 'consistency';

// ---- XP (SRS §3.2) ----

// XP depends only on difficulty: each step roughly doubles the reward
export const DIFFICULTY_BASE_XP: Record<Difficulty, number> = {
  EASY: 20,
  NORMAL: 40,
  HARD: 80,
  EXTREME: 150,
};

// A weekly quest is a bigger task spread over several days
export const QUEST_TYPE_MULTIPLIER: Record<QuestType, number> = {
  DAILY: 1,
  WEEKLY: 3,
  ONE_TIME: 1,
};

export const PENALTY_QUEST_XP = 25;

// Custom quests cannot be Extreme, and give at most this much XP per day in total
export const CUSTOM_QUEST_MAX_DIFFICULTY: Difficulty = 'HARD';
export const CUSTOM_QUEST_DAILY_XP_CAP = 150;

// ---- Streak (SRS §3.7) ----

export const STREAK_BONUS_PER_FULL_WEEK = 0.05; // +5% XP per 7 days of streak
export const STREAK_BONUS_MAX = 0.5; // capped at +50%

// ---- Levels (SRS §3.3) ----

// XP needed to go from level n to n + 1 = LEVEL_BASE_XP + LEVEL_XP_STEP × (n − 1)
export const LEVEL_BASE_XP = 100;
export const LEVEL_XP_STEP = 20;

// ---- Stats (SRS §3.1) ----

// Completing a quest gives XP ÷ 10 stat points, split between stats by category (percentages)
export const STAT_POINTS_PER_XP = 1 / 10;

export const CATEGORY_STAT_WEIGHTS: Record<Category, Partial<Record<StatName, number>>> = {
  FITNESS: { strength: 100 },
  STUDIES: { intelligence: 100 },
  LANGUAGES: { intelligence: 100 },
  READING: { intelligence: 50, discipline: 50 },
  CAREER: { intelligence: 50, discipline: 50 },
  HEALTH: { discipline: 100 },
};

// Consistency is not earned from categories: +1 per day with all daily quests completed
export const CONSISTENCY_PER_PERFECT_DAY = 1;

// ---- Discipline rate (SRS §3.7) ----

export const DISCIPLINE_RATE_WINDOW_DAYS = 30;

// ---- Quest engine (SRS §3.6) ----

export const REROLLS_PER_DAY = 3;
