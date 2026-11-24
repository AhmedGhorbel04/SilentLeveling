import request from 'supertest';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../../src/app.js';
import { prisma } from '../../src/lib/prisma.js';
import {
  addMilestone,
  createGoal,
  deleteGoal,
  deleteMilestone,
  listGoals,
  updateGoal,
  updateMilestone,
} from '../../src/modules/goals/goal.service.js';
import { completeOnboarding } from '../../src/modules/onboarding/onboarding.service.js';
import {
  createCustomQuest,
  updateCustomQuest,
} from '../../src/modules/quests/customQuest.service.js';
import { resetDatabase } from '../helpers/database.js';
import { createTestUser } from '../helpers/users.js';

const internship = {
  title: 'Get a Java internship',
  category: 'CAREER' as const,
  milestones: ['Update my CV', 'Build a Spring Boot project', 'Apply to 10 companies'],
};

const TUESDAY = new Date('2026-11-24T10:00:00Z');

beforeEach(async () => {
  await resetDatabase();
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe('creating goals', () => {
  it('creates a goal with its milestones in order and 0% progress', async () => {
    const user = await createTestUser();

    const goal = await createGoal(user.id, { ...internship, targetDate: '2027-06-30' });

    expect(goal).toMatchObject({
      title: 'Get a Java internship',
      category: 'CAREER',
      status: 'ACTIVE',
      targetDate: '2027-06-30',
      progress: { completed: 0, total: 3, percent: 0 },
    });
    expect(goal.milestones.map((m) => [m.position, m.title])).toEqual([
      [0, 'Update my CV'],
      [1, 'Build a Spring Boot project'],
      [2, 'Apply to 10 companies'],
    ]);
  });

  it('validates the input through the API', async () => {
    const agent = request.agent(createApp());
    await agent
      .post('/api/auth/register')
      .send({ username: 'goal_player', email: 'goal@example.com', password: 'secret123' });

    const res = await agent.post('/api/goals').send({
      title: 'ab',
      category: 'COOKING',
      targetDate: '30/06/2027',
      milestones: Array.from({ length: 21 }, (_, i) => `Step ${i}`),
    });

    expect(res.status).toBe(400);
    expect(res.body.error.details).toEqual({
      title: 'TITLE_TOO_SHORT',
      category: 'CATEGORY_INVALID',
      targetDate: 'TARGET_DATE_INVALID',
      milestones: 'TOO_MANY_MILESTONES',
    });
  });

  it('limits a player to 10 active goals', async () => {
    const user = await createTestUser();
    for (let i = 0; i < 10; i++) await createGoal(user.id, { ...internship, milestones: [] });

    await expect(createGoal(user.id, { ...internship, milestones: [] })).rejects.toMatchObject({
      code: 'TOO_MANY_GOALS',
    });
  });
});

describe('progress and milestones', () => {
  it('computes progress from completed milestones', async () => {
    const user = await createTestUser();
    const goal = await createGoal(user.id, internship);

    const after = await updateMilestone(user.id, goal.milestones[0]!.id, { completed: true });

    expect(after.progress).toEqual({ completed: 1, total: 3, percent: 33 });
    expect(after.milestones[0]!.completed).toBe(true);
  });

  it('can un-complete a milestone', async () => {
    const user = await createTestUser();
    const goal = await createGoal(user.id, internship);
    await updateMilestone(user.id, goal.milestones[0]!.id, { completed: true });

    const after = await updateMilestone(user.id, goal.milestones[0]!.id, { completed: false });

    expect(after.progress.completed).toBe(0);
  });

  it('adds a milestone at the end', async () => {
    const user = await createTestUser();
    const goal = await createGoal(user.id, internship);

    const after = await addMilestone(user.id, goal.id, 'Prepare for interviews');

    expect(after.milestones.at(-1)).toMatchObject({ title: 'Prepare for interviews', position: 3 });
  });

  it('moves a milestone and renumbers the others', async () => {
    const user = await createTestUser();
    const goal = await createGoal(user.id, internship);

    const after = await updateMilestone(user.id, goal.milestones[2]!.id, { position: 0 });

    expect(after.milestones.map((m) => m.title)).toEqual([
      'Apply to 10 companies',
      'Update my CV',
      'Build a Spring Boot project',
    ]);
    expect(after.milestones.map((m) => m.position)).toEqual([0, 1, 2]);
  });

  it('closes the gap after deleting a milestone', async () => {
    const user = await createTestUser();
    const goal = await createGoal(user.id, internship);

    const after = await deleteMilestone(user.id, goal.milestones[0]!.id);

    expect(after.milestones.map((m) => m.position)).toEqual([0, 1]);
    expect(after.progress.total).toBe(2);
  });

  it('limits a goal to 20 milestones', async () => {
    const user = await createTestUser();
    const goal = await createGoal(user.id, {
      ...internship,
      milestones: Array.from({ length: 20 }, (_, i) => `Step ${i}`),
    });

    await expect(addMilestone(user.id, goal.id, 'One too many')).rejects.toMatchObject({
      code: 'TOO_MANY_MILESTONES',
    });
  });
});

describe('goal status', () => {
  it('completes, abandons and reopens a goal', async () => {
    const user = await createTestUser();
    const goal = await createGoal(user.id, internship);

    const completed = await updateGoal(user.id, goal.id, { status: 'COMPLETED' });
    expect(completed.status).toBe('COMPLETED');
    expect(completed.completedAt).not.toBeNull();

    const reopened = await updateGoal(user.id, goal.id, { status: 'ACTIVE' });
    expect(reopened.completedAt).toBeNull();

    const abandoned = await updateGoal(user.id, goal.id, { status: 'ABANDONED' });
    expect(abandoned.status).toBe('ABANDONED');
  });

  it('lists active goals first', async () => {
    const user = await createTestUser();
    const old = await createGoal(user.id, { ...internship, title: 'Done goal' });
    await updateGoal(user.id, old.id, { status: 'COMPLETED' });
    await createGoal(user.id, { ...internship, title: 'Current goal' });

    const goals = await listGoals(user.id);

    expect(goals.map((g) => g.title)).toEqual(['Current goal', 'Done goal']);
  });

  it('gives no XP for completing a goal', async () => {
    const user = await createTestUser();
    const goal = await createGoal(user.id, internship);

    await updateGoal(user.id, goal.id, { status: 'COMPLETED' });

    expect(await prisma.xpTransaction.count({ where: { userId: user.id } })).toBe(0);
  });
});

describe('ownership', () => {
  it("cannot read, change or delete another player's goal or milestone", async () => {
    const owner = await createTestUser();
    const other = await createTestUser();
    const goal = await createGoal(owner.id, internship);

    expect(await listGoals(other.id)).toEqual([]);
    await expect(updateGoal(other.id, goal.id, { title: 'Hacked' })).rejects.toMatchObject({
      code: 'GOAL_NOT_FOUND',
    });
    await expect(deleteGoal(other.id, goal.id)).rejects.toMatchObject({ code: 'GOAL_NOT_FOUND' });
    await expect(
      updateMilestone(other.id, goal.milestones[0]!.id, { completed: true }),
    ).rejects.toMatchObject({ code: 'MILESTONE_NOT_FOUND' });
  });
});

describe('linking custom quests to milestones', () => {
  async function onboarded() {
    const user = await createTestUser();
    await completeOnboarding(
      user.id,
      {
        focusAreas: [{ category: 'CAREER', level: 'BEGINNER' }],
        dailyMinutes: 30,
        avatarKey: 'sigil-1',
      },
      TUESDAY,
    );
    return user;
  }

  it('links a quest to a milestone and shows "goal › milestone"', async () => {
    const user = await onboarded();
    const goal = await createGoal(user.id, internship);
    const milestone = goal.milestones[0]!;

    const quest = await createCustomQuest(
      user.id,
      {
        title: 'Rewrite my CV summary',
        category: 'CAREER',
        difficulty: 'NORMAL',
        milestoneId: milestone.id,
      },
      TUESDAY,
    );

    expect(quest.milestone).toEqual({
      id: milestone.id,
      title: 'Update my CV',
      goalTitle: 'Get a Java internship',
    });
    const [goalAfter] = await listGoals(user.id);
    expect(goalAfter!.milestones[0]!.linkedQuests).toBe(1);
  });

  it("refuses another player's milestone and a milestone of a finished goal", async () => {
    const user = await onboarded();
    const other = await createTestUser();
    const othersGoal = await createGoal(other.id, internship);
    const doneGoal = await createGoal(user.id, internship);
    await updateGoal(user.id, doneGoal.id, { status: 'COMPLETED' });

    for (const milestoneId of [othersGoal.milestones[0]!.id, doneGoal.milestones[0]!.id]) {
      await expect(
        createCustomQuest(
          user.id,
          { title: 'Sneaky quest', category: 'CAREER', difficulty: 'EASY', milestoneId },
          TUESDAY,
        ),
      ).rejects.toMatchObject({ details: { milestoneId: 'MILESTONE_NOT_FOUND' } });
    }
  });

  it('can remove the link', async () => {
    const user = await onboarded();
    const goal = await createGoal(user.id, internship);
    const quest = await createCustomQuest(
      user.id,
      {
        title: 'Linked quest',
        category: 'CAREER',
        difficulty: 'EASY',
        milestoneId: goal.milestones[0]!.id,
      },
      TUESDAY,
    );

    const unlinked = await updateCustomQuest(user.id, quest.id, { milestoneId: null }, TUESDAY);

    expect(unlinked.milestone).toBeNull();
  });

  it('keeps the quest when its goal is deleted', async () => {
    const user = await onboarded();
    const goal = await createGoal(user.id, internship);
    const quest = await createCustomQuest(
      user.id,
      {
        title: 'Linked quest',
        category: 'CAREER',
        difficulty: 'EASY',
        milestoneId: goal.milestones[0]!.id,
      },
      TUESDAY,
    );

    await deleteGoal(user.id, goal.id);

    const saved = await prisma.quest.findUniqueOrThrow({ where: { id: quest.id } });
    expect(saved.milestoneId).toBeNull();
    expect(await prisma.milestone.count()).toBe(0);
  });
});

describe('routes', () => {
  it('answer 404 for ids that are not UUIDs and 401 without login', async () => {
    const agent = request.agent(createApp());
    expect((await agent.get('/api/goals')).status).toBe(401);

    await agent
      .post('/api/auth/register')
      .send({ username: 'route_player', email: 'route@example.com', password: 'secret123' });

    expect((await agent.patch('/api/goals/abc').send({ title: 'New title' })).status).toBe(404);
    expect((await agent.delete('/api/milestones/abc')).status).toBe(404);
    expect((await agent.get('/api/goals')).body).toEqual({ goals: [] });
  });
});
