import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { Avatar } from '../../components/Avatar';
import { TitleBadge } from '../achievements/TitleBadge';
import { Spinner } from '../../components/ui/Spinner';
import { Alert } from '../../components/ui/Alert';
import { rankColor } from '../../game/ranks';
import type { Dashboard } from '../../api/dashboard';
import { useDashboard } from '../quests/useQuests';

const STATS = ['strength', 'intelligence', 'discipline', 'consistency'] as const;

// The player's "system window" (FR-42): level, XP bar, rank, stats, streak.
export function StatusWindow() {
  const { t } = useTranslation();
  const { data, isPending, error } = useDashboard();

  if (isPending) {
    return (
      <div className="system-panel grid place-items-center p-10 text-arcane-400" role="status">
        <Spinner />
        <span className="sr-only">{t('common.loading')}</span>
      </div>
    );
  }
  if (error || !data) return <Alert>{t('errors.UNKNOWN')}</Alert>;

  return (
    <section
      aria-labelledby="status-title"
      className="system-panel animate-fade-up p-6 shadow-glow"
    >
      <p
        id="status-title"
        className="text-xs font-semibold tracking-[0.3em] text-arcane-400 uppercase"
      >
        {t('status.title')}
      </p>

      <div className="mt-4 flex items-center gap-4">
        <Avatar avatarKey={data.avatarKey} size={64} />
        <div className="min-w-0 flex-1">
          <p className="truncate font-display text-2xl font-bold text-white" dir="ltr">
            {data.username}
          </p>
          {data.activeTitle && <TitleBadge title={data.activeTitle} />}
          <p className="text-sm text-slate-400">
            🔥 {t('status.streak', { count: data.streak.current })}
            <span className="ms-2 text-slate-500">
              {t('status.bestStreak', { count: data.streak.best })}
            </span>
          </p>
        </div>
        <RankBadge data={data} />
      </div>

      <LevelBar data={data} />
      <RankHint data={data} />

      <dl className="mt-6 grid grid-cols-2 gap-x-6 gap-y-4">
        {STATS.map((stat) => (
          <StatBar
            key={stat}
            name={t(`status.stats.${stat}`)}
            value={data.stats[stat]}
            max={maxStat(data)}
          />
        ))}
      </dl>

      <div className="mt-6 grid grid-cols-2 gap-3 border-t border-abyss-border pt-4 text-center">
        <div>
          <p className="font-display text-2xl font-bold text-white">
            {data.disciplineRate === null ? '—' : `${data.disciplineRate}%`}
          </p>
          <p className="text-xs text-slate-400">{t('status.disciplineRate')}</p>
        </div>
        <div>
          <p className="font-display text-2xl font-bold text-white" dir="ltr">
            {data.totalXp.toLocaleString()}
          </p>
          <p className="text-xs text-slate-400">{t('status.totalXp')}</p>
        </div>
      </div>
    </section>
  );
}

function RankBadge({ data }: { data: Dashboard }) {
  const { t } = useTranslation();

  return (
    <div
      className={`flex shrink-0 flex-col items-center rounded-md bg-linear-to-br p-px shadow-glow-sm ${rankColor(data.rank.code)}`}
    >
      <div className="flex flex-col items-center rounded-[5px] bg-abyss px-3 py-1.5">
        <span className="text-[10px] tracking-widest text-slate-400 uppercase">
          {t('status.rank')}
        </span>
        <span className="font-display text-2xl font-bold text-white" dir="ltr">
          {data.rank.label}
        </span>
      </div>
    </div>
  );
}

function LevelBar({ data }: { data: Dashboard }) {
  const { t } = useTranslation();
  const { level, xpIntoLevel, xpForNextLevel, percent } = data.progress;

  return (
    <div className="mt-6">
      <div className="flex items-baseline justify-between">
        <span className="font-display text-xl font-bold text-white">
          {t('status.level', { level })}
        </span>
        <span className="text-sm text-slate-400" dir="ltr">
          {xpIntoLevel} / {xpForNextLevel} XP
        </span>
      </div>
      <div
        className="mt-2 h-3 overflow-hidden rounded-full bg-void"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
        aria-label={t('status.xpProgress', { level: level + 1 })}
      >
        <div
          className="h-full rounded-full bg-linear-to-r from-azure-500 to-arcane-500 shadow-glow-sm transition-[width] duration-700 ease-out rtl:bg-linear-to-l"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}

// Next rank, or what real-life achievements are missing to unlock it (FR-47)
function RankHint({ data }: { data: Dashboard }) {
  const { t } = useTranslation();

  if (!data.nextRank) {
    return <p className="mt-3 text-sm text-amber-300">{t('status.maxRank')}</p>;
  }
  if (data.rankLockedBy) {
    return (
      <div className="mt-3 rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm">
        <p className="font-semibold text-amber-300">
          🔒 {t('status.rankLocked', { rank: data.nextRank.label })}
        </p>
        <p className="text-slate-300">{t('status.rankLockedText')}</p>
        <Link
          to="/legendary"
          className="font-semibold text-amber-300 underline hover:text-amber-200"
        >
          {t('status.claimLink')}
        </Link>
        {data.rankLockedBy.legendary > 0 && (
          <p className="text-slate-400">
            {t('status.legendaryNeeded', { count: data.rankLockedBy.legendary })}
          </p>
        )}
        {data.rankLockedBy.mythic > 0 && (
          <p className="text-slate-400">
            {t('status.mythicNeeded', { count: data.rankLockedBy.mythic })}
          </p>
        )}
      </div>
    );
  }
  return (
    <p className="mt-3 text-sm text-slate-400">
      {t('status.nextRank', { rank: data.nextRank.label, level: data.nextRank.minLevel })}
    </p>
  );
}

// Stat bars are relative to the highest stat (at least 10), so they grow visibly early on
function maxStat(data: Dashboard): number {
  return Math.max(10, ...Object.values(data.stats));
}

function StatBar({ name, value, max }: { name: string; value: number; max: number }) {
  return (
    <div>
      <div className="flex justify-between text-sm">
        <dt className="text-slate-400">{name}</dt>
        <dd className="font-display font-semibold text-white">{value}</dd>
      </div>
      <div className="mt-1 h-1.5 rounded-full bg-void" aria-hidden="true">
        <div
          className="h-full rounded-full bg-arcane-500/80 transition-[width] duration-700"
          style={{ width: `${(value / max) * 100}%` }}
        />
      </div>
    </div>
  );
}
