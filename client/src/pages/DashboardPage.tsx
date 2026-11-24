import { useTranslation } from 'react-i18next';
import { Avatar } from '../components/Avatar';
import { useCurrentUser } from '../features/auth/useAuth';
import { TodayQuests } from '../features/quests/TodayQuests';

// Milestone 3 dashboard: greeting + today's quests.
// The status window (level, XP bar, rank, stats) is added in Milestone 4.
export function DashboardPage() {
  const { t } = useTranslation();
  const { data: user } = useCurrentUser();

  return (
    <div className="flex flex-col gap-6">
      <header className="flex animate-fade-up items-center gap-4">
        <Avatar avatarKey={user?.avatarKey ?? null} size={56} />
        <div>
          <p className="text-xs font-semibold tracking-[0.3em] text-arcane-400 uppercase">
            {t('landing.eyebrow')}
          </p>
          <h1 className="font-display text-3xl font-bold text-white">
            {t('dashboard.welcome', { username: user?.username })}
          </h1>
        </div>
      </header>

      <TodayQuests />
    </div>
  );
}
