import request from 'supertest';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../../src/app.js';
import { prisma } from '../../src/lib/prisma.js';
import { getCalendar, getXpHistory } from '../../src/modules/dashboard/history.service.js';
import { resetDatabase } from '../helpers/database.js';
import { createTestUser } from '../helpers/users.js';

beforeEach(async () => {
  await resetDatabase();
});

afterAll(async () => {
  await prisma.$disconnect();
});

const gain = (userId: string, amount: number, createdAt: string) =>
  prisma.xpTransaction.create({
    data: { userId, amount, reason: 'QUEST', createdAt: new Date(createdAt) },
  });

describe('getXpHistory', () => {
  it('sums XP per day and fills days without XP with 0', async () => {
    const user = await createTestUser();
    await gain(user.id, 30, '2026-11-24T08:00:00Z');
    await gain(user.id, 20, '2026-11-24T20:00:00Z');
    await gain(user.id, 50, '2026-11-22T12:00:00Z');
    await gain(user.id, 999, '2026-11-10T12:00:00Z'); // outside the window

    const history = await getXpHistory(user.id, 7, new Date('2026-11-24T21:00:00Z'));

    expect(history).toHaveLength(7);
    expect(history[0]).toEqual({ date: '2026-11-18', xp: 0 });
    expect(history.find((d) => d.date === '2026-11-22')?.xp).toBe(50);
    expect(history.at(-1)).toEqual({ date: '2026-11-24', xp: 50 });
  });

  it("groups by the player's local day, not by UTC", async () => {
    const user = await createTestUser({ timezone: 'Africa/Tunis' }); // UTC+1
    await gain(user.id, 40, '2026-11-23T23:30:00Z'); // already the 24th in Tunis

    const history = await getXpHistory(user.id, 7, new Date('2026-11-24T10:00:00Z'));

    expect(history.at(-1)).toEqual({ date: '2026-11-24', xp: 40 });
    expect(history.at(-2)).toEqual({ date: '2026-11-23', xp: 0 });
  });
});

describe('getCalendar', () => {
  it('returns the closed days of the month only', async () => {
    const user = await createTestUser();
    const log = (date: string, done: number) =>
      prisma.dailyLog.create({
        data: {
          userId: user.id,
          date: new Date(`${date}T00:00:00Z`),
          questsTotal: 4,
          questsCompleted: done,
          allCompleted: done === 4,
        },
      });
    await log('2026-10-31', 4);
    await log('2026-11-01', 4);
    await log('2026-11-15', 2);
    await log('2026-12-01', 4);

    expect(await getCalendar(user.id, '2026-11')).toEqual([
      { date: '2026-11-01', questsTotal: 4, questsCompleted: 4, allCompleted: true },
      { date: '2026-11-15', questsTotal: 4, questsCompleted: 2, allCompleted: false },
    ]);
  });
});

describe('history routes', () => {
  it('require a session and validate the query', async () => {
    const app = createApp();
    expect((await request(app).get('/api/me/xp-history')).status).toBe(401);

    const agent = request.agent(app);
    await agent
      .post('/api/auth/register')
      .send({ username: 'Chart', email: 'chart@example.com', password: 'password123' });

    const history = await agent.get('/api/me/xp-history?days=14');
    expect(history.status).toBe(200);
    expect(history.body.days).toHaveLength(14);

    expect((await agent.get('/api/me/xp-history?days=500')).status).toBe(400);
    const badMonth = await agent.get('/api/me/calendar?month=2026-13');
    expect(badMonth.body.error.details).toEqual({ month: 'MONTH_INVALID' });
    expect((await agent.get('/api/me/calendar?month=2026-11')).body).toEqual({ days: [] });
  });
});
