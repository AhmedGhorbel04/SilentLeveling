import { prisma } from '../../lib/prisma.js';
import {
  REROLLS_PER_DAY,
  TEMPLATE_COOLDOWN_DAYS,
  applyStreakBonus,
  calculateQuestXp,
  pickRerollTemplate,
  progressSkill,
  restoreStreak,
  statGainsForQuest,
} from '../../game/index.js';
import { AppError } from '../../utils/AppError.js';
import { addDays, fromDbDate, localDate, mondayOf, toDbDate } from '../../utils/time.js';
import { awardXp, type AwardXpResult } from '../progression/progression.service.js';
import { QUEST_TRANSACTION_OPTIONS, runRollover } from './rollover.service.js';
import { toQuestDto, type QuestDto } from './quest.mapper.js';

// Every operation first runs the rollover, inside the same transaction, so it always
// works on an up-to-date day (yesterday's quests already failed, today's generated).

export type TodayQuests = {
  date: string;
  daily: QuestDto[];
  weekly: QuestDto[];
  penalty: QuestDto[];
  rerollsLeft: number;
};

export function getTodayQuests(userId: string, now = new Date()): Promise<TodayQuests> {
  return prisma.$transaction(async (tx) => {
    await runRollover(tx, userId, now);

    const user = await tx.user.findUniqueOrThrow({ where: { id: userId } });
    const today = localDate(user.timezone, now);

    const quests = await tx.quest.findMany({
      where: {
        userId,
        status: { not: 'REPLACED' },
        OR: [
          { type: 'DAILY', questDate: toDbDate(today) },
          { type: 'WEEKLY', questDate: toDbDate(mondayOf(today)) },
          { source: 'PENALTY', questDate: toDbDate(today) },
        ],
      },
      include: { template: true },
      orderBy: { createdAt: 'asc' },
    });
    const dtos = quests.map(toQuestDto);

    return {
      date: today,
      daily: dtos.filter((q) => q.type === 'DAILY'),
      weekly: dtos.filter((q) => q.type === 'WEEKLY'),
      penalty: dtos.filter((q) => q.source === 'PENALTY'),
      rerollsLeft: Math.max(0, REROLLS_PER_DAY - user.rerollsUsed),
    };
  }, QUEST_TRANSACTION_OPTIONS);
}

export type CompleteQuestResult = AwardXpResult & {
  quest: QuestDto;
  streak: number;
  streakRestored: boolean;
  skillLevelUp: { category: string; level: string } | null;
};

export function completeQuest(
  userId: string,
  questId: string,
  now = new Date(),
): Promise<CompleteQuestResult> {
  return prisma.$transaction(async (tx) => {
    await runRollover(tx, userId, now);

    const quest = await tx.quest.findFirst({ where: { id: questId, userId } });
    if (!quest) throw new AppError(404, 'QUEST_NOT_FOUND', 'Quest not found');

    // Atomic status change: only succeeds if the quest is still active and not expired.
    // A double click sends two requests; the second one changes 0 rows and is refused.
    const { count } = await tx.quest.updateMany({
      where: { id: questId, userId, status: 'ACTIVE', dueAt: { gt: now } },
      data: { status: 'COMPLETED', completedAt: now },
    });
    if (count === 0) throw new AppError(409, 'QUEST_NOT_ACTIVE', 'This quest cannot be completed');

    const user = await tx.user.findUniqueOrThrow({ where: { id: userId } });

    // The client never sends XP: it is read from the stored quest (SRS §3.9)
    const xp =
      quest.source === 'PENALTY'
        ? quest.xpReward
        : applyStreakBonus(quest.xpReward, user.currentStreak);

    const award = await awardXp(tx, {
      userId,
      amount: xp,
      reason: 'QUEST',
      questId,
      statGains: statGainsForQuest(quest.category, xp),
    });

    const completed = await tx.quest.update({
      where: { id: questId },
      data: { xpAwarded: xp },
      include: { template: true },
    });

    // Skill level in the quest's category (20 quests → intermediate, 40 → advanced)
    let skillLevelUp: CompleteQuestResult['skillLevelUp'] = null;
    if (quest.source === 'SYSTEM') {
      const area = await tx.focusArea.findUnique({
        where: { userId_category: { userId, category: quest.category } },
      });
      if (area) {
        const next = progressSkill(area.level, area.completedCount);
        await tx.focusArea.update({
          where: { id: area.id },
          data: { level: next.level, completedCount: next.completedCount },
        });
        if (next.leveledUp) skillLevelUp = { category: area.category, level: next.level };
      }
    }

    // The penalty quest gives the broken streak back
    let streak = user.currentStreak;
    let streakRestored = false;
    if (quest.source === 'PENALTY' && user.streakBeforePenalty !== null) {
      const restored = restoreStreak({
        current: user.currentStreak,
        best: user.bestStreak,
        beforePenalty: user.streakBeforePenalty,
      });
      await tx.user.update({
        where: { id: userId },
        data: {
          currentStreak: restored.current,
          bestStreak: restored.best,
          streakBeforePenalty: restored.beforePenalty,
        },
      });
      streak = restored.current;
      streakRestored = true;
    }

    return {
      ...award,
      quest: toQuestDto(completed),
      streak,
      streakRestored,
      skillLevelUp,
    };
  }, QUEST_TRANSACTION_OPTIONS);
}

