import { useTranslation } from 'react-i18next';
import { useCurrentUser } from '../features/auth/useAuth';

// Placeholder: the real status window (level, XP, stats, quests) is built in Milestone 4.
export function DashboardPage() {
  const { t } = useTranslation();
  const { data: user } = useCurrentUser();

  return (
    <section className="system-panel animate-fade-up p-8">
      <p className="text-xs font-semibold tracking-[0.3em] text-arcane-400 uppercase">
        {t('landing.eyebrow')}
      </p>
      <h1 className="mt-2 font-display text-3xl font-bold text-white">
        {t('dashboard.welcome', { username: user?.username })}
      </h1>
      <p className="mt-2 text-slate-300">{t('dashboard.subtitle')}</p>
      <p className="mt-4 max-w-xl text-sm text-slate-400">{t('dashboard.comingSoon')}</p>
    </section>
  );
}
