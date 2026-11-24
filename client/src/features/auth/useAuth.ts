import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
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
    onSuccess: ({ user }) => {
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
    onSuccess: ({ user }) => {
      queryClient.setQueryData(currentUserKey, user);
    },
  });
}

export function useLogout() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: authApi.logout,
    onSuccess: () => {
      // Forget all cached data of the previous player
      queryClient.clear();
      queryClient.setQueryData(currentUserKey, null);
    },
  });
}
