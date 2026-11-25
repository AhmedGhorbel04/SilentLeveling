import request from 'supertest';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../../src/app.js';
import { prisma } from '../../src/lib/prisma.js';
import { completeOnboarding } from '../../src/modules/onboarding/onboarding.service.js';
import type { OnboardingInput } from '../../src/modules/onboarding/onboarding.schemas.js';
import {
  completeQuest,
  getTodayQuests,
  rerollQuest,
} from '../../src/modules/quests/quest.service.js';
import { resetDatabase } from '../helpers/database.js';
import { createTestUser } from '../helpers/users.js';

// A Tuesday, 10:00 UTC. Tests move "now" forward to simulate the next days.
const TUESDAY = new Date('2026-11-24T10:00:00Z');
const daysLater = (days: number) => new Date(TUESDAY.getTime() + days * 86_400_000);

const defaultChoices: OnboardingInput = {
  focusAreas: [
    { category: 'STUDIES', level: 'BEGINNER' },
    { category: 'FITNESS', level: 'BEGINNER' },
  ],
  dailyMinutes: 60,
  avatarKey: 'sigil-1',
};

async function onboardedPlayer(choices = defaultChoices, timezone = 'UTC') {
  const user = await createTestUser({ timezone });
  await completeOnboarding(user.id, choices, TUESDAY);
  return user;
}

async function completeAll(userId: string, quests: { id: string }[], now: Date) {
  for (const quest of quests) await completeQuest(userId, quest.id, now);
}