export function rerollQuest(
  userId: string,
  questId: string,
  now = new Date(),
): Promise<{ quest: QuestDto; rerollsLeft: number }> {
  return prisma.$transaction(async (tx) => {
    await runRollover(tx, userId, now);

    const quest = await tx.quest.findFirst({
      where: { id: questId, userId },
      include: { template: true },
    });
    if (!quest) throw new AppError(404, 'QUEST_NOT_FOUND', 'Quest not found');
    if (!toQuestDto(quest).rerollable || !quest.template) {
      throw new AppError(409, 'QUEST_NOT_REROLLABLE', 'This quest cannot be rerolled');
    }

    const user = await tx.user.findUniqueOrThrow({ where: { id: userId } });
    if (user.rerollsUsed >= REROLLS_PER_DAY) {
      throw new AppError(409, 'NO_REROLLS_LEFT', 'No rerolls left today');
    }

    const today = fromDbDate(quest.questDate);
    const [templates, todayQuests, recentQuests] = await Promise.all([
      tx.questTemplate.findMany({
        where: {
          type: 'DAILY',
          active: true,
          category: quest.template.category,
          level: quest.template.level,
        },
      }),
      tx.quest.findMany({ where: { userId, questDate: quest.questDate, type: 'DAILY' } }),
      tx.quest.findMany({
        where: {
          userId,
          questDate: {
            gte: toDbDate(addDays(today, -TEMPLATE_COOLDOWN_DAYS)),
            lt: quest.questDate,
          },
        },
      }),
    ]);

    const replacement = pickRerollTemplate({
      current: quest.template,
      todayTemplateIds: new Set(todayQuests.map((q) => q.templateId!).filter(Boolean)),
      templates,
      recentlyUsedIds: new Set(recentQuests.map((q) => q.templateId!).filter(Boolean)),
      random: Math.random,
    });
    if (!replacement) {
      throw new AppError(409, 'NO_REROLL_AVAILABLE', 'No other quest available');
    }

    await tx.quest.update({ where: { id: questId }, data: { status: 'REPLACED' } });
    const template = templates.find((t) => t.id === replacement.id)!;
    const created = await tx.quest.create({
      data: {
        userId,
        templateId: template.id,
        source: 'SYSTEM',
        type: 'DAILY',
        category: template.category,
        difficulty: template.difficulty,
        minutes: template.minutes,
        xpReward: calculateQuestXp(template.difficulty, 'DAILY'),
        questDate: quest.questDate,
        dueAt: quest.dueAt,
      },
      include: { template: true },
    });
    const { rerollsUsed } = await tx.user.update({
      where: { id: userId },
      data: { rerollsUsed: { increment: 1 } },
    });

    return { quest: toQuestDto(created), rerollsLeft: REROLLS_PER_DAY - rerollsUsed };
  }, QUEST_TRANSACTION_OPTIONS);
}
