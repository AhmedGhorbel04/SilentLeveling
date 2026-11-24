import { execSync } from 'node:child_process';
import { testDatabaseUrl } from './testDatabaseUrl.js';

// Runs once before all test files: brings the test database schema up to date
// (same migrations as production) and writes the reference data (titles,
// achievements, quest templates).
export default function setup() {
  const options = {
    env: { ...process.env, DATABASE_URL: testDatabaseUrl },
    stdio: 'pipe' as const,
  };
  execSync('npx prisma migrate deploy', options);
  execSync('npx tsx prisma/seed.ts', options);
}
