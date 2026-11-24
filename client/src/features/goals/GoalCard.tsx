import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import type { Goal } from '../../api/goals';
import { CATEGORY_ICONS } from '../../game/constants';
import { Alert } from '../../components/ui/Alert';
import { Button } from '../../components/ui/Button';
import { ApiError } from '../../api/client';
import {
  useAddMilestone,
  useDeleteGoal,
  useDeleteMilestone,
  useUpdateGoal,
  useUpdateMilestone,
} from './useGoals';

const STATUS_STYLES: Record<Goal['status'], string> = {
  ACTIVE: 'border-azure-500/40 text-azure-400',
  COMPLETED: 'border-emerald-500/40 text-emerald-300',
  ABANDONED: 'border-slate-500/40 text-slate-400',
};

const smallButton =
  'grid size-7 shrink-0 place-items-center rounded text-slate-400 transition hover:bg-abyss hover:text-arcane-300 disabled:opacity-30 disabled:hover:bg-transparent';

export function GoalCard({ goal, onEdit }: { goal: Goal; onEdit: () => void }) {
  const { t, i18n } = useTranslation();
  const updateGoal = useUpdateGoal();
  const deleteGoal = useDeleteGoal();
  const updateMilestone = useUpdateMilestone();
  const deleteMilestone = useDeleteMilestone();
  const addMilestone = useAddMilestone();
  const [newMilestone, setNewMilestone] = useState('');

  const isActive = goal.status === 'ACTIVE';
  const last = goal.milestones.length - 1;
  const actionError =
    updateGoal.error ??
    deleteGoal.error ??
    updateMilestone.error ??
    deleteMilestone.error ??
    addMilestone.error;

  function onAddMilestone(event: FormEvent) {
    event.preventDefault();
    const title = newMilestone.trim();
    if (!title) return;
    addMilestone.mutate({ goalId: goal.id, title }, { onSuccess: () => setNewMilestone('') });
  }

  function onDelete() {
    if (window.confirm(t('goals.confirmDelete', { title: goal.title }))) deleteGoal.mutate(goal.id);
  }

  const targetDate =
    goal.targetDate &&
    new Intl.DateTimeFormat(i18n.resolvedLanguage, { dateStyle: 'medium' }).format(
      new Date(`${goal.targetDate}T12:00:00`),
    );

  return (
    <article
      aria-labelledby={`goal-${goal.id}`}
      className={`system-panel animate-fade-up p-5 ${isActive ? '' : 'opacity-75'}`}
    >
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm text-slate-400">
            <span aria-hidden="true">{CATEGORY_ICONS[goal.category]}</span>{' '}
            {t(`categories.${goal.category}`)}
            {targetDate && (
              <span className="ms-3">🎯 {t('goals.target', { date: targetDate })}</span>
            )}
          </p>
          <h2 id={`goal-${goal.id}`} className="mt-1 font-display text-2xl font-bold text-white">
            {goal.title}
          </h2>
          {goal.description && <p className="mt-1 text-sm text-slate-400">{goal.description}</p>}
        </div>
        <span className={`rounded border px-2 py-0.5 text-xs ${STATUS_STYLES[goal.status]}`}>
          {t(`goals.status.${goal.status}`)}
        </span>
      </header>

      <div className="mt-4">
        <div className="flex justify-between text-sm">
          <span className="text-slate-300">
            {t('goals.progress', { done: goal.progress.completed, total: goal.progress.total })}
          </span>
          <span className="font-display font-semibold text-white">{goal.progress.percent}%</span>
        </div>
        <div
          className="mt-1.5 h-2 overflow-hidden rounded-full bg-void"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={goal.progress.percent}
          aria-label={t('goals.progressLabel', { title: goal.title })}
        >
          <div
            className="h-full rounded-full bg-linear-to-r from-azure-500 to-arcane-500 transition-[width] duration-500 rtl:bg-linear-to-l"
            style={{ width: `${goal.progress.percent}%` }}
          />
        </div>
      </div>

      {goal.milestones.length > 0 && (
        <ol className="mt-4 flex flex-col gap-1">
          {goal.milestones.map((milestone, index) => (
            <li
              key={milestone.id}
              className="flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-abyss-light/60"
            >
              <input
                type="checkbox"
                checked={milestone.completed}
                disabled={!isActive}
                onChange={() =>
                  updateMilestone.mutate({ id: milestone.id, completed: !milestone.completed })
                }
                aria-label={milestone.title}
                className="size-4 shrink-0 accent-arcane-500"
              />
              <span
                className={`flex-1 text-sm ${
                  milestone.completed ? 'text-slate-500 line-through' : 'text-slate-200'
                }`}
              >
                {milestone.title}
                {milestone.linkedQuests > 0 && (
                  <span className="ms-2 text-xs text-azure-400">
                    {t('goals.linkedQuests', { count: milestone.linkedQuests })}
                  </span>
                )}
              </span>
              {isActive && (
                <>
                  <button
                    type="button"
                    className={smallButton}
                    disabled={index === 0}
                    onClick={() =>
                      updateMilestone.mutate({ id: milestone.id, position: index - 1 })
                    }
                    aria-label={t('goals.moveUp', { title: milestone.title })}
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    className={smallButton}
                    disabled={index === last}
                    onClick={() =>
                      updateMilestone.mutate({ id: milestone.id, position: index + 1 })
                    }
                    aria-label={t('goals.moveDown', { title: milestone.title })}
                  >
                    ↓
                  </button>
                  <button
                    type="button"
                    className={`${smallButton} hover:text-rose-400`}
                    onClick={() => deleteMilestone.mutate(milestone.id)}
                    aria-label={t('goals.deleteMilestone', { title: milestone.title })}
                  >
                    ✕
                  </button>
                </>
              )}
            </li>
          ))}
        </ol>
      )}

      {isActive && (
        <form onSubmit={onAddMilestone} className="mt-3 flex gap-2">
          <input
            value={newMilestone}
            onChange={(event) => setNewMilestone(event.target.value)}
            maxLength={120}
            placeholder={t('goals.newMilestone')}
            aria-label={t('goals.newMilestone')}
            className="min-w-0 flex-1 rounded-md border border-abyss-border bg-void/60 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-arcane-500 focus:outline-none"
          />
          <Button type="submit" variant="secondary" isLoading={addMilestone.isPending}>
            {t('goals.add')}
          </Button>
        </form>
      )}

      {actionError && (
        <div className="mt-3">
          <Alert>
            {t(
              `errors.${actionError instanceof ApiError ? actionError.code : 'UNKNOWN'}`,
              t('errors.UNKNOWN'),
            )}
          </Alert>
        </div>
      )}

      <footer className="mt-4 flex flex-wrap gap-2 border-t border-abyss-border pt-3">
        {isActive ? (
          <>
            <Button
              variant="secondary"
              onClick={() => updateGoal.mutate({ id: goal.id, status: 'COMPLETED' })}
            >
              ✓ {t('goals.complete')}
            </Button>
            <Button variant="ghost" onClick={onEdit}>
              {t('goals.edit')}
            </Button>
            <Button
              variant="ghost"
              onClick={() => updateGoal.mutate({ id: goal.id, status: 'ABANDONED' })}
            >
              {t('goals.abandon')}
            </Button>
          </>
        ) : (
          <Button
            variant="secondary"
            onClick={() => updateGoal.mutate({ id: goal.id, status: 'ACTIVE' })}
          >
            {t('goals.reopen')}
          </Button>
        )}
        <Button variant="ghost" className="ms-auto hover:text-rose-400" onClick={onDelete}>
          {t('goals.delete')}
        </Button>
      </footer>
    </article>
  );
}
