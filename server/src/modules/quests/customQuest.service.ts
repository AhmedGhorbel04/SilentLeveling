import { prisma } from '../../lib/prisma.js';
import type { Prisma } from '../../generated/prisma/client.js';
import {
  CUSTOM_QUEST_MAX_DAYS_AHEAD,
  MAX_ACTIVE_CUSTOM_QUESTS,
  calculateQuestXp,
} from '../../game/index.js';
import { AppError } from '../../utils/AppError.js';
import {
  addDays,
  endOfLocalDay,
  localDate,
  startOfLocalDay,
  toDbDate,
  type LocalDate,
} from '../../utils/time.js';
import { questInclude, toQuestDto, type QuestDto } from './quest.mapper.js';
import { QUEST_TRANSACTION_OPTIONS, runRollover } from './rollover.service.js';
import type { CreateCustomQuestInput, UpdateCustomQuestInput } from './customQuest.schemas.js';
import { assertLinkableMilestone } from '../goals/goal.service.js';

type Tx = Prisma.TransactionClient;

// XP already given today by custom quests, used for the 150 XP/day cap (SRS §3.9)
export async function customXpEarnedToday(
  tx: Tx,
  user: { id: string; timezone: string },
  now: Date,
): Promise<number> {
  const today = localDate(user.timezone, now);
  const { _sum } = await tx.quest.aggregate({
    where: {
      userId: user.id,
      source: 'CUSTOM',
      status: 'COMPLETED',
      completedAt: {
        gte: startOfLocalDay(today, user.timezone),
        lt: endOfLocalDay(today, user.timezone),
      },
    },
    _sum: { xpAwarded: true },
  });
  return _sum.xpAwarded ?? 0;
}

// Due date must be between today and 30 days ahead, in the player's time zone
function checkDueDate(dueDate: LocalDate, today: LocalDate): void {
  if (dueDate < today || dueDate > addDays(today, CUSTOM_QUEST_MAX_DAYS_AHEAD)) {
    throw new AppError(400, 'VALIDATION_ERROR', 'Invalid input', {
      dueDate: 'DUE_DATE_OUT_OF_RANGE',
    });
  }
}

export function createCustomQuest(
  userId: string,
  input: CreateCustomQuestInput,
  now = new Date(),
): Promise<QuestDto> {
  return prisma.$transaction(async (tx) => {
    await runRollover(tx, userId, now);

    if (input.id) {
      const existing = await tx.quest.findUnique({
        where: { id: input.id },
        include: questInclude,
      });
      if (existing?.userId === userId) return toQuestDto(existing); // already synced
      if (existing) throw new AppError(409, 'QUEST_ID_TAKEN', 'Quest id already used');
    }

    const user = await tx.user.findUniqueOrThrow({ where: { id: userId } });
    const today = localDate(user.timezone, now);
    const dueDate = input.dueDate ?? today;
    checkDueDate(dueDate, today);

    const active = await tx.quest.count({
      where: { userId, source: 'CUSTOM', status: 'ACTIVE' },
    });
    if (active >= MAX_ACTIVE_CUSTOM_QUESTS) {
      throw new AppError(409, 'TOO_MANY_CUSTOM_QUESTS', 'Too many active custom quests');
    }
    if (input.milestoneId) await assertLinkableMilestone(tx, userId, input.milestoneId);

    const quest = await tx.quest.create({
      data: {
        id: input.id,
        userId,
        source: 'CUSTOM',
        type: 'ONE_TIME',
        title: input.title,
        description: input.description ?? null,
        category: input.category,
        difficulty: input.difficulty,
        xpReward: calculateQuestXp(input.difficulty, 'ONE_TIME'),
        questDate: toDbDate(today),
        dueAt: endOfLocalDay(dueDate, user.timezone),
        milestoneId: input.milestoneId ?? null,
      },
      include: questInclude,
    });
    return toQuestDto(quest);
  }, QUEST_TRANSACTION_OPTIONS);
}

// Only the player's own custom quests, and only while they are active:
// a completed quest is part of the XP history and cannot change anymore
async function findEditableQuest(tx: Tx, userId: string, questId: string) {
  const quest = await tx.quest.findFirst({ where: { id: questId, userId, source: 'CUSTOM' } });
  if (!quest) throw new AppError(404, 'QUEST_NOT_FOUND', 'Quest not found');
  if (quest.status !== 'ACTIVE') {
    throw new AppError(409, 'QUEST_NOT_ACTIVE', 'This quest cannot be changed anymore');
  }
  return quest;
}

export function updateCustomQuest(
  userId: string,
  questId: string,
  input: UpdateCustomQuestInput,
  now = new Date(),
): Promise<QuestDto> {
  return prisma.$transaction(async (tx) => {
    await runRollover(tx, userId, now);
    await findEditableQuest(tx, userId, questId);
    const user = await tx.user.findUniqueOrThrow({ where: { id: userId } });

    if (input.dueDate) checkDueDate(input.dueDate, localDate(user.timezone, now));
    if (input.milestoneId) await assertLinkableMilestone(tx, userId, input.milestoneId);

    const quest = await tx.quest.update({
      where: { id: questId },
      data: {
        title: input.title,
        description: input.description,
        category: input.category,
        difficulty: input.difficulty,
        // The reward always follows the difficulty, so it is recalculated with it
        xpReward: input.difficulty ? calculateQuestXp(input.difficulty, 'ONE_TIME') : undefined,
        dueAt: input.dueDate ? endOfLocalDay(input.dueDate, user.timezone) : undefined,
        milestoneId: input.milestoneId,
      },
      include: questInclude,
    });
    return toQuestDto(quest);
  }, QUEST_TRANSACTION_OPTIONS);
}

export function deleteCustomQuest(userId: string, questId: string, now = new Date()) {
  return prisma.$transaction(async (tx) => {
    await runRollover(tx, userId, now);
    await findEditableQuest(tx, userId, questId);
    await tx.quest.delete({ where: { id: questId } });
  }, QUEST_TRANSACTION_OPTIONS);
}
