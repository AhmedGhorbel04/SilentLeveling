import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { adminApi, claimsApi, type ClaimStatus } from '../../api/claims';

// All claim-related queries start with 'claims', so one invalidation refreshes them all
const claimsKey = ['claims'] as const;

export function useLegendaryCatalog() {
  return useQuery({
    queryKey: [...claimsKey, 'catalog'],
    queryFn: claimsApi.catalog,
    select: (d) => d.quests,
  });
}

export function useMyClaims() {
  return useQuery({
    queryKey: [...claimsKey, 'mine'],
    queryFn: claimsApi.mine,
    select: (d) => d.claims,
  });
}

export function useSubmitClaim() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: claimsApi.submit,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: claimsKey }),
  });
}

export function useReviewClaims(status: ClaimStatus) {
  return useQuery({
    queryKey: [...claimsKey, 'review', status],
    queryFn: () => adminApi.claims(status),
    select: (d) => d.claims,
  });
}

export function useAdminTitles() {
  return useQuery({
    queryKey: [...claimsKey, 'titles'],
    queryFn: adminApi.titles,
    select: (d) => d.titles,
  });
}

export function useAdminCatalog() {
  return useQuery({
    queryKey: [...claimsKey, 'admin-catalog'],
    queryFn: adminApi.catalog,
    select: (d) => d.quests,
  });
}

function useAdminMutation<T>(mutationFn: (input: T) => Promise<unknown>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: claimsKey }),
  });
}

export const useApproveClaim = () => useAdminMutation(adminApi.approve);
export const useRejectClaim = () => useAdminMutation(adminApi.reject);
export const useSetQuestActive = () => useAdminMutation(adminApi.setActive);
export const useCreateQuest = () => useAdminMutation(adminApi.createQuest);
export const useUpdateQuest = () => useAdminMutation(adminApi.updateQuest);
export const useDeleteQuest = () => useAdminMutation(adminApi.deleteQuest);
