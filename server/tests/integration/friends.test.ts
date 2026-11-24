import request from 'supertest';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../../src/app.js';
import { prisma } from '../../src/lib/prisma.js';
import {
  acceptRequest,
  deleteRequest,
  friendsRanking,
  listFriends,
  listRequests,
  removeFriend,
  sendRequest,
} from '../../src/modules/friends/friend.service.js';
import { getProfile, updateBio } from '../../src/modules/friends/profile.service.js';
import { listNotifications } from '../../src/modules/notifications/notification.service.js';
import { resetDatabase } from '../helpers/database.js';
import { createTestUser } from '../helpers/users.js';

beforeEach(async () => {
  await resetDatabase();
});

afterAll(async () => {
  await prisma.$disconnect();
});

async function twoPlayers() {
  const alice = await createTestUser({ username: 'Alice' });
  const bob = await createTestUser({ username: 'Bob' });
  return { alice, bob };
}

async function befriend(a: { id: string }, b: { id: string; username: string }) {
  await sendRequest(a.id, b.username);
  const { incoming } = await listRequests(b.id);
  await acceptRequest(b.id, incoming[0]!.id);
}

describe('friend requests', () => {
  it('sends a request by username (any case) and notifies the other player', async () => {
    const { alice, bob } = await twoPlayers();

    const result = await sendRequest(alice.id, 'BOB');

    expect(result).toEqual({ status: 'PENDING' });
    const { incoming } = await listRequests(bob.id);
    expect(incoming.map((r) => r.player.username)).toEqual(['Alice']);
    const { notifications } = await listNotifications(bob.id, false);
    expect(notifications[0]).toMatchObject({ type: 'FRIEND_REQUEST', data: { username: 'Alice' } });
  });

  it('refuses unknown players, yourself, duplicates and existing friends', async () => {
    const { alice, bob } = await twoPlayers();

    await expect(sendRequest(alice.id, 'nobody')).rejects.toMatchObject({ code: 'USER_NOT_FOUND' });
    await expect(sendRequest(alice.id, 'alice')).rejects.toMatchObject({ code: 'CANNOT_ADD_SELF' });

    await sendRequest(alice.id, 'bob');
    await expect(sendRequest(alice.id, 'bob')).rejects.toMatchObject({
      code: 'REQUEST_ALREADY_SENT',
    });

    const { incoming } = await listRequests(bob.id);
    await acceptRequest(bob.id, incoming[0]!.id);
    await expect(sendRequest(alice.id, 'bob')).rejects.toMatchObject({ code: 'ALREADY_FRIENDS' });
  });

  it('accepts automatically when both players send a request to each other', async () => {
    const { alice, bob } = await twoPlayers();
    await sendRequest(alice.id, 'bob');

    const result = await sendRequest(bob.id, 'alice');

    expect(result).toEqual({ status: 'ACCEPTED' });
    expect(await prisma.friendship.count()).toBe(1);
    expect((await listFriends(alice.id)).map((f) => f.username)).toEqual(['Bob']);
  });

  it('lets the database refuse a second row for the same pair, whatever the direction', async () => {
    const { alice, bob } = await twoPlayers();
    await prisma.friendship.create({ data: { requesterId: alice.id, addresseeId: bob.id } });

    await expect(
      prisma.friendship.create({ data: { requesterId: bob.id, addresseeId: alice.id } }),
    ).rejects.toThrow();
  });

  it('only lets the receiver accept, and either side decline or cancel', async () => {
    const { alice, bob } = await twoPlayers();
    await sendRequest(alice.id, 'bob');
    const { outgoing } = await listRequests(alice.id);

    await expect(acceptRequest(alice.id, outgoing[0]!.id)).rejects.toMatchObject({
      code: 'REQUEST_NOT_FOUND',
    });

    await deleteRequest(alice.id, outgoing[0]!.id); // cancelled by the sender
    expect(await prisma.friendship.count()).toBe(0);

    await sendRequest(alice.id, 'bob');
    const { incoming } = await listRequests(bob.id);
    await deleteRequest(bob.id, incoming[0]!.id); // declined by the receiver
    expect(await prisma.friendship.count()).toBe(0);
  });

  it('limits pending requests to 20', async () => {
    const sender = await createTestUser({ username: 'Spammer' });
    for (let i = 0; i < 20; i++) {
      const target = await createTestUser({ username: `target_${i}` });
      await sendRequest(sender.id, target.username);
    }
    await createTestUser({ username: 'One_more' });

    await expect(sendRequest(sender.id, 'one_more')).rejects.toMatchObject({
      code: 'TOO_MANY_PENDING_REQUESTS',
    });
  });
});

describe('friendship', () => {
  it('notifies the sender and unlocks "First ally" for both players', async () => {
    const { alice, bob } = await twoPlayers();

    await befriend(alice, bob);

    const { notifications } = await listNotifications(alice.id, false);
    expect(notifications.map((n) => n.type)).toContain('FRIEND_ACCEPTED');
    for (const player of [alice, bob]) {
      const ally = await prisma.userAchievement.count({
        where: { userId: player.id, achievementCode: 'ALLY' },
      });
      expect(ally).toBe(1);
    }
  });

  it('can be removed by either friend', async () => {
    const { alice, bob } = await twoPlayers();
    await befriend(alice, bob);

    await removeFriend(bob.id, 'alice');

    expect(await listFriends(alice.id)).toEqual([]);
    await expect(removeFriend(bob.id, 'alice')).rejects.toMatchObject({ code: 'FRIEND_NOT_FOUND' });
  });
});

