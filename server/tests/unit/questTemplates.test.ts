import { describe, expect, it } from 'vitest';
import { QUEST_TEMPLATES } from '../../prisma/data/questTemplates.js';
import {
  CATEGORIES,
  DAILY_MINUTES_OPTIONS,
  DAILY_TIME_TOLERANCE_MINUTES,
  SKILL_LEVELS,
} from '../../src/game/index.js';

// Checks on the quest library itself, so a typo in the data is caught by CI
describe('quest template library', () => {
  it('has unique keys', () => {
    const keys = QUEST_TEMPLATES.map((t) => t.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('has at least 3 daily and 1 weekly quest for every category and level', () => {
    for (const category of CATEGORIES) {
      for (const level of SKILL_LEVELS) {
        const of = (type: string) =>
          QUEST_TEMPLATES.filter(
            (t) => t.type === type && t.category === category && t.level === level,
          );
        expect(of('DAILY').length, `${category} ${level} daily`).toBeGreaterThanOrEqual(3);
        expect(of('WEEKLY').length, `${category} ${level} weekly`).toBeGreaterThanOrEqual(1);
      }
    }
  });

  it('has penalty quests and exactly one onboarding quest', () => {
    expect(QUEST_TEMPLATES.filter((t) => t.type === 'PENALTY').length).toBeGreaterThan(0);
    expect(QUEST_TEMPLATES.filter((t) => t.type === 'ONBOARDING')).toHaveLength(1);
  });

  it('has a quest that fits the smallest daily time for every category and level', () => {
    // A player with 15 minutes a day gets quests up to 15 + 10 (tolerance) = 25 minutes
    const maxMinutes = DAILY_MINUTES_OPTIONS[0] + DAILY_TIME_TOLERANCE_MINUTES;
    for (const category of CATEGORIES) {
      for (const level of SKILL_LEVELS) {
        const short = QUEST_TEMPLATES.some(
          (t) =>
            t.type === 'DAILY' &&
            t.category === category &&
            t.level === level &&
            t.minutes <= maxMinutes,
        );
        expect(short, `${category} ${level}`).toBe(true);
      }
    }
  });

  it('keeps durations between 5 and 240 minutes', () => {
    for (const template of QUEST_TEMPLATES) {
      expect(template.minutes).toBeGreaterThanOrEqual(5);
      expect(template.minutes).toBeLessThanOrEqual(240);
    }
  });

  it('has a non-empty title in all three languages', () => {
    for (const template of QUEST_TEMPLATES) {
      expect(template.title.en.trim(), template.key).not.toBe('');
      expect(template.title.fr.trim(), template.key).not.toBe('');
      expect(template.title.ar.trim(), template.key).not.toBe('');
    }
  });
});
