import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { RegisterPage } from './RegisterPage';
import { jsonResponse, renderWithProviders } from '../../test/renderWithProviders';

afterEach(() => {
  vi.unstubAllGlobals();
});

async function fillForm(values: { username: string; password: string; confirm: string }) {
  await userEvent.type(screen.getByLabelText('Username'), values.username);
  await userEvent.type(screen.getByLabelText('Email'), 'player@example.com');
  await userEvent.type(screen.getByLabelText('Password'), values.password);
  await userEvent.type(screen.getByLabelText('Confirm password'), values.confirm);
  await userEvent.click(screen.getByRole('button', { name: 'Create account' }));
}

describe('RegisterPage', () => {
  it('checks password rules and confirmation in the browser', async () => {
    vi.stubGlobal('fetch', vi.fn());
    renderWithProviders(<RegisterPage />);

    await fillForm({ username: 'Player_1', password: 'onlyletters', confirm: 'different1' });

    expect(await screen.findByText('Must contain at least one number')).toBeInTheDocument();
    expect(screen.getByText('Passwords do not match')).toBeInTheDocument();
  });

  it('shows "username taken" under the username field', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => jsonResponse(409, { error: { code: 'USERNAME_TAKEN' } })),
    );
    renderWithProviders(<RegisterPage />);

    await fillForm({ username: 'Player_1', password: 'secret123', confirm: 'secret123' });

    const usernameInput = screen.getByLabelText('Username');
    expect(await screen.findByText('This username is already taken')).toBeInTheDocument();
    expect(usernameInput).toHaveAttribute('aria-invalid', 'true');
  });

  it('sends the interface language and the browser time zone', async () => {
    const fetchMock = vi.fn<typeof fetch>(() => jsonResponse(201, { user: {} }));
    vi.stubGlobal('fetch', fetchMock);
    renderWithProviders(<RegisterPage />);

    await fillForm({ username: 'Player_1', password: 'secret123', confirm: 'secret123' });

    const body = JSON.parse(fetchMock.mock.calls[0]![1]!.body as string);
    expect(body).toMatchObject({ username: 'Player_1', language: 'en' });
    expect(body.timezone).toEqual(expect.any(String));
    expect(body).not.toHaveProperty('confirmPassword');
  });
});
