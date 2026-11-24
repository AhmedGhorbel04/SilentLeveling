import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import { Avatar } from '../../components/Avatar';
import type { PlayerCard } from '../../api/friends';
import { TitleBadge } from '../achievements/TitleBadge';

// One player in a list: avatar, name (links to the profile), title, rank, level.
// `children` holds the buttons on the end side (accept, remove...).
export function PlayerRow({
  player,
  highlight = false,
  prefix,
  children,
}: {
  player: PlayerCard;
  highlight?: boolean;
  prefix?: ReactNode;
  children?: ReactNode;
}) {
  const { t } = useTranslation();

  return (
    <li
      className={`flex items-center gap-3 rounded-lg border px-3 py-2.5 ${
        highlight
          ? 'border-arcane-500/60 bg-arcane-600/10'
          : 'border-abyss-border bg-abyss-light/40'
      }`}
    >
      {prefix}
      <Avatar avatarKey={player.avatarKey} size={40} />
      <div className="min-w-0 flex-1">
        <Link
          to={`/u/${player.username}`}
          className="block truncate font-semibold text-white hover:text-arcane-300"
          dir="ltr"
        >
          {player.username}
        </Link>
        <p className="flex flex-wrap items-center gap-x-3 text-xs text-slate-400">
          <span>{t('status.level', { level: player.level })}</span>
          <span dir="ltr">{player.rank.label}</span>
          {player.activeTitle && <TitleBadge title={player.activeTitle} />}
        </p>
      </div>
      {children}
    </li>
  );
}
