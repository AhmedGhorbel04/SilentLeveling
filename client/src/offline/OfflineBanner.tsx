import { useSyncExternalStore } from 'react';
import { onlineManager, useMutationState } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';

function useIsOnline() {
  return useSyncExternalStore(
    (onChange) => onlineManager.subscribe(onChange),
    () => onlineManager.isOnline(),
  );
}

// Tells the player they are offline and how many changes wait to be synced
export function OfflineBanner() {
  const { t } = useTranslation();
  const online = useIsOnline();
  const waiting = useMutationState({
    filters: { mutationKey: ['offline'], status: 'pending' },
  }).length;

  if (online && waiting === 0) return null;

  return (
    <div
      role="status"
      className={`border-b px-4 py-2 text-center text-sm ${
        online
          ? 'border-arcane-500/40 bg-arcane-500/10 text-arcane-200'
          : 'border-amber-500/40 bg-amber-500/10 text-amber-200'
      }`}
    >
      {online
        ? t('offline.syncing', { count: waiting })
        : waiting > 0
          ? t('offline.waiting', { count: waiting })
          : t('offline.offline')}
    </div>
  );
}
