import { useState } from 'react';
import { onlineManager } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Alert } from '../../components/ui/Alert';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { Spinner } from '../../components/ui/Spinner';
import { ApiError } from '../../api/client';
import type { CompleteQuestResult, CustomQuestRequest, Quest } from '../../api/quests';
import type { LanguageCode } from '../../i18n';
import { LevelUpOverlay } from '../dashboard/LevelUpOverlay';
import { TitleBadge } from '../achievements/TitleBadge';
import { CustomQuestForm } from './CustomQuestForm';
import { QuestCard } from './QuestCard';
import {
  useCompleteQuest,
  useCreateCustomQuest,
  useDeleteCustomQuest,
  useRerollQuest,
  useTodayQuests,
  useUpdateCustomQuest,
} from './useQuests';

// Form state: closed, creating a new quest, or editing an existing one
type FormState = { mode: 'closed' } | { mode: 'create' } | { mode: 'edit'; quest: Quest };

// Penalty, daily, custom and weekly quests, with completion feedback
export function TodayQuests() {
  const { t, i18n } = useTranslation();
  const { data, isPending, error } = useTodayQuests();
  const complete = useCompleteQuest();
  const reroll = useRerollQuest();
  const createCustom = useCreateCustomQuest();
  const updateCustom = useUpdateCustomQuest();
  const deleteCustom = useDeleteCustomQuest();
  const [lastResult, setLastResult] = useState<CompleteQuestResult | null>(null);
  const [levelUp, setLevelUp] = useState<CompleteQuestResult | null>(null);
  const [form, setForm] = useState<FormState>({ mode: 'closed' });

  if (isPending) {
    return (
      <div className="grid place-items-center py-16 text-arcane-400" role="status">
        <Spinner />
        <span className="sr-only">{t('common.loading')}</span>
      </div>
    );
  }
  if (error || !data) return <Alert>{t('errors.UNKNOWN')}</Alert>;

  const actionError = complete.error ?? reroll.error ?? deleteCustom.error;
  const actionErrorCode = actionError instanceof ApiError ? actionError.code : 'UNKNOWN';

  function onCompleted(result: CompleteQuestResult) {
    setLastResult(result);
    if (result.leveledUp || result.rankedUp) setLevelUp(result);
  }

  function onDelete(quest: Quest) {
    const title = quest.title[(i18n.resolvedLanguage ?? 'en') as LanguageCode];
    if (window.confirm(t('customQuests.confirmDelete', { title }))) {
      deleteCustom.mutate(quest.id);
    }
  }

  function saveCustomQuest(values: CustomQuestRequest) {
    const close = { onSuccess: () => setForm({ mode: 'closed' }) };
    if (form.mode === 'edit') {
      updateCustom.mutate({ id: form.quest.id, ...values }, close);
      return;
    }
    createCustom.mutate({ ...values, id: crypto.randomUUID() }, close);
    // Offline the request waits for the connection: the quest is already shown
    if (!onlineManager.isOnline()) setForm({ mode: 'closed' });
  }

  function openForm(next: FormState) {
    createCustom.reset();
    updateCustom.reset();
    setForm(next);
  }

  const renderList = (quests: Quest[]) => (
    <ul className="flex flex-col gap-2">
      {quests.map((quest) => (
        <QuestCard
          key={quest.id}
          quest={quest}
          today={data.date}
          isCompleting={
            complete.isPending && !complete.isPaused && complete.variables?.id === quest.id
          }
          isRerolling={reroll.isPending && reroll.variables === quest.id}
          canReroll={data.rerollsLeft > 0}
          onComplete={() =>
            complete.mutate(
              // Offline, the server must know when it really happened (see quest.service)
              {
                id: quest.id,
                completedAt: onlineManager.isOnline() ? undefined : new Date().toISOString(),
              },
              { onSuccess: onCompleted },
            )
          }
          onReroll={() => reroll.mutate(quest.id)}
          onEdit={() => openForm({ mode: 'edit', quest })}
          onDelete={() => onDelete(quest)}
        />
      ))}
    </ul>
  );

  const dailyDone = data.daily.filter((q) => q.status === 'COMPLETED').length;

  return (
    <div className="flex flex-col gap-6">
      {levelUp && (
        <LevelUpOverlay
          level={levelUp.levelAfter}
          newRank={levelUp.rankedUp ? levelUp.rankAfter : null}
          onClose={() => setLevelUp(null)}
        />
      )}
      {form.mode !== 'closed' && (
        <Modal
          title={
            form.mode === 'edit'
              ? t('customQuests.form.editTitle')
              : t('customQuests.form.createTitle')
          }
          onClose={() => setForm({ mode: 'closed' })}
        >
          <CustomQuestForm
            today={data.date}
            customXpRemaining={data.customXpRemaining}
            quest={form.mode === 'edit' ? form.quest : undefined}
            isSaving={createCustom.isPending || updateCustom.isPending}
            error={createCustom.error ?? updateCustom.error}
            onSubmit={saveCustomQuest}
            onCancel={() => setForm({ mode: 'closed' })}
          />
        </Modal>
      )}

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

      <section className="system-panel p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="font-display text-xl font-bold text-white">{t('customQuests.title')}</h2>
            <p className="text-sm text-slate-400">
              {t('customQuests.xpLeft', { count: data.customXpRemaining })}
            </p>
          </div>
          <Button variant="secondary" onClick={() => openForm({ mode: 'create' })}>
            + {t('customQuests.new')}
          </Button>
        </div>
        {data.custom.length > 0 ? (
          renderList(data.custom)
        ) : (
          <p className="rounded-lg border border-dashed border-abyss-border px-4 py-6 text-center text-sm text-slate-400">
            {t('customQuests.empty')}
          </p>
        )}
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
        {result.xpGained === 0 && result.quest.source === 'CUSTOM' && (
          <p className="text-sm text-amber-300">{t('customQuests.capReached')}</p>
        )}
        {result.achievements?.map((achievement) => (
          <p key={achievement.code} className="text-sm font-semibold text-amber-300">
            🏆{' '}
            {t('notifications.achievement', { name: t(`achievements.${achievement.code}.name`) })}
            {achievement.title && (
              <span className="ms-2">
                <TitleBadge title={achievement.title} />
              </span>
            )}
          </p>
        ))}
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
