import { prisma } from '../../lib/prisma.js';
import type { Prisma } from '../../generated/prisma/client.js';
import {
  RANKS,
  compareAllTime,
  compareWeekly,
  titleScore,
  type RankedPlayer,
} from '../../game/index.js';
import { AppError } from '../../utils/AppError.js';
import { localDate, mondayOf, startOfLocalDay } from '../../utils/time.js';
import { checkAchievements } from '../achievements/achievement.service.js';
import { notify } from '../notifications/notification.service.js';

type Tx = Prisma.TransactionClient | typeof prisma;

// Too many unanswered requests at once looks like spam
const MAX_PENDING_REQUESTS = 20;

const rankLabel = (code: string) => RANKS.find((rank) => rank.code === code)?.label ?? code;

// The friendship row between two players, whoever sent the request
function pairWhere(a: string, b: string): Prisma.FriendshipWhereInput {
  return {
    OR: [
      { requesterId: a, addresseeId: b },
      { requesterId: b, addresseeId: a },
    ],
  };
}

export async function areFriends(tx: Tx, a: string, b: string): Promise<boolean> {
  const count = await tx.friendship.count({ where: { ...pairWhere(a, b), status: 'ACCEPTED' } });
  return count > 0;
}

export async function friendIdsOf(tx: Tx, userId: string): Promise<string[]> {
  const rows = await tx.friendship.findMany({
    where: { status: 'ACCEPTED', OR: [{ requesterId: userId }, { addresseeId: userId }] },
    select: { requesterId: true, addresseeId: true },
  });
  return rows.map((r) => (r.requesterId === userId ? r.addresseeId : r.requesterId));
}

// Only public information: never the email
const playerCardSelect = {
  id: true,
  username: true,
  avatarKey: true,
  level: true,
  rank: true,
  totalXp: true,
  currentStreak: true,
  activeTitle: { select: { id: true, key: true, name: true, rarity: true } },
} as const satisfies Prisma.UserSelect;

type PlayerCardRow = Prisma.UserGetPayload<{ select: typeof playerCardSelect }>;

function toPlayerCard(user: PlayerCardRow) {
  return {
    username: user.username,
    avatarKey: user.avatarKey,
    level: user.level,
    rank: { code: user.rank, label: rankLabel(user.rank) },
    totalXp: user.totalXp,
    streak: user.currentStreak,
    activeTitle: user.activeTitle,
  };
}

export type SendRequestResult = { status: 'PENDING' | 'ACCEPTED' };

// Sends a friend request by exact username (FR-50). If that player had already sent
// a request to us, sending one back simply accepts it.
export function sendRequest(userId: string, username: string): Promise<SendRequestResult> {
  return prisma.$transaction(async (tx) => {
    const target = await tx.user.findUnique({
      where: { usernameNormalized: username.trim().toLowerCase() },
    });
    if (!target) throw new AppError(404, 'USER_NOT_FOUND', 'No player with this username');
    if (target.id === userId) throw new AppError(400, 'CANNOT_ADD_SELF', 'You cannot add yourself');

    const existing = await tx.friendship.findFirst({ where: pairWhere(userId, target.id) });
    if (existing?.status === 'ACCEPTED') {
      throw new AppError(409, 'ALREADY_FRIENDS', 'You are already friends');
    }
    if (existing && existing.requesterId === userId) {
      throw new AppError(409, 'REQUEST_ALREADY_SENT', 'Request already sent');
    }
    if (existing) {
      await acceptInTransaction(tx, existing.id, userId);
      return { status: 'ACCEPTED' };
    }

    const pending = await tx.friendship.count({
      where: { requesterId: userId, status: 'PENDING' },
    });
    if (pending >= MAX_PENDING_REQUESTS) {
      throw new AppError(409, 'TOO_MANY_PENDING_REQUESTS', 'Too many requests waiting');
    }

    try {
      await tx.friendship.create({ data: { requesterId: userId, addresseeId: target.id } });
    } catch (error) {
      // Both players sent a request at the same moment: the unique pair index refused
      // the second one (Prisma error P2002)
      if ((error as { code?: string }).code === 'P2002') {
        throw new AppError(409, 'REQUEST_ALREADY_SENT', 'Request already sent');
      }
      throw error;
    }

    const me = await tx.user.findUniqueOrThrow({ where: { id: userId } });
    await notify(tx, target.id, 'FRIEND_REQUEST', { username: me.username });
    return { status: 'PENDING' };
  });
}

