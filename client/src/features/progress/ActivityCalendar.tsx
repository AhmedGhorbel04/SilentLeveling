import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert } from '../../components/ui/Alert';
import type { CalendarDay } from '../../api/dashboard';
import { useCalendar } from './useProgress';

// 'YYYY-MM' of a date in the browser's time zone
function monthOf(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function shiftMonth(month: string, by: number): string {
  const [year, m] = month.split('-').map(Number) as [number, number];
  return monthOf(new Date(year, m - 1 + by, 1));
}

function localToday(): string {
  const now = new Date();
  return `${monthOf(now)}-${String(now.getDate()).padStart(2, '0')}`;
}

type DayState = 'perfect' | 'partial' | 'missed' | 'none';

function stateOf(log: CalendarDay | undefined): DayState {
  if (!log) return 'none';
  if (log.allCompleted) return 'perfect';
  return log.questsCompleted > 0 ? 'partial' : 'missed';
}

const STATE_STYLES: Record<DayState, string> = {
  perfect: 'bg-linear-to-br from-azure-500 to-arcane-500 text-white font-semibold',
  partial: 'bg-arcane-500/25 text-arcane-200',
  missed: 'bg-rose-500/15 text-rose-300',
  none: 'text-slate-500',
};

// Month view of the closed days (FR-44): all daily quests done, some, or none
export function ActivityCalendar() {
  const { t, i18n } = useTranslation();
  const today = localToday();
  const currentMonth = today.slice(0, 7);
  const [month, setMonth] = useState(currentMonth);
  const { data, error } = useCalendar(month);

  const [year, monthNumber] = month.split('-').map(Number) as [number, number];
  const daysInMonth = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate();
  // Weeks start on Monday, like the weekly quests: 0 = Monday … 6 = Sunday
  const offset = (new Date(Date.UTC(year, monthNumber - 1, 1)).getUTCDay() + 6) % 7;
  const logs = new Map(data?.map((log) => [log.date, log]));
  const perfectDays = data?.filter((log) => log.allCompleted).length ?? 0;

  const language = i18n.resolvedLanguage;
  const monthLabel = new Intl.DateTimeFormat(language, {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(Date.UTC(year, monthNumber - 1, 1)));
  const weekdayFormat = (style: 'narrow' | 'long') =>
    new Intl.DateTimeFormat(language, { weekday: style, timeZone: 'UTC' });
  // 2024-01-01 was a Monday
  const weekdays = Array.from({ length: 7 }, (_, i) => new Date(Date.UTC(2024, 0, 1 + i)));
  const fullDate = new Intl.DateTimeFormat(language, { dateStyle: 'full', timeZone: 'UTC' });

  return (
    <section aria-labelledby="calendar-title" className="system-panel p-5">
      <div className="flex items-center justify-between gap-3">
        <h2 id="calendar-title" className="font-display text-xl font-bold text-white">
          {t('progress.calendarTitle')}
        </h2>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setMonth(shiftMonth(month, -1))}
            aria-label={t('progress.previousMonth')}
            className="grid size-9 place-items-center rounded-md text-slate-300 hover:bg-abyss-light hover:text-white"
          >
            <span aria-hidden="true" className="rtl:-scale-x-100">
              ‹
            </span>
          </button>
          <p aria-live="polite" className="min-w-32 text-center text-sm font-semibold text-white">
            {monthLabel}
          </p>
          <button
            type="button"
            onClick={() => setMonth(shiftMonth(month, 1))}
            disabled={month >= currentMonth}
            aria-label={t('progress.nextMonth')}
            className="grid size-9 place-items-center rounded-md text-slate-300 hover:bg-abyss-light hover:text-white disabled:opacity-30 disabled:hover:bg-transparent"
          >
            <span aria-hidden="true" className="rtl:-scale-x-100">
              ›
            </span>
          </button>
        </div>
      </div>

      {error && (
        <div className="mt-4">
          <Alert>{t('errors.UNKNOWN')}</Alert>
        </div>
      )}

      <p className="mt-2 text-sm text-slate-400">
        {t('progress.perfectDays', { count: perfectDays })}
      </p>

      <div className="mt-4 grid grid-cols-7 gap-1.5 text-center text-sm">
        {weekdays.map((day) => (
          <abbr
            key={day.toISOString()}
            title={weekdayFormat('long').format(day)}
            className="pb-1 text-xs text-slate-500 no-underline"
          >
            {weekdayFormat('narrow').format(day)}
          </abbr>
        ))}
        {Array.from({ length: offset }, (_, i) => (
          <span key={`empty-${i}`} aria-hidden="true" />
        ))}
        {Array.from({ length: daysInMonth }, (_, i) => {
          const date = `${month}-${String(i + 1).padStart(2, '0')}`;
          const log = logs.get(date);
          const state = stateOf(log);
          const label = `${fullDate.format(new Date(`${date}T00:00:00Z`))}: ${
            log
              ? t(`progress.state.${state}`, { done: log.questsCompleted, total: log.questsTotal })
              : date > today
                ? t('progress.state.future')
                : t('progress.state.none')
          }`;
          return (
            <span
              key={date}
              role="img"
              aria-label={label}
              title={label}
              className={`grid aspect-square place-items-center rounded-md ${STATE_STYLES[state]} ${
                date === today ? 'ring-2 ring-amber-300/80' : ''
              } ${date > today ? 'opacity-40' : ''}`}
            >
              <span aria-hidden="true">{i + 1}</span>
            </span>
          );
        })}
      </div>

      <ul className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-400">
        {(['perfect', 'partial', 'missed'] as const).map((state) => (
          <li key={state} className="flex items-center gap-1.5">
            <span aria-hidden="true" className={`size-3 rounded-sm ${STATE_STYLES[state]}`} />
            {t(`progress.legend.${state}`)}
          </li>
        ))}
      </ul>
    </section>
  );
}
