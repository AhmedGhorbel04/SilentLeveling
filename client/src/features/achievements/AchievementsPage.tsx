import { useTranslation } from 'react-i18next';
import { Alert } from '../../components/ui/Alert';
import { Spinner } from '../../components/ui/Spinner';
import { ApiError } from '../../api/client';
import type { LanguageCode } from '../../i18n';
import { TitleBadge } from './TitleBadge';
import { ACHIEVEMENT_ICONS, RARITY_BORDER, RARITY_TEXT } from './achievementStyles';
import { useAchievements, useSetActiveTitle, useTitles } from './useAchievements';

// All achievements, locked or not (FR-45), and the choice of active title (FR-46)
export function AchievementsPage() {
  const { t, i18n } = useTranslation();
  const achievements = useAchievements();
  const titles = useTitles();
  const setActiveTitle = useSetActiveTitle();

  if (achievements.isPending || titles.isPending) {
    return (
      <div className="grid place-items-center py-16 text-arcane-400" role="status">
        <Spinner />
        <span className="sr-only">{t('common.loading')}</span>
      </div>
    );
  }
  if (!achievements.data || !titles.data) return <Alert>{t('errors.UNKNOWN')}</Alert>;

  const unlockedCount = achievements.data.filter((a) => a.unlockedAt).length;
  const dateFormat = new Intl.DateTimeFormat(i18n.resolvedLanguage, { dateStyle: 'medium' });
  const language = (i18n.resolvedLanguage ?? 'en') as LanguageCode;
  const setError = setActiveTitle.error;

  return (
    <div className="flex flex-col gap-8">
      <header>
        <p className="text-xs font-semibold tracking-[0.3em] text-arcane-400 uppercase">
          {t('achievementsPage.eyebrow')}
        </p>
        <h1 className="font-display text-3xl font-bold text-white">
          {t('achievementsPage.title')}
        </h1>
        <p className="mt-1 text-slate-400">
          {t('achievementsPage.unlocked', {
            count: unlockedCount,
            total: achievements.data.length,
          })}
        </p>
      </header>

      <section aria-labelledby="titles-heading" className="system-panel p-5">
        <h2 id="titles-heading" className="font-display text-xl font-bold text-white">
          {t('achievementsPage.titlesHeading')}
        </h2>
        <p className="mt-1 text-sm text-slate-400">{t('achievementsPage.titlesText')}</p>
        {setError && (
          <div className="mt-3">
            <Alert>
              {t(
                `errors.${setError instanceof ApiError ? setError.code : 'UNKNOWN'}`,
                t('errors.UNKNOWN'),
              )}
            </Alert>
          </div>
        )}

        {titles.data.titles.length === 0 ? (
          <p className="mt-4 rounded-lg border border-dashed border-abyss-border px-4 py-5 text-center text-sm text-slate-400">
            {t('achievementsPage.noTitles')}
          </p>
        ) : (
          <fieldset className="mt-4 flex flex-wrap gap-2">
            <legend className="sr-only">{t('achievementsPage.titlesHeading')}</legend>
            {[null, ...titles.data.titles].map((title) => {
              const selected = (title?.id ?? null) === titles.data.activeTitleId;
              return (
                <label
                  key={title?.id ?? 'none'}
                  className={`flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 transition ${
                    selected
                      ? 'border-arcane-500 bg-arcane-600/15'
                      : 'border-abyss-border hover:border-arcane-500/50'
                  }`}
                >
                  <input
                    type="radio"
                    name="active-title"
                    checked={selected}
                    disabled={setActiveTitle.isPending}
                    onChange={() => setActiveTitle.mutate(title?.id ?? null)}
                    className="accent-arcane-500"
                  />
                  {title ? (
                    <TitleBadge title={title} />
                  ) : (
                    <span className="text-sm text-slate-300">{t('achievementsPage.noTitle')}</span>
                  )}
                </label>
              );
            })}
          </fieldset>
        )}
      </section>

      <section aria-labelledby="achievements-heading">
        <h2 id="achievements-heading" className="sr-only">
          {t('achievementsPage.title')}
        </h2>
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {achievements.data.map((achievement) => {
            const unlocked = achievement.unlockedAt !== null;
            return (
              <li
                key={achievement.code}
                className={`system-panel flex gap-4 p-4 ${
                  unlocked
                    ? achievement.title
                      ? RARITY_BORDER[achievement.title.rarity]
                      : 'border-arcane-500/40'
                    : 'opacity-55'
                }`}
              >
                <span
                  aria-hidden="true"
                  className={`grid size-12 shrink-0 place-items-center rounded-lg text-2xl ${
                    unlocked ? 'bg-arcane-600/20' : 'bg-void grayscale'
                  }`}
                >
                  {unlocked ? ACHIEVEMENT_ICONS[achievement.code] : '🔒'}
                </span>
                <div className="min-w-0">
                  <h3 className="font-semibold text-white">
                    {t(`achievements.${achievement.code}.name`)}
                  </h3>
                  <p className="text-sm text-slate-400">
                    {t(`achievements.${achievement.code}.description`)}
                  </p>
                  {achievement.title && (
                    <p className={`mt-1 text-xs ${RARITY_TEXT[achievement.title.rarity]}`}>
                      {t('achievementsPage.grantsTitle', {
                        title: achievement.title.name[language],
                        rarity: t(`rarity.${achievement.title.rarity}`),
                      })}
                    </p>
                  )}
                  <p className="mt-1 text-xs text-slate-500">
                    {unlocked
                      ? t('achievementsPage.unlockedOn', {
                          date: dateFormat.format(new Date(achievement.unlockedAt!)),
                        })
                      : t('achievementsPage.locked')}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
