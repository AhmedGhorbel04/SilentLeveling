import { defineConfig } from 'vitest/config';
import { testDatabaseUrl } from './tests/testDatabaseUrl.js';

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    globalSetup: ['./tests/globalSetup.ts'],
    // Test files share one database, so they run one after another
    fileParallelism: false,
    env: {
      NODE_ENV: 'test',
      DATABASE_URL: testDatabaseUrl,
      CLIENT_ORIGIN: 'http://localhost:5173',
      JWT_SECRET: 'test-secret-that-is-at-least-32-characters-long',
      // High limit so normal tests are never blocked; the rate-limit test sets its own
      AUTH_RATE_LIMIT_MAX: '1000',
    },
  },
});
