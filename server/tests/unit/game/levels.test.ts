import { describe, expect, it } from 'vitest';
import {
  levelFromTotalXp,
  levelProgress,
  totalXpForLevel,
  xpToNextLevel,
} from '../../../src/game/index.js';

describe('xpToNextLevel', () => {
  it('increases by 20 XP per level', () => {
    expect(xpToNextLevel(1)).toBe(100);
    expect(xpToNextLevel(2)).toBe(120);
    expect(xpToNextLevel(10)).toBe(280);
    expect(xpToNextLevel(100)).toBe(2080);
  });
});

describe('totalXpForLevel', () => {
  // Values from the table in SRS §3.3
  it.each([
    [1, 0],
    [2, 100],
    [10, 1620],
    [30, 11020],
    [50, 28420],
    [100, 106920],
  ])('level %i needs %i XP in total', (level, totalXp) => {
    expect(totalXpForLevel(level)).toBe(totalXp);
  });

  it('matches adding up every level step one by one', () => {
    let sum = 0;
    for (let level = 1; level <= 150; level++) {
      expect(totalXpForLevel(level)).toBe(sum);
      sum += xpToNextLevel(level);
    }
  });
});

describe('levelFromTotalXp', () => {
  it('starts at level 1', () => {
    expect(levelFromTotalXp(0)).toBe(1);
    expect(levelFromTotalXp(99)).toBe(1);
  });

  it('levels up exactly when the threshold is reached', () => {
    expect(levelFromTotalXp(100)).toBe(2);
    expect(levelFromTotalXp(219)).toBe(2);
    expect(levelFromTotalXp(220)).toBe(3);
  });

  it('handles high levels', () => {
    expect(levelFromTotalXp(106920)).toBe(100);
    expect(levelFromTotalXp(106919)).toBe(99);
  });
});

describe('levelProgress', () => {
  it('describes the XP bar', () => {
    // Level 2 starts at 100 XP and needs 120 more
    expect(levelProgress(160)).toEqual({
      level: 2,
      xpIntoLevel: 60,
      xpForNextLevel: 120,
      percent: 50,
    });
  });

  it('is empty right after a level-up', () => {
    expect(levelProgress(100)).toMatchObject({ level: 2, xpIntoLevel: 0, percent: 0 });
  });

  it('never shows 100% before the level-up', () => {
    expect(levelProgress(219).percent).toBe(99);
  });
});
