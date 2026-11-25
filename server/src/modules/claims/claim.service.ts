import { randomUUID } from 'node:crypto';
import { prisma } from '../../lib/prisma.js';
import type { ClaimStatus, Prisma } from '../../generated/prisma/client.js';
import { AppError } from '../../utils/AppError.js';
import { emailAdmin } from '../../utils/mailer.js';
import { awardXp } from '../progression/progression.service.js';
import { checkAchievements } from '../achievements/achievement.service.js';
import { notify } from '../notifications/notification.service.js';
import type {
  ApproveClaimInput,
  LegendaryQuestInput,
  SubmitClaimInput,
  UpdateLegendaryQuestInput,
} from './claim.schemas.js';

type Translations = { en: string; fr: string; ar: string };

// A player can wait for at most this many reviews at once (FR-62)
const MAX_PENDING_CLAIMS = 3;

const claimInclude = {
  legendaryQuest: { select: { id: true, key: true, title: true, tier: true, xpReward: true } },
  titleAwarded: { select: { id: true, key: true, name: true, rarity: true } },
} as const satisfies Prisma.AchievementClaimInclude;

type ClaimRow = Prisma.AchievementClaimGetPayload<{ include: typeof claimInclude }>;

function toClaimDto(claim: ClaimRow) {
  return {
    id: claim.id,
    status: claim.status,
    // Catalog quests carry their translated title; free-form claims their own text
    title: claim.legendaryQuest
      ? (claim.legendaryQuest.title as Translations)
      : { en: claim.title ?? '', fr: claim.title ?? '', ar: claim.title ?? '' },
    description: claim.description,
    proofUrl: claim.proofUrl,
    legendaryQuest: claim.legendaryQuest,
    tierAwarded: claim.tierAwarded,
    xpAwarded: claim.xpAwarded,
    titleAwarded: claim.titleAwarded,
    reviewNote: claim.reviewNote,
    createdAt: claim.createdAt,
    reviewedAt: claim.reviewedAt,
  };
}

// The catalog, with the player's latest claim for each quest (to show "pending" or "verified")
export async function listLegendaryQuests(userId: string) {
  const [quests, claims] = await Promise.all([
    prisma.legendaryQuest.findMany({
      where: { active: true },
      include: { rewardTitle: { select: { id: true, key: true, name: true, rarity: true } } },
      orderBy: [{ tier: 'asc' }, { xpReward: 'asc' }],
    }),
    prisma.achievementClaim.findMany({
      where: { userId, legendaryQuestId: { not: null } },
      orderBy: { createdAt: 'desc' },
    }),
  ]);

  return quests.map((quest) => ({
    id: quest.id,
    key: quest.key,
    title: quest.title as Translations,
    category: quest.category,
    tier: quest.tier,
    xpReward: quest.xpReward,
    rewardTitle: quest.rewardTitle,
    myClaimStatus: claims.find((c) => c.legendaryQuestId === quest.id)?.status ?? null,
  }));
}

export async function listMyClaims(userId: string) {
  const claims = await prisma.achievementClaim.findMany({
    where: { userId },
    include: claimInclude,
    orderBy: { createdAt: 'desc' },
  });
  return claims.map(toClaimDto);
}

export async function submitClaim(userId: string, input: SubmitClaimInput) {
  const claim = await prisma.$transaction(async (tx) => {
    // Lock the player's row: two quick submissions cannot both pass the checks below
    await tx.$queryRaw`SELECT id FROM users WHERE id = ${userId}::uuid FOR UPDATE`;

    const pending = await tx.achievementClaim.count({ where: { userId, status: 'PENDING' } });
    if (pending >= MAX_PENDING_CLAIMS) {
      throw new AppError(409, 'TOO_MANY_PENDING_CLAIMS', 'Too many claims waiting for review');
    }

    if (input.legendaryQuestId) {
      const quest = await tx.legendaryQuest.findFirst({
        where: { id: input.legendaryQuestId, active: true },
      });
      if (!quest) throw new AppError(404, 'LEGENDARY_QUEST_NOT_FOUND', 'Legendary quest not found');

      // A catalog quest can be claimed again only after a rejection
      const existing = await tx.achievementClaim.count({
        where: { userId, legendaryQuestId: quest.id, status: { in: ['PENDING', 'APPROVED'] } },
      });
      if (existing) throw new AppError(409, 'CLAIM_EXISTS', 'Already claimed');
    }

    return tx.achievementClaim.create({
      data: {
        userId,
        legendaryQuestId: input.legendaryQuestId ?? null,
        title: input.legendaryQuestId ? null : input.title!,
        description: input.description,
        proofUrl: input.proofUrl,
      },
      include: { ...claimInclude, user: { select: { username: true } } },
    });
  });

  // After the transaction: a slow or failing email never blocks or undoes the claim
  const title = toClaimDto(claim).title.en;
  void emailAdmin(
    `New achievement claim from ${claim.user.username}`,
    `${claim.user.username} claims: ${title}\n\n${claim.description}\n\nProof: ${claim.proofUrl}`,
  );

  return toClaimDto(claim);
}

// ---- Admin ----

export async function listClaimsForReview(status: ClaimStatus) {
  const claims = await prisma.achievementClaim.findMany({
    where: { status },
    include: { ...claimInclude, user: { select: { username: true, level: true, rank: true } } },
    orderBy: { createdAt: status === 'PENDING' ? 'asc' : 'desc' }, // oldest pending first
    take: 100,
  });
  return claims.map((claim) => ({ ...toClaimDto(claim), player: claim.user }));
}

