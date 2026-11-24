import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ProgressPage } from './ProgressPage';
import { jsonResponse, renderWithProviders } from '../../test/renderWithProviders';

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

const history = (days: number) =>
  Array.from({ length: days }, (_, i) => ({
    date: new Date(Date.UTC(2026, 10, 25 - days + 1 + i)).toISOString().slice(0, 10),
    xp: i % 2 === 0 ? 0 : 60,
  }));

function mockApi() {
  const fetchMock = vi.fn<typeof fetch>((url) => {
    const path = String(url);
    if (path.startsWith('/api/me/xp-history')) {
      return jsonResponse(200, { days: history(Number(path.split('=')[1])) });
    }
    return jsonResponse(200, {
      days: [
        { date: '2026-11-03', questsTotal: 4, questsCompleted: 4, allCompleted: true },
        { date: '2026-11-04', questsTotal: 4, questsCompleted: 1, allCompleted: false },
      ],
    });
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

describe('ProgressPage', () => {
  it('shows the XP totals and loads another period on demand', async () => {
    const fetchMock = mockApi();
    renderWithProviders(<ProgressPage />);

    // 7 days: 3 days with 60 XP
    await userEvent.click(await screen.findByRole('button', { name: '7 days' }));
    expect(await screen.findByText('180')).toBeInTheDocument();
    expect(screen.getByText('3 / 7')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '7 days' })).toHaveAttribute('aria-pressed', 'true');
    expect(fetchMock).toHaveBeenCalledWith('/api/me/xp-history?days=7', expect.anything());
  });

  it('describes each calendar day for screen readers', async () => {
    vi.useFakeTimers({ toFake: ['Date'], now: new Date(2026, 10, 25, 12) });
    mockApi();
    renderWithProviders(<ProgressPage />);

    const calendar = screen.getByRole('region', { name: 'Calendar' });
    expect(
      await within(calendar).findByRole('img', { name: /all daily quests done \(4\/4\)/ }),
    ).toBeInTheDocument();
    expect(within(calendar).getByRole('img', { name: /1 of 4 daily quests done/ })).toBeVisible();
    expect(within(calendar).getByText('1 perfect day this month')).toBeInTheDocument();
    // The current month is the last one
    expect(within(calendar).getByRole('button', { name: 'Next month' })).toBeDisabled();
  });
});
