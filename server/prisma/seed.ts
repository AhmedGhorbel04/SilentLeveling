import 'dotenv/config';
import { pathToFileURL } from 'node:url';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client.js';
import { ACHIEVEMENTS, LEGENDARY_QUESTS, TITLES } from '../src/game/catalog.js';
import { QUEST_TEMPLATES } from './data/questTemplates.js';

// Writes the reference data every environment needs (titles, achievements).
// Uses upserts, so running it again updates the rows instead of duplicating them.
// Run with `npm run db:seed -w server`.
export async function seed(prisma: PrismaClient): Promise<void> {
  for (const title of TITLES) {
    await prisma.title.upsert({
      where: { key: title.key },
      create: { key: title.key, rarity: title.rarity, name: title.name },
      update: { rarity: title.rarity, name: title.name },
    });
  }

  const titleIds = new Map(
    (await prisma.title.findMany({ select: { id: true, key: true } })).map((t) => [t.key, t.id]),
  );

  for (const achievement of ACHIEVEMENTS) {
    const titleId = achievement.titleKey ? titleIds.get(achievement.titleKey) : null;
    if (titleId === undefined) {
      throw new Error(`Unknown title "${achievement.titleKey}" for ${achievement.code}`);
    }
    await prisma.achievement.upsert({
      where: { code: achievement.code },
      create: { code: achievement.code, titleId },
      update: { titleId },
    });
  }

  for (const { key, ...template } of QUEST_TEMPLATES) {
    await prisma.questTemplate.upsert({
      where: { key },
      create: { key, ...template },
      update: template,
    });
  }

  for (const { key, titleKey, ...quest } of LEGENDARY_QUESTS) {
    const titleId = titleIds.get(titleKey);
    if (!titleId) throw new Error(`Unknown title "${titleKey}" for legendary quest ${key}`);
    await prisma.legendaryQuest.upsert({
      where: { key },
      create: { key, titleId, ...quest },
      update: { titleId, ...quest },
    });
  }
}

// Only runs when executed as a script, not when imported by a test
if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
  });
  seed(prisma)
    .then(() =>
      console.log(
        `Seeded ${TITLES.length} titles, ${ACHIEVEMENTS.length} achievements and ` +
          `${QUEST_TEMPLATES.length} quest templates`,
      ),
    )
    .finally(() => prisma.$disconnect());
}
