import type { Prisma } from '../../generated/prisma/client.js';
import { ROLLOVER_MAX_DAYS, recordDay, type StreakState } from '../../game/index.js';
import { AppError } from '../../utils/AppError.js';
import { addDays, fromDbDate, localDate, mondayOf, toDbDate } from '../../utils/time.js';
import {
  createPenaltyQuest,
  generateDailyQuests,
  generateWeeklyQuestsIfMissing,
} from './questGeneration.js';

type Tx = Prisma.TransactionClient;

// Daily rollover (SRS §3.6), run lazily on the player's first request after their
// local midnight instead of by a scheduled job: free hosting can put the server to
// sleep, and a sleeping server would miss a midnight job. This way no day is ever
// skipped, and no day is processed twice (tracked by last_rollover_date).
//
// For every day that ended since the last visit:
//   1. unfinished daily quests become FAILED
//   2. a daily log is saved and the streak is updated
// Then: expired weekly/penalty quests fail, a penalty quest is created if the streak
// can be saved, and today's (and this week's) quests are generated.
export async function runRollover(tx: Tx, userId: string, now: Date): Promise<void> {
  // Lock the player's row until the transaction ends. Two requests arriving at the
  // same time (two open tabs at midnight) run one after the other, so the second one
  // sees the day is already processed instead of generating quests twice.
  await tx.$queryRaw`SELECT id FROM users WHERE id = ${userId}::uuid FOR UPDATE`;

  const user = await tx.user.findUniqueOrThrow({
    where: { id: userId },
    include: { focusAreas: { orderBy: { category: 'asc' } } },
  });
  if (!user.onboardedAt || !user.lastRolloverDate) {
    throw new AppError(403, 'ONBOARDING_REQUIRED', 'Finish onboarding first');
  }

  const today = localDate(user.timezone, now);
  const lastProcessed = fromDbDate(user.lastRolloverDate);
  if (lastProcessed >= today) return; // already done today

  // A player back after months away: older days just count as missed
  const oldestDay = addDays(today, -ROLLOVER_MAX_DAYS);
  let day = lastProcessed > oldestDay ? lastProcessed : oldestDay;

  let streak: StreakState = {
    current: user.currentStreak,
    best: user.bestStreak,
    beforePenalty: user.streakBeforePenalty,
  };
  let perfectDays = 0;

  for (; day < today; day = addDays(day, 1)) {
    const allCompleted = await closeDay(tx, userId, day);
    streak = recordDay(streak, allCompleted);
    if (allCompleted) perfectDays++;
  }

  // Weekly, penalty and custom quests whose deadline has passed
  await tx.quest.updateMany({
    where: { userId, status: 'ACTIVE', dueAt: { lte: now } },
    data: { status: 'FAILED' },
  });

  await tx.user.update({
    where: { id: userId },
    data: {
      currentStreak: streak.current,
      bestStreak: streak.best,
      streakBeforePenalty: streak.beforePenalty,
      lastRolloverDate: toDbDate(today),
      rerollsUsed: 0,
      rerollsDate: toDbDate(today),
    },
  });
  if (perfectDays > 0) {
    await tx.playerStats.update({
      where: { userId },
      data: { consistency: { increment: perfectDays } }, // +1 per perfect day (SRS §3.1)
    });
  }

  if (streak.beforePenalty !== null) {
    await createPenaltyQuest(tx, user, today);
  }
  await generateDailyQuests(tx, user, today);
  await generateWeeklyQuestsIfMissing(tx, user, mondayOf(today));
}

// Closes one finished day and returns whether every daily quest was completed.
// A day without any quest (the player did not open the app) counts as missed.
async function closeDay(tx: Tx, userId: string, day: string): Promise<boolean> {
  const questDate = toDbDate(day);

  await tx.quest.updateMany({
    where: { userId, type: 'DAILY', questDate, status: 'ACTIVE' },
    data: { status: 'FAILED' },
  });

  const dailyQuests = { userId, type: 'DAILY' as const, source: 'SYSTEM' as const, questDate };
  const total = await tx.quest.count({ where: { ...dailyQuests, status: { not: 'REPLACED' } } });
  const completed = await tx.quest.count({ where: { ...dailyQuests, status: 'COMPLETED' } });
  const allCompleted = total > 0 && completed === total;

  await tx.dailyLog.upsert({
    where: { userId_date: { userId, date: questDate } },
    create: {
      userId,
      date: questDate,
      questsTotal: total,
      questsCompleted: completed,
      allCompleted,
    },
    update: { questsTotal: total, questsCompleted: completed, allCompleted },
  });

  return allCompleted;
}

// Prisma's interactive transactions time out after 5 seconds by default; a long
// rollover (many missed days) needs more.
export const QUEST_TRANSACTION_OPTIONS = { timeout: 15_000 } as const;
