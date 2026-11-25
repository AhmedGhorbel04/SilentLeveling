import request from 'supertest';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../../src/app.js';
import { prisma } from '../../src/lib/prisma.js';
import { completeOnboarding } from '../../src/modules/onboarding/onboarding.service.js';
import {
  createCustomQuest,
  deleteCustomQuest,
  updateCustomQuest,
} from '../../src/modules/quests/customQuest.service.js';
import {
  createCustomQuestSchema,
  type CreateCustomQuestInput,
} from '../../src/modules/quests/customQuest.schemas.js';
import { levelFromTotalXp } from '../../src/game/index.js';
import { completeQuest, getTodayQuests } from '../../src/modules/quests/quest.service.js';
import { getDashboard } from '../../src/modules/dashboard/dashboard.service.js';
import { resetDatabase } from '../helpers/database.js';
import { createTestUser } from '../helpers/users.js';

const TUESDAY = new Date('2026-11-24T10:00:00Z');
const daysLater = (days: number) => new Date(TUESDAY.getTime() + days * 86_400_000);

async function onboardedPlayer() {
  const user = await createTestUser();
  await completeOnboarding(
    user.id,
    {
      focusAreas: [{ category: 'READING', level: 'BEGINNER' }],
      dailyMinutes: 30,
      avatarKey: 'sigil-2',
    },
    TUESDAY,
  );
  return user;
}

const hardQuest: CreateCustomQuestInput = {
  title: 'Finish the project report',
  category: 'CAREER',
  difficulty: 'HARD',
};

