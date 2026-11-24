import bcrypt from 'bcryptjs';

// Cost factor 12 = 2^12 hashing rounds (~250 ms). Slow on purpose: it makes
// guessing passwords from a stolen database extremely expensive.
const SALT_ROUNDS = 12;

export function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

// Used when a login targets a user that does not exist: we still run a bcrypt
// comparison so the response takes the same time. Otherwise an attacker could
// measure response times to discover which emails are registered.
let dummyHash: Promise<string> | undefined;

export async function fakePasswordCheck(password: string): Promise<void> {
  dummyHash ??= bcrypt.hash('dummy-password-for-timing', SALT_ROUNDS);
  await bcrypt.compare(password, await dummyHash);
}
