// Tests use their own database (created by docker-compose), never the development one.
// CI provides its own URL through DATABASE_URL_TEST.
export const testDatabaseUrl =
  process.env.DATABASE_URL_TEST ??
  'postgresql://silent:silent_dev_password@localhost:5433/silentleveling_test';