beforeEach(async () => {
  await resetDatabase();
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe('creating custom quests', () => {
  it('calculates the XP from the difficulty and is due at the end of today by default', async () => {
    const user = await onboardedPlayer();

    const quest = await createCustomQuest(user.id, hardQuest, TUESDAY);

    expect(quest).toMatchObject({
      source: 'CUSTOM',
      type: 'ONE_TIME',
      difficulty: 'HARD',
      xpReward: 80,
      title: { en: 'Finish the project report' },
      rerollable: false,
    });
    expect(quest.dueAt.toISOString()).toBe('2026-11-25T00:00:00.000Z');
  });

  it('accepts a due date up to 30 days ahead, not more and not in the past', async () => {
    const user = await onboardedPlayer();

    const later = await createCustomQuest(
      user.id,
      { ...hardQuest, dueDate: '2026-12-24' },
      TUESDAY,
    );
    expect(later.dueAt.toISOString()).toBe('2026-12-25T00:00:00.000Z');

    for (const dueDate of ['2026-12-25', '2026-11-23']) {
      await expect(
        createCustomQuest(user.id, { ...hardQuest, dueDate }, TUESDAY),
      ).rejects.toMatchObject({ details: { dueDate: 'DUE_DATE_OUT_OF_RANGE' } });
    }
  });

  it('refuses Extreme difficulty and sent XP values through the API', async () => {
    const agent = request.agent(createApp());
    await agent
      .post('/api/auth/register')
      .send({ username: 'api_player', email: 'api@example.com', password: 'secret123' });
    await agent.post('/api/onboarding').send({
      focusAreas: [{ category: 'READING', level: 'BEGINNER' }],
      dailyMinutes: 30,
      avatarKey: 'sigil-1',
    });

    const extreme = await agent.post('/api/quests').send({ ...hardQuest, difficulty: 'EXTREME' });
    const withXp = await agent.post('/api/quests').send({ ...hardQuest, xpReward: 99999 });

    expect(extreme.status).toBe(400);
    expect(extreme.body.error.details.difficulty).toBe('DIFFICULTY_INVALID');
    expect(withXp.status).toBe(201);
    expect(withXp.body.quest.xpReward).toBe(80); // the sent value is ignored
  });

  it('validates the title and stores an empty description as null', () => {
    const tooShort = createCustomQuestSchema.safeParse({ ...hardQuest, title: '  ab  ' });
    const blankDescription = createCustomQuestSchema.parse({ ...hardQuest, description: '   ' });

    expect(tooShort.error?.issues[0]?.message).toBe('TITLE_TOO_SHORT');
    expect(blankDescription.description).toBeNull();
  });

  it('limits a player to 20 active custom quests', async () => {
    const user = await onboardedPlayer();
    for (let i = 0; i < 20; i++) await createCustomQuest(user.id, hardQuest, TUESDAY);

    await expect(createCustomQuest(user.id, hardQuest, TUESDAY)).rejects.toMatchObject({
      code: 'TOO_MANY_CUSTOM_QUESTS',
    });
  });
});

describe('creating a custom quest offline', () => {
  const offlineId = '7a1f3c2e-4b5d-4e6f-8a9b-0c1d2e3f4a5b';

  it('creates it once even if the sync sends it twice', async () => {
    const user = await onboardedPlayer();

    const first = await createCustomQuest(user.id, { ...hardQuest, id: offlineId }, TUESDAY);
    const again = await createCustomQuest(user.id, { ...hardQuest, id: offlineId }, TUESDAY);

    expect(first.id).toBe(offlineId);
    expect(again.id).toBe(offlineId);
    expect(await prisma.quest.count({ where: { userId: user.id, source: 'CUSTOM' } })).toBe(1);
  });

  it("refuses an id that belongs to another player's quest", async () => {
    const owner = await onboardedPlayer();
    const other = await onboardedPlayer();
    await createCustomQuest(owner.id, { ...hardQuest, id: offlineId }, TUESDAY);

    await expect(
      createCustomQuest(other.id, { ...hardQuest, id: offlineId }, TUESDAY),
    ).rejects.toMatchObject({ status: 409, code: 'QUEST_ID_TAKEN' });
  });
});

describe('the custom quest daily XP cap (150 XP)', () => {
  it('gives full XP, then what is left of the cap, then nothing', async () => {
    const user = await onboardedPlayer();
    const quests = [];
    for (let i = 0; i < 3; i++) quests.push(await createCustomQuest(user.id, hardQuest, TUESDAY));

    const first = await completeQuest(user.id, quests[0]!.id, TUESDAY);
    const second = await completeQuest(user.id, quests[1]!.id, TUESDAY);
    const third = await completeQuest(user.id, quests[2]!.id, TUESDAY);

    expect([first.xpGained, second.xpGained, third.xpGained]).toEqual([80, 70, 0]);
    expect(third.quest.status).toBe('COMPLETED'); // still completed, just no XP
    expect((await getTodayQuests(user.id, TUESDAY)).customXpRemaining).toBe(0);
  });

  it('does not limit system quests', async () => {
    const user = await onboardedPlayer();
    const custom = await createCustomQuest(user.id, hardQuest, TUESDAY);
    await completeQuest(user.id, custom.id, TUESDAY);
    await completeQuest(
      user.id,
      (await createCustomQuest(user.id, hardQuest, TUESDAY)).id,
      TUESDAY,
    );

    const [system] = (await getTodayQuests(user.id, TUESDAY)).daily;
    const result = await completeQuest(user.id, system!.id, TUESDAY);

    expect(result.xpGained).toBe(system!.xpReward);
  });

  it('starts again the next day', async () => {
    const user = await onboardedPlayer();
    const due = { ...hardQuest, dueDate: '2026-11-26' };
    const quests = [];
    for (let i = 0; i < 3; i++) quests.push(await createCustomQuest(user.id, due, TUESDAY));
    await completeQuest(user.id, quests[0]!.id, TUESDAY);
    await completeQuest(user.id, quests[1]!.id, TUESDAY);

    const nextDay = await completeQuest(user.id, quests[2]!.id, daysLater(1));

    expect(nextDay.xpGained).toBe(80);
  });
});

describe('editing and deleting custom quests', () => {
  it('recalculates the XP when the difficulty changes', async () => {
    const user = await onboardedPlayer();
    const quest = await createCustomQuest(user.id, hardQuest, TUESDAY);

    const updated = await updateCustomQuest(
      user.id,
      quest.id,
      { difficulty: 'EASY', title: 'Shorter report' },
      TUESDAY,
    );

    expect(updated).toMatchObject({ xpReward: 20, title: { en: 'Shorter report' } });
  });

  it('cannot change or delete a completed quest', async () => {
    const user = await onboardedPlayer();
    const quest = await createCustomQuest(user.id, hardQuest, TUESDAY);
    await completeQuest(user.id, quest.id, TUESDAY);

    await expect(
      updateCustomQuest(user.id, quest.id, { difficulty: 'HARD' }, TUESDAY),
    ).rejects.toMatchObject({ code: 'QUEST_NOT_ACTIVE' });
    await expect(deleteCustomQuest(user.id, quest.id, TUESDAY)).rejects.toMatchObject({
      code: 'QUEST_NOT_ACTIVE',
    });
  });

  it("cannot touch another player's quest or a system quest", async () => {
    const owner = await onboardedPlayer();
    const other = await onboardedPlayer();
    const quest = await createCustomQuest(owner.id, hardQuest, TUESDAY);
    const [system] = (await getTodayQuests(owner.id, TUESDAY)).daily;

    await expect(deleteCustomQuest(other.id, quest.id, TUESDAY)).rejects.toMatchObject({
      code: 'QUEST_NOT_FOUND',
    });
    await expect(
      updateCustomQuest(owner.id, system!.id, { difficulty: 'EASY' }, TUESDAY),
    ).rejects.toMatchObject({ code: 'QUEST_NOT_FOUND' });
  });

  it('deletes an active quest', async () => {
    const user = await onboardedPlayer();
    const quest = await createCustomQuest(user.id, hardQuest, TUESDAY);

    await deleteCustomQuest(user.id, quest.id, TUESDAY);

    expect(await prisma.quest.findUnique({ where: { id: quest.id } })).toBeNull();
  });
});

describe('custom quests in the day', () => {
  it("appear in today's list, soonest deadline first", async () => {
    const user = await onboardedPlayer();
    await createCustomQuest(
      user.id,
      { ...hardQuest, title: 'Later', dueDate: '2026-11-30' },
      TUESDAY,
    );
    await createCustomQuest(user.id, { ...hardQuest, title: 'Today' }, TUESDAY);

    const today = await getTodayQuests(user.id, TUESDAY);

    expect(today.custom.map((q) => q.title.en)).toEqual(['Today', 'Later']);
    expect(today.customXpRemaining).toBe(150);
  });

  it('expire after their due date', async () => {
    const user = await onboardedPlayer();
    const quest = await createCustomQuest(user.id, hardQuest, TUESDAY);

    const tomorrow = await getTodayQuests(user.id, daysLater(1));

    expect(tomorrow.custom).toEqual([]);
    const saved = await prisma.quest.findUniqueOrThrow({ where: { id: quest.id } });
    expect(saved.status).toBe('FAILED');
  });

  it('do not count for the streak (only system daily quests do)', async () => {
    const user = await onboardedPlayer();
    await createCustomQuest(user.id, hardQuest, TUESDAY); // left unfinished
    const { daily } = await getTodayQuests(user.id, TUESDAY);
    for (const quest of daily) await completeQuest(user.id, quest.id, TUESDAY);

    await getTodayQuests(user.id, daysLater(1));

    const saved = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
    expect(saved.currentStreak).toBe(1);
  });
});

describe('GET /api/me/dashboard', () => {
  it('gives the status window data', async () => {
    const user = await onboardedPlayer();
    const { daily } = await getTodayQuests(user.id, TUESDAY);
    for (const quest of daily) await completeQuest(user.id, quest.id, TUESDAY);

    const dashboard = await getDashboard(user.id, daysLater(1));

    expect(dashboard).toMatchObject({
      avatarKey: 'sigil-2',
      rank: { code: 'E4', label: 'E IV' },
      nextRank: { code: 'E3', label: 'E III', minLevel: 3 },
      rankLockedBy: null,
      streak: { current: 1, best: 1 },
      disciplineRate: 100,
      customXp: { earnedToday: 0, dailyCap: 150 },
    });
    expect(dashboard.totalXp).toBeGreaterThan(0);
    expect(dashboard.progress.level).toBe(levelFromTotalXp(dashboard.totalXp));
    expect(dashboard.stats.intelligence + dashboard.stats.discipline).toBeGreaterThan(0);
    expect(dashboard.stats.consistency).toBe(1);
  });

  it('shows a null discipline rate for a brand new player', async () => {
    const user = await onboardedPlayer();

    expect((await getDashboard(user.id, TUESDAY)).disciplineRate).toBeNull();
  });

  it('explains what is missing when the rank is locked', async () => {
    const user = await onboardedPlayer();
    await prisma.user.update({
      where: { id: user.id },
      data: { totalXp: 50_000, level: 40, rank: 'C1' },
    });

    const dashboard = await getDashboard(user.id, TUESDAY);

    expect(dashboard.rank.code).toBe('C1');
    expect(dashboard.rankLockedBy).toEqual({ legendary: 1, mythic: 0 });
  });

  it('requires a login', async () => {
    const res = await request(createApp()).get('/api/me/dashboard');

    expect(res.status).toBe(401);
  });
});
