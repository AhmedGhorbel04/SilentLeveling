import { z, type ZodType } from 'zod';
import { AUTH_COOKIE } from '../utils/authToken.js';
import { registerSchema, loginSchema } from '../modules/auth/auth.schemas.js';
import { onboardingSchema } from '../modules/onboarding/onboarding.schemas.js';
import {
  createCustomQuestSchema,
  updateCustomQuestSchema,
} from '../modules/quests/customQuest.schemas.js';
import {
  createGoalSchema,
  createMilestoneSchema,
  updateGoalSchema,
  updateMilestoneSchema,
} from '../modules/goals/goal.schemas.js';
import {
  deviceSchema,
  reminderSettingsSchema,
  removeDeviceSchema,
} from '../modules/reminders/reminder.routes.js';
import { completeSchema } from '../modules/quests/quest.routes.js';
import { activeTitleSchema } from '../modules/achievements/achievement.routes.js';
import { bioSchema, sendRequestSchema } from '../modules/friends/friend.routes.js';
import {
  approveClaimSchema,
  legendaryQuestSchema,
  rejectClaimSchema,
  updateLegendaryQuestSchema,
  submitClaimSchema,
} from '../modules/claims/claim.schemas.js';

type Method = 'get' | 'post' | 'patch' | 'put' | 'delete';
type Access = 'public' | 'player' | 'admin';
type Route = {
  method: Method;
  path: string;
  tag: string;
  summary: string;
  access?: Access; // default: player
  body?: ZodType;
  query?: Record<string, string>;
  status?: number; // success status, default 200
};

const r = (
  method: Method,
  path: string,
  tag: string,
  summary: string,
  extra: Partial<Route> = {},
): Route => ({ method, path, tag, summary, ...extra });

// Every endpoint of the API. Request bodies come straight from the Zod schemas the
// routes validate with, so the documentation cannot drift from the real validation.
export const routes: Route[] = [
  r('get', '/health', 'System', 'API and database status', { access: 'public' }),
  r('get', '/ranks', 'System', 'All ranks and their requirements', { access: 'public' }),

  r('post', '/auth/register', 'Auth', 'Create an account and start a session', {
    access: 'public',
    body: registerSchema,
    status: 201,
  }),
  r('post', '/auth/login', 'Auth', 'Log in with username or email', {
    access: 'public',
    body: loginSchema,
  }),
  r('post', '/auth/logout', 'Auth', 'Clear the session cookie', { access: 'public', status: 204 }),
  r('get', '/auth/me', 'Auth', 'The logged-in player'),
  r('get', '/auth/session', 'Auth', 'The logged-in player, or null for a visitor', {
    access: 'public',
  }),
  r('post', '/onboarding', 'Auth', 'Choose focus areas and generate the first quests', {
    body: onboardingSchema,
  }),

  r('get', '/me/dashboard', 'Player', 'Status window: level, XP, rank, stats, streak'),
  r('get', '/me/xp-history', 'Player', 'XP earned per day', {
    query: { days: 'Number of days, 7 to 90 (default 30)' },
  }),
  r('get', '/me/calendar', 'Player', 'Daily logs of a month', {
    query: { month: 'Month as YYYY-MM' },
  }),
  r('get', '/me/titles', 'Player', 'Titles owned by the player'),
  r('put', '/me/active-title', 'Player', 'Show a title under the name (or none)', {
    body: activeTitleSchema,
  }),
  r('patch', '/me/profile', 'Player', 'Update the bio', { body: bioSchema }),

  r('get', '/me/reminders', 'Player', 'Reminder settings and the public push key'),
  r('patch', '/me/reminders', 'Player', 'Turn the daily reminder on or off, or change its time', {
    body: reminderSettingsSchema,
  }),
  r('post', '/push/devices', 'Player', 'Register this device for notifications', {
    body: deviceSchema,
    status: 204,
  }),
  r('delete', '/push/devices', 'Player', 'Stop notifications on this device', {
    body: removeDeviceSchema,
    status: 204,
  }),
  r('post', '/push/test', 'Player', 'Send a test notification to my devices'),
  r('post', '/cron/reminders', 'System', 'Send the reminders due now (scheduled job)', {
    access: 'public',
  }),

  r('get', '/quests/today', 'Quests', 'Daily quests of today and weekly quests of this week'),
  r('post', '/quests', 'Quests', 'Create a custom quest', {
    body: createCustomQuestSchema,
    status: 201,
  }),
  r('patch', '/quests/{id}', 'Quests', 'Edit a custom quest', { body: updateCustomQuestSchema }),
  r('delete', '/quests/{id}', 'Quests', 'Delete a custom quest', { status: 204 }),
  r('post', '/quests/{id}/complete', 'Quests', 'Complete a quest and receive its XP', {
    body: completeSchema,
  }),
  r('post', '/quests/{id}/reroll', 'Quests', 'Replace a daily quest (once per day)'),

  r('get', '/goals', 'Goals', 'Long-term goals with their milestones'),
  r('post', '/goals', 'Goals', 'Create a goal', { body: createGoalSchema, status: 201 }),
  r('patch', '/goals/{id}', 'Goals', 'Edit a goal', { body: updateGoalSchema }),
  r('delete', '/goals/{id}', 'Goals', 'Delete a goal', { status: 204 }),
  r('post', '/goals/{id}/milestones', 'Goals', 'Add a milestone', {
    body: createMilestoneSchema,
    status: 201,
  }),
  r('patch', '/milestones/{id}', 'Goals', 'Edit or complete a milestone', {
    body: updateMilestoneSchema,
  }),
  r('delete', '/milestones/{id}', 'Goals', 'Delete a milestone', { status: 204 }),

  r('get', '/achievements', 'Achievements', 'All achievements, unlocked or not'),
  r('get', '/notifications', 'Achievements', 'Latest notifications and unread count'),
  r('post', '/notifications/read-all', 'Achievements', 'Mark every notification as read', {
    status: 204,
  }),
  r('post', '/notifications/{id}/read', 'Achievements', 'Mark one notification as read', {
    status: 204,
  }),

  r('get', '/friends', 'Friends', 'Friends list'),
  r('get', '/friends/requests', 'Friends', 'Incoming and outgoing requests'),
  r('post', '/friends/requests', 'Friends', 'Send a friend request by username', {
    body: sendRequestSchema,
    status: 201,
  }),
  r('post', '/friends/requests/{id}/accept', 'Friends', 'Accept a request'),
  r('delete', '/friends/requests/{id}', 'Friends', 'Decline or cancel a request', {
    status: 204,
  }),
  r('get', '/friends/ranking', 'Friends', 'Ranking among friends'),
  r('delete', '/friends/{username}', 'Friends', 'Remove a friend', { status: 204 }),
  r('get', '/users/{username}', 'Friends', 'Public profile (more details for friends)'),

  r('get', '/legendary-quests', 'Legendary', 'Real-life achievements with my claim status'),
  r('get', '/claims/mine', 'Legendary', 'My claims'),
  r('post', '/claims', 'Legendary', 'Claim an achievement with a proof link', {
    body: submitClaimSchema,
    status: 201,
  }),

  r('get', '/admin/claims', 'Admin', 'Claims to review', {
    access: 'admin',
    query: { status: 'PENDING, APPROVED or REJECTED' },
  }),
  r('post', '/admin/claims/{id}/approve', 'Admin', 'Approve a claim: XP, tier and title', {
    access: 'admin',
    body: approveClaimSchema,
  }),
  r('post', '/admin/claims/{id}/reject', 'Admin', 'Reject a claim with a reason', {
    access: 'admin',
    body: rejectClaimSchema,
  }),
  r('get', '/admin/legendary-quests', 'Admin', 'Catalog including inactive quests', {
    access: 'admin',
  }),
  r('post', '/admin/legendary-quests', 'Admin', 'Create a legendary quest', {
    access: 'admin',
    body: legendaryQuestSchema,
    status: 201,
  }),
  r('patch', '/admin/legendary-quests/{id}', 'Admin', 'Edit a quest, or switch it on or off', {
    access: 'admin',
    body: updateLegendaryQuestSchema,
    status: 204,
  }),
  r('delete', '/admin/legendary-quests/{id}', 'Admin', 'Delete a quest nobody claimed', {
    access: 'admin',
    status: 204,
  }),
  r('get', '/admin/titles', 'Admin', 'All titles, to grant one on approval', { access: 'admin' }),
];

