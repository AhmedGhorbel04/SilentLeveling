import { useState } from 'react';
import { useParams } from 'react-router';
import { useTranslation } from 'react-i18next';
import { Alert } from '../../components/ui/Alert';
import { Avatar } from '../../components/Avatar';
import { Button } from '../../components/ui/Button';
import { Spinner } from '../../components/ui/Spinner';
import { ApiError } from '../../api/client';
import type { FullProfile, Profile } from '../../api/friends';
import { rankColor } from '../../game/ranks';
import { ACHIEVEMENT_ICONS } from '../achievements/achievementStyles';
import { TitleBadge } from '../achievements/TitleBadge';
import {
  useAcceptRequest,
  useDeleteRequest,
  useProfile,
  useRemoveFriend,
  useSendRequest,
  useUpdateBio,
} from './useFriends';

const STATS = ['strength', 'intelligence', 'discipline', 'consistency'] as const;

// A player's profile: full for friends and yourself, a mini card for others (FR-52, FR-53)
export function ProfilePage() {
  const { t } = useTranslation();
  const { username = '' } = useParams();
  const { data: profile, isPending, error } = useProfile(username);

  if (isPending) {
    return (
      <div className="grid place-items-center py-16 text-arcane-400" role="status">
        <Spinner />
        <span className="sr-only">{t('common.loading')}</span>
      </div>
    );
  }
  if (error || !profile) {
    const code = error instanceof ApiError ? error.code : 'UNKNOWN';
    return <Alert>{t(`errors.${code}`, t('errors.UNKNOWN'))}</Alert>;
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <ProfileHeader profile={profile} />
      {profile.visibility === 'FULL' ? (
        <ProfileDetails profile={profile} />
      ) : (
        <p className="system-panel p-6 text-center text-slate-400">{t('profile.privateText')}</p>
      )}
    </div>
  );
}

function ProfileHeader({ profile }: { profile: Profile }) {
  const { t, i18n } = useTranslation();

  return (
    <section className="system-panel flex animate-fade-up flex-wrap items-center gap-5 p-6 shadow-glow">
      <Avatar avatarKey={profile.avatarKey} size={80} />
      <div className="min-w-0 flex-1">
        {/* Wraps instead of being cut off on small screens (usernames are at most 20 characters) */}
        <h1
          className="font-display text-2xl font-bold [overflow-wrap:anywhere] text-white sm:text-3xl"
          dir="ltr"
        >
          {profile.username}
        </h1>
        {profile.visibility === 'FULL' && profile.activeTitle && (
          <TitleBadge title={profile.activeTitle} />
        )}
        {profile.visibility === 'FULL' && (
          <p className="text-sm text-slate-400">
            {t('profile.memberSince', {
              date: new Intl.DateTimeFormat(i18n.resolvedLanguage, {
                month: 'long',
                year: 'numeric',
              }).format(new Date(profile.memberSince)),
            })}
            {' · '}
            {t('profile.friendsCount', { count: profile.friendsCount })}
          </p>
        )}
        <RelationshipActions profile={profile} />
      </div>
      <div
        className={`rounded-md bg-linear-to-br p-px shadow-glow-sm ${rankColor(profile.rank.code)}`}
      >
        <div className="flex flex-col items-center rounded-[5px] bg-abyss px-4 py-2">
          <span className="text-[10px] tracking-widest text-slate-400 uppercase">
            {t('status.rank')}
          </span>
          <span className="font-display text-3xl font-bold text-white" dir="ltr">
            {profile.rank.label}
          </span>
        </div>
      </div>
    </section>
  );
}

// The button depends on the relationship: add, accept, cancel, or remove
function RelationshipActions({ profile }: { profile: Profile }) {
  const { t } = useTranslation();
  const send = useSendRequest();
  const accept = useAcceptRequest();
  const deleteRequest = useDeleteRequest();
  const remove = useRemoveFriend();
  const { type, requestId } = profile.relationship;
  const error = send.error ?? accept.error ?? deleteRequest.error ?? remove.error;

  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {type === 'NONE' && (
        <Button onClick={() => send.mutate(profile.username)} isLoading={send.isPending}>
          + {t('profile.addFriend')}
        </Button>
      )}
      {type === 'REQUEST_RECEIVED' && requestId && (
        <>
          <Button onClick={() => accept.mutate(requestId)} isLoading={accept.isPending}>
            {t('friends.accept')}
          </Button>
          <Button variant="ghost" onClick={() => deleteRequest.mutate(requestId)}>
            {t('friends.decline')}
          </Button>
        </>
      )}
      {type === 'REQUEST_SENT' && requestId && (
        <Button variant="secondary" onClick={() => deleteRequest.mutate(requestId)}>
          {t('profile.cancelRequest')}
        </Button>
      )}
      {type === 'FRIEND' && (
        <Button
          variant="ghost"
          className="hover:text-rose-400"
          onClick={() =>
            window.confirm(t('friends.confirmRemove', { username: profile.username })) &&
            remove.mutate(profile.username)
          }
        >
          {t('friends.remove')}
        </Button>
      )}
      {error && (
        <p role="alert" className="w-full text-sm text-rose-400">
          {t(`errors.${error instanceof ApiError ? error.code : 'UNKNOWN'}`, t('errors.UNKNOWN'))}
        </p>
      )}
    </div>
  );
}

