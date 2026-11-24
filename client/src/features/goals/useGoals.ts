import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { goalsApi } from '../../api/goals';
import { todayQuestsKey } from '../quests/useQuests';

export const goalsKey = ['goals'] as const;

export function useGoals() {
  return useQuery({ queryKey: goalsKey, queryFn: goalsApi.list, select: (data) => data.goals });
}

// Goals and quests show each other (linked quests, "goal › milestone" labels),
// so a change to one refreshes both
function useRefreshGoals() {
  const queryClient = useQueryClient();
  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: goalsKey }),
      queryClient.invalidateQueries({ queryKey: todayQuestsKey }),
    ]);
}

export function useCreateGoal() {
  return useMutation({ mutationFn: goalsApi.create, onSuccess: useRefreshGoals() });
}

export function useUpdateGoal() {
  return useMutation({ mutationFn: goalsApi.update, onSuccess: useRefreshGoals() });
}

export function useDeleteGoal() {
  return useMutation({ mutationFn: goalsApi.remove, onSuccess: useRefreshGoals() });
}

export function useAddMilestone() {
  return useMutation({ mutationFn: goalsApi.addMilestone, onSuccess: useRefreshGoals() });
}

export function useUpdateMilestone() {
  return useMutation({ mutationFn: goalsApi.updateMilestone, onSuccess: useRefreshGoals() });
}

export function useDeleteMilestone() {
  return useMutation({ mutationFn: goalsApi.removeMilestone, onSuccess: useRefreshGoals() });
}
