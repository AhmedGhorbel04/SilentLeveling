import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '../../components/ui/Button';
import { ApiError } from '../../api/client';
import { remindersApi, type ReminderSettings } from '../../api/reminders';
import { currentSubscription, pushSupport, subscribeDevice } from './pushDevice';

const remindersKey = ['reminders'] as const;

// Daily reminder (M11): a notification at the chosen time if daily quests are left
export function RemindersCard() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const settings = useQuery({ queryKey: remindersKey, queryFn: remindersApi.get });
  const [support] = useState(pushSupport);
  const [permission, setPermission] = useState(() =>
    'Notification' in window ? Notification.permission : 'default',
  );
  // Whether THIS device receives notifications (the account may have others)
  const [thisDevice, setThisDevice] = useState<boolean | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (support !== 'supported') return;
    void currentSubscription().then((sub) => setThisDevice(Boolean(sub)));
  }, [support]);

  const save = (data: ReminderSettings) => queryClient.setQueryData(remindersKey, data);

  const enable = useMutation({
    mutationFn: async () => {
      const subscription = await subscribeDevice(settings.data!.publicKey!);
      setPermission(Notification.permission);
      if (!subscription) return null;
      await remindersApi.addDevice(subscription.toJSON());
      setThisDevice(true);
      return remindersApi.update({ enabled: true });
    },
    onSuccess: (data) => data && save(data),
  });

  const disable = useMutation({
    mutationFn: async () => {
      const subscription = await currentSubscription();
      if (subscription) {
        await remindersApi.removeDevice(subscription.endpoint);
        await subscription.unsubscribe();
      }
      setThisDevice(false);
      return remindersApi.update({ enabled: false });
    },
    onSuccess: save,
  });

  const changeTime = useMutation({
    mutationFn: (time: string) => remindersApi.update({ time }),
    onSuccess: save,
  });

  const test = useMutation({
    mutationFn: remindersApi.test,
    onSuccess: () => setMessage(t('reminders.testSent')),
    onError: (error) =>
      setMessage(t(`errors.${error instanceof ApiError ? error.code : 'UNKNOWN'}`)),
  });

  // The server has no push keys: the feature is simply not offered
  if (!settings.data?.publicKey) return null;
  const { enabled, time } = settings.data;
  const busy = enable.isPending || disable.isPending;
  const failed = enable.error ?? disable.error ?? changeTime.error;

  let notice: string | null = null;
  if (support === 'ios-needs-install') notice = t('reminders.iosInstall');
  else if (support !== 'supported') notice = t('reminders.unsupported');
  else if (permission === 'denied') notice = t('reminders.blocked');

  return (
    <section aria-labelledby="reminders-title" className="system-panel p-5">
      <div className="flex items-center justify-between gap-3">
        <h2 id="reminders-title" className="font-display text-lg font-bold text-white">
          🔔 {t('reminders.title')}
        </h2>
        {!notice && (
          <label className="flex items-center gap-2 text-sm text-slate-300">
            <input
              type="checkbox"
              role="switch"
              checked={enabled && thisDevice !== false}
              disabled={busy}
              onChange={() => (enabled && thisDevice !== false ? disable : enable).mutate()}
              className="size-4 accent-arcane-500"
            />
            {t('reminders.toggle')}
          </label>
        )}
      </div>
      <p className="mt-1 text-sm text-slate-400">{t('reminders.description')}</p>

      {notice && <p className="mt-3 text-sm text-amber-300">{notice}</p>}

      {!notice && enabled && thisDevice === false && (
        <p className="mt-3 text-sm text-slate-300">{t('reminders.otherDevice')}</p>
      )}

      {!notice && enabled && thisDevice !== false && (
        <div className="mt-4 flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-300">
            {t('reminders.time')}
            <input
              type="time"
              value={time}
              dir="ltr"
              onChange={(e) => e.target.value && changeTime.mutate(e.target.value)}
              className="rounded-md border border-abyss-border bg-void/60 px-3 py-2 text-slate-100 focus:border-arcane-500 focus:outline-none"
            />
          </label>
          <Button variant="secondary" isLoading={test.isPending} onClick={() => test.mutate()}>
            {t('reminders.test')}
          </Button>
        </div>
      )}

      {(message || failed) && (
        <p role="status" className="mt-3 text-sm text-slate-300">
          {failed ? t('errors.UNKNOWN') : message}
        </p>
      )}
    </section>
  );
}
