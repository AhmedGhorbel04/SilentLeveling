import { prisma } from '../../lib/prisma.js';
import type { Goal, Milestone, Prisma } from '../../generated/prisma/client.js';
import { MAX_ACTIVE_GOALS, MAX_MILESTONES_PER_GOAL } from '../../game/index.js';
import { AppError } from '../../utils/AppError.js';
import { fromDbDate, toDbDate } from '../../utils/time.js';
import type { CreateGoalInput, UpdateGoalInput, UpdateMilestoneInput } from './goal.schemas.js';

type Tx = Prisma.TransactionClient;

type MilestoneWithCount = Milestone & { _count: { quests: number } };
type GoalWithMilestones = Goal & { milestones: MilestoneWithCount[] };

export type MilestoneDto = {
  id: string;
  title: string;
  position: number;
  completed: boolean;
  linkedQuests: number;
};

export type GoalDto = {
  id: string;
  title: string;
  description: string | null;
  category: Goal['category'];
  targetDate: string | null;
  status: Goal['status'];
  completedAt: Date | null;
  createdAt: Date;
  // Progress = share of completed milestones (FR-34)
  progress: { completed: number; total: number; percent: number };
  milestones: MilestoneDto[];
};

const goalInclude = {
  milestones: {
    orderBy: { position: 'asc' },
    include: { _count: { select: { quests: true } } },
  },
} as const satisfies Prisma.GoalInclude;

function toGoalDto(goal: GoalWithMilestones): GoalDto {
  const completed = goal.milestones.filter((m) => m.completedAt !== null).length;
  const total = goal.milestones.length;

  return {
    id: goal.id,
    title: goal.title,
    description: goal.description,
    category: goal.category,
    targetDate: goal.targetDate ? fromDbDate(goal.targetDate) : null,
    status: goal.status,
    completedAt: goal.completedAt,
    createdAt: goal.createdAt,
    progress: {
      completed,
      total,
      percent: total === 0 ? 0 : Math.round((completed / total) * 100),
    },
    milestones: goal.milestones.map((m) => ({
      id: m.id,
      title: m.title,
      position: m.position,
      completed: m.completedAt !== null,
      linkedQuests: m._count.quests,
    })),
  };
}

// Every query includes userId: asking for another player's goal gives "not found",
// never their data.
async function findOwnGoal(tx: Tx, userId: string, goalId: string) {
  const goal = await tx.goal.findFirst({ where: { id: goalId, userId }, include: goalInclude });
  if (!goal) throw new AppError(404, 'GOAL_NOT_FOUND', 'Goal not found');
  return goal;
}

async function findOwnMilestone(tx: Tx, userId: string, milestoneId: string) {
  const milestone = await tx.milestone.findFirst({
    where: { id: milestoneId, goal: { userId } },
  });
  if (!milestone) throw new AppError(404, 'MILESTONE_NOT_FOUND', 'Milestone not found');
  return milestone;
}

async function ensureActiveGoalSlot(tx: Tx, userId: string) {
  const active = await tx.goal.count({ where: { userId, status: 'ACTIVE' } });
  if (active >= MAX_ACTIVE_GOALS) {
    throw new AppError(409, 'TOO_MANY_GOALS', 'Too many active goals');
  }
}

// Active goals first, then the most recent
export async function listGoals(userId: string): Promise<GoalDto[]> {
  const goals = await prisma.goal.findMany({
    where: { userId },
    include: goalInclude,
    orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
  });
  return goals.map(toGoalDto);
}

export function createGoal(userId: string, input: CreateGoalInput): Promise<GoalDto> {
  return prisma.$transaction(async (tx) => {
    await ensureActiveGoalSlot(tx, userId);

    const goal = await tx.goal.create({
      data: {
        userId,
        title: input.title,
        description: input.description ?? null,
        category: input.category,
        targetDate: input.targetDate ? toDbDate(input.targetDate) : null,
        milestones: {
          create: input.milestones.map((title, position) => ({ title, position })),
        },
      },
      include: goalInclude,
    });
    return toGoalDto(goal);
  });
}

