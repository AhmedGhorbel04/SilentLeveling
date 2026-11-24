import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { questsApi } from '../../api/quests';
import { currentUserKey } from '../auth/useAuth';

export const todayQuestsKey = ['quests', 'today'] as const;

export function useTodayQuests() {
  return useQuery({ queryKey: todayQuestsKey, queryFn: questsApi.today });
}

export function useCompleteQuest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: questsApi.complete,
    // Reload today's list from the server (statuses, streak, penalty) instead of
    // guessing the new state in the browser
    onSuccess: () => queryClient.invalidateQueries({ queryKey: todayQuestsKey }),
  });
}

export function useRerollQuest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: questsApi.reroll,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: todayQuestsKey }),
  });
}

export function useOnboarding() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: questsApi.onboard,
    onSuccess: ({ user }) => queryClient.setQueryData(currentUserKey, user),
  });
}
