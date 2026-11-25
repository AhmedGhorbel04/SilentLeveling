import { onlineManager, QueryClient, type QueryKey } from '@tanstack/react-query';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import { del, get, set } from 'idb-keyval';
import { ApiError } from '../api/client';
import { questsApi, type CustomQuestRequest, type Quest, type TodayQuests } from '../api/quests';
import { goalsApi, type Goal, type UpdateMilestoneRequest } from '../api/goals';

// Offline mode (M11):
// - The data the player looked at is saved in IndexedDB and shown when offline.
// - A few actions can be done offline: completing a quest, creating a custom quest,
//   ticking a milestone. They are queued (also saved), shown right away, and sent in
//   order when the connection is back. The server stays the judge of XP and streaks.
// - Every other action needs the network and fails at once with a clear message.

// TanStack Query assumes "online" until the browser fires an offline event, which
// never happens when the app is opened without a connection: start from the truth
if (typeof navigator !== 'undefined') onlineManager.setOnline(navigator.onLine);

export const CACHE_MAX_AGE = 7 * 24 * 60 * 60 * 1000; // matches the server's offline limit

// Queued actions all share one scope, so they are sent one after the other, in order
const offlineScope = { id: 'offline-queue' };
const todayKey: QueryKey = ['quests', 'today'];
const goalsKey: QueryKey = ['goals'];

// A replayed action the server already applied (response lost on a bad connection)
// or that can no longer apply: the reload after the sync shows the real state
function isSettledOnServer(error: unknown) {
  return error instanceof ApiError && (error.status === 404 || error.status === 409);
}

// A queued action is never dropped because of the network: "connected" to a Wi-Fi
// without internet, it keeps retrying (every 2 s, 4 s… up to 30 s) until it goes through
function retryQueued(count: number, error: unknown) {
  if (error instanceof ApiError && error.code === 'NETWORK_ERROR') return true;
  return !isSettledOnServer(error) && count < 3;
}
const retryDelay = (attempt: number) => Math.min(30_000, 1000 * 2 ** attempt);

export const offlineMutations = {
  completeQuest: ['offline', 'completeQuest'],
  createQuest: ['offline', 'createQuest'],
  updateMilestone: ['offline', 'updateMilestone'],
} as const;

export type CompleteQuestVariables = { id: string; completedAt?: string };
export type CreateQuestVariables = CustomQuestRequest & { id: string };
export type UpdateMilestoneVariables = UpdateMilestoneRequest & { id: string };

