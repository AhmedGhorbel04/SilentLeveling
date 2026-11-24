import { apiRequest } from './client';
import type { Title } from './achievements';

type Rank = { code: string; label: string };

// Public information about a player (never the email)
export type PlayerCard = {
  username: string;
  avatarKey: string | null;
  level: number;
  rank: Rank;
  totalXp: number;
  streak: number;
  activeTitle: Title | null;
};

export type FriendRequest = { id: string; createdAt: string; player: PlayerCard };

export type RankingEntry = PlayerCard & {
  position: number;
  weeklyXp: number;
  titleScore: number;
  isMe: boolean;
};

export type Relationship = {
  type: 'SELF' | 'FRIEND' | 'REQUEST_SENT' | 'REQUEST_RECEIVED' | 'NONE';
  requestId: string | null;
};

type ProfileCard = {
  visibility: 'CARD';
  relationship: Relationship;
  username: string;
  avatarKey: string | null;
  rank: Rank;
};

export type FullProfile = Omit<ProfileCard, 'visibility'> & {
  visibility: 'FULL';
  bio: string | null;
  activeTitle: Title | null;
  level: number;
  totalXp: number;
  stats: { strength: number; intelligence: number; discipline: number; consistency: number };
  streak: { current: number; best: number };
  disciplineRate: number | null;
  achievements: { code: string; unlockedAt: string }[];
  titles: Title[];
  friendsCount: number;
  memberSince: string;
};

// Friends (and the player) get the full profile; anyone else a mini card
export type Profile = ProfileCard | FullProfile;

export const friendsApi = {
  list: () => apiRequest<{ friends: PlayerCard[] }>('/friends'),
  requests: () =>
    apiRequest<{ incoming: FriendRequest[]; outgoing: FriendRequest[] }>('/friends/requests'),
  send: (username: string) =>
    apiRequest<{ status: 'PENDING' | 'ACCEPTED' }>('/friends/requests', {
      method: 'POST',
      body: { username },
    }),
  accept: (requestId: string) =>
    apiRequest<void>(`/friends/requests/${requestId}/accept`, { method: 'POST' }),
  deleteRequest: (requestId: string) =>
    apiRequest<void>(`/friends/requests/${requestId}`, { method: 'DELETE' }),
  remove: (username: string) =>
    apiRequest<void>(`/friends/${encodeURIComponent(username)}`, { method: 'DELETE' }),
  ranking: (period: 'weekly' | 'all') =>
    apiRequest<{ period: string; players: RankingEntry[] }>(`/friends/ranking?period=${period}`),
  profile: (username: string) => apiRequest<Profile>(`/users/${encodeURIComponent(username)}`),
  updateBio: (bio: string) => apiRequest<void>('/me/profile', { method: 'PATCH', body: { bio } }),
};
