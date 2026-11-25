import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { LegendaryPage } from './LegendaryPage';
import { AdminPage } from './AdminPage';
import { jsonResponse, renderWithProviders } from '../../test/renderWithProviders';
import type { LegendaryQuest, ReviewClaim } from '../../api/claims';

afterEach(() => {
  vi.unstubAllGlobals();
});

const marathon: LegendaryQuest = {
  id: 'q1',
  key: 'marathon',
  title: { en: 'Run a marathon', fr: 'Courir un marathon', ar: 'الجري في ماراثون' },
  category: 'FITNESS',
  tier: 'LEGENDARY',
  xpReward: 3000,
  rewardTitle: null,
  myClaimStatus: null,
};

function mockApi(
  routes: Record<string, unknown>,
  writes: Record<string, () => Promise<Response>> = {},
) {
  const fetchMock = vi.fn<typeof fetch>((url, init) => {
    const key = `${init?.method ?? 'GET'} ${String(url)}`;
    if (writes[key]) return writes[key]!();
    if (init?.method && init.method !== 'GET') return jsonResponse(200, {});
    return jsonResponse(200, routes[String(url)] ?? {});
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

const bodyOf = (fetchMock: ReturnType<typeof mockApi>, url: string) =>
  JSON.parse(
    fetchMock.mock.calls.find(([u, init]) => String(u) === url && init?.method === 'POST')![1]!
      .body as string,
  );

describe('LegendaryPage', () => {
  it('claims a catalog quest with a description and a proof link', async () => {
    const fetchMock = mockApi(
      { '/api/legendary-quests': { quests: [marathon] }, '/api/claims/mine': { claims: [] } },
      { 'POST /api/claims': () => jsonResponse(201, { claim: {} }) },
    );
    renderWithProviders(<LegendaryPage />);

    await userEvent.click(await screen.findByRole('button', { name: 'Claim' }));
    const dialog = screen.getByRole('dialog', { name: 'Run a marathon' });
    await userEvent.type(
      within(dialog).getByLabelText('What did you achieve?'),
      'Finished Paris in 4h12.',
    );
    await userEvent.type(within(dialog).getByLabelText('Proof link'), 'https://example.com/result');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Send for review' }));

    expect(bodyOf(fetchMock, '/api/claims')).toEqual({
      legendaryQuestId: 'q1',
      description: 'Finished Paris in 4h12.',
      proofUrl: 'https://example.com/result',
    });
  });

  it('shows the field errors returned by the API', async () => {
    mockApi(
      { '/api/legendary-quests': { quests: [marathon] }, '/api/claims/mine': { claims: [] } },
      {
        'POST /api/claims': () =>
          jsonResponse(400, {
            error: { code: 'VALIDATION_ERROR', details: { proofUrl: 'PROOF_URL_INVALID' } },
          }),
      },
    );
    renderWithProviders(<LegendaryPage />);

    await userEvent.click(await screen.findByRole('button', { name: 'Claim' }));
    await userEvent.click(screen.getByRole('button', { name: 'Send for review' }));

    expect(await screen.findByText('Enter a link starting with https://')).toBeInTheDocument();
  });

  it('shows "Waiting for review" instead of the claim button for a pending quest', async () => {
    mockApi({
      '/api/legendary-quests': { quests: [{ ...marathon, myClaimStatus: 'PENDING' }] },
      '/api/claims/mine': { claims: [] },
    });
    renderWithProviders(<LegendaryPage />);

    expect(await screen.findByText('Waiting for review')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Claim' })).not.toBeInTheDocument();
  });
});

describe('AdminPage', () => {
  const claim: ReviewClaim = {
    id: 'c1',
    status: 'PENDING',
    title: marathon.title,
    description: 'Finished Paris in 4h12.',
    proofUrl: 'https://example.com/result',
    legendaryQuest: {
      id: 'q1',
      key: 'marathon',
      title: marathon.title,
      tier: 'LEGENDARY',
      xpReward: 3000,
    },
    tierAwarded: null,
    xpAwarded: null,
    titleAwarded: null,
    reviewNote: null,
    createdAt: '2026-11-24T10:00:00Z',
    reviewedAt: null,
    player: { username: 'Runner', level: 40, rank: 'C1' },
  };
  const routes = {
    '/api/admin/claims?status=PENDING': { claims: [claim] },
    '/api/admin/titles': { titles: [] },
    '/api/admin/legendary-quests': { quests: [] },
  };

  it('opens the proof in a new tab without giving it access to the page', async () => {
    mockApi(routes);
    renderWithProviders(<AdminPage />);

    const link = await screen.findByRole('link', { name: 'https://example.com/result' });
    expect(link).toHaveAttribute('target', '_blank');
    expect(link.getAttribute('rel')).toContain('noopener');
  });

  it('approves with the quest XP by default and a new title in three languages', async () => {
    const fetchMock = mockApi(routes);
    renderWithProviders(<AdminPage />);

    await screen.findByText('Finished Paris in 4h12.');
    await userEvent.selectOptions(screen.getByLabelText('Title to grant'), 'new');
    await userEvent.type(screen.getByLabelText('New title (EN)'), 'Marathoner');
    await userEvent.type(screen.getByLabelText('New title (FR)'), 'Marathonien');
    await userEvent.type(screen.getByLabelText('New title (AR)'), 'عداء');
    await userEvent.click(screen.getByRole('button', { name: '✓ Approve' }));

    expect(bodyOf(fetchMock, '/api/admin/claims/c1/approve')).toEqual({
      xp: 3000,
      tier: 'LEGENDARY',
      newTitle: { name: { en: 'Marathoner', fr: 'Marathonien', ar: 'عداء' }, rarity: 'LEGENDARY' },
    });
  });

  it('edits a catalog quest and sends every field', async () => {
    const fetchMock = mockApi({
      ...routes,
      '/api/admin/legendary-quests': {
        quests: [{ ...marathon, active: true, titleId: null }],
      },
    });
    renderWithProviders(<AdminPage />);

    await userEvent.click(await screen.findByRole('button', { name: 'Edit Run a marathon' }));
    const dialog = screen.getByRole('dialog', { name: 'Run a marathon' });
    const xp = within(dialog).getByLabelText('XP reward');
    await userEvent.clear(xp);
    await userEvent.type(xp, '4500');
    await userEvent.selectOptions(within(dialog).getByLabelText('Tier'), 'MYTHIC');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Save' }));

    const call = fetchMock.mock.calls.find(
      ([u, init]) => String(u) === '/api/admin/legendary-quests/q1' && init?.method === 'PATCH',
    )!;
    expect(JSON.parse(call[1]!.body as string)).toEqual({
      title: marathon.title,
      category: 'FITNESS',
      tier: 'MYTHIC',
      xpReward: 4500,
      titleId: null,
      active: true,
    });
  });

  it('rejects with a reason', async () => {
    const fetchMock = mockApi(routes);
    renderWithProviders(<AdminPage />);

    await userEvent.type(await screen.findByLabelText('Reason for rejecting'), 'Name not visible.');
    await userEvent.click(screen.getByRole('button', { name: '✕ Reject' }));

    expect(bodyOf(fetchMock, '/api/admin/claims/c1/reject')).toEqual({
      reason: 'Name not visible.',
    });
  });
});
