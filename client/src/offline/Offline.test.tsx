import { act, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { onlineManager } from '@tanstack/react-query';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { TodayQuests } from '../features/quests/TodayQuests';
import { OfflineBanner } from './OfflineBanner';
import { syncNowFor } from './queryClient';
import { jsonResponse, renderWithProviders } from '../test/renderWithProviders';
import type { Quest, TodayQuests as TodayQuestsData } from '../api/quests';

afterEach(() => {
  act(() => onlineManager.setOnline(true));
  vi.unstubAllGlobals();
});

const quest = (id: string, en: string): Quest => ({
  id,
  source: 'SYSTEM',
  type: 'DAILY',
  category: 'READING',
  difficulty: 'NORMAL',
  minutes: 20,
  xpReward: 40,
  xpAwarded: null,
  status: 'ACTIVE',
  questDate: '2026-11-24',
  dueAt: '2026-11-25T00:00:00Z',
  completedAt: null,
  title: { en, fr: en, ar: en },
  description: null,
  milestone: null,
  rerollable: false,
});

const today: TodayQuestsData = {
  date: '2026-11-24',
  daily: [quest('q1', 'Read 10 pages'), quest('q2', 'Run 3 km')],
  weekly: [],
  penalty: [],
  custom: [],
  rerollsLeft: 3,
  customXpRemaining: 150,
};

describe('offline mode', () => {
  it('queues completions offline, shows them, and syncs them in order when back', async () => {
    const fetchMock = vi.fn<typeof fetch>((url) =>
      String(url).endsWith('/complete') ? jsonResponse(200, {}) : jsonResponse(200, today),
    );
    vi.stubGlobal('fetch', fetchMock);
    const { queryClient } = renderWithProviders(
      <>
        <OfflineBanner />
        <TodayQuests />
      </>,
    );
    const button = async (title: string) =>
      screen.findByRole('button', { name: `Complete: ${title}` });
    await button('Read 10 pages');

    act(() => onlineManager.setOnline(false));
    expect(screen.getByText(/^You're offline\. You can still/)).toBeInTheDocument();

    await userEvent.click(await button('Read 10 pages'));
    await userEvent.click(await button('Run 3 km'));

    // Shown as done right away, nothing sent yet
    expect(await button('Read 10 pages')).toBeDisabled();
    expect(await button('Run 3 km')).toBeDisabled();
    expect(screen.getByText('2/2 completed', { exact: false })).toBeInTheDocument();
    expect(screen.getByText(/2 changes will sync/)).toBeInTheDocument();
    const completions = () =>
      fetchMock.mock.calls.filter(([url]) => String(url).endsWith('/complete'));
    expect(completions()).toHaveLength(0);

    await act(async () => {
      onlineManager.setOnline(true);
      await syncNowFor(queryClient);
    });

    // Sent in order, each with the moment it really happened
    expect(completions().map(([url]) => url)).toEqual([
      '/api/quests/q1/complete',
      '/api/quests/q2/complete',
    ]);
    for (const [, init] of completions()) {
      expect(JSON.parse(init!.body as string).completedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    }
    // Then everything is reloaded from the server, after the queue
    const lastCompletion = fetchMock.mock.calls.findLastIndex(([url]) =>
      String(url).endsWith('/complete'),
    );
    const reloads = fetchMock.mock.calls
      .slice(lastCompletion + 1)
      .filter(([url]) => url === '/api/quests/today');
    expect(reloads.length).toBeGreaterThan(0);
    await waitFor(() => expect(screen.queryByText(/offline|Syncing/)).not.toBeInTheDocument());
  });

  it('sends no completedAt when online', async () => {
    const fetchMock = vi.fn<typeof fetch>((url) =>
      String(url).endsWith('/complete') ? jsonResponse(200, {}) : jsonResponse(200, today),
    );
    vi.stubGlobal('fetch', fetchMock);
    renderWithProviders(<TodayQuests />);

    await userEvent.click(await screen.findByRole('button', { name: 'Complete: Read 10 pages' }));

    const call = fetchMock.mock.calls.find(([url]) => String(url).endsWith('/complete'))!;
    expect(call[1]!.body).toBeUndefined();
  });
});
