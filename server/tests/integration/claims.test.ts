import request from 'supertest';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../../src/app.js';
import { prisma } from '../../src/lib/prisma.js';
import {
  approveClaim,
  listLegendaryQuests,
  rejectClaim,
  submitClaim,
} from '../../src/modules/claims/claim.service.js';
import { listNotifications } from '../../src/modules/notifications/notification.service.js';
import { resetDatabase } from '../helpers/database.js';
import { createTestUser } from '../helpers/users.js';

const proof = {
  description: 'Finished the Paris marathon in 4h12, here is my official result.',
  proofUrl: 'https://example.com/results/123',
};

async function marathonId() {
  return (await prisma.legendaryQuest.findUniqueOrThrow({ where: { key: 'marathon' } })).id;
}

async function admin() {
  const user = await createTestUser({ username: 'The_Admin' });
  await prisma.user.update({ where: { id: user.id }, data: { role: 'ADMIN' } });
  return user;
}

beforeEach(async () => {
  await resetDatabase();
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe('submitting claims', () => {
  it('claims a catalog quest and shows it as pending in the catalog', async () => {
    const player = await createTestUser();

    const claim = await submitClaim(player.id, { legendaryQuestId: await marathonId(), ...proof });

    expect(claim).toMatchObject({ status: 'PENDING', title: { en: 'Run a marathon' } });
    const catalog = await listLegendaryQuests(player.id);
    expect(catalog.find((q) => q.key === 'marathon')?.myClaimStatus).toBe('PENDING');
    expect(catalog).toHaveLength(8);
  });

  it('accepts a free-form claim with its own title', async () => {
    const player = await createTestUser();

    const claim = await submitClaim(player.id, { title: 'Won a national hackathon', ...proof });

    expect(claim.title.en).toBe('Won a national hackathon');
    expect(claim.legendaryQuest).toBeNull();
  });

  it('refuses claiming the same quest twice, and more than 3 pending claims', async () => {
    const player = await createTestUser();
    const id = await marathonId();
    await submitClaim(player.id, { legendaryQuestId: id, ...proof });

    await expect(submitClaim(player.id, { legendaryQuestId: id, ...proof })).rejects.toMatchObject({
      code: 'CLAIM_EXISTS',
    });

    await submitClaim(player.id, { title: 'Second thing', ...proof });
    await submitClaim(player.id, { title: 'Third thing', ...proof });
    await expect(submitClaim(player.id, { title: 'Fourth thing', ...proof })).rejects.toMatchObject(
      {
        code: 'TOO_MANY_PENDING_CLAIMS',
      },
    );
  });

  it('validates the claim through the API (https proof, description length)', async () => {
    const agent = request.agent(createApp());
    await agent
      .post('/api/auth/register')
      .send({ username: 'claimer', email: 'claimer@example.com', password: 'secret123' });

    const res = await agent
      .post('/api/claims')
      .send({ description: 'too short', proofUrl: 'http://not-secure.com' });

    expect(res.status).toBe(400);
    expect(res.body.error.details).toEqual({
      description: 'DESCRIPTION_TOO_SHORT',
      proofUrl: 'PROOF_URL_INVALID',
      title: 'REQUIRED',
    });
  });
});

describe('reviewing claims', () => {
  it('approving gives XP, the title, a notification, "Proven", and unlocks rank B', async () => {
    const reviewer = await admin();
    const player = await createTestUser();
    // Level 40 but no verified achievement: stuck at C I
    await prisma.user.update({
      where: { id: player.id },
      data: { totalXp: 23_000, level: 40, rank: 'C1' },
    });
    const claim = await submitClaim(player.id, { legendaryQuestId: await marathonId(), ...proof });

    const result = await approveClaim(reviewer.id, claim.id, { xp: 3000, tier: 'LEGENDARY' });

    expect(result).toEqual({ rankBefore: 'C1', rankAfter: 'B3' }); // level 43 after +3000 XP
    const ledger = await prisma.xpTransaction.findUniqueOrThrow({ where: { claimId: claim.id } });
    expect(ledger.amount).toBe(3000);
    const unlocked = await prisma.userAchievement.findMany({ where: { userId: player.id } });
    expect(unlocked.map((a) => a.achievementCode)).toEqual(
      expect.arrayContaining(['FIRST_LEGENDARY', 'RANK_B']),
    );
    const types = (await listNotifications(player.id, false)).notifications.map((n) => n.type);
    expect(types).toEqual(expect.arrayContaining(['CLAIM_APPROVED', 'RANK_UP']));
  });

  it('can grant a new title created for an extraordinary claim', async () => {
    const reviewer = await admin();
    const player = await createTestUser();
    const claim = await submitClaim(player.id, { title: 'Won a national hackathon', ...proof });

    await approveClaim(reviewer.id, claim.id, {
      xp: 5000,
      tier: 'MYTHIC',
      newTitle: {
        name: { en: 'Hackathon Champion', fr: 'Champion de hackathon', ar: 'بطل الهاكاثون' },
        rarity: 'MYTHIC',
      },
    });

    const titles = await prisma.userTitle.findMany({
      where: { userId: player.id },
      include: { title: true },
    });
    expect(titles.map((t) => (t.title.name as { en: string }).en)).toContain('Hackathon Champion');
  });

  it('cannot review the same claim twice', async () => {
    const reviewer = await admin();
    const player = await createTestUser();
    const claim = await submitClaim(player.id, { title: 'Something great', ...proof });
    await rejectClaim(reviewer.id, claim.id, 'The link does not show your name.');

    await expect(
      approveClaim(reviewer.id, claim.id, { xp: 1000, tier: 'LEGENDARY' }),
    ).rejects.toMatchObject({ code: 'CLAIM_ALREADY_REVIEWED' });
    const { notifications } = await listNotifications(player.id, false);
    expect(notifications[0]).toMatchObject({
      type: 'CLAIM_REJECTED',
      data: { reason: 'The link does not show your name.' },
    });
  });

  it('lets a player claim a quest again after a rejection', async () => {
    const reviewer = await admin();
    const player = await createTestUser();
    const id = await marathonId();
    const first = await submitClaim(player.id, { legendaryQuestId: id, ...proof });
    await rejectClaim(reviewer.id, first.id, 'Proof is not readable.');

    await expect(submitClaim(player.id, { legendaryQuestId: id, ...proof })).resolves.toMatchObject(
      {
        status: 'PENDING',
      },
    );
  });
});

describe('admin routes', () => {
  it('are refused to players and allowed to admins', async () => {
    const app = createApp();
    const agent = request.agent(app);
    await agent
      .post('/api/auth/register')
      .send({ username: 'not_admin', email: 'na@example.com', password: 'secret123' });

    const asPlayer = await agent.get('/api/admin/claims');
    await prisma.user.update({
      where: { usernameNormalized: 'not_admin' },
      data: { role: 'ADMIN' },
    });
    const asAdmin = await agent.get('/api/admin/claims');
    const approveBadInput = await agent
      .post('/api/admin/claims/abc/approve')
      .send({ xp: 0, tier: 'GOD' });

    expect(asPlayer.status).toBe(403);
    expect(asPlayer.body.error.code).toBe('FORBIDDEN');
    expect(asAdmin.status).toBe(200);
    expect(approveBadInput.body.error.details).toMatchObject({
      xp: 'XP_INVALID',
      tier: 'TIER_INVALID',
    });
  });

  it('can switch a legendary quest off, which hides it from players', async () => {
    const player = await createTestUser();
    const { setLegendaryQuestActive } = await import('../../src/modules/claims/claim.service.js');

    await setLegendaryQuestActive(await marathonId(), false);

    const catalog = await listLegendaryQuests(player.id);
    expect(catalog.map((q) => q.key)).not.toContain('marathon');
    await setLegendaryQuestActive(await marathonId(), true); // shared reference data
  });
});
