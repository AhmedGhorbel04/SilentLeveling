import { z } from 'zod';

// Error messages are codes (not sentences): the frontend translates them into EN/FR/AR.

function isValidTimeZone(timeZone: string): boolean {
  try {
    new Intl.DateTimeFormat('en', { timeZone });
    return true;
  } catch {
    return false;
  }
}

export const registerSchema = z.object({
  username: z
    .string({ error: 'REQUIRED' })
    .trim()
    .min(3, 'USERNAME_TOO_SHORT')
    .max(20, 'USERNAME_TOO_LONG')
    .regex(/^[A-Za-z0-9_]+$/, 'USERNAME_INVALID_CHARS'),
  email: z
    .string({ error: 'REQUIRED' })
    .trim()
    .toLowerCase()
    .pipe(z.email('EMAIL_INVALID').max(255, 'EMAIL_TOO_LONG')),
  password: z
    .string({ error: 'REQUIRED' })
    .min(8, 'PASSWORD_TOO_SHORT')
    // bcrypt ignores everything after 72 bytes, so longer passwords would be silently cut
    .refine((p) => new TextEncoder().encode(p).length <= 72, 'PASSWORD_TOO_LONG')
    .regex(/[A-Za-z]/, 'PASSWORD_NEEDS_LETTER')
    .regex(/\d/, 'PASSWORD_NEEDS_DIGIT'),
  language: z.enum(['en', 'fr', 'ar'], { error: 'LANGUAGE_INVALID' }).default('en'),
  timezone: z
    .string()
    .max(64, 'TIMEZONE_INVALID')
    .refine(isValidTimeZone, 'TIMEZONE_INVALID')
    .default('UTC'),
});

export const loginSchema = z.object({
  // Email or username
  identifier: z.string({ error: 'REQUIRED' }).trim().min(1, 'REQUIRED').max(255),
  password: z.string({ error: 'REQUIRED' }).min(1, 'REQUIRED').max(200),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
