import request from 'supertest';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../../src/app.js';
import { prisma } from '../../src/lib/prisma.js';
import {
  checkAchievements,
  listAchievements,
  listEarnedTitles,
  setActiveTitle,
} from '../../src/modules/achievements/achievement.service.js';
import {
  listNotifications,
  markAllRead,
  markRead,
} from '../../src/modules/notifications/notification.service.js';
import { completeOnboarding } from '../../src/modules/onboarding/onboarding.service.js';
import { createCustomQuest } from '../../src/modules/quests/customQuest.service.js';
import { completeQuest, getTodayQuests } from '../../src/modules/quests/quest.service.js';
import { getDashboard } from '../../src/modules/dashboard/dashboard.service.js';
import { resetDatabase } from '../helpers/database.js';
import { createTestUser } from '../helpers/users.js';

const TUESDAY = new Date('2026-11-24T10:00:00Z');
const daysLater = (days: number) => new Date(TUESDAY.getTime() + days * 86_400_000);

async function onboardedPlayer(timezone = 'UTC') {
  const user = await createTestUser({ timezone });
  await completeOnboarding(
    user.id,
    {
      focusAreas: [{ category: 'READING', level: 'BEGINNER' }],
      dailyMinutes: 15,
      avatarKey: 'sigil-1',
    },
    TUESDAY,
  );
  return user;
}

async function unlockedCodes(userId: string) {
  const rows = await prisma.userAchievement.findMany({ where: { userId } });
  return rows.map((r) => r.achievementCode).sort();
}

