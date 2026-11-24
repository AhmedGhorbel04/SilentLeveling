import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { friendsApi } from '../../api/friends';
import { notificationsKey } from '../achievements/queryKeys';

// Every friends-related query starts with 'friends', so one invalidation refreshes them all
export const friendsKeys = {
  all: ['friends'] as const,
  list: ['friends', 'list'] as const,
  requests: ['friends', 'requests'] as const,
  ranking: (period: string) => ['friends', 'ranking', period] as const,
  profile: (username: string) => ['friends', 'profile', username.toLowerCase()] as const,
};

export function useFriendsList() {
  return useQuery({
    queryKey: friendsKeys.list,
    queryFn: friendsApi.list,
    select: (data) => data.friends,
  });
}

export function useFriendRequests() {
  return useQuery({ queryKey: friendsKeys.requests, queryFn: friendsApi.requests });
}

export function useRanking(period: 'weekly' | 'all') {
  return useQuery({
    queryKey: friendsKeys.ranking(period),
    queryFn: () => friendsApi.ranking(period),
    select: (data) => data.players,
  });
}

export function useProfile(username: string) {
  return useQuery({
    queryKey: friendsKeys.profile(username),
    queryFn: () => friendsApi.profile(username),
    retry: false,
  });
}

function useRefreshFriends() {
  const queryClient = useQueryClient();
  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: friendsKeys.all }),
      queryClient.invalidateQueries({ queryKey: notificationsKey }),
    ]);
}

export function useSendRequest() {
  return useMutation({ mutationFn: friendsApi.send, onSuccess: useRefreshFriends() });
}

export function useAcceptRequest() {
  return useMutation({ mutationFn: friendsApi.accept, onSuccess: useRefreshFriends() });
}

export function useDeleteRequest() {
  return useMutation({ mutationFn: friendsApi.deleteRequest, onSuccess: useRefreshFriends() });
}

export function useRemoveFriend() {
  return useMutation({ mutationFn: friendsApi.remove, onSuccess: useRefreshFriends() });
}

export function useUpdateBio() {
  return useMutation({ mutationFn: friendsApi.updateBio, onSuccess: useRefreshFriends() });
}
