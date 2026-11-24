import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import { Alert } from '../../components/ui/Alert';
import { Button } from '../../components/ui/Button';
import { Avatar } from '../../components/Avatar';
import { ApiError } from '../../api/client';
import {
  AVATAR_KEYS,
  CATEGORIES,
  CATEGORY_ICONS,
  DAILY_MINUTES_OPTIONS,
  MAX_FOCUS_AREAS,
  SKILL_LEVELS,
  type AvatarKey,
  type Category,
  type DailyMinutes,
  type SkillLevel,
} from '../../game/constants';
import { useOnboarding } from '../quests/useQuests';

const STEPS = ['goals', 'levels', 'time', 'avatar'] as const;

// Guided setup after registration (FR-10 to FR-13). Four short steps, one decision each.
export function OnboardingPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const onboarding = useOnboarding();

  const [step, setStep] = useState(0);
  // Order matters: the first goal chosen is the player's main goal
  const [goals, setGoals] = useState<Category[]>([]);
  const [levels, setLevels] = useState<Partial<Record<Category, SkillLevel>>>({});
  const [dailyMinutes, setDailyMinutes] = useState<DailyMinutes>(60);
  const [avatarKey, setAvatarKey] = useState<AvatarKey>('sigil-1');

  const stepName = STEPS[step]!;
  const isLastStep = step === STEPS.length - 1;
  const canContinue = stepName !== 'goals' || goals.length > 0;

  function toggleGoal(category: Category) {
    setGoals((current) =>
      current.includes(category)
        ? current.filter((c) => c !== category)
        : current.length < MAX_FOCUS_AREAS
          ? [...current, category]
          : current,
    );
  }

  function finish() {
    onboarding.mutate(
      {
        focusAreas: goals.map((category) => ({ category, level: levels[category] ?? 'BEGINNER' })),
        dailyMinutes,
        avatarKey,
      },
      { onSuccess: () => navigate('/dashboard', { replace: true }) },
    );
  }

  const error =
    onboarding.error instanceof ApiError ? onboarding.error.code : onboarding.error && 'UNKNOWN';

  return (
    <div className="mx-auto w-full max-w-2xl">
      <div className="mb-6">
        <p className="text-xs font-semibold tracking-[0.3em] text-arcane-400 uppercase">
          {t('onboarding.eyebrow')}
        </p>
        <div
          className="mt-3 flex gap-2"
          role="progressbar"
          aria-valuemin={1}
          aria-valuemax={STEPS.length}
          aria-valuenow={step + 1}
          aria-label={t('onboarding.progress', { step: step + 1, total: STEPS.length })}
        >
          {STEPS.map((name, index) => (
            <span
              key={name}
              className={`h-1.5 flex-1 rounded-full transition ${
                index <= step ? 'bg-arcane-500 shadow-glow-sm' : 'bg-abyss-border'
              }`}
            />
          ))}
        </div>
      </div>

      <section className="system-panel animate-fade-up p-6 sm:p-8" key={stepName}>
        <h1 className="font-display text-3xl font-bold text-white">
          {t(`onboarding.${stepName}.title`)}
        </h1>
        <p className="mt-1 text-slate-400">{t(`onboarding.${stepName}.subtitle`)}</p>

        <div className="mt-6">
          {stepName === 'goals' && (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {CATEGORIES.map((category) => {
                const position = goals.indexOf(category);
                const selected = position !== -1;
                return (
                  <button
                    key={category}
                    type="button"
                    onClick={() => toggleGoal(category)}
                    aria-pressed={selected}
                    className={`relative flex flex-col items-start gap-2 rounded-lg border p-4 text-start transition ${
                      selected
                        ? 'border-arcane-500 bg-arcane-600/15 shadow-glow-sm'
                        : 'border-abyss-border bg-void/40 hover:border-arcane-500/50'
                    }`}
                  >
                    <span className="text-2xl" aria-hidden="true">
                      {CATEGORY_ICONS[category]}
                    </span>
                    <span className="font-semibold text-white">{t(`categories.${category}`)}</span>
                    {selected && (
                      <span className="absolute end-3 top-3 grid size-6 place-items-center rounded-full bg-arcane-600 text-xs font-bold text-white">
                        {position + 1}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {stepName === 'levels' && (
            <div className="flex flex-col gap-5">
              {goals.map((category) => (
                <fieldset key={category}>
                  <legend className="mb-2 font-semibold text-white">
                    <span aria-hidden="true">{CATEGORY_ICONS[category]}</span>{' '}
                    {t(`categories.${category}`)}
                  </legend>
                  <div className="grid grid-cols-3 gap-2">
                    {SKILL_LEVELS.map((level) => {
                      const selected = (levels[category] ?? 'BEGINNER') === level;
                      return (
                        <button
                          key={level}
                          type="button"
                          aria-pressed={selected}
                          onClick={() =>
                            setLevels((current) => ({ ...current, [category]: level }))
                          }
                          className={`rounded-md border px-3 py-2.5 text-sm font-medium transition ${
                            selected
                              ? 'border-arcane-500 bg-arcane-600/20 text-white'
                              : 'border-abyss-border text-slate-300 hover:border-arcane-500/50'
                          }`}
                        >
                          {t(`levels.${level}`)}
                        </button>
                      );
                    })}
                  </div>
                </fieldset>
              ))}
            </div>
          )}

          {stepName === 'time' && (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
              {DAILY_MINUTES_OPTIONS.map((minutes) => {
                const selected = dailyMinutes === minutes;
                return (
                  <button
                    key={minutes}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => setDailyMinutes(minutes)}
                    className={`rounded-lg border px-3 py-4 font-display text-xl font-bold transition ${
                      selected
                        ? 'border-arcane-500 bg-arcane-600/20 text-white shadow-glow-sm'
                        : 'border-abyss-border text-slate-300 hover:border-arcane-500/50'
                    }`}
                  >
                    {t(`onboarding.time.option${minutes}`)}
                  </button>
                );
              })}
            </div>
          )}

          {stepName === 'avatar' && (
            <div className="grid grid-cols-4 gap-3">
              {AVATAR_KEYS.map((key, index) => {
                const selected = avatarKey === key;
                return (
                  <button
                    key={key}
                    type="button"
                    aria-pressed={selected}
                    aria-label={t('onboarding.avatar.option', { number: index + 1 })}
                    onClick={() => setAvatarKey(key)}
                    className={`grid place-items-center rounded-lg border p-3 transition ${
                      selected
                        ? 'border-arcane-500 bg-arcane-600/15 shadow-glow-sm'
                        : 'border-abyss-border hover:border-arcane-500/50'
                    }`}
                  >
                    <Avatar avatarKey={key} size={56} />
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {error && (
          <div className="mt-6">
            <Alert>{t(`errors.${error}`, t('errors.UNKNOWN'))}</Alert>
          </div>
        )}

        <div className="mt-8 flex items-center justify-between gap-3">
          <Button
            variant="ghost"
            onClick={() => setStep((s) => s - 1)}
            className={step === 0 ? 'invisible' : ''}
          >
            {t('onboarding.back')}
          </Button>
          {isLastStep ? (
            <Button onClick={finish} isLoading={onboarding.isPending}>
              {t('onboarding.finish')}
            </Button>
          ) : (
            <Button onClick={() => setStep((s) => s + 1)} disabled={!canContinue}>
              {t('onboarding.next')}
            </Button>
          )}
        </div>
      </section>
    </div>
  );
}
