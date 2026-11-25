import { z } from 'zod';
import { CATEGORIES, CUSTOM_QUEST_DIFFICULTIES } from '../../game/index.js';

// Custom quests (FR-22, FR-23). The player never sends XP: it is calculated from
// the difficulty, and Extreme is reserved for system quests (SRS §3.9).

const title = z
  .string({ error: 'REQUIRED' })
  .trim()
  .min(3, 'TITLE_TOO_SHORT')
  .max(120, 'TITLE_TOO_LONG');

// Empty text becomes null, so "no description" is stored one way only
const description = z
  .string()
  .trim()
  .max(1000, 'DESCRIPTION_TOO_LONG')
  .transform((text) => (text === '' ? null : text))
  .nullable();

const category = z.enum(CATEGORIES, { error: 'CATEGORY_INVALID' });
const difficulty = z.enum(CUSTOM_QUEST_DIFFICULTIES, { error: 'DIFFICULTY_INVALID' });

// A calendar day in the player's time zone; the range (today .. +30 days) is
// checked by the service, which knows the player's time zone
const dueDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'DUE_DATE_INVALID');

// Optional link to a milestone of one of the player's active goals; null removes it
const milestoneId = z.uuid('MILESTONE_NOT_FOUND').nullable();

export const createCustomQuestSchema = z.object({
  // Chosen by the app when the quest is created offline: sending it twice (sync
  // retried after a lost response) cannot create a duplicate
  id: z.uuid('QUEST_ID_INVALID').optional(),
  title,
  description: description.optional(),
  category,
  difficulty,
  dueDate: dueDate.optional(), // defaults to today
  milestoneId: milestoneId.optional(),
});

export const updateCustomQuestSchema = z
  .object({
    title: title.optional(),
    description: description.optional(),
    category: category.optional(),
    difficulty: difficulty.optional(),
    dueDate: dueDate.optional(),
    milestoneId: milestoneId.optional(),
  })
  .refine((data) => Object.values(data).some((value) => value !== undefined), 'NOTHING_TO_UPDATE');

export type CreateCustomQuestInput = z.infer<typeof createCustomQuestSchema>;
export type UpdateCustomQuestInput = z.infer<typeof updateCustomQuestSchema>;
