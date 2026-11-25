import 'dotenv/config';
import { defineConfig } from 'prisma/config';

// Prisma CLI configuration (used by `prisma migrate`, `prisma generate`, `prisma studio`).
export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'tsx prisma/seed.ts',
  },
  // Read loosely: `prisma generate` runs on every install (postinstall), including on
  // Vercel which only builds the frontend and has no database. Commands that do
  // connect (migrate, seed, studio) still fail clearly without it.
  datasource: {
    url: process.env.DATABASE_URL ?? '',
  },
});