export function updateGoal(
  userId: string,
  goalId: string,
  input: UpdateGoalInput,
): Promise<GoalDto> {
  return prisma.$transaction(async (tx) => {
    const goal = await findOwnGoal(tx, userId, goalId);
    if (input.status === 'ACTIVE' && goal.status !== 'ACTIVE') {
      await ensureActiveGoalSlot(tx, userId); // reopening a goal uses a slot again
    }

    const updated = await tx.goal.update({
      where: { id: goalId },
      data: {
        title: input.title,
        description: input.description,
        category: input.category,
        targetDate:
          input.targetDate === undefined
            ? undefined
            : input.targetDate === null
              ? null
              : toDbDate(input.targetDate),
        status: input.status,
        // Keep completed_at in sync with the status (also enforced by a CHECK constraint)
        completedAt:
          input.status === undefined
            ? undefined
            : input.status === 'COMPLETED'
              ? (goal.completedAt ?? new Date())
              : null,
      },
      include: goalInclude,
    });
    return toGoalDto(updated);
  });
}

// Milestones are deleted with the goal; quests linked to them stay, without the link
export function deleteGoal(userId: string, goalId: string): Promise<void> {
  return prisma.$transaction(async (tx) => {
    await findOwnGoal(tx, userId, goalId);
    await tx.goal.delete({ where: { id: goalId } });
  });
}

export function addMilestone(userId: string, goalId: string, title: string): Promise<GoalDto> {
  return prisma.$transaction(async (tx) => {
    const goal = await findOwnGoal(tx, userId, goalId);
    if (goal.milestones.length >= MAX_MILESTONES_PER_GOAL) {
      throw new AppError(409, 'TOO_MANY_MILESTONES', 'Too many milestones');
    }

    await tx.milestone.create({ data: { goalId, title, position: goal.milestones.length } });
    return toGoalDto(await findOwnGoal(tx, userId, goalId));
  });
}

export function updateMilestone(
  userId: string,
  milestoneId: string,
  input: UpdateMilestoneInput,
): Promise<GoalDto> {
  return prisma.$transaction(async (tx) => {
    const milestone = await findOwnMilestone(tx, userId, milestoneId);

    await tx.milestone.update({
      where: { id: milestoneId },
      data: {
        title: input.title,
        completedAt:
          input.completed === undefined
            ? undefined
            : input.completed
              ? (milestone.completedAt ?? new Date())
              : null,
      },
    });

    if (input.position !== undefined) {
      await moveMilestone(tx, milestone.goalId, milestoneId, input.position);
    }
    return toGoalDto(await findOwnGoal(tx, userId, milestone.goalId));
  });
}

export function deleteMilestone(userId: string, milestoneId: string): Promise<GoalDto> {
  return prisma.$transaction(async (tx) => {
    const milestone = await findOwnMilestone(tx, userId, milestoneId);
    await tx.milestone.delete({ where: { id: milestoneId } });
    await renumber(tx, milestone.goalId);
    return toGoalDto(await findOwnGoal(tx, userId, milestone.goalId));
  });
}

// Moves a milestone to a new index and renumbers the others: [a, b, c] → move c to 0 → [c, a, b]
async function moveMilestone(tx: Tx, goalId: string, milestoneId: string, newIndex: number) {
  const ordered = await tx.milestone.findMany({ where: { goalId }, orderBy: { position: 'asc' } });
  const ids = ordered.map((m) => m.id).filter((id) => id !== milestoneId);
  ids.splice(Math.min(newIndex, ids.length), 0, milestoneId);
  await savePositions(tx, ids, ordered);
}

// After a deletion: positions 0, 1, 2... without gaps
async function renumber(tx: Tx, goalId: string) {
  const ordered = await tx.milestone.findMany({ where: { goalId }, orderBy: { position: 'asc' } });
  await savePositions(
    tx,
    ordered.map((m) => m.id),
    ordered,
  );
}

async function savePositions(tx: Tx, ids: string[], current: Milestone[]) {
  const currentPosition = new Map(current.map((m) => [m.id, m.position]));
  for (const [position, id] of ids.entries()) {
    if (currentPosition.get(id) !== position) {
      await tx.milestone.update({ where: { id }, data: { position } });
    }
  }
}

// Used when a custom quest is linked to a milestone: it must belong to one of
// the player's active goals
export async function assertLinkableMilestone(tx: Tx, userId: string, milestoneId: string) {
  const milestone = await tx.milestone.findFirst({
    where: { id: milestoneId, goal: { userId, status: 'ACTIVE' } },
  });
  if (!milestone) {
    throw new AppError(400, 'VALIDATION_ERROR', 'Invalid input', {
      milestoneId: 'MILESTONE_NOT_FOUND',
    });
  }
}
