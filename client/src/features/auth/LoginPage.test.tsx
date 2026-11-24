import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { LoginPage } from './LoginPage';
import { jsonResponse, renderWithProviders } from '../../test/renderWithProviders';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('LoginPage', () => {
  it('shows required-field errors without calling the API', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    renderWithProviders(<LoginPage />);

    await userEvent.click(screen.getByRole('button', { name: 'Log in' }));

    expect(await screen.findAllByText('This field is required')).toHaveLength(2);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('shows the translated server error when credentials are wrong', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => jsonResponse(401, { error: { code: 'INVALID_CREDENTIALS' } })),
    );
    renderWithProviders(<LoginPage />);

    await userEvent.type(screen.getByLabelText('Email or username'), 'player');
    await userEvent.type(screen.getByLabelText('Password'), 'wrong-pass1');
    await userEvent.click(screen.getByRole('button', { name: 'Log in' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Wrong email/username or password');
  });

  it('sends the identifier and password to the API', async () => {
    const fetchMock = vi.fn(() => jsonResponse(200, { user: { language: 'en' } }));
    vi.stubGlobal('fetch', fetchMock);
    renderWithProviders(<LoginPage />);

    await userEvent.type(screen.getByLabelText('Email or username'), 'player@example.com');
    await userEvent.type(screen.getByLabelText('Password'), 'secret123');
    await userEvent.click(screen.getByRole('button', { name: 'Log in' }));

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/auth/login',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ identifier: 'player@example.com', password: 'secret123' }),
      }),
    );
  });
});
