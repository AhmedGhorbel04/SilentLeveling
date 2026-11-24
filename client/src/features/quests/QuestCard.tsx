import { useTranslation } from 'react-i18next';
import type { Quest } from '../../api/quests';
import { CATEGORY_ICONS, type Difficulty } from '../../game/constants';
import type { LanguageCode } from '../../i18n';
import { dueDateOf } from './questDates';

const iconButton =
  'grid size-8 shrink-0 place-items-center rounded-md text-slate-400 transition hover:bg-abyss hover:text-arcane-300';

const DIFFICULTY_STYLES: Record<Difficulty, string> = {
  EASY: 'border-emerald-500/40 text-emerald-300',
  NORMAL: 'border-azure-500/40 text-azure-400',
  HARD: 'border-arcane-500/50 text-arcane-300',
  EXTREME: 'border-rose-500/50 text-rose-300',
};

type QuestCardProps = {
  quest: Quest;
  onComplete: () => void;
  onReroll?: () => void;
  onEdit?: () => void; // custom quests only
  onDelete?: () => void; // custom quests only
  isCompleting: boolean;
  isRerolling: boolean;
  canReroll: boolean;
  today?: string; // to show "due today" for custom quests
};

export function QuestCard({
  quest,
  onComplete,
  onReroll,
  onEdit,
  onDelete,
  isCompleting,
  isRerolling,
  canReroll,
  today,
}: QuestCardProps) {
  const { t, i18n } = useTranslation();
  const title = quest.title[(i18n.resolvedLanguage ?? 'en') as LanguageCode];
  const done = quest.status === 'COMPLETED';
  const failed = quest.status === 'FAILED';
  const isCustom = quest.source === 'CUSTOM';
  const dueDate = isCustom ? dueDateOf(quest) : null;
  const dueLabel =
    dueDate === null
      ? null
      : dueDate === today
        ? t('customQuests.dueToday')
        : t('customQuests.due', {
            date: new Intl.DateTimeFormat(i18n.resolvedLanguage, {
              day: 'numeric',
              month: 'short',
            }).format(new Date(`${dueDate}T12:00:00`)),
          });

  return (
    <li
      className={`flex items-center gap-3 rounded-lg border px-4 py-3 transition ${
        done
          ? 'border-abyss-border bg-void/30'
          : quest.source === 'PENALTY'
            ? 'border-rose-500/40 bg-rose-500/5'
            : 'border-abyss-border bg-abyss-light/60 hover:border-arcane-500/40'
      }`}
    >
      <button
        type="button"
        onClick={onComplete}
        disabled={done || failed || isCompleting}
        aria-label={t('quests.complete', { title })}
        className={`grid size-7 shrink-0 place-items-center rounded-md border-2 text-sm transition ${
          done
            ? 'border-arcane-500 bg-arcane-600 text-white'
            : 'border-slate-500 text-transparent hover:border-arcane-400 hover:text-arcane-400 disabled:cursor-not-allowed'
        } ${isCompleting ? 'animate-pulse' : ''}`}
      >
        ✓
      </button>

      <div className="min-w-0 flex-1">
        <p className={`font-medium ${done ? 'text-slate-500 line-through' : 'text-slate-100'}`}>
          {title}
        </p>
        <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-400">
          <span>
            <span aria-hidden="true">{CATEGORY_ICONS[quest.category]}</span>{' '}
            {t(`categories.${quest.category}`)}
          </span>
          <span className={`rounded border px-1.5 py-0.5 ${DIFFICULTY_STYLES[quest.difficulty]}`}>
            {t(`difficulty.${quest.difficulty}`)}
          </span>
          {quest.minutes && <span>{t('quests.minutes', { count: quest.minutes })}</span>}
          {dueLabel && !done && <span>⏳ {dueLabel}</span>}
          {failed && <span className="text-rose-400">{t('quests.failed')}</span>}
        </p>
        {quest.description && !done && (
          <p className="mt-1 line-clamp-2 text-sm text-slate-400">{quest.description}</p>
        )}
        {quest.milestone && (
          <p className="mt-1 text-xs text-azure-400">
            🎯 {quest.milestone.goalTitle} › {quest.milestone.title}
          </p>
        )}
      </div>

      <span className="shrink-0 font-display text-lg font-semibold text-azure-400" dir="ltr">
        +{done ? quest.xpAwarded : quest.xpReward} XP
      </span>

      {quest.rerollable && onReroll && (
        <button
          type="button"
          onClick={onReroll}
          disabled={!canReroll || isRerolling}
          aria-label={t('quests.reroll', { title })}
          title={t('quests.reroll', { title })}
          className={`${iconButton} disabled:cursor-not-allowed disabled:opacity-30 ${
            isRerolling ? 'animate-spin' : ''
          }`}
        >
          <svg
            viewBox="0 0 24 24"
            className="size-4"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            aria-hidden="true"
          >
            <path
              d="M4 12a8 8 0 0 1 14-5.3L20 9M20 4v5h-5M20 12a8 8 0 0 1-14 5.3L4 15M4 20v-5h5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      )}

      {isCustom && !done && !failed && (onEdit || onDelete) && (
        <div className="flex shrink-0">
          {onEdit && (
            <button
              type="button"
              onClick={onEdit}
              aria-label={t('customQuests.edit', { title })}
              title={t('customQuests.edit', { title })}
              className={iconButton}
            >
              <svg
                viewBox="0 0 24 24"
                className="size-4"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                aria-hidden="true"
              >
                <path
                  d="M4 20h4L19 9l-4-4L4 16v4ZM14 6l4 4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          )}
          {onDelete && (
            <button
              type="button"
              onClick={onDelete}
              aria-label={t('customQuests.delete', { title })}
              title={t('customQuests.delete', { title })}
              className={`${iconButton} hover:text-rose-400`}
            >
              <svg
                viewBox="0 0 24 24"
                className="size-4"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                aria-hidden="true"
              >
                <path
                  d="M5 7h14M10 7V4h4v3M7 7l1 13h8l1-13"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          )}
        </div>
      )}
    </li>
  );
}
