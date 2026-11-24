import { prisma } from '../../lib/prisma.js';
import { AppError } from '../../utils/AppError.js';
import { localDate, mondayOf, toDbDate } from '../../utils/time.js';
import { getCurrentUser, type CurrentUser } from '../auth/auth.service.js';
import {
  createOnboardingQuest,
  generateDailyQuests,
  generateWeeklyQuestsIfMissing,
} from '../quests/questGeneration.js';
import { QUEST_TRANSACTION_OPTIONS } from '../quests/rollover.service.js';
import type { OnboardingInput } from './onboarding.schemas.js';

// Saves the player's choices and generates their very first quests (FR-10 to FR-13)
export async function completeOnboarding(
  userId: string,
  input: OnboardingInput,
  now = new Date(),
): Promise<CurrentUser> {
  await prisma.$transaction(async (tx) => {
    // Lock the row: two clicks on "Finish" must not onboard twice
    await tx.$queryRaw`SELECT id FROM users WHERE id = ${userId}::uuid FOR UPDATE`;
    const user = await tx.user.findUniqueOrThrow({ where: { id: userId } });
    if (user.onboardedAt) {
      throw new AppError(409, 'ALREADY_ONBOARDED', 'Onboarding is already done');
    }

    const today = localDate(user.timezone, now);

    await tx.focusArea.createMany({
      data: input.focusAreas.map((area) => ({ userId, ...area })),
    });
    await tx.user.update({
      where: { id: userId },
      data: {
        dailyMinutes: input.dailyMinutes,
        avatarKey: input.avatarKey,
        onboardedAt: now,
        lastRolloverDate: toDbDate(today),
        rerollsDate: toDbDate(today),
      },
    });

    // Focus areas in the order the player chose them: the first one is their main goal
    const focusAreas = await tx.focusArea.findMany({ where: { userId } });
    focusAreas.sort(
      (a, b) =>
        input.focusAreas.findIndex((f) => f.category === a.category) -
        input.focusAreas.findIndex((f) => f.category === b.category),
    );
    const player = { ...user, dailyMinutes: input.dailyMinutes, focusAreas };

    await createOnboardingQuest(tx, player, today);
    await generateDailyQuests(tx, player, today);
    await generateWeeklyQuestsIfMissing(tx, player, mondayOf(today));
  }, QUEST_TRANSACTION_OPTIONS);

  return (await getCurrentUser(userId))!;
}
