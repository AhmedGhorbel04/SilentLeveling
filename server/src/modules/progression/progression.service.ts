import type { Prisma, XpReason } from '../../generated/prisma/client.js';
import {
  NO_STAT_GAINS,
  RANKS,
  levelFromTotalXp,
  levelProgress,
  rankFor,
  type LevelProgress,
  type StatGains,
  type VerifiedAchievements,
} from '../../game/index.js';

// A Prisma transaction. Awarding XP is always part of a bigger operation
// (completing a quest, approving a claim), so the caller owns the transaction:
// if anything fails, the XP is rolled back together with the rest.
type Tx = Prisma.TransactionClient;

export type AwardXpInput = {
  userId: string;
  amount: number;
  reason: XpReason;
  statGains?: StatGains;
  // The quest that gave this XP. Unique in the ledger: a quest can never pay twice.
  questId?: string;
};

export type AwardXpResult = {
  xpGained: number;
  totalXp: number;
  progress: LevelProgress;
  levelBefore: number;
  levelAfter: number;
  leveledUp: boolean;
  rankBefore: string;
  rankAfter: string;
  rankedUp: boolean;
};

// The only function allowed to change a player's XP.
// 1. records the gain in the XP ledger
// 2. updates the cached total XP, level and rank
// 3. adds stat points
export async function awardXp(tx: Tx, input: AwardXpInput): Promise<AwardXpResult> {
  const { userId, amount, reason, statGains = NO_STAT_GAINS, questId } = input;

  const before = await tx.user.findUniqueOrThrow({
    where: { id: userId },
    select: { totalXp: true, level: true, rank: true },
  });

  if (amount <= 0) {
    // e.g. a custom quest completed after the daily cap: nothing to record
    return buildResult(0, before.totalXp, before, before.level, before.rank);
  }

  await tx.xpTransaction.create({ data: { userId, amount, reason, questId } });

  // Atomic increment in SQL ("total_xp = total_xp + amount"), not read-then-write:
  // two awards at the same moment both count, because PostgreSQL locks the row
  // and the second update waits for the first.
  const { totalXp } = await tx.user.update({
    where: { id: userId },
    data: { totalXp: { increment: amount } },
    select: { totalXp: true },
  });

  const level = levelFromTotalXp(totalXp);
  const rank = rankFor(level, await getVerifiedAchievements(tx, userId)).code;

  await tx.user.update({ where: { id: userId }, data: { level, rank } });
  await tx.playerStats.update({
    where: { userId },
    data: {
      strength: { increment: statGains.strength },
      intelligence: { increment: statGains.intelligence },
      discipline: { increment: statGains.discipline },
      consistency: { increment: statGains.consistency },
    },
  });

  return buildResult(amount, totalXp, before, level, rank);
}

// Approved real-life achievement claims, by tier. Claims are added in Milestone 8;
// until then nobody has any, so ranks stop at C I as the rules require.
async function getVerifiedAchievements(_tx: Tx, _userId: string): Promise<VerifiedAchievements> {
  return { legendary: 0, mythic: 0 };
}

function buildResult(
  xpGained: number,
  totalXp: number,
  before: { level: number; rank: string },
  levelAfter: number,
  rankAfter: string,
): AwardXpResult {
  const rankIndex = (code: string) => RANKS.findIndex((rank) => rank.code === code);

  return {
    xpGained,
    totalXp,
    progress: levelProgress(totalXp),
    levelBefore: before.level,
    levelAfter,
    leveledUp: levelAfter > before.level,
    rankBefore: before.rank,
    rankAfter,
    rankedUp: rankIndex(rankAfter) > rankIndex(before.rank),
  };
}
