import type { RequestHandler } from 'express';
import type { ZodType } from 'zod';
import { AppError } from '../utils/AppError.js';

// Validates req.body against a Zod schema. On success, req.body is replaced by the
// parsed (cleaned) data: trimmed strings, defaults applied, unknown fields removed.
// On failure, responds 400 with one error code per field, e.g.
// { "username": "USERNAME_TOO_SHORT", "password": "PASSWORD_NEEDS_DIGIT" }.
export function validateBody(schema: ZodType): RequestHandler {
  return (req, _res, next) => {
    const result = schema.safeParse(req.body ?? {});

    if (!result.success) {
      const details: Record<string, string> = {};
      for (const issue of result.error.issues) {
        const field = issue.path.join('.') || '_';
        details[field] ??= issue.message; // keep the first error of each field
      }
      throw new AppError(400, 'VALIDATION_ERROR', 'Invalid input', details);
    }

    req.body = result.data;
    next();
  };
}
