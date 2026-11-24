import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert } from '../../components/ui/Alert';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { Spinner } from '../../components/ui/Spinner';
import { ApiError } from '../../api/client';
import type { CreateGoalRequest, Goal } from '../../api/goals';
import { GoalCard } from './GoalCard';
import { GoalForm } from './GoalForm';
import { useCreateGoal, useGoals, useUpdateGoal } from './useGoals';

type FormState = { mode: 'closed' } | { mode: 'create' } | { mode: 'edit'; goal: Goal };

// Long-term goals broken into milestones (FR-30 to FR-34)
export function GoalsPage() {
  const { t } = useTranslation();
  const { data: goals, isPending, error } = useGoals();
  const createGoal = useCreateGoal();
  const updateGoal = useUpdateGoal();
  const [form, setForm] = useState<FormState>({ mode: 'closed' });

  function openForm(next: FormState) {
    createGoal.reset();
    updateGoal.reset();
    setForm(next);
  }

  function save(values: CreateGoalRequest) {
    const close = { onSuccess: () => setForm({ mode: 'closed' }) };
    if (form.mode === 'edit') {
      // Milestones are edited on the card, so the edit form only sends the goal's own fields
      const { title, description, category, targetDate } = values;
      updateGoal.mutate({ id: form.goal.id, title, description, category, targetDate }, close);
    } else {
      createGoal.mutate(values, close);
    }
  }

  const mutationError = updateGoal.error;
  const activeCount = goals?.filter((g) => g.status === 'ACTIVE').length ?? 0;

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold tracking-[0.3em] text-arcane-400 uppercase">
            {t('goals.eyebrow')}
          </p>
          <h1 className="font-display text-3xl font-bold text-white">{t('goals.title')}</h1>
          <p className="mt-1 text-slate-400">{t('goals.subtitle')}</p>
        </div>
        <Button onClick={() => openForm({ mode: 'create' })}>+ {t('goals.new')}</Button>
      </header>

      {form.mode !== 'closed' && (
        <Modal
          title={form.mode === 'edit' ? t('goals.form.editTitle') : t('goals.form.createTitle')}
          onClose={() => setForm({ mode: 'closed' })}
        >
          <GoalForm
            goal={form.mode === 'edit' ? form.goal : undefined}
            isSaving={createGoal.isPending || updateGoal.isPending}
            error={createGoal.error ?? updateGoal.error}
            onSubmit={save}
            onCancel={() => setForm({ mode: 'closed' })}
          />
        </Modal>
      )}

      {mutationError && form.mode === 'closed' && (
        <Alert>
          {t(
            `errors.${mutationError instanceof ApiError ? mutationError.code : 'UNKNOWN'}`,
            t('errors.UNKNOWN'),
          )}
        </Alert>
      )}

      {isPending ? (
        <div className="grid place-items-center py-16 text-arcane-400" role="status">
          <Spinner />
          <span className="sr-only">{t('common.loading')}</span>
        </div>
      ) : error || !goals ? (
        <Alert>{t('errors.UNKNOWN')}</Alert>
      ) : goals.length === 0 ? (
        <div className="system-panel p-10 text-center">
          <p className="text-4xl" aria-hidden="true">
            🎯
          </p>
          <p className="mt-3 font-display text-xl font-bold text-white">{t('goals.emptyTitle')}</p>
          <p className="mt-1 text-slate-400">{t('goals.emptyText')}</p>
          <Button className="mt-5" onClick={() => openForm({ mode: 'create' })}>
            + {t('goals.new')}
          </Button>
        </div>
      ) : (
        <>
          <p className="text-sm text-slate-400">{t('goals.activeCount', { count: activeCount })}</p>
          <div className="grid gap-5 xl:grid-cols-2">
            {goals.map((goal) => (
              <GoalCard key={goal.id} goal={goal} onEdit={() => openForm({ mode: 'edit', goal })} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
