import { prisma } from '../../src/lib/prisma.js';

// Reference data written once by the seed (in globalSetup) and never changed by tests
const REFERENCE_TABLES = [
  '_prisma_migrations',
  'titles',
  'achievements',
  'quest_templates',
  'legendary_quests',
];

// Empties every table holding player data so each test starts from a clean state
// and tests cannot affect each other.
export async function resetDatabase(): Promise<void> {
  const tables = await prisma.$queryRaw<{ tablename: string }[]>`
    SELECT tablename FROM pg_tables WHERE schemaname = 'public'
  `;
  const toEmpty = tables.map((t) => t.tablename).filter((t) => !REFERENCE_TABLES.includes(t));
  if (toEmpty.length === 0) return;

  const list = toEmpty.map((t) => `"public"."${t}"`).join(', ');
  await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${list} RESTART IDENTITY CASCADE`);
  // Titles an admin created while approving a claim are not reference data
  await prisma.title.deleteMany({ where: { key: { startsWith: 'custom_' } } });
}
