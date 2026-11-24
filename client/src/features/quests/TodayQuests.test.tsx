import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { TodayQuests } from './TodayQuests';
import { jsonResponse, renderWithProviders } from '../../test/renderWithProviders';
import i18n from '../../i18n';
import type { Quest, TodayQuests as TodayQuestsData } from '../../api/quests';

afterEach(() => {
  vi.unstubAllGlobals();
});

function quest(overrides: Partial<Quest> = {}): Quest {
  return {
    id: 'q1',
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
    title: { en: 'Read 10 pages', fr: 'Lire 10 pages', ar: 'اقرأ 10 صفحات' },
    description: null,
    rerollable: true,
    ...overrides,
  };
}

const today: TodayQuestsData = {
  date: '2026-11-24',
  daily: [quest()],
  weekly: [
    quest({
      id: 'w1',
      type: 'WEEKLY',
      xpReward: 120,
      rerollable: false,
      title: { en: 'Read 70 pages', fr: 'Lire 70 pages', ar: 'اقرأ 70 صفحة' },
    }),
  ],
  penalty: [],
  custom: [],
  rerollsLeft: 3,
  customXpRemaining: 150,
};

describe('TodayQuests', () => {
  it('shows daily and weekly quests with their XP', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => jsonResponse(200, today)),
    );
    renderWithProviders(<TodayQuests />);

    expect(await screen.findByText('Daily quests')).toBeInTheDocument();
    expect(screen.getByText('Weekly quests')).toBeInTheDocument();
    expect(screen.getByText('+40 XP')).toBeInTheDocument();
    expect(screen.getByText('+120 XP')).toBeInTheDocument();
    expect(screen.getByText('Rerolls left: 3', { exact: false })).toBeInTheDocument();
  });

  it('shows the quest title in the selected language', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => jsonResponse(200, today)),
    );
    await i18n.changeLanguage('fr');
    renderWithProviders(<TodayQuests />);

    expect(await screen.findByText('Lire 10 pages')).toBeInTheDocument();
    expect(screen.getByText('Lire 70 pages')).toBeInTheDocument();
  });

  it('completes a quest and shows the XP gained and the level-up', async () => {
    const fetchMock = vi.fn<typeof fetch>((url) =>
      String(url).endsWith('/complete')
        ? jsonResponse(200, { xpGained: 44, leveledUp: true, levelAfter: 2 })
        : jsonResponse(200, today),
    );
    vi.stubGlobal('fetch', fetchMock);
    renderWithProviders(<TodayQuests />);

    await userEvent.click(await screen.findByRole('button', { name: 'Complete: Read 10 pages' }));

    expect(await screen.findByText('+44 XP')).toBeInTheDocument();
    expect(screen.getByText('Level up! Level 2')).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/quests/q1/complete',
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('shows a translated error when the quest is no longer active', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn((url: string) =>
        url.endsWith('/complete')
          ? jsonResponse(409, { error: { code: 'QUEST_NOT_ACTIVE' } })
          : jsonResponse(200, today),
      ),
    );
    renderWithProviders(<TodayQuests />);

    await userEvent.click(await screen.findByRole('button', { name: 'Complete: Read 10 pages' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('finished or expired');
  });

  it('disables rerolls when none are left', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => jsonResponse(200, { ...today, rerollsLeft: 0 })),
    );
    renderWithProviders(<TodayQuests />);

    expect(
      await screen.findByRole('button', { name: 'Replace this quest: Read 10 pages' }),
    ).toBeDisabled();
  });
});
