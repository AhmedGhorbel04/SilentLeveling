import { z } from 'zod';
import { CATEGORIES, MAX_MILESTONES_PER_GOAL } from '../../game/index.js';

const title = z
  .string({ error: 'REQUIRED' })
  .trim()
  .min(3, 'TITLE_TOO_SHORT')
  .max(120, 'TITLE_TOO_LONG');

const description = z
  .string()
  .trim()
  .max(1000, 'DESCRIPTION_TOO_LONG')
  .transform((text) => (text === '' ? null : text))
  .nullable();

const category = z.enum(CATEGORIES, { error: 'CATEGORY_INVALID' });

// Optional target day 'YYYY-MM-DD'; null removes it
const targetDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'TARGET_DATE_INVALID')
  .nullable();

const milestoneTitle = z
  .string({ error: 'REQUIRED' })
  .trim()
  .min(1, 'REQUIRED')
  .max(120, 'TITLE_TOO_LONG');

export const createGoalSchema = z.object({
  title,
  description: description.optional(),
  category,
  targetDate: targetDate.optional(),
  // Milestones can be created together with the goal (e.g. from a template)
  milestones: z
    .array(milestoneTitle)
    .max(MAX_MILESTONES_PER_GOAL, 'TOO_MANY_MILESTONES')
    .default([]),
});

export const updateGoalSchema = z
  .object({
    title: title.optional(),
    description: description.optional(),
    category: category.optional(),
    targetDate: targetDate.optional(),
    status: z.enum(['ACTIVE', 'COMPLETED', 'ABANDONED'], { error: 'STATUS_INVALID' }).optional(),
  })
  .refine((data) => Object.values(data).some((value) => value !== undefined), 'NOTHING_TO_UPDATE');

export const createMilestoneSchema = z.object({ title: milestoneTitle });

export const updateMilestoneSchema = z
  .object({
    title: milestoneTitle.optional(),
    completed: z.boolean({ error: 'COMPLETED_INVALID' }).optional(),
    // New place in the list, starting at 0 (used to move a milestone up or down)
    position: z.number({ error: 'POSITION_INVALID' }).int().min(0, 'POSITION_INVALID').optional(),
  })
  .refine((data) => Object.values(data).some((value) => value !== undefined), 'NOTHING_TO_UPDATE');

export type CreateGoalInput = z.infer<typeof createGoalSchema>;
export type UpdateGoalInput = z.infer<typeof updateGoalSchema>;
export type UpdateMilestoneInput = z.infer<typeof updateMilestoneSchema>;
