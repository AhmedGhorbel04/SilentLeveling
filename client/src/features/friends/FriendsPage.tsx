import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert } from '../../components/ui/Alert';
import { Button } from '../../components/ui/Button';
import { Spinner } from '../../components/ui/Spinner';
import { ApiError } from '../../api/client';
import { PlayerRow } from './PlayerRow';
import {
  useAcceptRequest,
  useDeleteRequest,
  useFriendRequests,
  useFriendsList,
  useRanking,
  useRemoveFriend,
  useSendRequest,
} from './useFriends';

const errorCode = (error: unknown) => (error instanceof ApiError ? error.code : 'UNKNOWN');

// Friends, friend requests and the ranking among friends (FR-50 to FR-54)
export function FriendsPage() {
  const { t } = useTranslation();
  const [period, setPeriod] = useState<'weekly' | 'all'>('weekly');
  const [username, setUsername] = useState('');
  const friends = useFriendsList();
  const requests = useFriendRequests();
  const ranking = useRanking(period);
  const send = useSendRequest();
  const accept = useAcceptRequest();
  const deleteRequest = useDeleteRequest();
  const remove = useRemoveFriend();

  function onSend(event: FormEvent) {
    event.preventDefault();
    if (!username.trim()) return;
    send.mutate(username.trim(), { onSuccess: () => setUsername('') });
  }

  function onRemove(friend: string) {
    if (window.confirm(t('friends.confirmRemove', { username: friend }))) remove.mutate(friend);
  }

  const actionError = accept.error ?? deleteRequest.error ?? remove.error;
  const incoming = requests.data?.incoming ?? [];
  const outgoing = requests.data?.outgoing ?? [];

  return (
    <div className="flex flex-col gap-6">
      <header>
        <p className="text-xs font-semibold tracking-[0.3em] text-arcane-400 uppercase">
          {t('friends.eyebrow')}
        </p>
        <h1 className="font-display text-3xl font-bold text-white">{t('friends.title')}</h1>
        <p className="mt-1 text-slate-400">{t('friends.subtitle')}</p>
      </header>

      <div className="grid items-start gap-6 lg:grid-cols-2">
        <section aria-labelledby="ranking-heading" className="system-panel p-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 id="ranking-heading" className="font-display text-xl font-bold text-white">
              {t('friends.rankingTitle')}
            </h2>
            <div className="flex rounded-md border border-abyss-border p-0.5" role="group">
              {(['weekly', 'all'] as const).map((option) => (
                <button
                  key={option}
                  type="button"
                  aria-pressed={period === option}
                  onClick={() => setPeriod(option)}
                  className={`rounded px-3 py-1 text-sm font-medium transition ${
                    period === option
                      ? 'bg-arcane-600 text-white'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {t(`friends.period.${option}`)}
                </button>
              ))}
            </div>
          </div>

          {ranking.isPending ? (
            <Spinner />
          ) : (
            <ol className="flex flex-col gap-2">
              {ranking.data?.map((entry) => (
                <PlayerRow
                  key={entry.username}
                  player={entry}
                  highlight={entry.isMe}
                  prefix={
                    <span className="w-6 text-center font-display text-lg font-bold text-slate-400">
                      {entry.position}
                    </span>
                  }
                >
                  <span className="shrink-0 font-display font-semibold text-azure-400" dir="ltr">
                    {period === 'weekly'
                      ? `${entry.weeklyXp} XP`
                      : `${entry.totalXp.toLocaleString()} XP`}
                  </span>
                </PlayerRow>
              ))}
            </ol>
          )}
          {ranking.data?.length === 1 && (
            <p className="mt-3 text-sm text-slate-400">{t('friends.rankingAlone')}</p>
          )}
        </section>

        <div className="flex flex-col gap-6">
          <section aria-labelledby="add-heading" className="system-panel p-5">
            <h2 id="add-heading" className="font-display text-xl font-bold text-white">
              {t('friends.addTitle')}
            </h2>
            <form onSubmit={onSend} className="mt-3 flex gap-2">
              <input
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                maxLength={20}
                dir="ltr"
                placeholder={t('friends.usernamePlaceholder')}
                aria-label={t('friends.usernamePlaceholder')}
                className="min-w-0 flex-1 rounded-md border border-abyss-border bg-void/60 px-3 py-2.5 text-slate-100 placeholder:text-slate-500 focus:border-arcane-500 focus:outline-none"
              />
              <Button type="submit" isLoading={send.isPending}>
                {t('friends.send')}
              </Button>
            </form>
            {send.isSuccess && (
              <p role="status" className="mt-2 text-sm text-emerald-300">
                {send.data.status === 'ACCEPTED'
                  ? t('friends.nowFriends')
                  : t('friends.requestSent')}
              </p>
            )}
            {send.error && (
              <div className="mt-3">
                <Alert>{t(`errors.${errorCode(send.error)}`, t('errors.UNKNOWN'))}</Alert>
              </div>
            )}
          </section>

          {actionError && (
            <Alert>{t(`errors.${errorCode(actionError)}`, t('errors.UNKNOWN'))}</Alert>
          )}

          {incoming.length > 0 && (
            <section aria-labelledby="incoming-heading" className="system-panel p-5">
              <h2 id="incoming-heading" className="mb-3 font-display text-xl font-bold text-white">
                {t('friends.incomingTitle', { count: incoming.length })}
              </h2>
              <ul className="flex flex-col gap-2">
                {incoming.map((request) => (
                  <PlayerRow key={request.id} player={request.player}>
                    <Button
                      onClick={() => accept.mutate(request.id)}
                      isLoading={accept.isPending && accept.variables === request.id}
                    >
                      {t('friends.accept')}
                    </Button>
                    <Button variant="ghost" onClick={() => deleteRequest.mutate(request.id)}>
                      {t('friends.decline')}
                    </Button>
                  </PlayerRow>
                ))}
              </ul>
            </section>
          )}

          {outgoing.length > 0 && (
            <section aria-labelledby="outgoing-heading" className="system-panel p-5">
              <h2 id="outgoing-heading" className="mb-3 font-display text-xl font-bold text-white">
                {t('friends.outgoingTitle')}
              </h2>
              <ul className="flex flex-col gap-2">
                {outgoing.map((request) => (
                  <PlayerRow key={request.id} player={request.player}>
                    <Button variant="ghost" onClick={() => deleteRequest.mutate(request.id)}>
                      {t('friends.cancel')}
                    </Button>
                  </PlayerRow>
                ))}
              </ul>
            </section>
          )}

          <section aria-labelledby="friends-heading" className="system-panel p-5">
            <h2 id="friends-heading" className="mb-3 font-display text-xl font-bold text-white">
              {t('friends.listTitle', { count: friends.data?.length ?? 0 })}
            </h2>
            {friends.data && friends.data.length === 0 ? (
              <p className="text-sm text-slate-400">{t('friends.empty')}</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {friends.data?.map((friend) => (
                  <PlayerRow key={friend.username} player={friend}>
                    <span className="hidden text-sm text-slate-400 sm:inline">
                      🔥 {friend.streak}
                    </span>
                    <Button
                      variant="ghost"
                      className="hover:text-rose-400"
                      onClick={() => onRemove(friend.username)}
                    >
                      {t('friends.remove')}
                    </Button>
                  </PlayerRow>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
