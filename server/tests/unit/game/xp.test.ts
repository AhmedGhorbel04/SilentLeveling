import { describe, expect, it } from 'vitest';
import {
  applyCustomQuestCap,
  applyStreakBonus,
  calculateQuestXp,
  streakBonus,
} from '../../../src/game/index.js';

describe('calculateQuestXp', () => {
  it('gives more XP for harder quests', () => {
    expect(calculateQuestXp('EASY', 'DAILY')).toBe(20);
    expect(calculateQuestXp('NORMAL', 'DAILY')).toBe(40);
    expect(calculateQuestXp('HARD', 'DAILY')).toBe(80);
    expect(calculateQuestXp('EXTREME', 'DAILY')).toBe(150);
  });

  it('makes one Hard quest worth four Easy ones', () => {
    expect(calculateQuestXp('HARD', 'DAILY')).toBe(4 * calculateQuestXp('EASY', 'DAILY'));
  });

  it('triples the XP of weekly quests', () => {
    expect(calculateQuestXp('NORMAL', 'WEEKLY')).toBe(120);
    expect(calculateQuestXp('HARD', 'WEEKLY')).toBe(240);
  });

  it('gives one-time quests the same XP as daily ones', () => {
    expect(calculateQuestXp('HARD', 'ONE_TIME')).toBe(calculateQuestXp('HARD', 'DAILY'));
  });
});

describe('streakBonus', () => {
  it('starts after 7 full days', () => {
    expect(streakBonus(0)).toBe(0);
    expect(streakBonus(6)).toBe(0);
    expect(streakBonus(7)).toBe(0.05);
    expect(streakBonus(13)).toBe(0.05);
    expect(streakBonus(14)).toBe(0.1);
  });

  it('is capped at +50% from 70 days', () => {
    expect(streakBonus(69)).toBeCloseTo(0.45);
    expect(streakBonus(70)).toBe(0.5);
    expect(streakBonus(365)).toBe(0.5);
  });

  it('treats a negative streak as zero', () => {
    expect(streakBonus(-3)).toBe(0);
  });
});

describe('applyStreakBonus', () => {
  it('adds the bonus and rounds down', () => {
    expect(applyStreakBonus(80, 0)).toBe(80);
    expect(applyStreakBonus(80, 7)).toBe(84); // 80 × 1.05
    expect(applyStreakBonus(25, 7)).toBe(26); // 26.25 → 26
    expect(applyStreakBonus(150, 100)).toBe(225); // 150 × 1.5
  });
});

describe('applyCustomQuestCap', () => {
  it('gives full XP while under the daily cap', () => {
    expect(applyCustomQuestCap(80, 0)).toBe(80);
    expect(applyCustomQuestCap(40, 100)).toBe(40);
  });

  it('gives only what is left of the cap', () => {
    expect(applyCustomQuestCap(80, 100)).toBe(50);
  });

  it('gives nothing once the cap is reached', () => {
    expect(applyCustomQuestCap(80, 150)).toBe(0);
    expect(applyCustomQuestCap(80, 999)).toBe(0);
  });
});
