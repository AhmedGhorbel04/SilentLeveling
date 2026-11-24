import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { achievementsApi, notificationsApi } from '../../api/achievements';
import { dashboardKey } from '../quests/useQuests';
import { achievementsKey, notificationsKey, titlesKey } from './queryKeys';

export function useAchievements() {
  return useQuery({
    queryKey: achievementsKey,
    queryFn: achievementsApi.list,
    select: (data) => data.achievements,
  });
}

export function useTitles() {
  return useQuery({ queryKey: titlesKey, queryFn: achievementsApi.titles });
}

export function useSetActiveTitle() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: achievementsApi.setActiveTitle,
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: titlesKey }),
        queryClient.invalidateQueries({ queryKey: dashboardKey }),
      ]),
  });
}

// Checked again every minute, and right after completing a quest
export function useNotifications() {
  return useQuery({
    queryKey: notificationsKey,
    queryFn: notificationsApi.list,
    refetchInterval: 60_000,
  });
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: notificationsApi.markRead,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: notificationsKey }),
  });
}

export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: notificationsApi.markAllRead,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: notificationsKey }),
  });
}
