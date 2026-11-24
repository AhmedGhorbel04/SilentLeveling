import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert } from '../../components/ui/Alert';
import { Spinner } from '../../components/ui/Spinner';
import { ApiError } from '../../api/client';
import type { CompleteQuestResult, Quest } from '../../api/quests';
import { QuestCard } from './QuestCard';
import { useCompleteQuest, useRerollQuest, useTodayQuests } from './useQuests';

// Today's daily quests, this week's weekly quests and any penalty quest.
// The full status window (level, XP bar, stats) arrives in Milestone 4.
export function TodayQuests() {
  const { t } = useTranslation();
  const { data, isPending, error } = useTodayQuests();
  const complete = useCompleteQuest();
  const reroll = useRerollQuest();
  const [lastResult, setLastResult] = useState<CompleteQuestResult | null>(null);

  if (isPending) {
    return (
      <div className="grid place-items-center py-16 text-arcane-400" role="status">
        <Spinner />
        <span className="sr-only">{t('common.loading')}</span>
      </div>
    );
  }
  if (error || !data) return <Alert>{t('errors.UNKNOWN')}</Alert>;

  const actionError = complete.error ?? reroll.error;
  const actionErrorCode = actionError instanceof ApiError ? actionError.code : 'UNKNOWN';

  const renderList = (quests: Quest[]) => (
    <ul className="flex flex-col gap-2">
      {quests.map((quest) => (
        <QuestCard
          key={quest.id}
          quest={quest}
          isCompleting={complete.isPending && complete.variables === quest.id}
          isRerolling={reroll.isPending && reroll.variables === quest.id}
          canReroll={data.rerollsLeft > 0}
          onComplete={() => complete.mutate(quest.id, { onSuccess: setLastResult })}
          onReroll={() => reroll.mutate(quest.id)}
        />
      ))}
    </ul>
  );

  const dailyDone = data.daily.filter((q) => q.status === 'COMPLETED').length;

  return (
    <div className="flex flex-col gap-6">
      {lastResult && <CompletionBanner result={lastResult} onClose={() => setLastResult(null)} />}
      {actionError && <Alert>{t(`errors.${actionErrorCode}`, t('errors.UNKNOWN'))}</Alert>}

      {data.penalty.length > 0 && (
        <section className="system-panel border-rose-500/40 p-5">
          <h2 className="font-display text-xl font-bold text-rose-300">
            {t('quests.penaltyTitle')}
          </h2>
          <p className="mb-4 text-sm text-slate-400">{t('quests.penaltyText')}</p>
          {renderList(data.penalty)}
        </section>
      )}

      <section className="system-panel p-5">
        <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="font-display text-xl font-bold text-white">{t('quests.dailyTitle')}</h2>
          <p className="text-sm text-slate-400">
            {t('quests.progress', { done: dailyDone, total: data.daily.length })} ·{' '}
            {t('quests.rerollsLeft', { count: data.rerollsLeft })}
          </p>
        </div>
        {renderList(data.daily)}
      </section>

      {data.weekly.length > 0 && (
        <section className="system-panel p-5">
          <h2 className="mb-4 font-display text-xl font-bold text-white">
            {t('quests.weeklyTitle')}
          </h2>
          {renderList(data.weekly)}
        </section>
      )}
    </div>
  );
}

function CompletionBanner({
  result,
  onClose,
}: {
  result: CompleteQuestResult;
  onClose: () => void;
}) {
  const { t } = useTranslation();

  return (
    <div
      role="status"
      className="flex animate-fade-up items-center justify-between gap-4 rounded-lg border border-arcane-500/50 bg-arcane-600/15 px-4 py-3 shadow-glow-sm"
    >
      <div>
        <p className="font-display text-lg font-bold text-white">
          <span dir="ltr">+{result.xpGained} XP</span>
          {result.leveledUp && (
            <span className="ms-3 text-arcane-300">
              {t('quests.levelUp', { level: result.levelAfter })}
            </span>
          )}
        </p>
        {result.streakRestored && (
          <p className="text-sm text-slate-300">
            {t('quests.streakRestored', { count: result.streak })}
          </p>
        )}
        {result.skillLevelUp && (
          <p className="text-sm text-slate-300">
            {t('quests.skillLevelUp', {
              category: t(`categories.${result.skillLevelUp.category}`),
              level: t(`levels.${result.skillLevelUp.level}`),
            })}
          </p>
        )}
      </div>
      <button
        type="button"
        onClick={onClose}
        aria-label={t('common.close')}
        className="text-slate-400 hover:text-white"
      >
        ✕
      </button>
    </div>
  );
}
