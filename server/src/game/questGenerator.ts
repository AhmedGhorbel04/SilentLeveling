import {
  DAILY_TIME_TOLERANCE_MINUTES,
  MAX_DAILY_QUESTS,
  MAX_WEEKLY_QUESTS,
  MIN_DAILY_QUESTS,
  QUESTS_TO_LEVEL_UP_SKILL,
  SKILL_LEVELS,
  type Category,
  type SkillLevel,
} from './config.js';

// The rule-based quest engine (SRS §3.6). Pure functions: the service loads
// templates and history from the database, these functions only decide.

export type FocusAreaInput = { category: Category; level: SkillLevel };

export type TemplateCandidate = {
  id: string;
  category: Category;
  level: SkillLevel;
  minutes: number;
};

// Returns a number in [0, 1). Math.random in the app, a fixed sequence in tests.
export type RandomFn = () => number;

function pickRandom<T>(items: T[], random: RandomFn): T {
  return items[Math.floor(random() * items.length)]!;
}

// Templates of an area, preferring ones not used recently. If every template was
// used recently, recent ones are allowed again rather than giving no quest at all.
function candidatesFor(
  area: FocusAreaInput,
  templates: TemplateCandidate[],
  excluded: Set<string>,
  recentlyUsed: Set<string>,
): TemplateCandidate[] {
  const matching = templates.filter(
    (t) => t.category === area.category && t.level === area.level && !excluded.has(t.id),
  );
  const fresh = matching.filter((t) => !recentlyUsed.has(t.id));
  return fresh.length > 0 ? fresh : matching;
}

type DailyParams = {
  focusAreas: FocusAreaInput[];
  dailyMinutes: number;
  templates: TemplateCandidate[];
  recentlyUsedIds: Set<string>;
  random: RandomFn;
};

// Number of random plans tried for a day; the best one is kept
const DAILY_PLAN_ATTEMPTS = 20;

// Picks today's daily quests:
// - rotates through the focus areas so every goal gets attention
// - fills the player's daily time as closely as possible (never more than +10 minutes)
// - at least 1 quest, at most 6
// Choosing one quest at a time can paint itself into a corner (small early picks leave
// a gap nothing fits), so we build several random plans and keep the closest one.
export function pickDailyTemplates(params: DailyParams): TemplateCandidate[] {
  let best: TemplateCandidate[] = [];
  let bestGap = Infinity;

  for (let attempt = 0; attempt < DAILY_PLAN_ATTEMPTS; attempt++) {
    const plan = buildDailyPlan(params);
    const gap = Math.abs(params.dailyMinutes - plan.reduce((sum, t) => sum + t.minutes, 0));
    if (gap < bestGap) {
      best = plan;
      bestGap = gap;
    }
  }

  return best;
}

// One random plan for the day
function buildDailyPlan(params: DailyParams): TemplateCandidate[] {
  const { focusAreas, dailyMinutes, templates, recentlyUsedIds, random } = params;
  const minMinutes = dailyMinutes - DAILY_TIME_TOLERANCE_MINUTES;
  const maxMinutes = dailyMinutes + DAILY_TIME_TOLERANCE_MINUTES;

  const picked: TemplateCandidate[] = [];
  const pickedIds = new Set<string>();
  let totalMinutes = 0;
  let areaIndex = 0;
  let areasWithoutFit = 0;

  while (
    picked.length < MAX_DAILY_QUESTS &&
    totalMinutes < minMinutes &&
    areasWithoutFit < focusAreas.length
  ) {
    const area = focusAreas[areaIndex % focusAreas.length]!;
    areaIndex++;

    const fitting = candidatesFor(area, templates, pickedIds, recentlyUsedIds).filter(
      (t) => totalMinutes + t.minutes <= maxMinutes,
    );
    if (fitting.length === 0) {
      areasWithoutFit++;
      continue;
    }

    // If some template would complete the day inside the target range, take one of those.
    // Without this, small early picks can leave a gap that no remaining template fits.
    const finishing = fitting.filter((t) => totalMinutes + t.minutes >= minMinutes);
    const template = pickRandom(finishing.length > 0 ? finishing : fitting, random);
    picked.push(template);
    pickedIds.add(template.id);
    totalMinutes += template.minutes;
    areasWithoutFit = 0;
  }

  // Even with very little time, the player always gets at least one quest:
  // the shortest one of their first goal
  if (picked.length < MIN_DAILY_QUESTS && focusAreas.length > 0) {
    const candidates = candidatesFor(focusAreas[0]!, templates, pickedIds, new Set());
    const shortest = [...candidates].sort((a, b) => a.minutes - b.minutes)[0];
    if (shortest) picked.push(shortest);
  }

  return picked;
}

// One weekly quest per focus area (max 3), avoiding last week's templates when possible.
export function pickWeeklyTemplates(params: {
  focusAreas: FocusAreaInput[];
  templates: TemplateCandidate[];
  recentlyUsedIds: Set<string>;
  random: RandomFn;
}): TemplateCandidate[] {
  const { focusAreas, templates, recentlyUsedIds, random } = params;
  const picked: TemplateCandidate[] = [];

  for (const area of focusAreas.slice(0, MAX_WEEKLY_QUESTS)) {
    const candidates = candidatesFor(area, templates, new Set(), recentlyUsedIds);
    if (candidates.length > 0) picked.push(pickRandom(candidates, random));
  }

  return picked;
}

// Replacement for a rerolled daily quest: same category and level, different
// template, and not one already in today's list.
export function pickRerollTemplate(params: {
  current: TemplateCandidate;
  todayTemplateIds: Set<string>;
  templates: TemplateCandidate[];
  recentlyUsedIds: Set<string>;
  random: RandomFn;
}): TemplateCandidate | null {
  const { current, todayTemplateIds, templates, recentlyUsedIds, random } = params;
  const excluded = new Set([...todayTemplateIds, current.id]);
  const candidates = candidatesFor(current, templates, excluded, recentlyUsedIds);

  return candidates.length > 0 ? pickRandom(candidates, random) : null;
}

// Skill level after completing one more quest in a category (SRS §3.6):
// 20 quests at beginner → intermediate, 40 at intermediate → advanced.
export function progressSkill(
  level: SkillLevel,
  completedCount: number,
): { level: SkillLevel; completedCount: number; leveledUp: boolean } {
  const count = completedCount + 1;
  const needed = QUESTS_TO_LEVEL_UP_SKILL[level];

  if (needed !== null && count >= needed) {
    const nextLevel = SKILL_LEVELS[SKILL_LEVELS.indexOf(level) + 1]!;
    return { level: nextLevel, completedCount: 0, leveledUp: true };
  }
  return { level, completedCount: count, leveledUp: false };
}
