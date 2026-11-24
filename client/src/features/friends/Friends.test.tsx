import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { FriendsPage } from './FriendsPage';
import { ProfilePage } from './ProfilePage';
import { jsonResponse, renderWithProviders } from '../../test/renderWithProviders';
import type { FullProfile, PlayerCard, Profile, RankingEntry } from '../../api/friends';

afterEach(() => {
  vi.unstubAllGlobals();
});

const card = (username: string, changes: Partial<PlayerCard> = {}): PlayerCard => ({
  username,
  avatarKey: 'sigil-1',
  level: 3,
  rank: { code: 'E3', label: 'E III' },
  totalXp: 250,
  streak: 2,
  activeTitle: null,
  ...changes,
});

const entry = (
  position: number,
  player: PlayerCard,
  weeklyXp: number,
  isMe = false,
): RankingEntry => ({
  ...player,
  position,
  weeklyXp,
  titleScore: 0,
  isMe,
});

// GET requests get fake data by URL (or a function of it); other requests are recorded
function mockApi(
  routes: Record<string, unknown>,
  writes: Record<string, () => Promise<Response>> = {},
) {
  const fetchMock = vi.fn<typeof fetch>((url, init) => {
    const method = init?.method ?? 'GET';
    const key = `${method} ${String(url)}`;
    if (writes[key]) return writes[key]!();
    if (method !== 'GET') return Promise.resolve(new Response(null, { status: 204 }));
    return jsonResponse(200, routes[String(url)] ?? {});
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

const writeCalls = (fetchMock: ReturnType<typeof mockApi>) =>
  fetchMock.mock.calls
    .filter(([, init]) => init?.method && init.method !== 'GET')
    .map(([url, init]) => `${init!.method} ${String(url)} ${init!.body ?? ''}`.trim());

const friendsData = {
  '/api/friends': { friends: [card('Bob')] },
  '/api/friends/requests': {
    incoming: [{ id: 'r1', createdAt: '2026-11-24T10:00:00Z', player: card('Carol') }],
    outgoing: [],
  },
  '/api/friends/ranking?period=weekly': {
    players: [entry(1, card('Bob'), 120), entry(2, card('Alice'), 80, true)],
  },
  '/api/friends/ranking?period=all': {
    players: [entry(1, card('Alice', { totalXp: 9000 }), 80, true), entry(2, card('Bob'), 120)],
  },
};

describe('FriendsPage', () => {
  it('shows the weekly ranking, and switches to all time', async () => {
    mockApi(friendsData);
    renderWithProviders(<FriendsPage />);

    expect(await screen.findByText('120 XP')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'All time' }));

    expect(await screen.findByText('9,000 XP')).toBeInTheDocument();
  });

  it('sends a request by username and shows a translated error', async () => {
    const fetchMock = mockApi(friendsData, {
      'POST /api/friends/requests': () => jsonResponse(404, { error: { code: 'USER_NOT_FOUND' } }),
    });
    renderWithProviders(<FriendsPage />);

    await userEvent.type(await screen.findByLabelText('Exact username'), 'nobody');
    await userEvent.click(screen.getByRole('button', { name: 'Send' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('No player with this username');
    expect(writeCalls(fetchMock)).toEqual(['POST /api/friends/requests {"username":"nobody"}']);
  });

  it('accepts a received request', async () => {
    const fetchMock = mockApi(friendsData);
    renderWithProviders(<FriendsPage />);

    const received = await screen.findByRole('heading', { name: 'Requests received: 1' });
    const section = received.closest('section')!;
    await userEvent.click(within(section).getByRole('button', { name: 'Accept' }));

    expect(writeCalls(fetchMock)).toEqual(['POST /api/friends/requests/r1/accept']);
  });
});

describe('ProfilePage', () => {
  function showProfile(profile: Profile) {
    const fetchMock = mockApi({ '/api/users/Bob': profile });
    renderWithProviders(
      <Routes>
        <Route path="/u/:username" element={<ProfilePage />} />
      </Routes>,
      { route: '/u/Bob' },
    );
    return fetchMock;
  }

  it('shows only a mini card and an "add friend" button to non-friends', async () => {
    const fetchMock = showProfile({
      visibility: 'CARD',
      relationship: { type: 'NONE', requestId: null },
      username: 'Bob',
      avatarKey: 'sigil-2',
      rank: { code: 'D4', label: 'D IV' },
    });

    expect(await screen.findByText('Only friends can see the full profile.')).toBeInTheDocument();
    expect(screen.queryByText('Stats')).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: '+ Add friend' }));
    expect(writeCalls(fetchMock)).toEqual(['POST /api/friends/requests {"username":"Bob"}']);
  });

  it('offers to accept when the player sent us a request', async () => {
    showProfile({
      visibility: 'CARD',
      relationship: { type: 'REQUEST_RECEIVED', requestId: 'r9' },
      username: 'Bob',
      avatarKey: null,
      rank: { code: 'E4', label: 'E IV' },
    });

    expect(await screen.findByRole('button', { name: 'Accept' })).toBeInTheDocument();
  });

  it('shows the full profile of a friend', async () => {
    const full: FullProfile = {
      visibility: 'FULL',
      relationship: { type: 'FRIEND', requestId: null },
      username: 'Bob',
      avatarKey: 'sigil-3',
      rank: { code: 'C4', label: 'C IV' },
      bio: 'Learning Spring Boot',
      activeTitle: null,
      level: 22,
      totalXp: 9000,
      stats: { strength: 10, intelligence: 40, discipline: 20, consistency: 5 },
      streak: { current: 12, best: 30 },
      disciplineRate: 91,
      achievements: [{ code: 'STREAK_7', unlockedAt: '2026-11-20T10:00:00Z' }],
      titles: [],
      friendsCount: 4,
      memberSince: '2026-09-01T10:00:00Z',
    };
    showProfile(full);

    expect(await screen.findByText('Learning Spring Boot')).toBeInTheDocument();
    expect(screen.getByText('91%')).toBeInTheDocument();
    expect(screen.getByText('One week strong')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Remove' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Edit' })).not.toBeInTheDocument(); // not my bio
  });

  it('shows a translated error for an unknown player', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => jsonResponse(404, { error: { code: 'USER_NOT_FOUND' } })),
    );
    renderWithProviders(
      <Routes>
        <Route path="/u/:username" element={<ProfilePage />} />
      </Routes>,
      { route: '/u/nobody' },
    );

    expect(await screen.findByRole('alert')).toHaveTextContent('No player with this username');
  });
});
