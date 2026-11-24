import { describe, expect, it } from 'vitest';
import {
  pickDailyTemplates,
  pickRerollTemplate,
  pickWeeklyTemplates,
  progressSkill,
  type TemplateCandidate,
} from '../../../src/game/index.js';

// "Random" that always takes the first candidate: makes results predictable
const first = () => 0;

// Small seeded pseudo-random generator (mulberry32): looks random, but the same seed
// always gives the same sequence, so tests stay reproducible.
function seededRandom(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function template(
  id: string,
  category: TemplateCandidate['category'],
  minutes: number,
  level: TemplateCandidate['level'] = 'BEGINNER',
): TemplateCandidate {
  return { id, category, level, minutes };
}

const templates: TemplateCandidate[] = [
  template('fit-10', 'FITNESS', 10),
  template('fit-20', 'FITNESS', 20),
  template('fit-30', 'FITNESS', 30),
  template('stu-15', 'STUDIES', 15),
  template('stu-30', 'STUDIES', 30),
  template('stu-45', 'STUDIES', 45),
  template('stu-adv', 'STUDIES', 30, 'ADVANCED'),
];

const totalMinutes = (picked: TemplateCandidate[]) => picked.reduce((s, t) => s + t.minutes, 0);

describe('pickDailyTemplates', () => {
  const twoAreas = [
    { category: 'FITNESS', level: 'BEGINNER' },
    { category: 'STUDIES', level: 'BEGINNER' },
  ] as const;

  it('fills the daily time within ±10 minutes', () => {
    for (const seed of [1, 2, 3, 42, 1234]) {
      for (const dailyMinutes of [15, 30, 60, 120]) {
        const picked = pickDailyTemplates({
          focusAreas: [...twoAreas],
          dailyMinutes,
          templates,
          recentlyUsedIds: new Set(),
          random: seededRandom(seed),
        });
        expect(totalMinutes(picked)).toBeGreaterThanOrEqual(dailyMinutes - 10);
        expect(totalMinutes(picked)).toBeLessThanOrEqual(dailyMinutes + 10);
      }
    }
  });

  it('gets as close as possible when the exact time cannot be reached', () => {
    // Only 60 minutes of fitness templates exist: all of them, never more than needed
    const picked = pickDailyTemplates({
      focusAreas: [{ category: 'FITNESS', level: 'BEGINNER' }],
      dailyMinutes: 240,
      templates,
      recentlyUsedIds: new Set(),
      random: seededRandom(7),
    });

    expect(totalMinutes(picked)).toBe(60);
  });

  it('alternates between focus areas', () => {
    const picked = pickDailyTemplates({
      focusAreas: [...twoAreas],
      dailyMinutes: 60,
      templates,
      recentlyUsedIds: new Set(),
      random: first,
    });

    expect(picked[0]!.category).toBe('FITNESS');
    expect(picked[1]!.category).toBe('STUDIES');
  });

  it('only uses templates of the player level', () => {
    const picked = pickDailyTemplates({
      focusAreas: [{ category: 'STUDIES', level: 'ADVANCED' }],
      dailyMinutes: 30,
      templates,
      recentlyUsedIds: new Set(),
      random: first,
    });

    expect(picked.map((t) => t.id)).toEqual(['stu-adv']);
  });

  it('never picks the same template twice in a day', () => {
    const picked = pickDailyTemplates({
      focusAreas: [{ category: 'FITNESS', level: 'BEGINNER' }],
      dailyMinutes: 240,
      templates,
      recentlyUsedIds: new Set(),
      random: first,
    });

    expect(new Set(picked.map((t) => t.id)).size).toBe(picked.length);
  });

  it('stops at 6 quests even with a lot of time', () => {
    const many = Array.from({ length: 20 }, (_, i) => template(`fit-${i}`, 'FITNESS', 10));
    const picked = pickDailyTemplates({
      focusAreas: [{ category: 'FITNESS', level: 'BEGINNER' }],
      dailyMinutes: 240,
      templates: many,
      recentlyUsedIds: new Set(),
      random: first,
    });

    expect(picked).toHaveLength(6);
  });

  it('avoids recently used templates when others exist', () => {
    const picked = pickDailyTemplates({
      focusAreas: [{ category: 'FITNESS', level: 'BEGINNER' }],
      dailyMinutes: 15,
      templates,
      recentlyUsedIds: new Set(['fit-10']),
      random: first,
    });

    expect(picked.map((t) => t.id)).toEqual(['fit-20']);
  });

  it('allows recent templates again rather than giving no quest', () => {
    const picked = pickDailyTemplates({
      focusAreas: [{ category: 'FITNESS', level: 'BEGINNER' }],
      dailyMinutes: 15,
      templates,
      recentlyUsedIds: new Set(['fit-10', 'fit-20', 'fit-30']),
      random: first,
    });

    expect(picked).toHaveLength(1);
  });

  it('always gives at least one quest, even if nothing fits the time', () => {
    const picked = pickDailyTemplates({
      focusAreas: [{ category: 'STUDIES', level: 'BEGINNER' }],
      dailyMinutes: 15,
      templates: [template('long', 'STUDIES', 90), template('longer', 'STUDIES', 120)],
      recentlyUsedIds: new Set(),
      random: first,
    });

    expect(picked.map((t) => t.id)).toEqual(['long']); // the shortest one
  });

  it('uses the random function to choose', () => {
    const last = () => 0.99;
    const picked = pickDailyTemplates({
      focusAreas: [{ category: 'FITNESS', level: 'BEGINNER' }],
      dailyMinutes: 30,
      templates,
      recentlyUsedIds: new Set(),
      random: last,
    });

    expect(picked[0]!.id).toBe('fit-30');
  });

  it('returns nothing without focus areas', () => {
    expect(
      pickDailyTemplates({
        focusAreas: [],
        dailyMinutes: 60,
        templates,
        recentlyUsedIds: new Set(),
        random: first,
      }),
    ).toEqual([]);
  });
});

describe('pickWeeklyTemplates', () => {
  const weekly = [
    template('w-fit-1', 'FITNESS', 120),
    template('w-fit-2', 'FITNESS', 120),
    template('w-stu', 'STUDIES', 180),
  ];

  it('gives one weekly quest per focus area', () => {
    const picked = pickWeeklyTemplates({
      focusAreas: [
        { category: 'FITNESS', level: 'BEGINNER' },
        { category: 'STUDIES', level: 'BEGINNER' },
      ],
      templates: weekly,
      recentlyUsedIds: new Set(),
      random: first,
    });

    expect(picked.map((t) => t.id)).toEqual(['w-fit-1', 'w-stu']);
  });

  it("avoids last week's template", () => {
    const picked = pickWeeklyTemplates({
      focusAreas: [{ category: 'FITNESS', level: 'BEGINNER' }],
      templates: weekly,
      recentlyUsedIds: new Set(['w-fit-1']),
      random: first,
    });

    expect(picked.map((t) => t.id)).toEqual(['w-fit-2']);
  });

  it('skips an area that has no weekly template', () => {
    const picked = pickWeeklyTemplates({
      focusAreas: [{ category: 'HEALTH', level: 'BEGINNER' }],
      templates: weekly,
      recentlyUsedIds: new Set(),
      random: first,
    });

    expect(picked).toEqual([]);
  });
});

describe('pickRerollTemplate', () => {
  it('gives a different template of the same category and level', () => {
    const replacement = pickRerollTemplate({
      current: templates[0]!, // fit-10
      todayTemplateIds: new Set(['fit-10', 'stu-15']),
      templates,
      recentlyUsedIds: new Set(),
      random: first,
    });

    expect(replacement?.id).toBe('fit-20');
  });

  it("never gives a template already in today's list", () => {
    const replacement = pickRerollTemplate({
      current: templates[0]!,
      todayTemplateIds: new Set(['fit-10', 'fit-20']),
      templates,
      recentlyUsedIds: new Set(),
      random: first,
    });

    expect(replacement?.id).toBe('fit-30');
  });

  it('returns null when there is no alternative', () => {
    const replacement = pickRerollTemplate({
      current: templates[6]!, // the only advanced studies template
      todayTemplateIds: new Set(['stu-adv']),
      templates,
      recentlyUsedIds: new Set(),
      random: first,
    });

    expect(replacement).toBeNull();
  });
});

describe('progressSkill', () => {
  it('counts completed quests', () => {
    expect(progressSkill('BEGINNER', 5)).toEqual({
      level: 'BEGINNER',
      completedCount: 6,
      leveledUp: false,
    });
  });

  it('moves to intermediate after 20 quests and resets the count', () => {
    expect(progressSkill('BEGINNER', 19)).toEqual({
      level: 'INTERMEDIATE',
      completedCount: 0,
      leveledUp: true,
    });
  });

  it('moves to advanced after 40 quests at intermediate', () => {
    expect(progressSkill('INTERMEDIATE', 38).leveledUp).toBe(false);
    expect(progressSkill('INTERMEDIATE', 39).level).toBe('ADVANCED');
  });

  it('stays at advanced', () => {
    expect(progressSkill('ADVANCED', 500)).toEqual({
      level: 'ADVANCED',
      completedCount: 501,
      leveledUp: false,
    });
  });
});
