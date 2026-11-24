import type { Prisma } from '../../generated/prisma/client.js';
import { fromDbDate } from '../../utils/time.js';

// What every quest query loads with the quest: its template (for the translated
// title) and its milestone with the goal (for the "goal › milestone" label)
export const questInclude = {
  template: true,
  milestone: { include: { goal: { select: { title: true } } } },
} as const satisfies Prisma.QuestInclude;

export type QuestWithRelations = Prisma.QuestGetPayload<{ include: typeof questInclude }>;

type Translations = { en: string; fr: string; ar: string };

// What the API returns for a quest. The title is always given in all three languages:
// the interface shows the one matching the language currently selected.
export type QuestDto = {
  id: string;
  source: QuestWithRelations['source'];
  type: QuestWithRelations['type'];
  category: QuestWithRelations['category'];
  difficulty: QuestWithRelations['difficulty'];
  minutes: number | null;
  xpReward: number;
  xpAwarded: number | null;
  status: QuestWithRelations['status'];
  questDate: string;
  dueAt: Date;
  completedAt: Date | null;
  title: Translations;
  description: string | null; // custom quests only
  milestone: { id: string; title: string; goalTitle: string } | null; // custom quests only
  rerollable: boolean;
};

export function toQuestDto(quest: QuestWithRelations): QuestDto {
  const title: Translations = quest.template
    ? (quest.template.title as Translations)
    : { en: quest.title ?? '', fr: quest.title ?? '', ar: quest.title ?? '' };

  return {
    id: quest.id,
    source: quest.source,
    type: quest.type,
    category: quest.category,
    difficulty: quest.difficulty,
    minutes: quest.minutes,
    xpReward: quest.xpReward,
    xpAwarded: quest.xpAwarded,
    status: quest.status,
    questDate: fromDbDate(quest.questDate),
    dueAt: quest.dueAt,
    completedAt: quest.completedAt,
    title,
    description: quest.description,
    milestone: quest.milestone
      ? {
          id: quest.milestone.id,
          title: quest.milestone.title,
          goalTitle: quest.milestone.goal.title,
        }
      : null,
    // Only generated daily quests can be rerolled (not the onboarding or penalty quest)
    rerollable:
      quest.status === 'ACTIVE' && quest.source === 'SYSTEM' && quest.template?.type === 'DAILY',
  };
}
