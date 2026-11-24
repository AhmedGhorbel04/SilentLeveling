import type { Quest, QuestTemplate } from '../../generated/prisma/client.js';
import { fromDbDate } from '../../utils/time.js';

export type QuestWithTemplate = Quest & { template: QuestTemplate | null };

type Translations = { en: string; fr: string; ar: string };

// What the API returns for a quest. The title is always given in all three languages:
// the interface shows the one matching the language currently selected.
export type QuestDto = {
  id: string;
  source: Quest['source'];
  type: Quest['type'];
  category: Quest['category'];
  difficulty: Quest['difficulty'];
  minutes: number | null;
  xpReward: number;
  xpAwarded: number | null;
  status: Quest['status'];
  questDate: string;
  dueAt: Date;
  completedAt: Date | null;
  title: Translations;
  rerollable: boolean;
};

export function toQuestDto(quest: QuestWithTemplate): QuestDto {
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
    // Only generated daily quests can be rerolled (not the onboarding or penalty quest)
    rerollable:
      quest.status === 'ACTIVE' && quest.source === 'SYSTEM' && quest.template?.type === 'DAILY',
  };
}
