import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AchievementsPage } from './AchievementsPage';
import { NotificationBell } from './NotificationBell';
import { jsonResponse, renderWithProviders } from '../../test/renderWithProviders';
import en from '../../i18n/locales/en.json';
import type { Achievement, AppNotification, Title } from '../../api/achievements';

afterEach(() => {
  vi.unstubAllGlobals();
});

const ironWill: Title = {
  id: 't1',
  key: 'iron_will',
  name: { en: 'Iron Will', fr: 'Volonté de fer', ar: 'الإرادة الحديدية' },
  rarity: 'EPIC',
};

const achievements: Achievement[] = [
  { code: 'FIRST_STEP', unlockedAt: '2026-11-24T10:00:00Z', title: null },
  { code: 'STREAK_30', unlockedAt: '2026-11-24T10:00:00Z', title: ironWill },
  { code: 'RANK_S', unlockedAt: null, title: null },
];

// GET requests get fake data by URL; other requests are recorded
function mockApi(routes: Record<string, unknown>) {
  const fetchMock = vi.fn<typeof fetch>((url, init) => {
    if (init?.method && init.method !== 'GET')
      return Promise.resolve(new Response(null, { status: 204 }));
    return jsonResponse(200, routes[String(url)] ?? {});
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

const writes = (fetchMock: ReturnType<typeof mockApi>) =>
  fetchMock.mock.calls
    .filter(([, init]) => init?.method && init.method !== 'GET')
    .map(([url, init]) => `${init!.method} ${String(url)} ${init!.body ?? ''}`.trim());

describe('achievement texts', () => {
  it('exist for every achievement code', () => {
    const codes = [
      'FIRST_STEP',
      'AWAKENED',
      'STREAK_7',
      'STREAK_30',
      'STREAK_100',
      'QUESTS_100',
      'EARLY_RISER',
      'REDEMPTION',
      'ALLY',
      'RANK_C',
      'RANK_B',
      'RANK_A',
      'RANK_S',
      'FIRST_LEGENDARY',
    ];
    expect(Object.keys(en.achievements).sort()).toEqual(codes.sort());
  });
});

describe('AchievementsPage', () => {
  it('shows unlocked and locked achievements and the title they grant', async () => {
    mockApi({
      '/api/achievements': { achievements },
      '/api/me/titles': { titles: [], activeTitleId: null },
    });
    renderWithProviders(<AchievementsPage />);

    expect(await screen.findByText('2 / 3 unlocked')).toBeInTheDocument();
    const rankS = screen.getByText('Rank S').closest('li')!;
    expect(within(rankS).getByText('Locked')).toBeInTheDocument();
    expect(screen.getByText('Title: Iron Will (Epic)')).toBeInTheDocument();
    expect(screen.getByText('Unlock achievements to earn titles.')).toBeInTheDocument();
  });

  it('chooses the active title among earned titles, or none', async () => {
    const fetchMock = mockApi({
      '/api/achievements': { achievements },
      '/api/me/titles': {
        titles: [{ ...ironWill, earnedAt: '2026-11-24T10:00:00Z' }],
        activeTitleId: null,
      },
    });
    renderWithProviders(<AchievementsPage />);

    const radios = await screen.findAllByRole('radio');
    expect(radios).toHaveLength(2); // "No title" + Iron Will
    expect(radios[0]).toBeChecked();

    await userEvent.click(radios[1]!);

    expect(writes(fetchMock)).toEqual(['PUT /api/me/active-title {"titleId":"t1"}']);
  });
});

describe('NotificationBell', () => {
  const notifications: AppNotification[] = [
    {
      id: 'n1',
      type: 'ACHIEVEMENT_UNLOCKED',
      data: { code: 'STREAK_7' },
      read: false,
      createdAt: '2026-11-24T10:00:00Z',
    },
    {
      id: 'n2',
      type: 'RANK_UP',
      data: { rank: 'C4' },
      read: true,
      createdAt: '2026-11-23T10:00:00Z',
    },
  ];

  it('shows the unread count and the notifications in the selected language', async () => {
    mockApi({ '/api/notifications': { notifications, unreadCount: 1 } });
    renderWithProviders(<NotificationBell />);

    const bell = await screen.findByRole('button', { name: 'Notifications, unread: 1' });
    await userEvent.click(bell);

    expect(screen.getByText('Achievement unlocked: One week strong')).toBeInTheDocument();
    expect(screen.getByText('New rank: C IV')).toBeInTheDocument();
  });

  it('marks one or all notifications as read, and closes with Escape', async () => {
    const fetchMock = mockApi({ '/api/notifications': { notifications, unreadCount: 1 } });
    renderWithProviders(<NotificationBell />);

    await userEvent.click(await screen.findByRole('button', { name: /Notifications/ }));
    await userEvent.click(screen.getByText('Achievement unlocked: One week strong'));
    await userEvent.click(screen.getByRole('button', { name: 'Mark all as read' }));

    expect(writes(fetchMock)).toEqual([
      'POST /api/notifications/n1/read',
      'POST /api/notifications/read-all',
    ]);

    await userEvent.keyboard('{Escape}');
    expect(screen.queryByText('New rank: C IV')).not.toBeInTheDocument();
  });

  it('shows an empty state', async () => {
    mockApi({ '/api/notifications': { notifications: [], unreadCount: 0 } });
    renderWithProviders(<NotificationBell />);

    await userEvent.click(await screen.findByRole('button', { name: 'Notifications, unread: 0' }));

    expect(screen.getByText('No notifications yet.')).toBeInTheDocument();
  });
});