async function acceptInTransaction(
  tx: Prisma.TransactionClient,
  requestId: string,
  userId: string,
) {
  const request = await tx.friendship.findFirst({
    where: { id: requestId, addresseeId: userId, status: 'PENDING' },
  });
  if (!request) throw new AppError(404, 'REQUEST_NOT_FOUND', 'Friend request not found');

  await tx.friendship.update({
    where: { id: requestId },
    data: { status: 'ACCEPTED', respondedAt: new Date() },
  });
  const me = await tx.user.findUniqueOrThrow({ where: { id: userId } });
  await notify(tx, request.requesterId, 'FRIEND_ACCEPTED', { username: me.username });

  // First friend: "First ally" achievement, for both players
  await checkAchievements(tx, userId);
  await checkAchievements(tx, request.requesterId);
}

// Only the player who received the request can accept it (FR-51)
export function acceptRequest(userId: string, requestId: string): Promise<void> {
  return prisma.$transaction((tx) => acceptInTransaction(tx, requestId, userId));
}

// Declines (receiver) or cancels (sender) a pending request: the row is deleted
export async function deleteRequest(userId: string, requestId: string): Promise<void> {
  const { count } = await prisma.friendship.deleteMany({
    where: {
      id: requestId,
      status: 'PENDING',
      OR: [{ requesterId: userId }, { addresseeId: userId }],
    },
  });
  if (count === 0) throw new AppError(404, 'REQUEST_NOT_FOUND', 'Friend request not found');
}

export async function removeFriend(userId: string, username: string): Promise<void> {
  const friend = await prisma.user.findUnique({
    where: { usernameNormalized: username.toLowerCase() },
    select: { id: true },
  });
  const { count } = friend
    ? await prisma.friendship.deleteMany({
        where: { ...pairWhere(userId, friend.id), status: 'ACCEPTED' },
      })
    : { count: 0 };
  if (count === 0) throw new AppError(404, 'FRIEND_NOT_FOUND', 'Not in your friends');
}

export async function listFriends(userId: string) {
  const ids = await friendIdsOf(prisma, userId);
  const friends = await prisma.user.findMany({
    where: { id: { in: ids } },
    select: playerCardSelect,
    orderBy: { usernameNormalized: 'asc' },
  });
  return friends.map(toPlayerCard);
}

export async function listRequests(userId: string) {
  const [incoming, outgoing] = await Promise.all([
    prisma.friendship.findMany({
      where: { addresseeId: userId, status: 'PENDING' },
      include: { requester: { select: playerCardSelect } },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.friendship.findMany({
      where: { requesterId: userId, status: 'PENDING' },
      include: { addressee: { select: playerCardSelect } },
      orderBy: { createdAt: 'desc' },
    }),
  ]);
  return {
    incoming: incoming.map((r) => ({
      id: r.id,
      createdAt: r.createdAt,
      player: toPlayerCard(r.requester),
    })),
    outgoing: outgoing.map((r) => ({
      id: r.id,
      createdAt: r.createdAt,
      player: toPlayerCard(r.addressee),
    })),
  };
}

// Ranking of the player and their friends (FR-54).
// Weekly = XP earned since Monday 00:00 in the viewer's time zone.
export async function friendsRanking(userId: string, period: 'weekly' | 'all', now = new Date()) {
  const me = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  const ids = [userId, ...(await friendIdsOf(prisma, userId))];
  const weekStart = startOfLocalDay(mondayOf(localDate(me.timezone, now)), me.timezone);

  const [players, weekly, titles] = await Promise.all([
    prisma.user.findMany({ where: { id: { in: ids } }, select: playerCardSelect }),
    prisma.xpTransaction.groupBy({
      by: ['userId'],
      where: { userId: { in: ids }, createdAt: { gte: weekStart } },
      _sum: { amount: true },
    }),
    prisma.userTitle.findMany({
      where: { userId: { in: ids } },
      select: { userId: true, title: { select: { rarity: true } } },
    }),
  ]);

  const weeklyXp = new Map(weekly.map((w) => [w.userId, w._sum.amount ?? 0]));
  const entries = players.map((player) => {
    const ranked: RankedPlayer = {
      username: player.username,
      rank: player.rank,
      totalXp: player.totalXp,
      weeklyXp: weeklyXp.get(player.id) ?? 0,
      titleScore: titleScore(
        titles.filter((t) => t.userId === player.id).map((t) => t.title.rarity),
      ),
    };
    return { ranked, card: toPlayerCard(player), isMe: player.id === userId };
  });

  entries.sort((a, b) =>
    (period === 'weekly' ? compareWeekly : compareAllTime)(a.ranked, b.ranked),
  );

  return entries.map((entry, index) => ({
    position: index + 1,
    ...entry.card,
    weeklyXp: entry.ranked.weeklyXp,
    titleScore: entry.ranked.titleScore,
    isMe: entry.isMe,
  }));
}
