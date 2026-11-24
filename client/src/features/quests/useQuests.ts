import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { questsApi } from '../../api/quests';
import { dashboardApi } from '../../api/dashboard';
import { currentUserKey } from '../auth/useAuth';

export const todayQuestsKey = ['quests', 'today'] as const;
export const dashboardKey = ['dashboard'] as const;

export function useTodayQuests() {
  return useQuery({ queryKey: todayQuestsKey, queryFn: questsApi.today });
}

export function useDashboard() {
  return useQuery({ queryKey: dashboardKey, queryFn: dashboardApi.get });
}

// After any change, reload the quest list and the status window from the server
// (statuses, XP, level, streak) instead of guessing the new state in the browser
function useRefreshAfter() {
  const queryClient = useQueryClient();
  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: todayQuestsKey }),
      queryClient.invalidateQueries({ queryKey: dashboardKey }),
    ]);
}

export function useCompleteQuest() {
  return useMutation({ mutationFn: questsApi.complete, onSuccess: useRefreshAfter() });
}

export function useRerollQuest() {
  return useMutation({ mutationFn: questsApi.reroll, onSuccess: useRefreshAfter() });
}

export function useCreateCustomQuest() {
  return useMutation({ mutationFn: questsApi.createCustom, onSuccess: useRefreshAfter() });
}

export function useUpdateCustomQuest() {
  return useMutation({ mutationFn: questsApi.updateCustom, onSuccess: useRefreshAfter() });
}

export function useDeleteCustomQuest() {
  return useMutation({ mutationFn: questsApi.deleteCustom, onSuccess: useRefreshAfter() });
}

export function useOnboarding() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: questsApi.onboard,
    onSuccess: ({ user }) => queryClient.setQueryData(currentUserKey, user),
  });
}
