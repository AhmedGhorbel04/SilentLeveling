import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { clearOfflineData } from '../../offline/queryClient';
import { authApi, type CurrentUser } from '../../api/auth';

// The logged-in player is stored in TanStack Query's cache under this key.
// Every component that calls useCurrentUser() shares the same data and request.
export const currentUserKey = ['currentUser'] as const;

// Returns the logged-in player, or null when nobody is logged in.
export function useCurrentUser() {
  return useQuery<CurrentUser | null>({
    queryKey: currentUserKey,
    queryFn: async () => (await authApi.session()).user,
    staleTime: 5 * 60 * 1000,
    retry: false,
  });
}

export function useLogin() {
  const queryClient = useQueryClient();
  const { i18n } = useTranslation();

  return useMutation({
    mutationFn: authApi.login,
    onSuccess: async ({ user }) => {
      // A session that expired leaves the previous player's saved data behind
      await clearOfflineData();
      queryClient.setQueryData(currentUserKey, user);
      // Show the interface in the language saved in the player's account
      void i18n.changeLanguage(user.language);
    },
  });
}

export function useRegister() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: authApi.register,
    onSuccess: async ({ user }) => {
      await clearOfflineData();
      queryClient.setQueryData(currentUserKey, user);
    },
  });
}

export function useLogout() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: authApi.logout,
    onSuccess: async () => {
      // Forget all data of the previous player, in memory and saved on the device
      await clearOfflineData();
      queryClient.setQueryData(currentUserKey, null);
    },
  });
}
