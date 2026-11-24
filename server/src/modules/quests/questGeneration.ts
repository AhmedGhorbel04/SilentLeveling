import type { FocusArea, Prisma, QuestTemplate } from '../../generated/prisma/client.js';
import {
  PENALTY_QUEST_XP,
  TEMPLATE_COOLDOWN_DAYS,
  calculateQuestXp,
  pickDailyTemplates,
  pickWeeklyTemplates,
  type RandomFn,
} from '../../game/index.js';
import {
  addDays,
  endOfLocalDay,
  endOfLocalWeek,
  toDbDate,
  type LocalDate,
} from '../../utils/time.js';

// Creates quest rows from templates. The choice itself is made by the pure
// functions in game/questGenerator.ts; this file loads their inputs and saves results.

type Tx = Prisma.TransactionClient;

type PlayerContext = {
  id: string;
  timezone: string;
  dailyMinutes: number;
  focusAreas: FocusArea[];
};

async function recentlyUsedTemplateIds(tx: Tx, userId: string, from: LocalDate, to: LocalDate) {
  const quests = await tx.quest.findMany({
    where: {
      userId,
      templateId: { not: null },
      questDate: { gte: toDbDate(from), lt: toDbDate(to) },
    },
    select: { templateId: true },
  });
  return new Set(quests.map((q) => q.templateId!));
}

function questDataFrom(
  template: QuestTemplate,
  player: PlayerContext,
  overrides: Pick<Prisma.QuestCreateManyInput, 'type' | 'questDate' | 'dueAt'> &
    Partial<Prisma.QuestCreateManyInput>,
): Prisma.QuestCreateManyInput {
  return {
    userId: player.id,
    templateId: template.id,
    source: 'SYSTEM',
    category: template.category,
    difficulty: template.difficulty,
    minutes: template.minutes,
    xpReward: calculateQuestXp(template.difficulty, overrides.type),
    ...overrides,
  };
}

export async function generateDailyQuests(
  tx: Tx,
  player: PlayerContext,
  date: LocalDate,
  random: RandomFn = Math.random,
): Promise<void> {
  const templates = await tx.questTemplate.findMany({
    where: {
      type: 'DAILY',
      active: true,
      category: { in: player.focusAreas.map((area) => area.category) },
    },
  });

  const picked = pickDailyTemplates({
    focusAreas: player.focusAreas,
    dailyMinutes: player.dailyMinutes,
    templates,
    recentlyUsedIds: await recentlyUsedTemplateIds(
      tx,
      player.id,
      addDays(date, -TEMPLATE_COOLDOWN_DAYS),
      date,
    ),
    random,
  });

  const byId = new Map(templates.map((t) => [t.id, t]));
  await tx.quest.createMany({
    data: picked.map((p) =>
      questDataFrom(byId.get(p.id)!, player, {
        type: 'DAILY',
        questDate: toDbDate(date),
        dueAt: endOfLocalDay(date, player.timezone),
      }),
    ),
  });
}

// Weekly quests are created once per week, the first time the player shows up that week
export async function generateWeeklyQuestsIfMissing(
  tx: Tx,
  player: PlayerContext,
  monday: LocalDate,
  random: RandomFn = Math.random,
): Promise<void> {
  const existing = await tx.quest.count({
    where: { userId: player.id, type: 'WEEKLY', questDate: toDbDate(monday) },
  });
  if (existing > 0) return;

  const templates = await tx.questTemplate.findMany({
    where: {
      type: 'WEEKLY',
      active: true,
      category: { in: player.focusAreas.map((area) => area.category) },
    },
  });

  const picked = pickWeeklyTemplates({
    focusAreas: player.focusAreas,
    templates,
    recentlyUsedIds: await recentlyUsedTemplateIds(tx, player.id, addDays(monday, -7), monday),
    random,
  });

  const byId = new Map(templates.map((t) => [t.id, t]));
  await tx.quest.createMany({
    data: picked.map((p) =>
      questDataFrom(byId.get(p.id)!, player, {
        type: 'WEEKLY',
        questDate: toDbDate(monday),
        dueAt: endOfLocalWeek(monday, player.timezone),
      }),
    ),
  });
}

// After a missed day with a streak to save: one penalty quest, due at the end of today
export async function createPenaltyQuest(
  tx: Tx,
  player: PlayerContext,
  date: LocalDate,
  random: RandomFn = Math.random,
): Promise<void> {
  const templates = await tx.questTemplate.findMany({ where: { type: 'PENALTY', active: true } });
  if (templates.length === 0) return;

  const template = templates[Math.floor(random() * templates.length)]!;
  await tx.quest.create({
    data: questDataFrom(template, player, {
      source: 'PENALTY',
      type: 'ONE_TIME',
      xpReward: PENALTY_QUEST_XP,
      questDate: toDbDate(date),
      dueAt: endOfLocalDay(date, player.timezone),
    }),
  });
}

// The very first quest, right after onboarding: 5 minutes, so the player levels up
// almost immediately (FR-13). It counts in the player's first goal.
export async function createOnboardingQuest(
  tx: Tx,
  player: PlayerContext,
  date: LocalDate,
): Promise<void> {
  const template = await tx.questTemplate.findFirst({ where: { type: 'ONBOARDING' } });
  if (!template) return;

  await tx.quest.create({
    data: questDataFrom(template, player, {
      type: 'DAILY',
      category: player.focusAreas[0]?.category ?? template.category,
      questDate: toDbDate(date),
      dueAt: endOfLocalDay(date, player.timezone),
    }),
  });
}
