import { apiRequest } from './client';
import type { Category } from '../game/constants';

export type GoalStatus = 'ACTIVE' | 'COMPLETED' | 'ABANDONED';

export type Milestone = {
  id: string;
  title: string;
  position: number;
  completed: boolean;
  linkedQuests: number;
};

export type Goal = {
  id: string;
  title: string;
  description: string | null;
  category: Category;
  targetDate: string | null;
  status: GoalStatus;
  completedAt: string | null;
  createdAt: string;
  progress: { completed: number; total: number; percent: number };
  milestones: Milestone[];
};

export type CreateGoalRequest = {
  title: string;
  description: string;
  category: Category;
  targetDate: string | null;
  milestones: string[];
};

export type UpdateGoalRequest = Partial<Omit<CreateGoalRequest, 'milestones'>> & {
  status?: GoalStatus;
};

export type UpdateMilestoneRequest = { title?: string; completed?: boolean; position?: number };

export type GoalResponse = { goal: Goal };

export const goalsApi = {
  list: () => apiRequest<{ goals: Goal[] }>('/goals'),
  create: (data: CreateGoalRequest) =>
    apiRequest<GoalResponse>('/goals', { method: 'POST', body: data }),
  update: ({ id, ...data }: UpdateGoalRequest & { id: string }) =>
    apiRequest<GoalResponse>(`/goals/${id}`, { method: 'PATCH', body: data }),
  remove: (id: string) => apiRequest<void>(`/goals/${id}`, { method: 'DELETE' }),
  addMilestone: ({ goalId, title }: { goalId: string; title: string }) =>
    apiRequest<GoalResponse>(`/goals/${goalId}/milestones`, { method: 'POST', body: { title } }),
  updateMilestone: ({ id, ...data }: UpdateMilestoneRequest & { id: string }) =>
    apiRequest<GoalResponse>(`/milestones/${id}`, { method: 'PATCH', body: data }),
  removeMilestone: (id: string) =>
    apiRequest<GoalResponse>(`/milestones/${id}`, { method: 'DELETE' }),
};
