import { describe, expect, it } from 'vitest';
import {
  ACHIEVEMENT_CONDITIONS,
  newlyEarnedAchievements,
  type PlayerSnapshot,
} from '../../../src/game/index.js';
import { ACHIEVEMENTS } from '../../../src/game/catalog.js';

const newPlayer: PlayerSnapshot = {
  level: 1,
  rank: 'E4',
  bestStreak: 0,
  questsCompleted: 0,
  questsCompletedBefore8am: 0,
  penaltyQuestsCompleted: 0,
  friends: 0,
  verifiedAchievements: 0,
};

const earned = (changes: Partial<PlayerSnapshot>, unlocked: string[] = []) =>
  newlyEarnedAchievements({ ...newPlayer, ...changes }, new Set(unlocked));

describe('achievement conditions', () => {
  it('has a condition for every achievement in the catalog, and nothing else', () => {
    expect(Object.keys(ACHIEVEMENT_CONDITIONS).sort()).toEqual(
      ACHIEVEMENTS.map((a) => a.code).sort(),
    );
  });

  it('gives nothing to a brand new player', () => {
    expect(earned({})).toEqual([]);
  });

  it('unlocks the first step with the first quest', () => {
    expect(earned({ questsCompleted: 1 })).toEqual(['FIRST_STEP']);
  });

  it('unlocks Awakened at level 5, not before', () => {
    expect(earned({ level: 4 })).toEqual([]);
    expect(earned({ level: 5 })).toEqual(['AWAKENED']);
  });

  it('unlocks the streak achievements from the best streak', () => {
    expect(earned({ bestStreak: 6 })).toEqual([]);
    expect(earned({ bestStreak: 7 })).toEqual(['STREAK_7']);
    expect(earned({ bestStreak: 100 })).toEqual(['STREAK_7', 'STREAK_30', 'STREAK_100']);
  });

  it('counts quests, early quests and penalty quests', () => {
    expect(earned({ questsCompleted: 100 })).toEqual(['FIRST_STEP', 'QUESTS_100']);
    expect(earned({ questsCompletedBefore8am: 19 })).toEqual([]);
    expect(earned({ questsCompletedBefore8am: 20 })).toEqual(['EARLY_RISER']);
    expect(earned({ penaltyQuestsCompleted: 1 })).toEqual(['REDEMPTION']);
  });

  it('unlocks every rank achievement up to the current rank', () => {
    expect(earned({ rank: 'D1' })).toEqual([]);
    expect(earned({ rank: 'C4' })).toEqual(['RANK_C']);
    expect(earned({ rank: 'A2' })).toEqual(['RANK_C', 'RANK_B', 'RANK_A']);
    expect(earned({ rank: 'SS' })).toEqual(['RANK_C', 'RANK_B', 'RANK_A', 'RANK_S']);
  });

  it('unlocks the social and real-life achievements', () => {
    expect(earned({ friends: 1 })).toEqual(['ALLY']);
    expect(earned({ verifiedAchievements: 1 })).toEqual(['FIRST_LEGENDARY']);
  });

  it('never returns an achievement that is already unlocked', () => {
    expect(earned({ questsCompleted: 5, level: 6 }, ['FIRST_STEP'])).toEqual(['AWAKENED']);
    expect(earned({ questsCompleted: 5 }, ['FIRST_STEP'])).toEqual([]);
  });
});
