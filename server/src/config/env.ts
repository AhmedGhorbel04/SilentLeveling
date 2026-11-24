import 'dotenv/config';
import { z } from 'zod';

// All environment variables are validated once, at startup.
// If one is missing or invalid, the server refuses to start with a clear message
// instead of failing later in an unexpected place.
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  DATABASE_URL: z.url(),
  CLIENT_ORIGIN: z.url().default('http://localhost:5173'),
  // Secret used to sign login tokens. Anyone who knows it can create valid tokens,
  // so it must be long, random, and different in every environment.
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  // Max login/register attempts per IP per 15 minutes
  AUTH_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(10),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('Invalid environment variables:', z.flattenError(parsed.error).fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
export const isProduction = env.NODE_ENV === 'production';
