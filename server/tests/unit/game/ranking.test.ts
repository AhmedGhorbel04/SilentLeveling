import { describe, expect, it } from 'vitest';
import {
  compareAllTime,
  compareWeekly,
  titleScore,
  type RankedPlayer,
} from '../../../src/game/index.js';

const player = (username: string, changes: Partial<RankedPlayer> = {}): RankedPlayer => ({
  username,
  rank: 'E4',
  totalXp: 0,
  weeklyXp: 0,
  titleScore: 0,
  ...changes,
});

const order = (players: RankedPlayer[], compare: typeof compareAllTime) =>
  [...players].sort(compare).map((p) => p.username);

describe('titleScore', () => {
  it('weights titles by rarity', () => {
    expect(titleScore([])).toBe(0);
    expect(titleScore(['COMMON', 'EPIC', 'MYTHIC'])).toBe(1 + 3 + 8);
  });
});

describe('compareAllTime', () => {
  it('puts the higher rank first, even with less XP', () => {
    const players = [
      player('grinder', { rank: 'C1', totalXp: 90_000 }),
      player('proven', { rank: 'B4', totalXp: 30_000 }),
    ];

    expect(order(players, compareAllTime)).toEqual(['proven', 'grinder']);
  });

  it('uses total XP inside the same rank', () => {
    const players = [
      player('less', { rank: 'D2', totalXp: 4000 }),
      player('more', { rank: 'D2', totalXp: 5000 }),
    ];

    expect(order(players, compareAllTime)).toEqual(['more', 'less']);
  });

  it('compares SS players by their titles, not their XP', () => {
    const players = [
      player('rich', { rank: 'SS', totalXp: 500_000, titleScore: 10 }),
      player('legend', { rank: 'SS', totalXp: 200_000, titleScore: 30 }),
    ];

    expect(order(players, compareAllTime)).toEqual(['legend', 'rich']);
  });

  it('only uses titles between SS players', () => {
    const players = [
      player('titled', { rank: 'C4', totalXp: 100, titleScore: 50 }),
      player('xp', { rank: 'C4', totalXp: 900, titleScore: 0 }),
    ];

    expect(order(players, compareAllTime)).toEqual(['xp', 'titled']);
  });

  it('breaks full ties by username, so the order is stable', () => {
    expect(order([player('bob'), player('alice')], compareAllTime)).toEqual(['alice', 'bob']);
  });
});

describe('compareWeekly', () => {
  it('only looks at the XP of the week', () => {
    const players = [
      player('veteran', { rank: 'B1', totalXp: 80_000, weeklyXp: 300 }),
      player('newcomer', { rank: 'E4', totalXp: 900, weeklyXp: 900 }),
    ];

    expect(order(players, compareWeekly)).toEqual(['newcomer', 'veteran']);
  });
});
