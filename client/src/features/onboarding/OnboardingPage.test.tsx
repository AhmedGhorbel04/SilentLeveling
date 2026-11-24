import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { OnboardingPage } from './OnboardingPage';
import { jsonResponse, renderWithProviders } from '../../test/renderWithProviders';

afterEach(() => {
  vi.unstubAllGlobals();
});

const next = () => userEvent.click(screen.getByRole('button', { name: 'Continue' }));

describe('OnboardingPage', () => {
  it('cannot continue without choosing a goal', async () => {
    renderWithProviders(<OnboardingPage />);

    expect(screen.getByRole('button', { name: 'Continue' })).toBeDisabled();

    await userEvent.click(screen.getByRole('button', { name: /Reading/ }));

    expect(screen.getByRole('button', { name: 'Continue' })).toBeEnabled();
  });

  it('allows at most 3 goals', async () => {
    renderWithProviders(<OnboardingPage />);

    for (const goal of [/Fitness/, /Reading/, /Languages/, /Health/]) {
      await userEvent.click(screen.getByRole('button', { name: goal }));
    }

    expect(screen.getByRole('button', { name: /Health/ })).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getAllByRole('button', { pressed: true })).toHaveLength(3);
  });

  it('sends the choices in order, with the chosen levels, time and avatar', async () => {
    const fetchMock = vi.fn<typeof fetch>(() => jsonResponse(201, { user: { onboarded: true } }));
    vi.stubGlobal('fetch', fetchMock);
    renderWithProviders(<OnboardingPage />);

    await userEvent.click(screen.getByRole('button', { name: /Programming/ }));
    await userEvent.click(screen.getByRole('button', { name: /Fitness/ }));
    await next();
    // Fitness: intermediate (the second group of level buttons)
    await userEvent.click(screen.getAllByRole('button', { name: 'Intermediate' })[1]!);
    await next();
    await userEvent.click(screen.getByRole('button', { name: '2 h' }));
    await next();
    await userEvent.click(screen.getByRole('button', { name: 'Sigil 3' }));
    await userEvent.click(screen.getByRole('button', { name: 'Start my journey' }));

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/onboarding',
      expect.objectContaining({ method: 'POST' }),
    );
    expect(JSON.parse(fetchMock.mock.calls[0]![1]!.body as string)).toEqual({
      focusAreas: [
        { category: 'STUDIES', level: 'BEGINNER' },
        { category: 'FITNESS', level: 'INTERMEDIATE' },
      ],
      dailyMinutes: 120,
      avatarKey: 'sigil-3',
    });
  });
});
