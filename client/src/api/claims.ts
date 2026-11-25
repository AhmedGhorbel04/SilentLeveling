import { apiRequest } from './client';
import type { Title } from './achievements';
import type { Category } from '../game/constants';

type Translations = { en: string; fr: string; ar: string };
export type Tier = 'LEGENDARY' | 'MYTHIC';
export type ClaimStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export type LegendaryQuest = {
  id: string;
  key: string;
  title: Translations;
  category: Category;
  tier: Tier;
  xpReward: number;
  rewardTitle: Title | null;
  myClaimStatus: ClaimStatus | null;
};

export type Claim = {
  id: string;
  status: ClaimStatus;
  title: Translations;
  description: string;
  proofUrl: string;
  legendaryQuest: {
    id: string;
    key: string;
    title: Translations;
    tier: Tier;
    xpReward: number;
  } | null;
  tierAwarded: Tier | null;
  xpAwarded: number | null;
  titleAwarded: Title | null;
  reviewNote: string | null;
  createdAt: string;
  reviewedAt: string | null;
};

export type ReviewClaim = Claim & { player: { username: string; level: number; rank: string } };

export type SubmitClaimRequest = {
  legendaryQuestId?: string;
  title?: string;
  description: string;
  proofUrl: string;
};

export type ApproveClaimRequest = {
  xp: number;
  tier: Tier;
  titleId?: string;
  newTitle?: { name: Translations; rarity: Tier };
  note?: string;
};

export const claimsApi = {
  catalog: () => apiRequest<{ quests: LegendaryQuest[] }>('/legendary-quests'),
  mine: () => apiRequest<{ claims: Claim[] }>('/claims/mine'),
  submit: (data: SubmitClaimRequest) =>
    apiRequest<{ claim: Claim }>('/claims', { method: 'POST', body: data }),
};

export type AdminLegendaryQuest = Omit<LegendaryQuest, 'myClaimStatus'> & {
  active: boolean;
  titleId: string | null;
};

export type LegendaryQuestRequest = {
  title: Translations;
  category: Category;
  tier: Tier;
  xpReward: number;
  titleId: string | null;
  active: boolean;
};

export const adminApi = {
  claims: (status: ClaimStatus) =>
    apiRequest<{ claims: ReviewClaim[] }>(`/admin/claims?status=${status}`),
  approve: ({ id, ...data }: ApproveClaimRequest & { id: string }) =>
    apiRequest<{ rankBefore: string; rankAfter: string }>(`/admin/claims/${id}/approve`, {
      method: 'POST',
      body: data,
    }),
  reject: ({ id, reason }: { id: string; reason: string }) =>
    apiRequest<void>(`/admin/claims/${id}/reject`, { method: 'POST', body: { reason } }),
  titles: () => apiRequest<{ titles: Title[] }>('/admin/titles'),
  catalog: () => apiRequest<{ quests: AdminLegendaryQuest[] }>('/admin/legendary-quests'),
  setActive: ({ id, active }: { id: string; active: boolean }) =>
    apiRequest<void>(`/admin/legendary-quests/${id}`, { method: 'PATCH', body: { active } }),
  createQuest: (data: LegendaryQuestRequest) =>
    apiRequest<{ quest: AdminLegendaryQuest }>('/admin/legendary-quests', {
      method: 'POST',
      body: data,
    }),
  updateQuest: ({ id, ...data }: LegendaryQuestRequest & { id: string }) =>
    apiRequest<void>(`/admin/legendary-quests/${id}`, { method: 'PATCH', body: data }),
  deleteQuest: (id: string) =>
    apiRequest<void>(`/admin/legendary-quests/${id}`, { method: 'DELETE' }),
};
