import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { AppNotification } from '../../api/achievements';
import { rankLabel } from '../../game/ranks';
import {
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useNotifications,
} from './useAchievements';

// The text is built here from the type and data, so it follows the selected language
function useNotificationText() {
  const { t } = useTranslation();
  return (notification: AppNotification) => {
    switch (notification.type) {
      case 'ACHIEVEMENT_UNLOCKED':
        return t('notifications.achievement', {
          name: t(`achievements.${notification.data.code}.name`),
        });
      case 'RANK_UP':
        return t('notifications.rankUp', { rank: rankLabel(notification.data.rank ?? '') });
      case 'PENALTY_QUEST':
        return t('notifications.penalty', { count: notification.data.streak });
      case 'FRIEND_REQUEST':
        return t('notifications.friendRequest', { username: notification.data.username });
      case 'FRIEND_ACCEPTED':
        return t('notifications.friendAccepted', { username: notification.data.username });
      case 'CLAIM_APPROVED':
        return t('notifications.claimApproved', { xp: notification.data.xp });
      case 'CLAIM_REJECTED':
        return t('notifications.claimRejected', { reason: notification.data.reason });
    }
  };
}

const ICONS: Record<AppNotification['type'], string> = {
  ACHIEVEMENT_UNLOCKED: '🏆',
  RANK_UP: '⬆️',
  PENALTY_QUEST: '⚠️',
  FRIEND_REQUEST: '👋',
  FRIEND_ACCEPTED: '🤝',
  CLAIM_APPROVED: '🏆',
  CLAIM_REJECTED: '✖️',
};

// Bell in the header with the unread count; opens the latest notifications (FR-70, FR-71)
export function NotificationBell() {
  const { t, i18n } = useTranslation();
  const { data } = useNotifications();
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();
  const textOf = useNotificationText();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close with Escape or a click outside
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => event.key === 'Escape' && setOpen(false);
    const onClick = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    window.addEventListener('mousedown', onClick);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('mousedown', onClick);
    };
  }, [open]);

  const unread = data?.unreadCount ?? 0;
  const timeFormat = new Intl.DateTimeFormat(i18n.resolvedLanguage, {
    dateStyle: 'short',
    timeStyle: 'short',
  });

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="true"
        aria-label={t('notifications.open', { count: unread })}
        className="relative grid size-9 place-items-center rounded-md text-slate-300 transition hover:bg-abyss-light hover:text-white"
      >
        <svg
          viewBox="0 0 24 24"
          className="size-5"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          aria-hidden="true"
        >
          <path
            d="M6 16V11a6 6 0 1 1 12 0v5l1.5 2h-15L6 16ZM10 20a2 2 0 0 0 4 0"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        {unread > 0 && (
          <span
            aria-hidden="true"
            className="absolute -end-0.5 -top-0.5 grid min-w-4 place-items-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white"
          >
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="system-panel absolute end-0 top-11 z-30 w-80 max-w-[calc(100vw-2rem)] p-3 shadow-glow">
          <div className="mb-2 flex items-center justify-between gap-2 px-1">
            <h2 className="font-display text-lg font-bold text-white">
              {t('notifications.title')}
            </h2>
            {unread > 0 && (
              <button
                type="button"
                onClick={() => markAllRead.mutate()}
                className="text-xs font-semibold text-arcane-400 hover:text-arcane-300"
              >
                {t('notifications.markAllRead')}
              </button>
            )}
          </div>

          {!data || data.notifications.length === 0 ? (
            <p className="px-1 py-6 text-center text-sm text-slate-400">
              {t('notifications.empty')}
            </p>
          ) : (
            <ul className="flex max-h-96 flex-col gap-1 overflow-y-auto">
              {data.notifications.map((notification) => (
                <li key={notification.id}>
                  <button
                    type="button"
                    onClick={() => !notification.read && markRead.mutate(notification.id)}
                    className={`flex w-full gap-3 rounded-md px-2 py-2 text-start transition hover:bg-abyss-light ${
                      notification.read ? 'opacity-60' : ''
                    }`}
                  >
                    <span aria-hidden="true">{ICONS[notification.type]}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm text-slate-100">{textOf(notification)}</span>
                      <span className="block text-xs text-slate-500">
                        {timeFormat.format(new Date(notification.createdAt))}
                      </span>
                    </span>
                    {!notification.read && (
                      <span
                        className="mt-1.5 size-2 shrink-0 rounded-full bg-arcane-400"
                        aria-label={t('notifications.unread')}
                      />
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