const errorResponse = { $ref: '#/components/responses/Error' };

function operation(route: Route) {
  const access = route.access ?? 'player';
  const pathParams = [...route.path.matchAll(/\{(\w+)\}/g)].map(([, name]) => ({
    name,
    in: 'path',
    required: true,
    schema: { type: 'string' },
  }));
  const queryParams = Object.entries(route.query ?? {}).map(([name, description]) => ({
    name,
    in: 'query',
    description,
    schema: { type: 'string' },
  }));
  const parameters = [...pathParams, ...queryParams];
  const status = route.status ?? 200;

  return {
    tags: [route.tag],
    summary: route.summary + (access === 'admin' ? ' (admin only)' : ''),
    ...(access === 'public' ? { security: [] } : {}),
    ...(parameters.length ? { parameters } : {}),
    ...(route.body && {
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: z.toJSONSchema(route.body, { io: 'input', unrepresentable: 'any' }),
          },
        },
      },
    }),
    responses: {
      [status]: { description: status === 204 ? 'Done, no content' : 'Success' },
      ...(route.body || queryParams.length ? { 400: errorResponse } : {}),
      ...(access !== 'public' ? { 401: errorResponse } : {}),
      ...(access === 'admin' ? { 403: errorResponse } : {}),
      ...(pathParams.length ? { 404: errorResponse } : {}),
    },
  };
}

export function buildOpenApiDocument() {
  const paths: Record<string, Partial<Record<Method, ReturnType<typeof operation>>>> = {};
  for (const route of routes) {
    (paths[route.path] ??= {})[route.method] = operation(route);
  }

  return {
    openapi: '3.1.0',
    info: {
      title: 'SilentLeveling API',
      version: '1.0.0',
      description:
        'REST API of SilentLeveling. The session is an HttpOnly cookie set by register and ' +
        'login, so "Try it out" works on this page once logged in. Errors always look like ' +
        '`{ "error": { "code", "message", "details" } }`; the frontend translates the codes.',
    },
    servers: [{ url: '/api' }],
    security: [{ cookieAuth: [] }],
    tags: [...new Set(routes.map((route) => route.tag))].map((name) => ({ name })),
    paths,
    components: {
      securitySchemes: { cookieAuth: { type: 'apiKey', in: 'cookie', name: AUTH_COOKIE } },
      responses: {
        Error: {
          description: 'Error with a stable code',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  error: {
                    type: 'object',
                    required: ['code', 'message'],
                    properties: {
                      code: { type: 'string' },
                      message: { type: 'string' },
                      details: { type: 'object', additionalProperties: { type: 'string' } },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  };
}
