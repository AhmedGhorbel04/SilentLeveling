import { screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { StatusWindow } from './StatusWindow';
import { jsonResponse, renderWithProviders } from '../../test/renderWithProviders';
import type { Dashboard } from '../../api/dashboard';

afterEach(() => {
  vi.unstubAllGlobals();
});

const dashboard: Dashboard = {
  username: 'Shadow_Player',
  avatarKey: 'sigil-1',
  activeTitle: null,
  totalXp: 1880,
  progress: { level: 11, xpIntoLevel: 140, xpForNextLevel: 300, percent: 46 },
  rank: { code: 'D4', label: 'D IV' },
  nextRank: { code: 'D3', label: 'D III', minLevel: 13 },
  rankLockedBy: null,
  stats: { strength: 34, intelligence: 58, discipline: 41, consistency: 12 },
  streak: { current: 12, best: 20 },
  disciplineRate: 87,
  customXp: { earnedToday: 0, dailyCap: 150 },
};

function show(data: Dashboard) {
  vi.stubGlobal(
    'fetch',
    vi.fn(() => jsonResponse(200, data)),
  );
  renderWithProviders(<StatusWindow />);
}

describe('StatusWindow', () => {
  it('shows level, XP bar, rank, streak, stats and discipline', async () => {
    show(dashboard);

    expect(await screen.findByText('Level 11')).toBeInTheDocument();
    expect(screen.getByText('140 / 300 XP')).toBeInTheDocument();
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '46');
    expect(screen.getByText('D IV')).toBeInTheDocument();
    expect(screen.getByText(/Streak: 12/)).toBeInTheDocument();
    expect(screen.getByText('Intelligence')).toBeInTheDocument();
    expect(screen.getByText('58')).toBeInTheDocument();
    expect(screen.getByText('87%')).toBeInTheDocument();
    expect(screen.getByText('Next rank: D III at level 13')).toBeInTheDocument();
  });

  it('explains a locked rank', async () => {
    show({
      ...dashboard,
      rank: { code: 'C1', label: 'C I' },
      nextRank: { code: 'B4', label: 'B IV', minLevel: 38 },
      rankLockedBy: { legendary: 1, mythic: 0 },
    });

    expect(await screen.findByText(/B IV is locked/)).toBeInTheDocument();
    expect(screen.getByText('Verified Legendary achievements needed: 1')).toBeInTheDocument();
    expect(screen.queryByText(/Mythic/)).not.toBeInTheDocument();
  });

  it('shows the active title in the selected language', async () => {
    show({
      ...dashboard,
      activeTitle: {
        id: 't1',
        key: 'iron_will',
        name: { en: 'Iron Will', fr: 'Volonté de fer', ar: 'الإرادة الحديدية' },
        rarity: 'EPIC',
      },
    });

    expect(await screen.findByText('✦ Iron Will')).toHaveClass('text-rarity-epic');
  });

  it('shows a dash instead of a discipline rate for a new player', async () => {
    show({ ...dashboard, disciplineRate: null });

    expect(await screen.findByText('—')).toBeInTheDocument();
  });
});
