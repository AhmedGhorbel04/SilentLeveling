import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { questsApi, type CompleteQuestResult, type Quest } from '../../api/quests';
import {
  offlineMutations,
  type CompleteQuestVariables,
  type CreateQuestVariables,
} from '../../offline/queryClient';
import { dashboardApi } from '../../api/dashboard';
import { currentUserKey } from '../auth/useAuth';
import { achievementsKey, notificationsKey, titlesKey } from '../achievements/queryKeys';

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
      // A completion can unlock achievements and titles and create notifications
      queryClient.invalidateQueries({ queryKey: notificationsKey }),
      queryClient.invalidateQueries({ queryKey: achievementsKey }),
      queryClient.invalidateQueries({ queryKey: titlesKey }),
    ]);
}

// Can be done offline: the action is queued, shown right away and synced later.
// The function and the reload after it are defined once in offline/queryClient.ts.
export function useCompleteQuest() {
  return useMutation<CompleteQuestResult, Error, CompleteQuestVariables>({
    mutationKey: offlineMutations.completeQuest,
  });
}

export function useRerollQuest() {
  return useMutation({ mutationFn: questsApi.reroll, onSuccess: useRefreshAfter() });
}

// Can be done offline too: the app picks the quest id, so a retried sync can't duplicate it
export function useCreateCustomQuest() {
  return useMutation<{ quest: Quest }, Error, CreateQuestVariables>({
    mutationKey: offlineMutations.createQuest,
  });
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
