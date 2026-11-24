import { useTranslation } from 'react-i18next';
import { XpChart } from './XpChart';
import { ActivityCalendar } from './ActivityCalendar';

// XP history and calendar of completed days (FR-44)
export function ProgressPage() {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="font-display text-3xl font-bold text-white">{t('progress.title')}</h1>
        <p className="mt-1 text-slate-400">{t('progress.subtitle')}</p>
      </header>
      <div className="grid items-start gap-6 lg:grid-cols-[1fr_minmax(300px,360px)]">
        <XpChart />
        <ActivityCalendar />
      </div>
    </div>
  );
}
