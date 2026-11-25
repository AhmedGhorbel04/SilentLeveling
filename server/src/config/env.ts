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
  // How many proxies sit in front of the API in production (Render's, plus Vercel's
  // rewrite = 2). Needed so req.ip is the real visitor, for rate limiting.
  TRUST_PROXY_HOPS: z.coerce.number().int().min(0).default(1),
  // Max login/register attempts per IP per 15 minutes
  AUTH_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(10),
  // Optional: email the admin when a claim is submitted (Resend). Without them,
  // the email is only logged to the console.
  RESEND_API_KEY: z.string().optional(),
  ADMIN_EMAIL: z.email().optional(),
  MAIL_FROM: z.string().default('SilentLeveling <onboarding@resend.dev>'),
  // Optional: push notifications (quest reminders). Generate the pair once with
  // `npx web-push generate-vapid-keys`. Without them, reminders are unavailable.
  VAPID_PUBLIC_KEY: z.string().optional(),
  VAPID_PRIVATE_KEY: z.string().optional(),
  // Who push services can contact about this app (a URL or mailto:)
  VAPID_SUBJECT: z.string().default('https://silentleveling.vercel.app'),
  // Secret the scheduled job sends to POST /api/cron/reminders
  CRON_SECRET: z.string().min(32, 'CRON_SECRET must be at least 32 characters').optional(),
});

// Hosting dashboards often save an optional field left blank as "": treat it as unset
const definedEnv = Object.fromEntries(
  Object.entries(process.env).filter(([, value]) => value !== ''),
);

const parsed = envSchema.safeParse(definedEnv);

if (!parsed.success) {
  console.error('Invalid environment variables:', z.flattenError(parsed.error).fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
export const isProduction = env.NODE_ENV === 'production';
