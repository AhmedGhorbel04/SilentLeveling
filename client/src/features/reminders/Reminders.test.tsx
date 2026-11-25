import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { RemindersCard } from './RemindersCard';
import { jsonResponse, renderWithProviders } from '../../test/renderWithProviders';
import type { ReminderSettings } from '../../api/reminders';

const settings = (overrides: Partial<ReminderSettings> = {}): ReminderSettings => ({
  enabled: false,
  time: '20:00',
  devices: 0,
  publicKey:
    'BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U',
  ...overrides,
});

function mockApi(initial: ReminderSettings) {
  let current = initial;
  const fetchMock = vi.fn<typeof fetch>((url, init) => {
    const method = init?.method ?? 'GET';
    if (String(url) === '/api/me/reminders' && method === 'PATCH') {
      current = { ...current, ...JSON.parse(init!.body as string) };
    }
    if (String(url) === '/api/me/reminders') return jsonResponse(200, current);
    return Promise.resolve(new Response(null, { status: 204 }));
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

// A browser with a service worker and push, where the player accepts notifications
function stubPushBrowser() {
  const subscription = {
    endpoint: 'https://push.example.com/abc',
    toJSON: () => ({ endpoint: 'https://push.example.com/abc', keys: { p256dh: 'k', auth: 'a' } }),
    unsubscribe: vi.fn(async () => true),
  };
  let subscribed = false;
  const registration = {
    pushManager: {
      getSubscription: vi.fn(async () => (subscribed ? subscription : null)),
      subscribe: vi.fn(async () => {
        subscribed = true;
        return subscription;
      }),
    },
  };
  vi.stubGlobal('PushManager', class {});
  vi.stubGlobal('Notification', {
    permission: 'default',
    requestPermission: vi.fn(async () => 'granted'),
  });
  Object.defineProperty(navigator, 'serviceWorker', {
    configurable: true,
    value: { getRegistration: async () => registration, ready: Promise.resolve(registration) },
  });
  return registration;
}

afterEach(() => {
  vi.unstubAllGlobals();
  Reflect.deleteProperty(navigator, 'serviceWorker');
});

describe('RemindersCard', () => {
  it('is hidden when the server cannot send notifications', async () => {
    const fetchMock = mockApi(settings({ publicKey: null }));
    const { container } = renderWithProviders(<RemindersCard />);

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect(container).toBeEmptyDOMElement();
  });

  it('explains when the browser cannot receive notifications', async () => {
    mockApi(settings());
    renderWithProviders(<RemindersCard />);

    expect(await screen.findByText(/can't receive notifications/)).toBeInTheDocument();
    expect(screen.queryByRole('switch')).not.toBeInTheDocument();
  });

  it('subscribes this device and turns the reminder on', async () => {
    const registration = stubPushBrowser();
    const fetchMock = mockApi(settings());
    renderWithProviders(<RemindersCard />);

    await userEvent.click(await screen.findByRole('switch'));

    await waitFor(() => expect(screen.getByRole('switch')).toBeChecked());
    expect(registration.pushManager.subscribe).toHaveBeenCalledWith(
      expect.objectContaining({ userVisibleOnly: true }),
    );
    const sent = (url: string, method: string) =>
      fetchMock.mock.calls.find(([u, init]) => u === url && init?.method === method)?.[1]?.body;
    expect(JSON.parse(sent('/api/push/devices', 'POST') as string)).toMatchObject({
      endpoint: 'https://push.example.com/abc',
    });
    expect(JSON.parse(sent('/api/me/reminders', 'PATCH') as string)).toEqual({ enabled: true });
    expect(screen.getByLabelText('Remind me at')).toHaveValue('20:00');
  });
});