async function findPendingClaim(tx: Prisma.TransactionClient, claimId: string) {
  const claim = await tx.achievementClaim.findUnique({
    where: { id: claimId },
    include: { legendaryQuest: true },
  });
  if (!claim) throw new AppError(404, 'CLAIM_NOT_FOUND', 'Claim not found');
  if (claim.status !== 'PENDING') {
    throw new AppError(409, 'CLAIM_ALREADY_REVIEWED', 'This claim was already reviewed');
  }
  return claim;
}

// Approving gives the XP and the title, and counts toward ranks B and above (FR-65)
export function approveClaim(adminId: string, claimId: string, input: ApproveClaimInput) {
  return prisma.$transaction(async (tx) => {
    const claim = await findPendingClaim(tx, claimId);

    let titleId: string | null = input.titleId ?? null;
    if (input.newTitle) {
      const created = await tx.title.create({
        data: {
          key: `custom_${randomUUID().slice(0, 8)}`,
          name: input.newTitle.name,
          rarity: input.newTitle.rarity,
        },
      });
      titleId = created.id;
    } else if (titleId && !(await tx.title.count({ where: { id: titleId } }))) {
      throw new AppError(404, 'TITLE_NOT_FOUND', 'Title not found');
    }

    // The status changes first, so the rank calculation in awardXp already counts this claim
    await tx.achievementClaim.update({
      where: { id: claimId },
      data: {
        status: 'APPROVED',
        tierAwarded: input.tier,
        xpAwarded: input.xp,
        titleAwardedId: titleId,
        reviewerId: adminId,
        reviewNote: input.note ?? null,
        reviewedAt: new Date(),
      },
    });

    const award = await awardXp(tx, {
      userId: claim.userId,
      amount: input.xp,
      reason: 'CLAIM',
      claimId,
    });
    if (titleId) {
      await tx.userTitle.createMany({
        data: [{ userId: claim.userId, titleId }],
        skipDuplicates: true,
      });
    }

    const name = (claim.legendaryQuest?.title as Translations | undefined)?.en ?? claim.title ?? '';
    await notify(tx, claim.userId, 'CLAIM_APPROVED', { title: name, xp: String(input.xp) });
    if (award.rankedUp) await notify(tx, claim.userId, 'RANK_UP', { rank: award.rankAfter });
    await checkAchievements(tx, claim.userId); // "Proven" and rank achievements

    return { rankBefore: award.rankBefore, rankAfter: award.rankAfter };
  });
}

export function rejectClaim(adminId: string, claimId: string, reason: string) {
  return prisma.$transaction(async (tx) => {
    const claim = await findPendingClaim(tx, claimId);
    await tx.achievementClaim.update({
      where: { id: claimId },
      data: { status: 'REJECTED', reviewerId: adminId, reviewNote: reason, reviewedAt: new Date() },
    });
    const name = (claim.legendaryQuest?.title as Translations | undefined)?.en ?? claim.title ?? '';
    await notify(tx, claim.userId, 'CLAIM_REJECTED', { title: name, reason });
  });
}

// Admin catalog management (FR-66): list everything, switch quests on or off
export async function listCatalogForAdmin() {
  return prisma.legendaryQuest.findMany({
    include: { rewardTitle: { select: { key: true, name: true, rarity: true } } },
    orderBy: [{ tier: 'asc' }, { xpReward: 'asc' }],
  });
}

async function assertTitleExists(titleId: string | null | undefined) {
  if (titleId && !(await prisma.title.findUnique({ where: { id: titleId } }))) {
    throw new AppError(404, 'TITLE_NOT_FOUND', 'Title not found');
  }
}

// Quests made by an admin get a generated key; the seed never touches them
export async function createLegendaryQuest(input: LegendaryQuestInput) {
  await assertTitleExists(input.titleId);
  return prisma.legendaryQuest.create({
    data: { ...input, key: `custom_${randomUUID().slice(0, 8)}` },
  });
}

export async function updateLegendaryQuest(questId: string, input: UpdateLegendaryQuestInput) {
  await assertTitleExists(input.titleId);
  const { count } = await prisma.legendaryQuest.updateMany({ where: { id: questId }, data: input });
  if (count === 0)
    throw new AppError(404, 'LEGENDARY_QUEST_NOT_FOUND', 'Legendary quest not found');
}

// A quest that players already claimed is part of their history: it can only be
// deactivated, not deleted
export async function deleteLegendaryQuest(questId: string) {
  return prisma.$transaction(async (tx) => {
    const quest = await tx.legendaryQuest.findUnique({
      where: { id: questId },
      include: { _count: { select: { claims: true } } },
    });
    if (!quest) throw new AppError(404, 'LEGENDARY_QUEST_NOT_FOUND', 'Legendary quest not found');
    if (quest._count.claims > 0) {
      throw new AppError(409, 'LEGENDARY_QUEST_HAS_CLAIMS', 'Deactivate it instead');
    }
    await tx.legendaryQuest.delete({ where: { id: questId } });
  });
}

export async function listTitlesForAdmin() {
  return prisma.title.findMany({
    select: { id: true, key: true, name: true, rarity: true },
    orderBy: [{ rarity: 'desc' }, { key: 'asc' }],
  });
}
