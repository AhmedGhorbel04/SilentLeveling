import request from 'supertest';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../../src/app.js';
import { prisma } from '../../src/lib/prisma.js';
import { awardXp, type AwardXpInput } from '../../src/modules/progression/progression.service.js';
import { NO_STAT_GAINS } from '../../src/game/index.js';
import { seed } from '../../prisma/seed.js';
import { TITLES } from '../../src/game/catalog.js';
import { resetDatabase } from '../helpers/database.js';
import { createTestUser } from '../helpers/users.js';

function award(input: AwardXpInput) {
  return prisma.$transaction((tx) => awardXp(tx, input));
}

async function ledgerSum(userId: string) {
  const { _sum } = await prisma.xpTransaction.aggregate({
    where: { userId },
    _sum: { amount: true },
  });
  return _sum.amount ?? 0;
}

beforeEach(async () => {
  await resetDatabase();
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe('awardXp', () => {
  it('records the gain in the ledger and updates the cached total', async () => {
    const user = await createTestUser();

    const result = await award({ userId: user.id, amount: 40, reason: 'QUEST' });

    expect(result).toMatchObject({ xpGained: 40, totalXp: 40, levelAfter: 1, leveledUp: false });
    expect(await ledgerSum(user.id)).toBe(40);
  });

  it('levels up when the threshold is crossed', async () => {
    const user = await createTestUser();
    await award({ userId: user.id, amount: 80, reason: 'QUEST' });

    const result = await award({ userId: user.id, amount: 40, reason: 'QUEST' });

    expect(result).toMatchObject({ levelBefore: 1, levelAfter: 2, leveledUp: true });
    expect(result.progress).toEqual({
      level: 2,
      xpIntoLevel: 20,
      xpForNextLevel: 120,
      percent: 16,
    });
    const saved = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
    expect(saved.level).toBe(2);
  });

  it('ranks up from E IV to E III at level 3', async () => {
    const user = await createTestUser();

    const result = await award({ userId: user.id, amount: 220, reason: 'QUEST' });

    expect(result).toMatchObject({
      levelAfter: 3,
      rankBefore: 'E4',
      rankAfter: 'E3',
      rankedUp: true,
    });
  });

  it('stops at C I without verified real-life achievements', async () => {
    const user = await createTestUser();

    const result = await award({ userId: user.id, amount: 50_000, reason: 'ADMIN_ADJUSTMENT' });

    expect(result.levelAfter).toBeGreaterThan(38); // level high enough for B
    expect(result.rankAfter).toBe('C1');
  });

  it('adds stat points', async () => {
    const user = await createTestUser();

    await award({
      userId: user.id,
      amount: 80,
      reason: 'QUEST',
      statGains: { ...NO_STAT_GAINS, intelligence: 4, discipline: 4 },
    });

    const stats = await prisma.playerStats.findUniqueOrThrow({ where: { userId: user.id } });
    expect(stats).toMatchObject({ strength: 0, intelligence: 4, discipline: 4, consistency: 0 });
  });

  it('records nothing for a zero amount (custom quest over the daily cap)', async () => {
    const user = await createTestUser();

    const result = await award({ userId: user.id, amount: 0, reason: 'QUEST' });

    expect(result.xpGained).toBe(0);
    expect(await prisma.xpTransaction.count()).toBe(0);
  });

  it('never loses XP when awards happen at the same moment', async () => {
    const user = await createTestUser();

    await Promise.all(
      Array.from({ length: 20 }, () => award({ userId: user.id, amount: 20, reason: 'QUEST' })),
    );

    const saved = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
    expect(saved.totalXp).toBe(400);
    expect(await ledgerSum(user.id)).toBe(400);
    expect(saved.level).toBe(4); // level 4 starts at 360 XP, level 5 at 520
  });

  it('rolls everything back when the surrounding transaction fails', async () => {
    const user = await createTestUser();

    await expect(
      prisma.$transaction(async (tx) => {
        await awardXp(tx, { userId: user.id, amount: 100, reason: 'QUEST' });
        throw new Error('something else failed');
      }),
    ).rejects.toThrow('something else failed');

    const saved = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
    expect(saved.totalXp).toBe(0);
    expect(await prisma.xpTransaction.count()).toBe(0);
  });
});

describe('database safety checks', () => {
  it('refuses a negative total XP', async () => {
    const user = await createTestUser();

    await expect(
      prisma.user.update({ where: { id: user.id }, data: { totalXp: -10 } }),
    ).rejects.toThrow();
  });

  it('refuses a zero-XP ledger entry', async () => {
    const user = await createTestUser();

    await expect(
      prisma.xpTransaction.create({ data: { userId: user.id, amount: 0, reason: 'QUEST' } }),
    ).rejects.toThrow();
  });
});

describe('registration', () => {
  it('creates the stats row with every stat at 0', async () => {
    const res = await request(createApp())
      .post('/api/auth/register')
      .send({ username: 'new_player', email: 'new@example.com', password: 'secret123' });

    const stats = await prisma.playerStats.findUnique({ where: { userId: res.body.user.id } });
    expect(stats).toMatchObject({ strength: 0, intelligence: 0, discipline: 0, consistency: 0 });
  });
});

describe('seed', () => {
  it('can run twice without duplicating titles or achievements', async () => {
    await seed(prisma);
    await seed(prisma);

    expect(await prisma.title.count()).toBe(TITLES.length);
    expect(await prisma.achievement.count()).toBe(14);
    const streak30 = await prisma.achievement.findUniqueOrThrow({
      where: { code: 'STREAK_30' },
      include: { title: true },
    });
    expect(streak30.title?.key).toBe('iron_will');
  });
});

describe('GET /api/ranks', () => {
  it('returns the 25 ranks with their requirements', async () => {
    const res = await request(createApp()).get('/api/ranks');

    expect(res.status).toBe(200);
    expect(res.body.ranks).toHaveLength(25);
    expect(res.body.ranks[12]).toEqual({
      code: 'B4',
      label: 'B IV',
      minLevel: 38,
      requiredLegendary: 1,
      requiredMythic: 0,
    });
  });
});
