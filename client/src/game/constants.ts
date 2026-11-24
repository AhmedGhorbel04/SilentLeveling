// Mirrors server/src/game/config.ts. The backend validates everything again;
// these lists only drive the interface.

export const CATEGORIES = [
  'FITNESS',
  'STUDIES',
  'LANGUAGES',
  'READING',
  'CAREER',
  'HEALTH',
] as const;
export type Category = (typeof CATEGORIES)[number];

export const SKILL_LEVELS = ['BEGINNER', 'INTERMEDIATE', 'ADVANCED'] as const;
export type SkillLevel = (typeof SKILL_LEVELS)[number];

export const DIFFICULTIES = ['EASY', 'NORMAL', 'HARD', 'EXTREME'] as const;
export type Difficulty = (typeof DIFFICULTIES)[number];

export const DAILY_MINUTES_OPTIONS = [15, 30, 60, 120, 240] as const;
export type DailyMinutes = (typeof DAILY_MINUTES_OPTIONS)[number];

export const MAX_FOCUS_AREAS = 3;

export const AVATAR_KEYS = [
  'sigil-1',
  'sigil-2',
  'sigil-3',
  'sigil-4',
  'sigil-5',
  'sigil-6',
  'sigil-7',
  'sigil-8',
] as const;
export type AvatarKey = (typeof AVATAR_KEYS)[number];

export const CATEGORY_ICONS: Record<Category, string> = {
  FITNESS: '💪',
  STUDIES: '💻',
  LANGUAGES: '🗣️',
  READING: '📖',
  CAREER: '🚀',
  HEALTH: '🌿',
};
