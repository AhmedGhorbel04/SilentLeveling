import {
  CUSTOM_QUEST_DAILY_XP_CAP,
  DIFFICULTY_BASE_XP,
  QUEST_TYPE_MULTIPLIER,
  STREAK_BONUS_MAX,
  STREAK_BONUS_PER_FULL_WEEK,
  type Difficulty,
  type QuestType,
} from './config.js';

// Base XP of a quest, calculated when the quest is created and stored with it,
// so the player sees exactly what they will earn.
export function calculateQuestXp(difficulty: Difficulty, type: QuestType): number {
  return DIFFICULTY_BASE_XP[difficulty] * QUEST_TYPE_MULTIPLIER[type];
}

// Streak bonus as a fraction: 0 for less than 7 days, 0.05 for 7–13 days, ... max 0.5.
export function streakBonus(streakDays: number): number {
  const fullWeeks = Math.floor(Math.max(0, streakDays) / 7);
  return Math.min(fullWeeks * STREAK_BONUS_PER_FULL_WEEK, STREAK_BONUS_MAX);
}

// XP actually awarded at completion: base XP + streak bonus, rounded down.
export function applyStreakBonus(baseXp: number, streakDays: number): number {
  return Math.floor(baseXp * (1 + streakBonus(streakDays)));
}

// Custom quests share a daily XP cap. Returns how much XP this completion may give,
// given how much custom-quest XP the player already earned today.
export function applyCustomQuestCap(xp: number, customXpEarnedToday: number): number {
  const remaining = Math.max(0, CUSTOM_QUEST_DAILY_XP_CAP - customXpEarnedToday);
  return Math.min(xp, remaining);
}