beforeEach(async () => {
  await resetDatabase();
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe('unlocking achievements', () => {
  it('unlocks "First step" with the first quest, once, and notifies the player', async () => {
    const user = await onboardedPlayer();
    const [first, second] = (await getTodayQuests(user.id, TUESDAY)).daily;

    const result = await completeQuest(user.id, first!.id, TUESDAY);
    const again = await completeQuest(user.id, second!.id, TUESDAY);

    expect(result.achievements).toEqual([{ code: 'FIRST_STEP', title: null }]);
    expect(again.achievements).toEqual([]);
    expect(await unlockedCodes(user.id)).toEqual(['FIRST_STEP']);
    const { notifications } = await listNotifications(user.id, false);
    expect(notifications).toMatchObject([
      { type: 'ACHIEVEMENT_UNLOCKED', data: { code: 'FIRST_STEP' }, read: false },
    ]);
  });

  it('grants the title of an achievement (Awakened at level 5)', async () => {
    const user = await onboardedPlayer();
    await prisma.user.update({ where: { id: user.id }, data: { totalXp: 500, level: 4 } });
    const [quest] = (await getTodayQuests(user.id, TUESDAY)).daily;

    const result = await completeQuest(user.id, quest!.id, TUESDAY);

    const awakened = result.achievements.find((a) => a.code === 'AWAKENED');
    expect(awakened?.title).toMatchObject({
      key: 'the_awakened',
      rarity: 'COMMON',
      name: { en: 'The Awakened', fr: "L'Éveillé", ar: 'المستيقظ' },
    });
    const { titles } = await listEarnedTitles(user.id);
    expect(titles.map((t) => t.key)).toEqual(['the_awakened']);
  });

  it('does not count custom quests', async () => {
    const user = await onboardedPlayer();
    const custom = await createCustomQuest(
      user.id,
      { title: 'My own quest', category: 'READING', difficulty: 'EASY' },
      TUESDAY,
    );

    const result = await completeQuest(user.id, custom.id, TUESDAY);

    expect(result.achievements).toEqual([]);
  });

  it('unlocks the 7-day streak achievement during the daily rollover', async () => {
    const user = await onboardedPlayer();
    await prisma.user.update({ where: { id: user.id }, data: { currentStreak: 6, bestStreak: 6 } });
    for (const quest of (await getTodayQuests(user.id, TUESDAY)).daily) {
      await completeQuest(user.id, quest.id, TUESDAY);
    }

    await getTodayQuests(user.id, daysLater(1));

    expect(await unlockedCodes(user.id)).toContain('STREAK_7');
  });

  it('notifies a penalty quest, and unlocks "Redemption" when it is completed', async () => {
    const user = await onboardedPlayer();
    await prisma.user.update({ where: { id: user.id }, data: { currentStreak: 5, bestStreak: 5 } });

    const wednesday = await getTodayQuests(user.id, daysLater(1));
    const { notifications } = await listNotifications(user.id, false);
    expect(notifications.map((n) => n.type)).toContain('PENALTY_QUEST');

    const result = await completeQuest(user.id, wednesday.penalty[0]!.id, daysLater(1));
    expect(result.achievements.map((a) => a.code)).toContain('REDEMPTION');
  });

  it('notifies a rank-up', async () => {
    const user = await onboardedPlayer();
    // 210 XP: level 2, rank E IV. Any quest (≥ 20 XP) reaches level 3, rank E III.
    await prisma.user.update({ where: { id: user.id }, data: { totalXp: 210, level: 2 } });
    const [quest] = (await getTodayQuests(user.id, TUESDAY)).daily;

    await completeQuest(user.id, quest!.id, TUESDAY);

    const { notifications } = await listNotifications(user.id, false);
    expect(notifications).toContainEqual(
      expect.objectContaining({ type: 'RANK_UP', data: { rank: 'E3' } }),
    );
  });

  it("counts Early Riser quests in the player's own time zone", async () => {
    // Tokyo is UTC+9: 22:30 UTC is 07:30 there (counts), 23:30 UTC is 08:30 (does not)
    const user = await onboardedPlayer('Asia/Tokyo');
    const completedQuest = (hourUtc: number) => ({
      userId: user.id,
      source: 'SYSTEM' as const,
      type: 'DAILY' as const,
      category: 'READING' as const,
      difficulty: 'EASY' as const,
      xpReward: 20,
      status: 'COMPLETED' as const,
      questDate: new Date('2026-11-01T00:00:00Z'),
      dueAt: new Date('2026-11-02T00:00:00Z'),
      completedAt: new Date(`2026-11-01T${hourUtc}:30:00Z`),
    });
    await prisma.quest.createMany({ data: Array.from({ length: 19 }, () => completedQuest(22)) });
    await prisma.quest.create({ data: completedQuest(23) });

    const notYet = await prisma.$transaction((tx) => checkAchievements(tx, user.id));
    await prisma.quest.create({ data: completedQuest(22) });
    const now = await prisma.$transaction((tx) => checkAchievements(tx, user.id));

    expect(notYet.map((a) => a.code)).not.toContain('EARLY_RISER');
    expect(now.map((a) => a.code)).toContain('EARLY_RISER');
  });
});

describe('achievement list', () => {
  it('lists all 14 achievements, with an unlock date only for unlocked ones', async () => {
    const user = await onboardedPlayer();
    const [quest] = (await getTodayQuests(user.id, TUESDAY)).daily;
    await completeQuest(user.id, quest!.id, TUESDAY);

    const achievements = await listAchievements(user.id);

    expect(achievements).toHaveLength(14);
    const unlocked = achievements.filter((a) => a.unlockedAt !== null).map((a) => a.code);
    expect(unlocked).toEqual(['FIRST_STEP']);
    expect(achievements.find((a) => a.code === 'STREAK_30')?.title?.key).toBe('iron_will');
  });
});

describe('active title', () => {
  it('can only be a title the player earned', async () => {
    const user = await onboardedPlayer();
    const ironWill = await prisma.title.findUniqueOrThrow({ where: { key: 'iron_will' } });

    await expect(setActiveTitle(user.id, ironWill.id)).rejects.toMatchObject({
      status: 403,
      code: 'TITLE_NOT_EARNED',
    });

    await prisma.userTitle.create({ data: { userId: user.id, titleId: ironWill.id } });
    await setActiveTitle(user.id, ironWill.id);

    const dashboard = await getDashboard(user.id, TUESDAY);
    expect(dashboard.activeTitle).toMatchObject({ key: 'iron_will', rarity: 'EPIC' });

    await setActiveTitle(user.id, null);
    expect((await getDashboard(user.id, TUESDAY)).activeTitle).toBeNull();
  });
});

describe('notifications', () => {
  it('marks one or all as read, and only the player own ones', async () => {
    const user = await onboardedPlayer();
    const other = await onboardedPlayer();
    await prisma.notification.createMany({
      data: [
        { userId: user.id, type: 'RANK_UP', data: { rank: 'E3' } },
        { userId: user.id, type: 'RANK_UP', data: { rank: 'E2' } },
      ],
    });
    const { notifications, unreadCount } = await listNotifications(user.id, false);
    expect(unreadCount).toBe(2);

    await expect(markRead(other.id, notifications[0]!.id)).rejects.toMatchObject({
      code: 'NOTIFICATION_NOT_FOUND',
    });
    await markRead(user.id, notifications[0]!.id);
    expect((await listNotifications(user.id, true)).notifications).toHaveLength(1);

    await markAllRead(user.id);
    expect((await listNotifications(user.id, false)).unreadCount).toBe(0);
  });

  it('are served by the API', async () => {
    const agent = request.agent(createApp());
    expect((await agent.get('/api/notifications')).status).toBe(401);
    await agent
      .post('/api/auth/register')
      .send({ username: 'notif_player', email: 'notif@example.com', password: 'secret123' });

    const res = await agent.get('/api/notifications?unread=true');
    const badId = await agent.post('/api/notifications/abc/read');
    const titles = await agent.get('/api/me/titles');
    const notEarned = await agent.put('/api/me/active-title').send({ titleId: 'abc' });

    expect(res.body).toEqual({ notifications: [], unreadCount: 0 });
    expect(badId.status).toBe(404);
    expect(titles.body).toEqual({ titles: [], activeTitleId: null });
    expect(notEarned.status).toBe(400);
  });
});
