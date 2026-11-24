import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    env: {
      NODE_ENV: 'test',
      // Tests use their own database (created by docker-compose). CI overrides it.
      DATABASE_URL:
        process.env.DATABASE_URL_TEST ??
        'postgresql://silent:silent_dev_password@localhost:5433/silentleveling_test',
      CLIENT_ORIGIN: 'http://localhost:5173',
    },
  },
});