function ProfileDetails({ profile }: { profile: FullProfile }) {
  const { t, i18n } = useTranslation();
  const maxStat = Math.max(10, ...Object.values(profile.stats));
  const dateFormat = new Intl.DateTimeFormat(i18n.resolvedLanguage, { dateStyle: 'medium' });

  return (
    <>
      <Bio profile={profile} />

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: t('profile.level'), value: profile.level },
          { label: t('status.totalXp'), value: profile.totalXp.toLocaleString() },
          { label: t('profile.streak'), value: `🔥 ${profile.streak.current}` },
          {
            label: t('status.disciplineRate'),
            value: profile.disciplineRate === null ? '—' : `${profile.disciplineRate}%`,
          },
        ].map((item) => (
          <div key={item.label} className="system-panel p-4 text-center">
            <p className="font-display text-2xl font-bold text-white" dir="ltr">
              {item.value}
            </p>
            <p className="text-xs text-slate-400">{item.label}</p>
          </div>
        ))}
      </section>

      <section className="system-panel p-5">
        <h2 className="mb-4 font-display text-xl font-bold text-white">
          {t('profile.statsTitle')}
        </h2>
        <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
          {STATS.map((stat) => (
            <div key={stat}>
              <div className="flex justify-between text-sm">
                <dt className="text-slate-400">{t(`status.stats.${stat}`)}</dt>
                <dd className="font-display font-semibold text-white">{profile.stats[stat]}</dd>
              </div>
              <div className="mt-1 h-1.5 rounded-full bg-void" aria-hidden="true">
                <div
                  className="h-full rounded-full bg-arcane-500/80"
                  style={{ width: `${(profile.stats[stat] / maxStat) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </dl>
      </section>

      <section className="system-panel p-5">
        <h2 className="mb-3 font-display text-xl font-bold text-white">
          {t('profile.achievementsTitle', { count: profile.achievements.length })}
        </h2>
        {profile.achievements.length === 0 ? (
          <p className="text-sm text-slate-400">{t('profile.noAchievements')}</p>
        ) : (
          <ul className="flex flex-wrap gap-2">
            {profile.achievements.map((achievement) => (
              <li
                key={achievement.code}
                title={dateFormat.format(new Date(achievement.unlockedAt))}
                className="flex items-center gap-2 rounded-md border border-arcane-500/40 bg-arcane-600/10 px-3 py-1.5 text-sm text-slate-200"
              >
                <span aria-hidden="true">{ACHIEVEMENT_ICONS[achievement.code]}</span>
                {t(`achievements.${achievement.code}.name`)}
              </li>
            ))}
          </ul>
        )}
        {profile.titles.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 border-t border-abyss-border pt-3">
            {profile.titles.map((title) => (
              <TitleBadge key={title.id} title={title} />
            ))}
          </div>
        )}
      </section>
    </>
  );
}

// The bio, editable on your own profile
function Bio({ profile }: { profile: FullProfile }) {
  const { t } = useTranslation();
  const updateBio = useUpdateBio();
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(profile.bio ?? '');
  const isSelf = profile.relationship.type === 'SELF';

  if (!isSelf && !profile.bio) return null;

  return (
    <section className="system-panel p-5">
      {editing ? (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            updateBio.mutate(text, { onSuccess: () => setEditing(false) });
          }}
          className="flex flex-col gap-2"
        >
          <label htmlFor="bio" className="text-sm font-medium text-slate-300">
            {t('profile.bio')}
          </label>
          <textarea
            id="bio"
            value={text}
            onChange={(event) => setText(event.target.value)}
            maxLength={160}
            rows={2}
            className="rounded-md border border-abyss-border bg-void/60 px-3 py-2 text-slate-100 focus:border-arcane-500 focus:outline-none"
          />
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs text-slate-500">{text.length} / 160</span>
            <div className="flex gap-2">
              <Button variant="ghost" onClick={() => setEditing(false)}>
                {t('goals.form.cancel')}
              </Button>
              <Button type="submit" isLoading={updateBio.isPending}>
                {t('goals.form.save')}
              </Button>
            </div>
          </div>
        </form>
      ) : (
        <div className="flex items-start justify-between gap-3">
          <p className={profile.bio ? 'text-slate-200' : 'text-slate-500'}>
            {profile.bio ?? t('profile.noBio')}
          </p>
          {isSelf && (
            <Button variant="ghost" onClick={() => setEditing(true)}>
              {t('goals.edit')}
            </Button>
          )}
        </div>
      )}
    </section>
  );
}
