import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Spinner } from '../../components/ui/Spinner';
import { Alert } from '../../components/ui/Alert';
import { useXpHistory } from './useProgress';

const RANGES = [7, 30, 90] as const;

// XP earned per day (FR-44). Plain HTML bars: light, responsive, and the data is
// also given to screen readers as a table.
export function XpChart() {
  const { t, i18n } = useTranslation();
  const [days, setDays] = useState<(typeof RANGES)[number]>(30);
  const { data, isPending, error } = useXpHistory(days);

  const dayFormat = new Intl.DateTimeFormat(i18n.resolvedLanguage, {
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
  });
  const formatDay = (date: string) => dayFormat.format(new Date(`${date}T00:00:00Z`));

  const total = data?.reduce((sum, day) => sum + day.xp, 0) ?? 0;
  const max = Math.max(1, ...(data?.map((day) => day.xp) ?? []));
  const activeDays = data?.filter((day) => day.xp > 0).length ?? 0;

  return (
    <section aria-labelledby="xp-chart-title" className="system-panel p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="xp-chart-title" className="font-display text-xl font-bold text-white">
          {t('progress.xpTitle')}
        </h2>
        <div role="group" aria-label={t('progress.range')} className="flex gap-1">
          {RANGES.map((range) => (
            <button
              key={range}
              type="button"
              aria-pressed={days === range}
              onClick={() => setDays(range)}
              className={`rounded-md px-3 py-1.5 text-sm font-semibold transition ${
                days === range
                  ? 'bg-arcane-500/20 text-white ring-1 ring-arcane-500/60'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {t('progress.days', { count: range })}
            </button>
          ))}
        </div>
      </div>

      {isPending ? (
        <div className="grid h-48 place-items-center text-arcane-400" role="status">
          <Spinner />
          <span className="sr-only">{t('common.loading')}</span>
        </div>
      ) : error || !data ? (
        <div className="mt-4">
          <Alert>{t('errors.UNKNOWN')}</Alert>
        </div>
      ) : (
        <>
          <dl className="mt-4 grid grid-cols-3 gap-3 text-center">
            <Figure label={t('progress.totalXp')} value={total.toLocaleString()} />
            <Figure
              label={t('progress.average')}
              value={Math.round(total / data.length).toLocaleString()}
            />
            <Figure label={t('progress.activeDays')} value={`${activeDays} / ${data.length}`} />
          </dl>

          {/* Time flows left to right in every language, like on a timeline */}
          <div className="mt-5" dir="ltr" aria-hidden="true">
            <div className="flex h-44 items-end gap-px border-b border-abyss-border sm:gap-0.5">
              {data.map((day) => (
                <div
                  key={day.date}
                  title={`${formatDay(day.date)}: ${day.xp} XP`}
                  className="group flex h-full flex-1 items-end"
                >
                  <div
                    className={`w-full rounded-t-sm transition-[height] duration-500 ${
                      day.xp > 0
                        ? 'bg-linear-to-t from-azure-500 to-arcane-500 group-hover:from-azure-400 group-hover:to-arcane-400'
                        : 'bg-abyss-border/60'
                    }`}
                    style={{ height: day.xp > 0 ? `${Math.max(3, (day.xp / max) * 100)}%` : '2px' }}
                  />
                </div>
              ))}
            </div>
            <div className="mt-1.5 flex justify-between text-xs text-slate-500">
              <span>{formatDay(data[0]!.date)}</span>
              <span>{formatDay(data.at(-1)!.date)}</span>
            </div>
          </div>

          <table className="sr-only">
            <caption>{t('progress.xpTitle')}</caption>
            <thead>
              <tr>
                <th scope="col">{t('progress.date')}</th>
                <th scope="col">XP</th>
              </tr>
            </thead>
            <tbody>
              {data.map((day) => (
                <tr key={day.date}>
                  <td>{formatDay(day.date)}</td>
                  <td>{day.xp}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </section>
  );
}

function Figure({ label, value }: { label: string; value: string }) {
  return (
    // dt must come first in the markup; flex-col-reverse shows the value on top
    <div className="flex flex-col-reverse rounded-lg border border-abyss-border bg-void/40 px-2 py-2.5">
      <dt className="text-xs text-slate-400">{label}</dt>
      <dd className="font-display text-xl font-bold text-white" dir="ltr">
        {value}
      </dd>
    </div>
  );
}
