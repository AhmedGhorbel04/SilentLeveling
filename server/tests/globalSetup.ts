import { execSync } from 'node:child_process';
import { testDatabaseUrl } from './testDatabaseUrl.js';

// Runs once before all test files: brings the test database schema up to date
// by applying the same migrations that production uses.
export default function setup() {
  execSync('npx prisma migrate deploy', {
    env: { ...process.env, DATABASE_URL: testDatabaseUrl },
    stdio: 'pipe',
  });
}
