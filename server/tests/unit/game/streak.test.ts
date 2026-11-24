import { describe, expect, it } from 'vitest';
import {
  disciplineRate,
  recordDay,
  restoreStreak,
  type StreakState,
} from '../../../src/game/index.js';

const fresh: StreakState = { current: 0, best: 0, beforePenalty: null };

describe('recordDay', () => {
  it('grows the streak on a perfect day and tracks the best', () => {
    const afterOne = recordDay(fresh, true);
    const afterTwo = recordDay(afterOne, true);

    expect(afterOne).toEqual({ current: 1, best: 1, beforePenalty: null });
    expect(afterTwo).toEqual({ current: 2, best: 2, beforePenalty: null });
  });

  it('breaks the streak on a missed day but remembers it for the penalty quest', () => {
    const state = recordDay({ current: 12, best: 20, beforePenalty: null }, false);

    expect(state).toEqual({ current: 0, best: 20, beforePenalty: 12 });
  });

  it('has nothing to restore when the streak was already 0', () => {
    expect(recordDay(fresh, false)).toEqual(fresh);
  });

  it('loses the streak for good when the next day is missed too', () => {
    const missedOnce = recordDay({ current: 12, best: 12, beforePenalty: null }, false);
    const missedTwice = recordDay(missedOnce, false);

    expect(missedTwice).toEqual({ current: 0, best: 12, beforePenalty: null });
  });

  it('keeps the best streak when the current one breaks', () => {
    const state = recordDay({ current: 5, best: 30, beforePenalty: null }, false);

    expect(state.best).toBe(30);
  });
});

describe('restoreStreak', () => {
  it('gives the streak back after the penalty quest', () => {
    const missed = recordDay({ current: 12, best: 12, beforePenalty: null }, false);

    expect(restoreStreak(missed)).toEqual({ current: 12, best: 12, beforePenalty: null });
  });

  it('adds days already earned after the missed day', () => {
    const restored = restoreStreak({ current: 1, best: 12, beforePenalty: 12 });

    expect(restored).toEqual({ current: 13, best: 13, beforePenalty: null });
  });

  it('does nothing when there is nothing to restore', () => {
    const state = { current: 4, best: 9, beforePenalty: null };

    expect(restoreStreak(state)).toBe(state);
  });
});

describe('disciplineRate', () => {
  it('is the percentage of daily quests completed', () => {
    const days = [
      { questsTotal: 4, questsCompleted: 4 },
      { questsTotal: 4, questsCompleted: 2 },
      { questsTotal: 2, questsCompleted: 1 },
    ];

    expect(disciplineRate(days)).toBe(70); // 7 of 10
  });

  it('rounds to a whole percentage', () => {
    expect(disciplineRate([{ questsTotal: 3, questsCompleted: 2 }])).toBe(67);
  });

  it('is null for a new player with no days yet', () => {
    expect(disciplineRate([])).toBeNull();
    expect(disciplineRate([{ questsTotal: 0, questsCompleted: 0 }])).toBeNull();
  });
});
