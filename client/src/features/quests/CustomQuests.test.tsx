import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { TodayQuests } from './TodayQuests';
import { jsonResponse, renderWithProviders } from '../../test/renderWithProviders';
import type { Quest, TodayQuests as TodayQuestsData } from '../../api/quests';

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

const customQuest: Quest = {
  id: 'c1',
  source: 'CUSTOM',
  type: 'ONE_TIME',
  category: 'CAREER',
  difficulty: 'HARD',
  minutes: null,
  xpReward: 80,
  xpAwarded: null,
  status: 'ACTIVE',
  questDate: '2026-11-24',
  dueAt: new Date(2026, 10, 25).toISOString(), // next local midnight → due on the 24th
  completedAt: null,
  title: { en: 'Send my CV', fr: 'Send my CV', ar: 'Send my CV' },
  description: 'To three companies',
  milestone: null,
  rerollable: false,
};

function todayWith(overrides: Partial<TodayQuestsData> = {}): TodayQuestsData {
  return {
    date: '2026-11-24',
    daily: [],
    weekly: [],
    penalty: [],
    custom: [],
    rerollsLeft: 3,
    customXpRemaining: 150,
    ...overrides,
  };
}

// Routes fetch calls to fake responses, and records them
function mockApi(today: TodayQuestsData, other: Record<string, () => Promise<Response>> = {}) {
  const fetchMock = vi.fn<typeof fetch>((url, init) => {
    const key = `${init?.method ?? 'GET'} ${String(url)}`;
    if (other[key]) return other[key]!();
    return jsonResponse(200, today);
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

describe('custom quests', () => {
  it('shows an empty state and the XP left for today', async () => {
    mockApi(todayWith({ customXpRemaining: 70 }));
    renderWithProviders(<TodayQuests />);

    expect(
      await screen.findByText('No personal quests yet. Add your own goals here.'),
    ).toBeInTheDocument();
    expect(screen.getByText('Custom XP left today: 70')).toBeInTheDocument();
  });

  it('creates a quest from the form, without ever sending an XP value', async () => {
    const fetchMock = mockApi(todayWith(), {
      'POST /api/quests': () => jsonResponse(201, { quest: customQuest }),
    });
    renderWithProviders(<TodayQuests />);

    await userEvent.click(await screen.findByRole('button', { name: '+ New quest' }));
    const dialog = screen.getByRole('dialog', { name: 'New quest' });
    await userEvent.type(within(dialog).getByLabelText('Title'), 'Send my CV');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Hard · 80 XP' }));
    expect(within(dialog).getByText('Reward: 80 XP')).toBeInTheDocument();
    await userEvent.click(within(dialog).getByRole('button', { name: 'Create quest' }));

    const call = fetchMock.mock.calls.find(([, init]) => init?.method === 'POST')!;
    const body = JSON.parse(call[1]!.body as string);
    expect(body).toEqual({
      title: 'Send my CV',
      description: '',
      category: 'STUDIES',
      difficulty: 'HARD',
      dueDate: '2026-11-24',
      milestoneId: null,
    });
    expect(body).not.toHaveProperty('xpReward');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument(); // closed after saving
  });

  it('puts the cursor in the title field when the form opens', async () => {
    // Found in the browser: the focus went to the ✕ button and typing was lost
    mockApi(todayWith());
    renderWithProviders(<TodayQuests />);

    await userEvent.click(await screen.findByRole('button', { name: '+ New quest' }));

    expect(screen.getByLabelText('Title')).toHaveFocus();
  });

  it('can link the quest to an unfinished milestone of an active goal', async () => {
    const goals = [
      {
        id: 'g1',
        title: 'Get a Java internship',
        status: 'ACTIVE',
        milestones: [
          { id: 'm1', title: 'Update my CV', completed: true },
          { id: 'm2', title: 'Build a project', completed: false },
        ],
      },
      {
        id: 'g2',
        title: 'Old goal',
        status: 'COMPLETED',
        milestones: [{ id: 'm9', title: 'Done step', completed: false }],
      },
    ];
    const fetchMock = mockApi(todayWith(), {
      'GET /api/goals': () => jsonResponse(200, { goals }),
      'POST /api/quests': () => jsonResponse(201, { quest: customQuest }),
    });
    renderWithProviders(<TodayQuests />);

    await userEvent.click(await screen.findByRole('button', { name: '+ New quest' }));
    const dialog = screen.getByRole('dialog');
    const picker = await within(dialog).findByLabelText('Linked milestone (optional)');
    // Only "Build a project": the other one is done, and the old goal is not active
    expect(
      within(picker)
        .getAllByRole('option')
        .map((o) => o.textContent),
    ).toEqual(['Not linked to a goal', 'Build a project']);

    await userEvent.type(within(dialog).getByLabelText('Title'), 'Set up the repository');
    await userEvent.selectOptions(picker, 'm2');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Create quest' }));

    const call = fetchMock.mock.calls.find(([, init]) => init?.method === 'POST')!;
    expect(JSON.parse(call[1]!.body as string).milestoneId).toBe('m2');
  });

  it('validates the title in the browser', async () => {
    const fetchMock = mockApi(todayWith());
    renderWithProviders(<TodayQuests />);

    await userEvent.click(await screen.findByRole('button', { name: '+ New quest' }));
    const dialog = screen.getByRole('dialog');
    await userEvent.type(within(dialog).getByLabelText('Title'), 'ab');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Create quest' }));

    expect(await within(dialog).findByText('At least 3 characters')).toBeInTheDocument();
    expect(fetchMock.mock.calls.every(([, init]) => init?.method !== 'POST')).toBe(true);
  });

  it('warns when the reward is higher than the XP left today', async () => {
    mockApi(todayWith({ customXpRemaining: 30 }));
    renderWithProviders(<TodayQuests />);

    await userEvent.click(await screen.findByRole('button', { name: '+ New quest' }));

    // Normal (40 XP) is selected by default, more than the 30 XP left
    expect(screen.getByText(/Left today: 30 XP/)).toHaveClass('text-amber-300');
  });

  it('shows a custom quest with its due date, description, edit and delete buttons', async () => {
    mockApi(todayWith({ custom: [customQuest] }));
    renderWithProviders(<TodayQuests />);

    expect(await screen.findByText('Send my CV')).toBeInTheDocument();
    expect(screen.getByText('To three companies')).toBeInTheDocument();
    expect(screen.getByText(/Due today/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Edit: Send my CV' })).toBeInTheDocument();
  });

  it('deletes a quest only after confirmation', async () => {
    const fetchMock = mockApi(todayWith({ custom: [customQuest] }), {
      'DELETE /api/quests/c1': () => Promise.resolve(new Response(null, { status: 204 })),
    });
    const confirm = vi
      .spyOn(window, 'confirm')
      .mockReturnValueOnce(false)
      .mockReturnValueOnce(true);
    renderWithProviders(<TodayQuests />);

    const deleteButton = await screen.findByRole('button', { name: 'Delete: Send my CV' });
    await userEvent.click(deleteButton); // cancelled
    await userEvent.click(deleteButton); // confirmed

    expect(confirm).toHaveBeenCalledTimes(2);
    const deletes = fetchMock.mock.calls.filter(([, init]) => init?.method === 'DELETE');
    expect(deletes).toHaveLength(1);
  });
});

describe('level-up overlay', () => {
  it('appears after a level-up and closes with Escape', async () => {
    const systemQuest = {
      ...customQuest,
      id: 'q1',
      source: 'SYSTEM' as const,
      title: { en: 'Read', fr: 'Read', ar: 'Read' },
    };
    mockApi(todayWith({ daily: [systemQuest] }), {
      'POST /api/quests/q1/complete': () =>
        jsonResponse(200, {
          quest: systemQuest,
          xpGained: 80,
          leveledUp: true,
          levelAfter: 3,
          rankedUp: true,
          rankAfter: 'E3',
        }),
    });
    renderWithProviders(<TodayQuests />);

    await userEvent.click(await screen.findByRole('button', { name: 'Complete: Read' }));

    const overlay = await screen.findByRole('dialog', { name: 'LEVEL UP' });
    expect(within(overlay).getByText('You reached level 3')).toBeInTheDocument();
    expect(within(overlay).getByText('New rank: E III')).toBeInTheDocument();

    await userEvent.keyboard('{Escape}');
    expect(screen.queryByRole('dialog', { name: 'LEVEL UP' })).not.toBeInTheDocument();
  });
});
