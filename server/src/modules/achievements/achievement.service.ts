import { prisma } from '../../lib/prisma.js';
import type { Prisma, TitleRarity } from '../../generated/prisma/client.js';
import { newlyEarnedAchievements, type PlayerSnapshot } from '../../game/index.js';
import { AppError } from '../../utils/AppError.js';
import { getVerifiedAchievements } from '../progression/progression.service.js';
import { notify } from '../notifications/notification.service.js';

type Tx = Prisma.TransactionClient;
type Translations = { en: string; fr: string; ar: string };

export type TitleDto = { id: string; key: string; name: Translations; rarity: TitleRarity };

export type UnlockedAchievement = { code: string; title: TitleDto | null };

// Builds the player snapshot the achievement rules need, from the database
async function buildSnapshot(tx: Tx, userId: string): Promise<PlayerSnapshot> {
  const user = await tx.user.findUniqueOrThrow({ where: { id: userId } });
  const notCustom = { userId, status: 'COMPLETED' as const, source: { not: 'CUSTOM' as const } };

  const [questsCompleted, penaltyQuestsCompleted, early, verified] = await Promise.all([
    tx.quest.count({ where: notCustom }),
    tx.quest.count({ where: { ...notCustom, source: 'PENALTY' } }),
    // Hour of completion in the player's own time zone, computed by PostgreSQL
    tx.$queryRaw<{ count: bigint }[]>`
      SELECT COUNT(*) AS count FROM quests
      WHERE user_id = ${userId}::uuid AND status = 'COMPLETED' AND source <> 'CUSTOM'
        AND EXTRACT(HOUR FROM completed_at AT TIME ZONE 'UTC' AT TIME ZONE ${user.timezone}) < 8
    `,
    getVerifiedAchievements(tx, userId),
  ]);

  return {
    level: user.level,
    rank: user.rank,
    bestStreak: user.bestStreak,
    questsCompleted,
    questsCompletedBefore8am: Number(early[0]?.count ?? 0),
    penaltyQuestsCompleted,
    friends: await tx.friendship.count({
      where: { status: 'ACCEPTED', OR: [{ requesterId: userId }, { addresseeId: userId }] },
    }),
    verifiedAchievements: verified.legendary + verified.mythic,
  };
}

// Checks every achievement and unlocks the new ones: records the unlock, grants the
// title it comes with, and notifies the player. Safe to call as often as needed:
// an achievement is never unlocked twice (also guaranteed by the table's primary key).
export async function checkAchievements(tx: Tx, userId: string): Promise<UnlockedAchievement[]> {
  const already = await tx.userAchievement.findMany({
    where: { userId },
    select: { achievementCode: true },
  });
  const codes = newlyEarnedAchievements(
    await buildSnapshot(tx, userId),
    new Set(already.map((a) => a.achievementCode)),
  );
  if (codes.length === 0) return [];

  const achievements = await tx.achievement.findMany({
    where: { code: { in: codes } },
    include: { title: true },
  });

  const unlocked: UnlockedAchievement[] = [];
  for (const achievement of achievements) {
    await tx.userAchievement.create({ data: { userId, achievementCode: achievement.code } });
    if (achievement.title) {
      await tx.userTitle.createMany({
        data: [{ userId, titleId: achievement.title.id }],
        skipDuplicates: true,
      });
    }
    await notify(tx, userId, 'ACHIEVEMENT_UNLOCKED', { code: achievement.code });
    unlocked.push({
      code: achievement.code,
      title: achievement.title ? toTitleDto(achievement.title) : null,
    });
  }
  return unlocked;
}

function toTitleDto(title: {
  id: string;
  key: string;
  name: unknown;
  rarity: TitleRarity;
}): TitleDto {
  return { id: title.id, key: title.key, name: title.name as Translations, rarity: title.rarity };
}

export type AchievementDto = {
  code: string;
  unlockedAt: Date | null;
  title: TitleDto | null;
};

// All achievements, unlocked or not, in catalog order (FR-45)
export async function listAchievements(userId: string): Promise<AchievementDto[]> {
  const [achievements, unlocked] = await Promise.all([
    prisma.achievement.findMany({ include: { title: true } }),
    prisma.userAchievement.findMany({ where: { userId } }),
  ]);
  const unlockedAt = new Map(unlocked.map((u) => [u.achievementCode, u.unlockedAt]));

  return achievements.map((a) => ({
    code: a.code,
    unlockedAt: unlockedAt.get(a.code) ?? null,
    title: a.title ? toTitleDto(a.title) : null,
  }));
}

export async function listEarnedTitles(
  userId: string,
): Promise<{ titles: (TitleDto & { earnedAt: Date })[]; activeTitleId: string | null }> {
  const [earned, user] = await Promise.all([
    prisma.userTitle.findMany({
      where: { userId },
      include: { title: true },
      orderBy: { earnedAt: 'asc' },
    }),
    prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { activeTitleId: true } }),
  ]);
  return {
    titles: earned.map((e) => ({ ...toTitleDto(e.title), earnedAt: e.earnedAt })),
    activeTitleId: user.activeTitleId,
  };
}

// The title shown next to the username (FR-46). Only an earned title can be chosen.
export async function setActiveTitle(userId: string, titleId: string | null): Promise<void> {
  if (titleId) {
    const owned = await prisma.userTitle.count({ where: { userId, titleId } });
    if (!owned) throw new AppError(403, 'TITLE_NOT_EARNED', 'This title is not earned');
  }
  await prisma.user.update({ where: { id: userId }, data: { activeTitleId: titleId } });
}

export async function getActiveTitle(userId: string): Promise<TitleDto | null> {
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    include: { activeTitle: true },
  });
  return user.activeTitle ? toTitleDto(user.activeTitle) : null;
}
