import { prisma } from '../../src/lib/prisma.js';

let counter = 0;

// Creates a player directly in the database (faster than going through the API,
// which hashes the password). Use it when a test is not about registration itself.
export async function createTestUser(overrides: { username?: string; timezone?: string } = {}) {
  counter++;
  const username = overrides.username ?? `player_${counter}`;

  return prisma.user.create({
    data: {
      username,
      usernameNormalized: username.toLowerCase(),
      email: `${username.toLowerCase()}@example.com`,
      passwordHash: 'not-a-real-hash',
      timezone: overrides.timezone ?? 'UTC',
      stats: { create: {} },
    },
  });
}
