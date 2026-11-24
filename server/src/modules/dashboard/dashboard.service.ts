import { prisma } from '../../lib/prisma.js';
import {
  CUSTOM_QUEST_DAILY_XP_CAP,
  DISCIPLINE_RATE_WINDOW_DAYS,
  disciplineRate,
  levelProgress,
  rankStatus,
  type LevelProgress,
} from '../../game/index.js';
import { addDays, localDate, toDbDate } from '../../utils/time.js';
import { getVerifiedAchievements } from '../progression/progression.service.js';
import { customXpEarnedToday } from '../quests/customQuest.service.js';
import { QUEST_TRANSACTION_OPTIONS, runRollover } from '../quests/rollover.service.js';

type RankInfo = { code: string; label: string };

// Everything the status window shows, in one request (FR-42, FR-47)
export type Dashboard = {
  username: string;
  avatarKey: string | null;
  totalXp: number;
  progress: LevelProgress;
  rank: RankInfo;
  nextRank: (RankInfo & { minLevel: number }) | null;
  // Set when the level is enough for the next rank but real-life achievements are missing
  rankLockedBy: { legendary: number; mythic: number } | null;
  stats: { strength: number; intelligence: number; discipline: number; consistency: number };
  streak: { current: number; best: number };
  // % of daily quests completed over the last 30 days; null for a brand new player
  disciplineRate: number | null;
  customXp: { earnedToday: number; dailyCap: number };
};

export function getDashboard(userId: string, now = new Date()): Promise<Dashboard> {
  return prisma.$transaction(async (tx) => {
    // Up-to-date streak and stats: yesterday must be closed before we show them
    await runRollover(tx, userId, now);

    const user = await tx.user.findUniqueOrThrow({
      where: { id: userId },
      include: { stats: true },
    });
    const today = localDate(user.timezone, now);

    const logs = await tx.dailyLog.findMany({
      where: { userId, date: { gte: toDbDate(addDays(today, -DISCIPLINE_RATE_WINDOW_DAYS)) } },
    });
    const status = rankStatus(user.level, await getVerifiedAchievements(tx, userId));

    return {
      username: user.username,
      avatarKey: user.avatarKey,
      totalXp: user.totalXp,
      progress: levelProgress(user.totalXp),
      rank: { code: status.current.code, label: status.current.label },
      nextRank: status.next
        ? { code: status.next.code, label: status.next.label, minLevel: status.next.minLevel }
        : null,
      rankLockedBy: status.lockedBy,
      stats: {
        strength: user.stats?.strength ?? 0,
        intelligence: user.stats?.intelligence ?? 0,
        discipline: user.stats?.discipline ?? 0,
        consistency: user.stats?.consistency ?? 0,
      },
      streak: { current: user.currentStreak, best: user.bestStreak },
      disciplineRate: disciplineRate(logs),
      customXp: {
        earnedToday: await customXpEarnedToday(tx, user, now),
        dailyCap: CUSTOM_QUEST_DAILY_XP_CAP,
      },
    };
  }, QUEST_TRANSACTION_OPTIONS);
}
