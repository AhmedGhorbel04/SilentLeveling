import { z } from 'zod';
import {
  AVATAR_KEYS,
  CATEGORIES,
  DAILY_MINUTES_OPTIONS,
  MAX_FOCUS_AREAS,
  SKILL_LEVELS,
} from '../../game/index.js';

export const onboardingSchema = z.object({
  focusAreas: z
    .array(
      z.object({
        category: z.enum(CATEGORIES, { error: 'CATEGORY_INVALID' }),
        level: z.enum(SKILL_LEVELS, { error: 'LEVEL_INVALID' }),
      }),
      { error: 'FOCUS_AREAS_REQUIRED' },
    )
    .min(1, 'FOCUS_AREAS_REQUIRED')
    .max(MAX_FOCUS_AREAS, 'FOCUS_AREAS_TOO_MANY')
    .refine(
      (areas) => new Set(areas.map((a) => a.category)).size === areas.length,
      'FOCUS_AREAS_DUPLICATE',
    ),
  dailyMinutes: z
    .number({ error: 'DAILY_MINUTES_INVALID' })
    .refine(
      (m) => (DAILY_MINUTES_OPTIONS as readonly number[]).includes(m),
      'DAILY_MINUTES_INVALID',
    ),
  avatarKey: z.enum(AVATAR_KEYS, { error: 'AVATAR_INVALID' }),
});

export type OnboardingInput = z.infer<typeof onboardingSchema>;
