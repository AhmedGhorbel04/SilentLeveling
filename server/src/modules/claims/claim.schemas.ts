import { z } from 'zod';
import { CATEGORIES } from '../../game/config.js';

// Proof must be an https link (certificate, article, LinkedIn post, photo...)
const proofUrl = z
  .string({ error: 'REQUIRED' })
  .trim()
  .max(500, 'PROOF_URL_INVALID')
  .pipe(z.url({ protocol: /^https$/, error: 'PROOF_URL_INVALID' }));

export const submitClaimSchema = z
  .object({
    // A quest from the catalog, or none for a free-form extraordinary achievement
    legendaryQuestId: z.uuid('LEGENDARY_QUEST_NOT_FOUND').optional(),
    title: z.string().trim().min(3, 'TITLE_TOO_SHORT').max(120, 'TITLE_TOO_LONG').optional(),
    description: z
      .string({ error: 'REQUIRED' })
      .trim()
      .min(20, 'DESCRIPTION_TOO_SHORT')
      .max(2000, 'DESCRIPTION_TOO_LONG'),
    proofUrl,
  })
  .refine((claim) => claim.legendaryQuestId || claim.title, {
    message: 'REQUIRED',
    path: ['title'],
  });

const titleName = z.string().trim().min(2, 'TITLE_TOO_SHORT').max(40, 'TITLE_TOO_LONG');

export const approveClaimSchema = z.object({
  xp: z.number({ error: 'XP_INVALID' }).int().min(1, 'XP_INVALID').max(20000, 'XP_INVALID'),
  tier: z.enum(['LEGENDARY', 'MYTHIC'], { error: 'TIER_INVALID' }),
  // Either an existing title, a new one created for this claim, or no title
  titleId: z.uuid('TITLE_NOT_FOUND').optional(),
  newTitle: z
    .object({
      name: z.object({ en: titleName, fr: titleName, ar: titleName }),
      rarity: z.enum(['LEGENDARY', 'MYTHIC'], { error: 'TIER_INVALID' }),
    })
    .optional(),
  note: z.string().trim().max(500).optional(),
});

export const rejectClaimSchema = z.object({
  reason: z.string({ error: 'REQUIRED' }).trim().min(5, 'REASON_TOO_SHORT').max(500),
});

const questTitle = z.string().trim().min(3, 'TITLE_TOO_SHORT').max(120, 'TITLE_TOO_LONG');

// A legendary quest of the catalog, created or edited by an admin
export const legendaryQuestSchema = z.object({
  title: z.object({ en: questTitle, fr: questTitle, ar: questTitle }, { error: 'REQUIRED' }),
  category: z.enum(CATEGORIES, { error: 'CATEGORY_INVALID' }),
  tier: z.enum(['LEGENDARY', 'MYTHIC'], { error: 'TIER_INVALID' }),
  xpReward: z
    .number({ error: 'XP_INVALID' })
    .int('XP_INVALID')
    .min(1, 'XP_INVALID')
    .max(20000, 'XP_INVALID'),
  // Title granted by default on approval; null = none
  titleId: z.uuid('TITLE_NOT_FOUND').nullable().default(null),
  active: z.boolean().default(true),
});

// Partial edit; also used by the on/off switch ({ active } only)
export const updateLegendaryQuestSchema = legendaryQuestSchema
  .partial()
  .extend({ titleId: z.uuid('TITLE_NOT_FOUND').nullable().optional() })
  .refine((data) => Object.values(data).some((value) => value !== undefined), 'NOTHING_TO_UPDATE');

export type LegendaryQuestInput = z.infer<typeof legendaryQuestSchema>;
export type UpdateLegendaryQuestInput = z.infer<typeof updateLegendaryQuestSchema>;
export type SubmitClaimInput = z.infer<typeof submitClaimSchema>;
export type ApproveClaimInput = z.infer<typeof approveClaimSchema>;