describe('profiles', () => {
  it('shows only a mini card to non-friends', async () => {
    const { alice } = await twoPlayers();

    const profile = await getProfile(alice.id, 'bob');

    expect(profile).toEqual({
      visibility: 'CARD',
      relationship: { type: 'NONE', requestId: null },
      username: 'Bob',
      avatarKey: null,
      rank: { code: 'E4', label: 'E IV' },
    });
  });

  it('shows the full profile to friends, never with the email', async () => {
    const { alice, bob } = await twoPlayers();
    await updateBio(bob.id, 'Learning Spring Boot');
    await befriend(alice, bob);

    const profile = await getProfile(alice.id, 'bob');

    expect(profile).toMatchObject({
      visibility: 'FULL',
      relationship: { type: 'FRIEND' },
      bio: 'Learning Spring Boot',
      level: 1,
      friendsCount: 1,
      achievements: [{ code: 'ALLY' }],
    });
    expect(JSON.stringify(profile)).not.toContain('@example.com');
  });

  it('tells the viewer about a pending request in either direction', async () => {
    const { alice, bob } = await twoPlayers();
    await sendRequest(alice.id, 'bob');

    const seenByAlice = await getProfile(alice.id, 'bob');
    const seenByBob = await getProfile(bob.id, 'alice');

    expect(seenByAlice.relationship.type).toBe('REQUEST_SENT');
    expect(seenByBob.relationship.type).toBe('REQUEST_RECEIVED');
    expect(seenByBob.relationship.requestId).not.toBeNull();
  });

  it('shows everything on your own profile', async () => {
    const { alice } = await twoPlayers();

    const profile = await getProfile(alice.id, 'alice');

    expect(profile).toMatchObject({ visibility: 'FULL', relationship: { type: 'SELF' } });
  });
});

describe('friends ranking', () => {
  it('ranks all-time by rank, then XP, and marks the viewer', async () => {
    const { alice, bob } = await twoPlayers();
    const carol = await createTestUser({ username: 'Carol' });
    await befriend(alice, bob);
    await befriend(alice, carol);
    await prisma.user.update({
      where: { id: bob.id },
      data: { rank: 'D4', level: 10, totalXp: 1700 },
    });
    await prisma.user.update({
      where: { id: carol.id },
      data: { totalXp: 300, level: 3, rank: 'E3' },
    });

    const ranking = await friendsRanking(alice.id, 'all');

    expect(ranking.map((p) => [p.position, p.username, p.isMe])).toEqual([
      [1, 'Bob', false],
      [2, 'Carol', false],
      [3, 'Alice', true],
    ]);
  });

  it("ranks weekly by the XP earned since Monday in the viewer's time zone", async () => {
    const { alice, bob } = await twoPlayers();
    await befriend(alice, bob);
    const tuesday = new Date('2026-11-24T10:00:00Z'); // the week started on Monday 23rd
    await prisma.xpTransaction.createMany({
      data: [
        {
          userId: bob.id,
          amount: 500,
          reason: 'QUEST',
          createdAt: new Date('2026-11-20T10:00:00Z'),
        },
        {
          userId: alice.id,
          amount: 80,
          reason: 'QUEST',
          createdAt: new Date('2026-11-23T08:00:00Z'),
        },
        {
          userId: bob.id,
          amount: 40,
          reason: 'QUEST',
          createdAt: new Date('2026-11-24T08:00:00Z'),
        },
      ],
    });

    const ranking = await friendsRanking(alice.id, 'weekly', tuesday);

    expect(ranking.map((p) => [p.username, p.weeklyXp])).toEqual([
      ['Alice', 80],
      ['Bob', 40], // last week's 500 XP do not count
    ]);
  });

  it('contains only the player when they have no friends', async () => {
    const { alice } = await twoPlayers();

    expect((await friendsRanking(alice.id, 'all')).map((p) => p.username)).toEqual(['Alice']);
  });
});

describe('routes', () => {
  it('work through the API', async () => {
    const app = createApp();
    const alice = request.agent(app);
    const bob = request.agent(app);
    await alice
      .post('/api/auth/register')
      .send({ username: 'Alice', email: 'alice@example.com', password: 'secret123' });
    await bob
      .post('/api/auth/register')
      .send({ username: 'Bob', email: 'bob@example.com', password: 'secret123' });

    const sent = await alice.post('/api/friends/requests').send({ username: 'bob' });
    const requests = await bob.get('/api/friends/requests');
    const accepted = await bob.post(`/api/friends/requests/${requests.body.incoming[0].id}/accept`);
    const profile = await alice.get('/api/users/bob');
    const bio = await alice.patch('/api/me/profile').send({ bio: 'x'.repeat(161) });
    const ranking = await alice.get('/api/friends/ranking?period=all');

    expect(sent.status).toBe(201);
    expect(accepted.status).toBe(204);
    expect(profile.body.visibility).toBe('FULL');
    expect(JSON.stringify(profile.body)).not.toContain('bob@example.com');
    expect(bio.body.error.details.bio).toBe('BIO_TOO_LONG');
    expect(ranking.body.players).toHaveLength(2);
    expect((await request(app).get('/api/users/bob')).status).toBe(401);
    expect((await alice.get('/api/users/nobody')).status).toBe(404);
  });
});
