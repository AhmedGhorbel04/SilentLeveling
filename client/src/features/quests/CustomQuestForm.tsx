import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslation } from 'react-i18next';
import { Alert } from '../../components/ui/Alert';
import { Button } from '../../components/ui/Button';
import { TextField } from '../../components/ui/TextField';
import { ApiError } from '../../api/client';
import type { CustomQuestRequest, Quest } from '../../api/quests';
import { addDays, dueDateOf } from './questDates';
import {
  CATEGORIES,
  CATEGORY_ICONS,
  CUSTOM_DIFFICULTIES,
  CUSTOM_QUEST_MAX_DAYS_AHEAD,
  DIFFICULTY_BASE_XP,
  type CustomDifficulty,
} from '../../game/constants';

// Same rules and error codes as the backend (customQuest.schemas.ts)
const customQuestFormSchema = z.object({
  title: z.string().trim().min(3, 'TITLE_TOO_SHORT').max(120, 'TITLE_TOO_LONG'),
  description: z.string().trim().max(1000, 'DESCRIPTION_TOO_LONG'),
  category: z.enum(CATEGORIES),
  difficulty: z.enum(CUSTOM_DIFFICULTIES),
  dueDate: z.string().min(1, 'REQUIRED'),
});

type FormValues = z.infer<typeof customQuestFormSchema>;

type CustomQuestFormProps = {
  today: string; // the player's current day, from the server
  customXpRemaining: number;
  quest?: Quest; // when editing
  isSaving: boolean;
  error: unknown;
  onSubmit: (values: CustomQuestRequest) => void;
  onCancel: () => void;
};

export function CustomQuestForm({
  today,
  customXpRemaining,
  quest,
  isSaving,
  error,
  onSubmit,
  onCancel,
}: CustomQuestFormProps) {
  const { t } = useTranslation();
  const {
    register,
    handleSubmit,
    control,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(customQuestFormSchema),
    defaultValues: {
      title: quest?.title.en ?? '',
      description: quest?.description ?? '',
      category: quest?.category ?? 'STUDIES',
      difficulty: (quest?.difficulty as CustomDifficulty | undefined) ?? 'NORMAL',
      dueDate: quest ? dueDateOf(quest) : today,
    },
  });

  const difficulty = useWatch({ control, name: 'difficulty' });
  const reward = DIFFICULTY_BASE_XP[difficulty];
  const errorText = (code?: string) =>
    code ? t(`errors.${code}`, t('errors.UNKNOWN')) : undefined;
  const serverError = error instanceof ApiError ? error.code : error ? 'UNKNOWN' : null;
  const fieldClasses =
    'w-full rounded-md border border-abyss-border bg-void/60 px-3 py-2.5 text-slate-100 focus:border-arcane-500 focus:ring-2 focus:ring-arcane-500/30 focus:outline-none';

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">
      {serverError && <Alert>{t(`errors.${serverError}`, t('errors.UNKNOWN'))}</Alert>}

      <TextField
        label={t('customQuests.form.title')}
        maxLength={120}
        error={errorText(errors.title?.message)}
        {...register('title')}
      />

      <div className="flex flex-col gap-1.5">
        <label htmlFor="custom-description" className="text-sm font-medium text-slate-300">
          {t('customQuests.form.description')}
        </label>
        <textarea
          id="custom-description"
          rows={3}
          maxLength={1000}
          className={fieldClasses}
          {...register('description')}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="custom-category" className="text-sm font-medium text-slate-300">
            {t('customQuests.form.category')}
          </label>
          <select id="custom-category" className={fieldClasses} {...register('category')}>
            {CATEGORIES.map((category) => (
              <option key={category} value={category}>
                {CATEGORY_ICONS[category]} {t(`categories.${category}`)}
              </option>
            ))}
          </select>
        </div>

        <TextField
          label={t('customQuests.form.dueDate')}
          type="date"
          min={today}
          max={addDays(today, CUSTOM_QUEST_MAX_DAYS_AHEAD)}
          error={errorText(errors.dueDate?.message)}
          {...register('dueDate')}
        />
      </div>

      <fieldset>
        <legend className="mb-1.5 text-sm font-medium text-slate-300">
          {t('customQuests.form.difficulty')}
        </legend>
        <div className="grid grid-cols-3 gap-2">
          {CUSTOM_DIFFICULTIES.map((option) => (
            <button
              key={option}
              type="button"
              aria-pressed={difficulty === option}
              onClick={() => setValue('difficulty', option)}
              className={`rounded-md border px-3 py-2 text-sm font-medium transition ${
                difficulty === option
                  ? 'border-arcane-500 bg-arcane-600/20 text-white'
                  : 'border-abyss-border text-slate-300 hover:border-arcane-500/50'
              }`}
            >
              {t(`difficulty.${option}`)} · {DIFFICULTY_BASE_XP[option]} XP
            </button>
          ))}
        </div>
      </fieldset>

      <div className="rounded-md border border-abyss-border bg-void/40 px-3 py-2 text-sm">
        <p className="font-semibold text-azure-400">
          {t('customQuests.form.reward', { xp: reward })}
        </p>
        <p className={reward > customXpRemaining ? 'text-amber-300' : 'text-slate-400'}>
          {t('customQuests.form.capNote', { left: customXpRemaining })}
        </p>
      </div>

      <div className="flex justify-end gap-3">
        <Button variant="ghost" onClick={onCancel}>
          {t('customQuests.form.cancel')}
        </Button>
        <Button type="submit" isLoading={isSaving}>
          {quest ? t('customQuests.form.save') : t('customQuests.form.create')}
        </Button>
      </div>
    </form>
  );
}