// One factory for the app and for the tests, so both get the offline actions
export function createAppQueryClient(options: { retry?: boolean } = {}) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        refetchOnWindowFocus: false,
        // On reconnect, the queue is sent first and only then is everything reloaded
        // (see useSyncOnReconnect): a reload first would close the day on the server
        // before the quests done offline arrive
        refetchOnReconnect: false,
        gcTime: CACHE_MAX_AGE, // kept in memory as long as it is kept on disk
      },
      // Not queued: fail immediately when offline instead of waiting forever
      mutations: { networkMode: 'always' },
    },
  });
  function updateToday(update: (today: TodayQuests) => TodayQuests) {
    queryClient.setQueryData<TodayQuests>(todayKey, (today) => today && update(today));
  }

  // After an action, reload from the server: quests, status window, achievements,
  // notifications, goals. Not while more queued actions are waiting: a reload would
  // close the day on the server before the rest of that day's quests arrive.
  function refreshWhenQueueIsEmpty() {
    // The action that just finished still counts as running here
    if (queryClient.isMutating({ mutationKey: ['offline'] }) <= 1) {
      void queryClient.invalidateQueries();
    }
  }

  const markCompleted = (quest: Quest): Quest => ({
    ...quest,
    status: 'COMPLETED',
    completedAt: new Date().toISOString(),
    xpAwarded: quest.xpReward, // estimate; the server's value replaces it after the sync
  });

  queryClient.setMutationDefaults(offlineMutations.completeQuest, {
    onSettled: refreshWhenQueueIsEmpty,
    mutationFn: ({ id, completedAt }: CompleteQuestVariables) =>
      questsApi.complete(id, completedAt),
    networkMode: 'online', // paused while offline, resumed on reconnect
    scope: offlineScope,
    retry: retryQueued,
    retryDelay,
    onMutate: async ({ id }: CompleteQuestVariables) => {
      await queryClient.cancelQueries({ queryKey: todayKey });
      updateToday((today) => {
        const mark = (quests: Quest[]) => quests.map((q) => (q.id === id ? markCompleted(q) : q));
        return {
          ...today,
          daily: mark(today.daily),
          weekly: mark(today.weekly),
          penalty: mark(today.penalty),
          custom: mark(today.custom),
        };
      });
    },
  });

  queryClient.setMutationDefaults(offlineMutations.createQuest, {
    onSettled: refreshWhenQueueIsEmpty,
    mutationFn: (quest: CreateQuestVariables) => questsApi.createCustom(quest),
    networkMode: 'online',
    scope: offlineScope,
    retry: (count, error) =>
      (error instanceof ApiError && error.code === 'NETWORK_ERROR') ||
      (!(error instanceof ApiError && error.status < 500) && count < 3),
    retryDelay,
    onMutate: async (input: CreateQuestVariables) => {
      await queryClient.cancelQueries({ queryKey: todayKey });
      updateToday((today) => ({
        ...today,
        custom: [
          ...today.custom,
          {
            id: input.id,
            source: 'CUSTOM',
            type: 'ONE_TIME',
            category: input.category,
            difficulty: input.difficulty,
            minutes: null,
            xpReward: 0, // calculated by the server
            xpAwarded: null,
            status: 'ACTIVE',
            questDate: today.date,
            dueAt: `${input.dueDate}T23:59:59`,
            completedAt: null,
            title: { en: input.title, fr: input.title, ar: input.title },
            description: input.description || null,
            milestone: null,
            rerollable: false,
          },
        ],
      }));
    },
  });

  queryClient.setMutationDefaults(offlineMutations.updateMilestone, {
    onSettled: refreshWhenQueueIsEmpty,
    mutationFn: (input: UpdateMilestoneVariables) => goalsApi.updateMilestone(input),
    networkMode: 'online',
    scope: offlineScope,
    retry: retryQueued,
    retryDelay,
    onMutate: async ({ id, completed }: UpdateMilestoneVariables) => {
      if (completed === undefined) return;
      await queryClient.cancelQueries({ queryKey: goalsKey });
      queryClient.setQueryData<{ goals: Goal[] }>(goalsKey, (data) =>
        data
          ? {
              goals: data.goals.map((goal) => ({
                ...goal,
                milestones: goal.milestones.map((m) => (m.id === id ? { ...m, completed } : m)),
              })),
            }
          : data,
      );
    },
  });

  if (options.retry === false) {
    queryClient.setDefaultOptions({
      ...queryClient.getDefaultOptions(),
      queries: { ...queryClient.getDefaultOptions().queries, retry: false },
    });
    for (const key of Object.values(offlineMutations)) {
      queryClient.setMutationDefaults(key, {
        ...queryClient.getMutationDefaults(key),
        retry: false,
      });
    }
  }
  return queryClient;
}

export const queryClient = createAppQueryClient();

// Stored in IndexedDB: large capacity, works offline, survives a restart
export const persister = createAsyncStoragePersister({
  storage: { getItem: get, setItem: set, removeItem: del },
  key: 'silentleveling-cache',
  throttleTime: 1000,
});

// What is worth saving: the player's own pages, never another player's profile or
// admin data (smaller cache, nothing sensitive left on a shared device)
const OFFLINE_QUERIES = ['currentUser', 'quests', 'dashboard', 'goals', 'achievements', 'titles'];

export const persistOptions = {
  persister,
  maxAge: CACHE_MAX_AGE,
  // Bump when the shape of cached data changes, to drop old caches after a deploy
  buster: 'v1',
  dehydrateOptions: {
    shouldDehydrateQuery: (query: { queryKey: QueryKey; state: { status: string } }) =>
      query.state.status === 'success' && OFFLINE_QUERIES.includes(String(query.queryKey[0])),
    shouldDehydrateMutation: (mutation: { state: { isPaused: boolean } }) =>
      mutation.state.isPaused,
  },
};

// Sends the queue, then reloads everything from the server
export async function syncNowFor(client: QueryClient) {
  await client.resumePausedMutations();
  await client.invalidateQueries();
}

export const syncNow = () => syncNowFor(queryClient);

// Logging out removes the saved data and queue from the device
export async function clearOfflineData() {
  queryClient.getMutationCache().clear();
  queryClient.clear();
  await persister.removeClient();
}

export { onlineManager };
