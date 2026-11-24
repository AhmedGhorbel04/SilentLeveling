import { prisma } from '../../lib/prisma.js';
import { DISCIPLINE_RATE_WINDOW_DAYS, RANKS, disciplineRate } from '../../game/index.js';
import { AppError } from '../../utils/AppError.js';
import { addDays, localDate, toDbDate } from '../../utils/time.js';
import { friendIdsOf } from './friend.service.js';

export type Relationship = 'SELF' | 'FRIEND' | 'REQUEST_SENT' | 'REQUEST_RECEIVED' | 'NONE';

const rankLabel = (code: string) => RANKS.find((rank) => rank.code === code)?.label ?? code;

// A player's profile (FR-52, FR-53). Friends (and the player themselves) see
// everything; anyone else sees only a mini card: username, avatar, rank.
// The email is never part of a profile.
export async function getProfile(viewerId: string, username: string, now = new Date()) {
  const user = await prisma.user.findUnique({
    where: { usernameNormalized: username.toLowerCase() },
    include: { activeTitle: true, stats: true },
  });
  if (!user) throw new AppError(404, 'USER_NOT_FOUND', 'No player with this username');

  const relationship = await relationshipBetween(viewerId, user.id);
  const card = {
    username: user.username,
    avatarKey: user.avatarKey,
    rank: { code: user.rank, label: rankLabel(user.rank) },
  };

  if (relationship.type !== 'SELF' && relationship.type !== 'FRIEND') {
    return { visibility: 'CARD' as const, relationship, ...card };
  }

  const today = localDate(user.timezone, now);
  const [logs, achievements, titles, friendIds] = await Promise.all([
    prisma.dailyLog.findMany({
      where: {
        userId: user.id,
        date: { gte: toDbDate(addDays(today, -DISCIPLINE_RATE_WINDOW_DAYS)) },
      },
    }),
    prisma.userAchievement.findMany({
      where: { userId: user.id },
      orderBy: { unlockedAt: 'asc' },
    }),
    prisma.userTitle.findMany({
      where: { userId: user.id },
      include: { title: true },
      orderBy: { earnedAt: 'asc' },
    }),
    friendIdsOf(prisma, user.id),
  ]);

  return {
    visibility: 'FULL' as const,
    relationship,
    ...card,
    bio: user.bio,
    activeTitle: user.activeTitle
      ? {
          id: user.activeTitle.id,
          key: user.activeTitle.key,
          name: user.activeTitle.name,
          rarity: user.activeTitle.rarity,
        }
      : null,
    level: user.level,
    totalXp: user.totalXp,
    stats: {
      strength: user.stats?.strength ?? 0,
      intelligence: user.stats?.intelligence ?? 0,
      discipline: user.stats?.discipline ?? 0,
      consistency: user.stats?.consistency ?? 0,
    },
    streak: { current: user.currentStreak, best: user.bestStreak },
    disciplineRate: disciplineRate(logs),
    achievements: achievements.map((a) => ({ code: a.achievementCode, unlockedAt: a.unlockedAt })),
    titles: titles.map((t) => ({
      id: t.title.id,
      key: t.title.key,
      name: t.title.name,
      rarity: t.title.rarity,
    })),
    friendsCount: friendIds.length,
    memberSince: user.createdAt,
  };
}

// Also returns the pending request id, so the page can show "accept" or "cancel"
async function relationshipBetween(
  viewerId: string,
  userId: string,
): Promise<{ type: Relationship; requestId: string | null }> {
  if (viewerId === userId) return { type: 'SELF', requestId: null };

  const row = await prisma.friendship.findFirst({
    where: {
      OR: [
        { requesterId: viewerId, addresseeId: userId },
        { requesterId: userId, addresseeId: viewerId },
      ],
    },
  });
  if (!row) return { type: 'NONE', requestId: null };
  if (row.status === 'ACCEPTED') return { type: 'FRIEND', requestId: null };
  return {
    type: row.requesterId === viewerId ? 'REQUEST_SENT' : 'REQUEST_RECEIVED',
    requestId: row.id,
  };
}

export async function updateBio(userId: string, bio: string | null): Promise<void> {
  await prisma.user.update({ where: { id: userId }, data: { bio } });
}
