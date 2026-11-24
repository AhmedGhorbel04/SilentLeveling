import { describe, expect, it } from 'vitest';
import { CATEGORIES, CATEGORY_STAT_WEIGHTS, statGainsForQuest } from '../../../src/game/index.js';

describe('statGainsForQuest', () => {
  it('gives XP ÷ 10 points to the category stat', () => {
    expect(statGainsForQuest('FITNESS', 80)).toEqual({
      strength: 8,
      intelligence: 0,
      discipline: 0,
      consistency: 0,
    });
    expect(statGainsForQuest('STUDIES', 40)).toMatchObject({ intelligence: 4 });
    expect(statGainsForQuest('HEALTH', 20)).toMatchObject({ discipline: 2 });
  });

  it('splits mixed categories', () => {
    expect(statGainsForQuest('READING', 80)).toMatchObject({ intelligence: 4, discipline: 4 });
  });

  it('gives the rounding remainder to the first stat, so no point is lost', () => {
    // 50 XP → 5 points, split 50/50 → 2.5 each → 3 + 2
    expect(statGainsForQuest('CAREER', 50)).toMatchObject({ intelligence: 3, discipline: 2 });
  });

  it('rounds partial points down', () => {
    expect(statGainsForQuest('FITNESS', 26)).toMatchObject({ strength: 2 });
    expect(statGainsForQuest('FITNESS', 9)).toMatchObject({ strength: 0 });
  });

  it('never gives consistency (it comes from perfect days)', () => {
    for (const category of CATEGORIES) {
      expect(statGainsForQuest(category, 150).consistency).toBe(0);
    }
  });

  it('has weights adding up to 100% for every category', () => {
    for (const category of CATEGORIES) {
      const total = Object.values(CATEGORY_STAT_WEIGHTS[category]).reduce((a, b) => a + b, 0);
      expect(total).toBe(100);
    }
  });

  it('gives exactly XP ÷ 10 points in total for every category', () => {
    for (const category of CATEGORIES) {
      const gains = statGainsForQuest(category, 130);
      const total = Object.values(gains).reduce((a, b) => a + b, 0);
      expect(total).toBe(13);
    }
  });
});
