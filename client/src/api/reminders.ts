import { apiRequest } from './client';

export type ReminderSettings = {
  enabled: boolean;
  time: string; // "HH:MM", in the player's time zone
  devices: number;
  publicKey: string | null; // null: the server can't send notifications
};

export const remindersApi = {
  get: () => apiRequest<ReminderSettings>('/me/reminders'),
  update: (data: { enabled?: boolean; time?: string }) =>
    apiRequest<ReminderSettings>('/me/reminders', { method: 'PATCH', body: data }),
  addDevice: (subscription: PushSubscriptionJSON) =>
    apiRequest<void>('/push/devices', { method: 'POST', body: subscription }),
  removeDevice: (endpoint: string) =>
    apiRequest<void>('/push/devices', { method: 'DELETE', body: { endpoint } }),
  test: () => apiRequest<{ delivered: number }>('/push/test', { method: 'POST' }),
};
