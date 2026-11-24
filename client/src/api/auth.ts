import { apiRequest } from './client';
import type { LanguageCode } from '../i18n';

// Mirrors the CurrentUser type returned by the backend
export type CurrentUser = {
  id: string;
  username: string;
  email: string;
  role: 'PLAYER' | 'ADMIN';
  language: LanguageCode;
  timezone: string;
  avatarKey: string | null;
  onboarded: boolean;
  createdAt: string;
};

export type RegisterRequest = {
  username: string;
  email: string;
  password: string;
  language: LanguageCode;
  timezone: string;
};

export type LoginRequest = {
  identifier: string;
  password: string;
};

type UserResponse = { user: CurrentUser };

export const authApi = {
  register: (data: RegisterRequest) =>
    apiRequest<UserResponse>('/auth/register', { method: 'POST', body: data }),
  login: (data: LoginRequest) =>
    apiRequest<UserResponse>('/auth/login', { method: 'POST', body: data }),
  logout: () => apiRequest<void>('/auth/logout', { method: 'POST' }),
  session: () => apiRequest<{ user: CurrentUser | null }>('/auth/session'),
};
