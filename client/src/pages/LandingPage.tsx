import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import { Logo } from '../components/ui/Logo';
import { buttonClasses } from '../components/ui/buttonClasses';
import { LanguageSwitcher } from '../components/LanguageSwitcher';
import { useCurrentUser } from '../features/auth/useAuth';

export function LandingPage() {
  const { t } = useTranslation();
  const { data: user } = useCurrentUser();

  return (
    <div className="flex min-h-screen flex-col">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-6 py-5">
        <Logo />
        <div className="flex items-center gap-3">
          <LanguageSwitcher />
          {!user && (
            <Link to="/login" className={buttonClasses('ghost', 'hidden sm:inline-flex')}>
              {t('common.login')}
            </Link>
          )}
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-6">
        <section className="grid items-center gap-12 py-12 lg:grid-cols-2 lg:py-20">
          <div className="animate-fade-up">
            <p className="text-xs font-semibold tracking-[0.3em] text-arcane-400 uppercase">
              {t('landing.eyebrow')}
            </p>
            <h1 className="mt-4 font-display text-5xl leading-tight font-bold text-white sm:text-6xl">
              {t('landing.title')}
            </h1>
            <p className="mt-6 max-w-xl text-lg text-slate-400">{t('landing.subtitle')}</p>

            <div className="mt-8 flex flex-wrap gap-3">
              {user ? (
                <Link to="/dashboard" className={buttonClasses('primary', 'px-6 py-3 text-base')}>
                  {t('dashboard.welcome', { username: user.username })}
                </Link>
              ) : (
                <>
                  <Link to="/register" className={buttonClasses('primary', 'px-6 py-3 text-base')}>
                    {t('landing.ctaStart')}
                  </Link>
                  <Link to="/login" className={buttonClasses('secondary', 'px-6 py-3 text-base')}>
                    {t('landing.ctaLogin')}
                  </Link>
                </>
              )}
            </div>
          </div>

          <StatusWindowPreview />
        </section>

        <section className="grid gap-4 pb-20 md:grid-cols-3">
          {(['quests', 'ranks', 'friends'] as const).map((feature, index) => (
            <article
              key={feature}
              className="system-panel animate-fade-up p-6"
              style={{ animationDelay: `${150 + index * 100}ms` }}
            >
              <h2 className="font-display text-xl font-bold text-white">
                {t(`landing.features.${feature}.title`)}
              </h2>
              <p className="mt-2 text-sm text-slate-400">{t(`landing.features.${feature}.text`)}</p>
            </article>
          ))}
        </section>
      </main>
    </div>
  );
}

// A static example of the in-game status window, to show what the app feels like.
function StatusWindowPreview() {
  const { t } = useTranslation();

  const stats = [
    { key: 'strength', value: 34 },
    { key: 'intelligence', value: 58 },
    { key: 'discipline', value: 46 },
    { key: 'consistency', value: 21 },
  ] as const;

  const quests = [
    { key: 'quest1', xp: 80, done: true },
    { key: 'quest2', xp: 40, done: true },
    { key: 'quest3', xp: 20, done: false },
  ] as const;

  return (
    <aside
      aria-label={t('landing.preview.title')}
      className="system-panel animate-fade-up p-6 shadow-glow [animation-delay:120ms] sm:p-8"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold tracking-[0.25em] text-arcane-400 uppercase">
            {t('landing.preview.title')}
          </p>
          <p className="mt-2 font-display text-2xl font-bold text-white" dir="ltr">
            Shadow_Player
          </p>
          <p className="text-sm text-slate-400">🔥 {t('landing.preview.streak', { count: 12 })}</p>
        </div>
        <div className="flex flex-col items-center rounded-md border border-arcane-500/50 bg-arcane-600/15 px-4 py-2 shadow-glow-sm">
          <span className="text-[10px] tracking-widest text-arcane-300 uppercase">
            {t('landing.preview.rank')}
          </span>
          <span className="font-display text-2xl font-bold text-white" dir="ltr">
            D IV
          </span>
        </div>
      </div>

      <div className="mt-6">
        <div className="flex items-baseline justify-between text-sm">
          <span className="font-display text-lg font-semibold text-white">
            {t('landing.preview.level')} 12
          </span>
          <span className="text-slate-400" dir="ltr">
            218 / 320 {t('landing.preview.xp')}
          </span>
        </div>
        <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-void">
          <div className="h-full w-[68%] rounded-full bg-linear-to-r from-azure-500 to-arcane-500 shadow-glow-sm rtl:bg-linear-to-l" />
        </div>
      </div>

      <dl className="mt-6 grid grid-cols-2 gap-x-6 gap-y-3">
        {stats.map((stat) => (
          <div key={stat.key}>
            <div className="flex justify-between text-xs">
              <dt className="text-slate-400">{t(`landing.preview.stats.${stat.key}`)}</dt>
              <dd className="font-semibold text-slate-200">{stat.value}</dd>
            </div>
            <div className="mt-1 h-1 rounded-full bg-void">
              <div
                className="h-full rounded-full bg-arcane-500/80"
                style={{ width: `${stat.value}%` }}
              />
            </div>
          </div>
        ))}
      </dl>

      <div className="mt-6 border-t border-abyss-border pt-4">
        <p className="text-xs font-semibold tracking-wider text-slate-400 uppercase">
          {t('landing.preview.dailyQuests')}
        </p>
        <ul className="mt-3 flex flex-col gap-2">
          {quests.map((quest) => (
            <li key={quest.key} className="flex items-center gap-3 text-sm">
              <span
                aria-hidden="true"
                className={`grid size-5 shrink-0 place-items-center rounded border text-[11px] ${
                  quest.done
                    ? 'border-arcane-500 bg-arcane-600 text-white'
                    : 'border-abyss-border text-transparent'
                }`}
              >
                ✓
              </span>
              <span className={quest.done ? 'text-slate-500 line-through' : 'text-slate-200'}>
                {t(`landing.preview.${quest.key}`)}
              </span>
              <span className="ms-auto font-display font-semibold text-azure-400" dir="ltr">
                +{quest.xp} XP
              </span>
            </li>
          ))}
        </ul>
      </div>
    </aside>
  );
}
