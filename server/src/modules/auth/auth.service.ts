import { prisma } from '../../lib/prisma.js';
import type { User } from '../../generated/prisma/client.js';
import { AppError } from '../../utils/AppError.js';
import { fakePasswordCheck, hashPassword, verifyPassword } from '../../utils/password.js';
import type { LoginInput, RegisterInput } from './auth.schemas.js';

// What the API returns about the logged-in player. Never includes the password hash.
export type CurrentUser = {
  id: string;
  username: string;
  email: string;
  role: User['role'];
  language: User['language'];
  timezone: string;
  avatarKey: string | null;
  onboarded: boolean;
  createdAt: Date;
};

function toCurrentUser(user: User): CurrentUser {
  return {
    id: user.id,
    username: user.username,
    email: user.email,
    role: user.role,
    language: user.language,
    timezone: user.timezone,
    avatarKey: user.avatarKey,
    onboarded: user.onboardedAt !== null,
    createdAt: user.createdAt,
  };
}

export async function register(input: RegisterInput): Promise<CurrentUser> {
  const usernameNormalized = input.username.toLowerCase();

  // Check first so we can tell the player exactly which field is taken
  const existing = await prisma.user.findFirst({
    where: { OR: [{ email: input.email }, { usernameNormalized }] },
    select: { email: true },
  });
  if (existing) {
    throw existing.email === input.email
      ? new AppError(409, 'EMAIL_TAKEN', 'This email is already registered')
      : new AppError(409, 'USERNAME_TAKEN', 'This username is already taken');
  }

  try {
    const user = await prisma.user.create({
      data: {
        username: input.username,
        usernameNormalized,
        email: input.email,
        passwordHash: await hashPassword(input.password),
        language: input.language,
        timezone: input.timezone,
        stats: { create: {} }, // every player starts with all stats at 0
      },
    });
    return toCurrentUser(user);
  } catch (error) {
    // Two sign-ups with the same email at the same moment can both pass the check
    // above; the database unique constraint is the final guarantee (error P2002).
    if (isUniqueConstraintError(error)) {
      throw new AppError(409, 'ACCOUNT_EXISTS', 'Username or email already taken');
    }
    throw error;
  }
}

export async function login(input: LoginInput): Promise<CurrentUser> {
  const identifier = input.identifier.toLowerCase();
  const user = await prisma.user.findUnique({
    where: identifier.includes('@') ? { email: identifier } : { usernameNormalized: identifier },
  });

  if (!user) {
    await fakePasswordCheck(input.password);
    throw invalidCredentials();
  }
  if (!(await verifyPassword(input.password, user.passwordHash))) {
    throw invalidCredentials();
  }

  return toCurrentUser(user);
}

export async function getCurrentUser(userId: string): Promise<CurrentUser | null> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  return user ? toCurrentUser(user) : null;
}

// Same error for "unknown user" and "wrong password", so the response
// does not reveal which accounts exist.
function invalidCredentials() {
  return new AppError(401, 'INVALID_CREDENTIALS', 'Wrong username/email or password');
}

function isUniqueConstraintError(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2002';
}
