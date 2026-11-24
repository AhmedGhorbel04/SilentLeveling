import { z } from 'zod';

// Same rules and error codes as the backend (server/src/modules/auth/auth.schemas.ts).
// Checking in the browser gives instant feedback; the backend still checks everything,
// because a request can be sent without using our frontend at all.

export const loginFormSchema = z.object({
  identifier: z.string().trim().min(1, 'REQUIRED'),
  password: z.string().min(1, 'REQUIRED'),
});

export const registerFormSchema = z
  .object({
    username: z
      .string()
      .trim()
      .min(1, 'REQUIRED')
      .min(3, 'USERNAME_TOO_SHORT')
      .max(20, 'USERNAME_TOO_LONG')
      .regex(/^[A-Za-z0-9_]+$/, 'USERNAME_INVALID_CHARS'),
    email: z.string().trim().min(1, 'REQUIRED').pipe(z.email('EMAIL_INVALID')),
    password: z
      .string()
      .min(1, 'REQUIRED')
      .min(8, 'PASSWORD_TOO_SHORT')
      .refine((p) => new TextEncoder().encode(p).length <= 72, 'PASSWORD_TOO_LONG')
      .regex(/[A-Za-z]/, 'PASSWORD_NEEDS_LETTER')
      .regex(/\d/, 'PASSWORD_NEEDS_DIGIT'),
    confirmPassword: z.string().min(1, 'REQUIRED'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'PASSWORDS_DONT_MATCH',
    path: ['confirmPassword'],
  });

export type LoginFormValues = z.infer<typeof loginFormSchema>;
export type RegisterFormValues = z.infer<typeof registerFormSchema>;
