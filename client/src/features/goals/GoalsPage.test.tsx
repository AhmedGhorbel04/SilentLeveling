import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { GoalsPage } from './GoalsPage';
import { GOAL_TEMPLATES } from './goalTemplates';
import { jsonResponse, renderWithProviders } from '../../test/renderWithProviders';
import type { Goal } from '../../api/goals';

afterEach(() => {
  vi.unstubAllGlobals();
});

const goal: Goal = {
  id: 'g1',
  title: 'Get a Java internship',
  description: null,
  category: 'CAREER',
  targetDate: null,
  status: 'ACTIVE',
  completedAt: null,
  createdAt: '2026-11-24T10:00:00Z',
  progress: { completed: 1, total: 3, percent: 33 },
  milestones: [
    { id: 'm1', title: 'Update my CV', position: 0, completed: true, linkedQuests: 0 },
    { id: 'm2', title: 'Build a project', position: 1, completed: false, linkedQuests: 2 },
    { id: 'm3', title: 'Apply to 10 companies', position: 2, completed: false, linkedQuests: 0 },
  ],
};

// Fakes the API: GET /api/goals returns `goals`, other calls are recorded and return the goal
function mockApi(goals: Goal[]) {
  const fetchMock = vi.fn<typeof fetch>((_url, init) =>
    !init?.method || init.method === 'GET'
      ? jsonResponse(200, { goals })
      : jsonResponse(200, { goal }),
  );
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

const sentRequests = (fetchMock: ReturnType<typeof mockApi>) =>
  fetchMock.mock.calls
    .filter(([, init]) => init?.method && init.method !== 'GET')
    .map(([url, init]) => ({
      method: init!.method,
      url: String(url),
      body: init!.body ? JSON.parse(init!.body as string) : undefined,
    }));

describe('goal templates', () => {
  it('have a title and milestones in all three languages', () => {
    for (const template of GOAL_TEMPLATES) {
      for (const text of [template.title, ...template.milestones]) {
        expect(text.en.trim(), template.id).not.toBe('');
        expect(text.fr.trim(), template.id).not.toBe('');
        expect(text.ar.trim(), template.id).not.toBe('');
      }
    }
  });
});

describe('GoalsPage', () => {
  it('shows an empty state for a new player', async () => {
    mockApi([]);
    renderWithProviders(<GoalsPage />);

    expect(await screen.findByText('No goals yet')).toBeInTheDocument();
  });

  it('creates a goal from a template, ignoring empty milestone lines', async () => {
    const fetchMock = mockApi([]);
    renderWithProviders(<GoalsPage />);

    await userEvent.click(await screen.findByRole('button', { name: '+ New goal' }));
    const dialog = screen.getByRole('dialog', { name: 'New goal' });
    await userEvent.selectOptions(within(dialog).getByLabelText('Start from a template'), 'run10k');
    await userEvent.click(within(dialog).getByRole('button', { name: '+ Add a milestone' }));
    await userEvent.click(within(dialog).getByRole('button', { name: 'Create goal' }));

    expect(sentRequests(fetchMock)).toEqual([
      {
        method: 'POST',
        url: '/api/goals',
        body: {
          title: 'Run 10 km',
          description: '',
          category: 'FITNESS',
          targetDate: null,
          milestones: [
            'Run 2 km without stopping',
            'Run 3 times a week for a month',
            'Run 5 km',
            'Run 8 km',
            'Run 10 km',
          ],
        },
      },
    ]);
  });

  it('shows progress, milestones and linked quests', async () => {
    mockApi([goal]);
    renderWithProviders(<GoalsPage />);

    expect(await screen.findByText('Get a Java internship')).toBeInTheDocument();
    expect(screen.getByText('1 / 3 milestones')).toBeInTheDocument();
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '33');
    expect(screen.getByRole('checkbox', { name: 'Update my CV' })).toBeChecked();
    expect(screen.getByText('Linked quests: 2')).toBeInTheDocument();
  });

  it('completes a milestone and moves another one', async () => {
    const fetchMock = mockApi([goal]);
    renderWithProviders(<GoalsPage />);

    await userEvent.click(await screen.findByRole('checkbox', { name: 'Build a project' }));
    await userEvent.click(screen.getByRole('button', { name: 'Move up: Apply to 10 companies' }));

    expect(sentRequests(fetchMock)).toEqual([
      { method: 'PATCH', url: '/api/milestones/m2', body: { completed: true } },
      { method: 'PATCH', url: '/api/milestones/m3', body: { position: 1 } },
    ]);
    // The first milestone cannot go further up, the last one not further down
    expect(screen.getByRole('button', { name: 'Move up: Update my CV' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Move down: Apply to 10 companies' })).toBeDisabled();
  });

  it('only offers to reopen a finished goal', async () => {
    mockApi([{ ...goal, status: 'COMPLETED', completedAt: '2026-11-24T12:00:00Z' }]);
    renderWithProviders(<GoalsPage />);

    expect(await screen.findByRole('button', { name: 'Reopen' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Add' })).not.toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: 'Build a project' })).toBeDisabled();
  });
});
