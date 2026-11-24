import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client.js';

// Gives the ADMIN role to an existing player. There is deliberately no API for this:
// admins are created by whoever has access to the server.
// Usage: npm run make-admin -w server -- <username>
const username = process.argv[2];
if (!username) {
  console.error('Usage: npm run make-admin -w server -- <username>');
  process.exit(1);
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
});

const { count } = await prisma.user.updateMany({
  where: { usernameNormalized: username.toLowerCase() },
  data: { role: 'ADMIN' },
});
console.log(count ? `${username} is now an admin` : `No player named ${username}`);
await prisma.$disconnect();
