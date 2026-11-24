import request from 'supertest';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../../src/app.js';
import { prisma } from '../../src/lib/prisma.js';
import { resetDatabase } from '../helpers/database.js';

const app = createApp();

const validPlayer = {
  username: 'Shadow_Player',
  email: 'player@example.com',
  password: 'secret123',
  language: 'fr',
  timezone: 'Africa/Tunis',
};

function register(overrides: Partial<typeof validPlayer> = {}) {
  return request(app)
    .post('/api/auth/register')
    .send({ ...validPlayer, ...overrides });
}

function getCookie(res: request.Response): string {
  const cookies = res.headers['set-cookie'] as unknown as string[] | undefined;
  return cookies?.find((c) => c.startsWith('sl_token=')) ?? '';
}

beforeEach(async () => {
  await resetDatabase();
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe('POST /api/auth/register', () => {
  it('creates the account, logs the player in and never returns the password', async () => {
    const res = await register();

    expect(res.status).toBe(201);
    expect(res.body.user).toMatchObject({
      username: 'Shadow_Player',
      email: 'player@example.com',
      role: 'PLAYER',
      language: 'fr',
      timezone: 'Africa/Tunis',
      onboarded: false,
    });
    expect(JSON.stringify(res.body)).not.toContain('secret123');
    expect(res.body.user).not.toHaveProperty('passwordHash');

    const cookie = getCookie(res);
    expect(cookie).toContain('HttpOnly');
    expect(cookie).toContain('SameSite=Lax');
  });

  it('stores a bcrypt hash, not the password', async () => {
    await register();

    const user = await prisma.user.findUniqueOrThrow({ where: { email: 'player@example.com' } });
    expect(user.passwordHash).not.toBe('secret123');
    expect(user.passwordHash).toMatch(/^\$2[aby]\$12\$/);
  });

  it('normalizes the email to lowercase', async () => {
    const res = await register({ email: '  Player@Example.COM ' });

    expect(res.status).toBe(201);
    expect(res.body.user.email).toBe('player@example.com');
  });

  it('rejects an email that is already registered', async () => {
    await register();
    const res = await register({ username: 'another_name' });

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('EMAIL_TAKEN');
  });

  it('treats usernames as case-insensitive', async () => {
    await register();
    const res = await register({ username: 'SHADOW_player', email: 'other@example.com' });

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('USERNAME_TAKEN');
  });

  it('returns one error code per invalid field', async () => {
    const res = await register({
      username: 'a!',
      email: 'not-an-email',
      password: 'onlyletters',
      timezone: 'Mars/Olympus',
    });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.error.details).toEqual({
      username: 'USERNAME_TOO_SHORT',
      email: 'EMAIL_INVALID',
      password: 'PASSWORD_NEEDS_DIGIT',
      timezone: 'TIMEZONE_INVALID',
    });
  });

  it('rejects passwords longer than 72 bytes (bcrypt limit)', async () => {
    const res = await register({ password: 'a1' + 'x'.repeat(71) });

    expect(res.status).toBe(400);
    expect(res.body.error.details.password).toBe('PASSWORD_TOO_LONG');
  });

  it('ignores fields the player is not allowed to set, like role', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ ...validPlayer, role: 'ADMIN' });

    expect(res.status).toBe(201);
    expect(res.body.user.role).toBe('PLAYER');
  });
});

describe('POST /api/auth/login', () => {
  beforeEach(async () => {
    await register();
  });

  it('logs in with the email', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ identifier: 'player@example.com', password: 'secret123' });

    expect(res.status).toBe(200);
    expect(res.body.user.username).toBe('Shadow_Player');
    expect(getCookie(res)).toContain('sl_token=');
  });

  it('logs in with the username, in any case', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ identifier: 'shadow_PLAYER', password: 'secret123' });

    expect(res.status).toBe(200);
  });

  it('gives the same error for a wrong password and an unknown account', async () => {
    const wrongPassword = await request(app)
      .post('/api/auth/login')
      .send({ identifier: 'player@example.com', password: 'wrong-password1' });
    const unknownUser = await request(app)
      .post('/api/auth/login')
      .send({ identifier: 'nobody@example.com', password: 'secret123' });

    expect(wrongPassword.status).toBe(401);
    expect(unknownUser.status).toBe(401);
    expect(wrongPassword.body.error.code).toBe('INVALID_CREDENTIALS');
    expect(unknownUser.body.error.code).toBe('INVALID_CREDENTIALS');
  });
});

describe('GET /api/auth/me and POST /api/auth/logout', () => {
  it('requires a login cookie', async () => {
    const res = await request(app).get('/api/auth/me');

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHENTICATED');
  });

  it('returns the logged-in player, then nothing after logout', async () => {
    const agent = request.agent(app); // keeps cookies between requests, like a browser
    await agent.post('/api/auth/register').send(validPlayer);

    const me = await agent.get('/api/auth/me');
    expect(me.status).toBe(200);
    expect(me.body.user.username).toBe('Shadow_Player');

    const logout = await agent.post('/api/auth/logout');
    expect(logout.status).toBe(204);

    const afterLogout = await agent.get('/api/auth/me');
    expect(afterLogout.status).toBe(401);
  });

  it('rejects a tampered token', async () => {
    const cookie = getCookie(await register());
    const [token] = cookie.replace('sl_token=', '').split(';');
    const tampered = token!.slice(0, -2) + (token!.endsWith('AA') ? 'BB' : 'AA');

    const res = await request(app).get('/api/auth/me').set('Cookie', `sl_token=${tampered}`);

    expect(res.status).toBe(401);
  });

  it('rejects the token of a deleted account', async () => {
    const cookie = getCookie(await register());
    await prisma.user.deleteMany();

    const res = await request(app).get('/api/auth/me').set('Cookie', cookie.split(';')[0]!);

    expect(res.status).toBe(401);
  });
});

describe('rate limiting', () => {
  it('blocks login attempts after the limit', async () => {
    const limitedApp = createApp({ authRateLimitMax: 3 });
    const attempt = () =>
      request(limitedApp)
        .post('/api/auth/login')
        .send({ identifier: 'player@example.com', password: 'wrong-password1' });

    for (let i = 0; i < 3; i++) {
      expect((await attempt()).status).toBe(401);
    }
    const blocked = await attempt();

    expect(blocked.status).toBe(429);
    expect(blocked.body.error.code).toBe('TOO_MANY_REQUESTS');
  });
});