beforeEach(async () => {
  await resetDatabase();
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe('onboarding', () => {
  async function registeredAgent() {
    const agent = request.agent(createApp());
    await agent
      .post('/api/auth/register')
      .send({ username: 'new_player', email: 'new@example.com', password: 'secret123' });
    return agent;
  }

  it('blocks quests until onboarding is done', async () => {
    const agent = await registeredAgent();

    const res = await agent.get('/api/quests/today');

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('ONBOARDING_REQUIRED');
  });

  it('validates the choices', async () => {
    const agent = await registeredAgent();

    const res = await agent.post('/api/onboarding').send({
      focusAreas: [
        { category: 'FITNESS', level: 'BEGINNER' },
        { category: 'FITNESS', level: 'ADVANCED' },
      ],
      dailyMinutes: 45,
      avatarKey: 'not-an-avatar',
    });

    expect(res.status).toBe(400);
    expect(res.body.error.details).toEqual({
      focusAreas: 'FOCUS_AREAS_DUPLICATE',
      dailyMinutes: 'DAILY_MINUTES_INVALID',
      avatarKey: 'AVATAR_INVALID',
    });
  });

  it('refuses no focus area and more than three', async () => {
    const agent = await registeredAgent();
    const area = (category: string) => ({ category, level: 'BEGINNER' });

    const none = await agent.post('/api/onboarding').send({ ...defaultChoices, focusAreas: [] });
    const four = await agent.post('/api/onboarding').send({
      ...defaultChoices,
      focusAreas: ['FITNESS', 'STUDIES', 'READING', 'HEALTH'].map(area),
    });

    expect(none.body.error.details.focusAreas).toBe('FOCUS_AREAS_REQUIRED');
    expect(four.body.error.details.focusAreas).toBe('FOCUS_AREAS_TOO_MANY');
  });

  it('completes onboarding once, then refuses a second time', async () => {
    const agent = await registeredAgent();

    const first = await agent.post('/api/onboarding').send(defaultChoices);
    const second = await agent.post('/api/onboarding').send(defaultChoices);

    expect(first.status).toBe(201);
    expect(first.body.user.onboarded).toBe(true);
    expect(second.status).toBe(409);
    expect(second.body.error.code).toBe('ALREADY_ONBOARDED');
  });

  it('generates the first quests: a 5-minute starter, daily quests and weekly quests', async () => {
    const user = await onboardedPlayer();

    const today = await getTodayQuests(user.id, TUESDAY);

    const starter = today.daily.find((q) => q.minutes === 5 && !q.rerollable);
    expect(starter?.difficulty).toBe('EASY');
    expect(starter?.category).toBe('STUDIES'); // the player's first goal

    const generated = today.daily.filter((q) => q !== starter);
    const minutes = generated.reduce((sum, q) => sum + q.minutes!, 0);
    expect(minutes).toBeGreaterThanOrEqual(50);
    expect(minutes).toBeLessThanOrEqual(70);
    expect(new Set(generated.map((q) => q.category))).toEqual(new Set(['STUDIES', 'FITNESS']));

    expect(today.weekly.map((q) => q.category).sort()).toEqual(['FITNESS', 'STUDIES']);
    expect(
      today.weekly.every(
        (q) => q.xpReward === 3 * { EASY: 20, NORMAL: 40, HARD: 80, EXTREME: 150 }[q.difficulty],
      ),
    ).toBe(true);
    expect(today.penalty).toEqual([]);
    expect(today.rerollsLeft).toBe(3);
  });

  it('gives titles in all three languages', async () => {
    const user = await onboardedPlayer();

    const { daily } = await getTodayQuests(user.id, TUESDAY);

    expect(daily[0]!.title).toEqual({
      en: expect.any(String),
      fr: expect.any(String),
      ar: expect.any(String),
    });
  });
});

describe('GET /api/quests/today', () => {
  it('returns the same quests when called again the same day', async () => {
    const user = await onboardedPlayer();

    const first = await getTodayQuests(user.id, TUESDAY);
    const again = await getTodayQuests(user.id, daysLater(0.4)); // same day, 19:36

    expect(again.daily.map((q) => q.id)).toEqual(first.daily.map((q) => q.id));
  });
});

describe('completing a quest', () => {
  it('awards the stored XP, links it in the ledger and adds stat points', async () => {
    const user = await onboardedPlayer();
    const { daily } = await getTodayQuests(user.id, TUESDAY);
    const quest = daily.find((q) => q.category === 'FITNESS')!;

    const result = await completeQuest(user.id, quest.id, TUESDAY);

    expect(result.xpGained).toBe(quest.xpReward);
    expect(result.quest.status).toBe('COMPLETED');
    expect(result.quest.xpAwarded).toBe(quest.xpReward);
    const ledger = await prisma.xpTransaction.findUniqueOrThrow({ where: { questId: quest.id } });
    expect(ledger.amount).toBe(quest.xpReward);
    const stats = await prisma.playerStats.findUniqueOrThrow({ where: { userId: user.id } });
    expect(stats.strength).toBe(Math.floor(quest.xpReward / 10));
  });

  it('refuses to complete the same quest twice', async () => {
    const user = await onboardedPlayer();
    const [quest] = (await getTodayQuests(user.id, TUESDAY)).daily;

    await completeQuest(user.id, quest!.id, TUESDAY);

    await expect(completeQuest(user.id, quest!.id, TUESDAY)).rejects.toMatchObject({
      status: 409,
      code: 'QUEST_NOT_ACTIVE',
    });
    expect(await prisma.xpTransaction.count({ where: { userId: user.id } })).toBe(1);
  });

  it("cannot complete another player's quest", async () => {
    const owner = await onboardedPlayer();
    const intruder = await onboardedPlayer();
    const [quest] = (await getTodayQuests(owner.id, TUESDAY)).daily;

    await expect(completeQuest(intruder.id, quest!.id, TUESDAY)).rejects.toMatchObject({
      status: 404,
      code: 'QUEST_NOT_FOUND',
    });
  });

  it("cannot complete yesterday's quest", async () => {
    const user = await onboardedPlayer();
    const [quest] = (await getTodayQuests(user.id, TUESDAY)).daily;

    await expect(completeQuest(user.id, quest!.id, daysLater(1))).rejects.toMatchObject({
      code: 'QUEST_NOT_ACTIVE',
    });
  });

  it('adds the streak bonus', async () => {
    const user = await onboardedPlayer();
    await prisma.user.update({ where: { id: user.id }, data: { currentStreak: 14 } });
    const [quest] = (await getTodayQuests(user.id, TUESDAY)).daily;

    const result = await completeQuest(user.id, quest!.id, TUESDAY);

    expect(result.xpGained).toBe(Math.floor(quest!.xpReward * 1.1)); // 14 days = +10%
  });

  it('counts toward the skill level of the category', async () => {
    const user = await onboardedPlayer();
    const quest = (await getTodayQuests(user.id, TUESDAY)).daily.find(
      (q) => q.category === 'FITNESS',
    )!;

    await completeQuest(user.id, quest.id, TUESDAY);

    const area = await prisma.focusArea.findUniqueOrThrow({
      where: { userId_category: { userId: user.id, category: 'FITNESS' } },
    });
    expect(area.completedCount).toBe(1);
  });

  it('answers 404 for an id that is not a UUID', async () => {
    const agent = request.agent(createApp());
    await agent
      .post('/api/auth/register')
      .send({ username: 'api_player', email: 'api@example.com', password: 'secret123' });
    await agent.post('/api/onboarding').send(defaultChoices);

    const res = await agent.post('/api/quests/not-a-uuid/complete');

    expect(res.status).toBe(404);
  });
});

describe('daily rollover', () => {
  it('fails unfinished quests, logs the day and generates new quests', async () => {
    const user = await onboardedPlayer();
    const tuesday = await getTodayQuests(user.id, TUESDAY);

    const wednesday = await getTodayQuests(user.id, daysLater(1));

    expect(wednesday.date).toBe('2026-11-25');
    expect(wednesday.daily.length).toBeGreaterThan(0);
    expect(wednesday.daily.every((q) => q.status === 'ACTIVE')).toBe(true);
    const old = await prisma.quest.findMany({
      where: { id: { in: tuesday.daily.map((q) => q.id) } },
    });
    expect(old.every((q) => q.status === 'FAILED')).toBe(true);
    const log = await prisma.dailyLog.findFirstOrThrow({ where: { userId: user.id } });
    expect(log).toMatchObject({ questsCompleted: 0, allCompleted: false });
    expect(log.questsTotal).toBe(tuesday.daily.length);
  });

  it('keeps the weekly quests for the whole week', async () => {
    const user = await onboardedPlayer();
    const tuesday = await getTodayQuests(user.id, TUESDAY);

    const saturday = await getTodayQuests(user.id, daysLater(4));

    expect(saturday.weekly.map((q) => q.id)).toEqual(tuesday.weekly.map((q) => q.id));
  });

  it('gives new weekly quests on Monday and fails the old ones', async () => {
    const user = await onboardedPlayer();
    const tuesday = await getTodayQuests(user.id, TUESDAY);

    const nextMonday = await getTodayQuests(user.id, daysLater(6));

    expect(nextMonday.weekly.length).toBe(2);
    expect(nextMonday.weekly.map((q) => q.id)).not.toContain(tuesday.weekly[0]!.id);
    const old = await prisma.quest.findUniqueOrThrow({ where: { id: tuesday.weekly[0]!.id } });
    expect(old.status).toBe('FAILED');
  });

  it('grows the streak and consistency after a perfect day', async () => {
    const user = await onboardedPlayer();
    const { daily } = await getTodayQuests(user.id, TUESDAY);
    await completeAll(user.id, daily, TUESDAY);

    await getTodayQuests(user.id, daysLater(1));

    const saved = await prisma.user.findUniqueOrThrow({
      where: { id: user.id },
      include: { stats: true },
    });
    expect(saved.currentStreak).toBe(1);
    expect(saved.bestStreak).toBe(1);
    expect(saved.stats!.consistency).toBe(1);
  });

  it('breaks the streak after a missed day and gives a penalty quest that restores it', async () => {
    const user = await onboardedPlayer();
    await prisma.user.update({ where: { id: user.id }, data: { currentStreak: 5, bestStreak: 5 } });

    const wednesday = await getTodayQuests(user.id, daysLater(1));

    expect(wednesday.penalty).toHaveLength(1);
    const broken = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
    expect(broken).toMatchObject({ currentStreak: 0, streakBeforePenalty: 5 });

    const result = await completeQuest(user.id, wednesday.penalty[0]!.id, daysLater(1));

    expect(result.xpGained).toBe(25);
    expect(result.streakRestored).toBe(true);
    expect(result.streak).toBe(5);
  });

  it('gives no penalty quest when there was no streak to save', async () => {
    const user = await onboardedPlayer();

    const wednesday = await getTodayQuests(user.id, daysLater(1));

    expect(wednesday.penalty).toEqual([]);
  });

  it('loses the streak for good after several days away', async () => {
    const user = await onboardedPlayer();
    await prisma.user.update({ where: { id: user.id }, data: { currentStreak: 9, bestStreak: 9 } });

    const later = await getTodayQuests(user.id, daysLater(5));

    expect(later.penalty).toEqual([]);
    const saved = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
    expect(saved).toMatchObject({ currentStreak: 0, bestStreak: 9, streakBeforePenalty: null });
    expect(await prisma.dailyLog.count({ where: { userId: user.id } })).toBe(5);
  });

  it('runs only once when several requests arrive at the same time', async () => {
    const user = await onboardedPlayer();
    const wednesday = daysLater(1);

    await Promise.all(Array.from({ length: 5 }, () => getTodayQuests(user.id, wednesday)));

    const once = await getTodayQuests(user.id, wednesday);
    const created = await prisma.quest.count({
      where: { userId: user.id, type: 'DAILY', questDate: new Date('2026-11-25T00:00:00Z') },
    });
    expect(created).toBe(once.daily.length);
    expect(await prisma.dailyLog.count({ where: { userId: user.id } })).toBe(1);
  });

  it("uses the player's own time zone", async () => {
    // 10:00 UTC on Tuesday is already 23:00 in Auckland (UTC+13)
    const user = await onboardedPlayer(defaultChoices, 'Pacific/Auckland');

    const today = await getTodayQuests(user.id, TUESDAY);
    const twoHoursLater = await getTodayQuests(user.id, new Date('2026-11-24T12:00:00Z'));

    expect(today.date).toBe('2026-11-24');
    expect(twoHoursLater.date).toBe('2026-11-25'); // past midnight in Auckland
  });
});

describe('syncing a quest completed offline', () => {
  // Tuesday 23:50 UTC, synced Wednesday 00:30 UTC
  const lateTuesday = new Date('2026-11-24T23:50:00Z');
  const earlyWednesday = new Date('2026-11-25T00:30:00Z');

  it('counts for the day it was done, so the streak survives the night', async () => {
    const user = await onboardedPlayer();
    const { daily } = await getTodayQuests(user.id, TUESDAY);

    for (const quest of daily) {
      await completeQuest(user.id, quest.id, earlyWednesday, lateTuesday);
    }
    // After the queue, the app refreshes: this closes Tuesday and opens Wednesday
    expect((await getTodayQuests(user.id, earlyWednesday)).date).toBe('2026-11-25');

    const log = await prisma.dailyLog.findUniqueOrThrow({
      where: { userId_date: { userId: user.id, date: new Date('2026-11-24T00:00:00Z') } },
    });
    expect(log.allCompleted).toBe(true);
    const saved = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
    expect(saved.currentStreak).toBe(1);
    // The XP lands on Tuesday in the history chart
    const ledger = await prisma.xpTransaction.findMany({ where: { userId: user.id } });
    expect(ledger.every((row) => row.createdAt.getTime() === lateTuesday.getTime())).toBe(true);
  });

  it('refuses a completion time after the quest expired', async () => {
    const user = await onboardedPlayer();
    const { daily } = await getTodayQuests(user.id, TUESDAY);

    await expect(
      completeQuest(user.id, daily[0]!.id, earlyWednesday, new Date('2026-11-25T00:10:00Z')),
    ).rejects.toMatchObject({ status: 409, code: 'QUEST_NOT_ACTIVE' });
  });

  it('refuses a quest already closed by an earlier visit after midnight', async () => {
    const user = await onboardedPlayer();
    const { daily } = await getTodayQuests(user.id, TUESDAY);
    await getTodayQuests(user.id, earlyWednesday); // another device closed Tuesday first

    await expect(
      completeQuest(user.id, daily[0]!.id, earlyWednesday, lateTuesday),
    ).rejects.toMatchObject({ code: 'QUEST_NOT_ACTIVE' });
  });

  it('uses the server time when the device clock is ahead', async () => {
    const user = await onboardedPlayer();
    const { daily } = await getTodayQuests(user.id, TUESDAY);

    const result = await completeQuest(user.id, daily[0]!.id, TUESDAY, daysLater(2));

    const saved = await prisma.quest.findUniqueOrThrow({ where: { id: result.quest.id } });
    expect(saved.completedAt).toEqual(TUESDAY);
  });

  it('validates completedAt over HTTP and refuses actions older than a week', async () => {
    const agent = request.agent(createApp());
    await agent
      .post('/api/auth/register')
      .send({ username: 'offline_player', email: 'off@example.com', password: 'secret123' });
    await agent.post('/api/onboarding').send(defaultChoices);
    const { daily } = (await agent.get('/api/quests/today')).body;

    const invalid = await agent
      .post(`/api/quests/${daily[0].id}/complete`)
      .send({ completedAt: 'yesterday' });
    expect(invalid.body.error.details).toEqual({ completedAt: 'COMPLETED_AT_INVALID' });

    const tooOld = await agent
      .post(`/api/quests/${daily[0].id}/complete`)
      .send({ completedAt: new Date(Date.now() - 8 * 86_400_000).toISOString() });
    expect(tooOld.status).toBe(400);

    const ok = await agent
      .post(`/api/quests/${daily[0].id}/complete`)
      .send({ completedAt: new Date(Date.now() - 1000).toISOString() });
    expect(ok.status).toBe(200);
  });
});

describe('rerolling a quest', () => {
  it('replaces a daily quest with another one of the same category', async () => {
    const user = await onboardedPlayer();
    const quest = (await getTodayQuests(user.id, TUESDAY)).daily.find((q) => q.rerollable)!;

    const result = await rerollQuest(user.id, quest.id, TUESDAY);

    expect(result.rerollsLeft).toBe(2);
    expect(result.quest.category).toBe(quest.category);
    expect(result.quest.title).not.toEqual(quest.title);
    const today = await getTodayQuests(user.id, TUESDAY);
    expect(today.daily.map((q) => q.id)).not.toContain(quest.id);
    expect(today.daily.map((q) => q.id)).toContain(result.quest.id);
  });

  it('refuses after 3 rerolls and gives them back the next day', async () => {
    const user = await onboardedPlayer();
    await prisma.user.update({ where: { id: user.id }, data: { rerollsUsed: 3 } });
    const quest = (await getTodayQuests(user.id, TUESDAY)).daily.find((q) => q.rerollable)!;

    await expect(rerollQuest(user.id, quest.id, TUESDAY)).rejects.toMatchObject({
      code: 'NO_REROLLS_LEFT',
    });
    expect((await getTodayQuests(user.id, daysLater(1))).rerollsLeft).toBe(3);
  });

  it('refuses when every other quest of the category is already in the list', async () => {
    // Only fitness and 240 minutes: the plan takes all 3 beginner fitness templates
    const user = await onboardedPlayer({
      ...defaultChoices,
      focusAreas: [{ category: 'FITNESS', level: 'BEGINNER' }],
      dailyMinutes: 240,
    });
    const fitness = (await getTodayQuests(user.id, TUESDAY)).daily.filter((q) => q.rerollable);
    expect(fitness).toHaveLength(3);

    await expect(rerollQuest(user.id, fitness[0]!.id, TUESDAY)).rejects.toMatchObject({
      code: 'NO_REROLL_AVAILABLE',
    });
    // A failed reroll does not use up a reroll
    expect((await getTodayQuests(user.id, TUESDAY)).rerollsLeft).toBe(3);
  });

  it('cannot reroll the starter quest or a completed quest', async () => {
    const user = await onboardedPlayer();
    const { daily } = await getTodayQuests(user.id, TUESDAY);
    const starter = daily.find((q) => !q.rerollable)!;
    const other = daily.find((q) => q.rerollable)!;
    await completeQuest(user.id, other.id, TUESDAY);

    for (const quest of [starter, other]) {
      await expect(rerollQuest(user.id, quest.id, TUESDAY)).rejects.toMatchObject({
        code: 'QUEST_NOT_REROLLABLE',
      });
    }
  });
});
