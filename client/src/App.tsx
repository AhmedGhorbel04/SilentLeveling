import { useEffect } from 'react';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { RouterProvider } from 'react-router';
import { router } from './router';
import { onlineManager, persistOptions, queryClient, syncNow } from './offline/queryClient';

// When the connection comes back: send the queued actions, then reload everything
function useSyncOnReconnect() {
  useEffect(
    () =>
      onlineManager.subscribe((online) => {
        if (online) void syncNow();
      }),
    [],
  );
}

export function App() {
  useSyncOnReconnect();

  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={persistOptions}
      // Saved data is back: send what was queued before the app was closed
      onSuccess={() => {
        if (onlineManager.isOnline()) void syncNow();
      }}
    >
      <RouterProvider router={router} />
    </PersistQueryClientProvider>
  );
}
