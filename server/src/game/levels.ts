import { LEVEL_BASE_XP, LEVEL_XP_STEP } from './config.js';

// XP needed to go from `level` to `level + 1` (100, 120, 140, ...)
export function xpToNextLevel(level: number): number {
  return LEVEL_BASE_XP + LEVEL_XP_STEP * (level - 1);
}

// Total XP needed to reach `level` from level 1.
// Sum of an arithmetic series: (L − 1) × base + step × (L − 1)(L − 2) / 2
export function totalXpForLevel(level: number): number {
  const n = level - 1;
  return n * LEVEL_BASE_XP + (LEVEL_XP_STEP * n * (n - 1)) / 2;
}

// The level a player has with `totalXp`. A simple loop is clear and fast enough:
// even level 500 needs only 500 iterations.
export function levelFromTotalXp(totalXp: number): number {
  let level = 1;
  while (totalXpForLevel(level + 1) <= totalXp) {
    level++;
  }
  return level;
}

export type LevelProgress = {
  level: number;
  xpIntoLevel: number; // XP earned since reaching the current level
  xpForNextLevel: number; // XP the current level requires in total
  percent: number; // 0–100, for the XP bar
};

// Everything the XP bar needs
export function levelProgress(totalXp: number): LevelProgress {
  const level = levelFromTotalXp(totalXp);
  const xpIntoLevel = totalXp - totalXpForLevel(level);
  const xpForNextLevel = xpToNextLevel(level);

  return {
    level,
    xpIntoLevel,
    xpForNextLevel,
    percent: Math.floor((xpIntoLevel / xpForNextLevel) * 100),
  };
}
