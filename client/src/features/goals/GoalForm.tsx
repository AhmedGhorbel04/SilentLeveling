import { useFieldArray, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslation } from 'react-i18next';
import { Alert } from '../../components/ui/Alert';
import { Button } from '../../components/ui/Button';
import { TextField } from '../../components/ui/TextField';
import { ApiError } from '../../api/client';
import type { CreateGoalRequest, Goal } from '../../api/goals';
import { CATEGORIES, CATEGORY_ICONS } from '../../game/constants';
import type { LanguageCode } from '../../i18n';
import { GOAL_TEMPLATES } from './goalTemplates';

const MAX_MILESTONES = 20;

// Same rules and error codes as the backend (goal.schemas.ts)
const goalFormSchema = z.object({
  title: z.string().trim().min(3, 'TITLE_TOO_SHORT').max(120, 'TITLE_TOO_LONG'),
  description: z.string().trim().max(1000, 'DESCRIPTION_TOO_LONG'),
  category: z.enum(CATEGORIES),
  targetDate: z.string(),
  milestones: z
    .array(z.object({ title: z.string().trim().max(120, 'TITLE_TOO_LONG') }))
    .max(MAX_MILESTONES, 'TOO_MANY_MILESTONES'),
});

type FormValues = z.infer<typeof goalFormSchema>;

type GoalFormProps = {
  goal?: Goal; // when editing (milestones are then edited on the goal card)
  isSaving: boolean;
  error: unknown;
  onSubmit: (values: CreateGoalRequest) => void;
  onCancel: () => void;
};

export function GoalForm({ goal, isSaving, error, onSubmit, onCancel }: GoalFormProps) {
  const { t, i18n } = useTranslation();
  const language = (i18n.resolvedLanguage ?? 'en') as LanguageCode;
  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(goalFormSchema),
    defaultValues: {
      title: goal?.title ?? '',
      description: goal?.description ?? '',
      category: goal?.category ?? 'CAREER',
      targetDate: goal?.targetDate ?? '',
      milestones: goal ? [] : [{ title: '' }],
    },
  });
  const milestones = useFieldArray({ control, name: 'milestones' });

  // Fills the form with a template, in the current interface language
  function applyTemplate(templateId: string) {
    const template = GOAL_TEMPLATES.find((tpl) => tpl.id === templateId);
    if (!template) return;
    reset({
      title: template.title[language],
      description: '',
      category: template.category,
      targetDate: '',
      milestones: template.milestones.map((m) => ({ title: m[language] })),
    });
  }

  function submit(values: FormValues) {
    onSubmit({
      title: values.title,
      description: values.description,
      category: values.category,
      targetDate: values.targetDate || null,
      // Empty milestone lines are ignored
      milestones: values.milestones.map((m) => m.title.trim()).filter(Boolean),
    });
  }

  const errorText = (code?: string) =>
    code ? t(`errors.${code}`, t('errors.UNKNOWN')) : undefined;
  const serverError = error instanceof ApiError ? error.code : error ? 'UNKNOWN' : null;
  const fieldClasses =
    'w-full rounded-md border border-abyss-border bg-void/60 px-3 py-2.5 text-slate-100 focus:border-arcane-500 focus:ring-2 focus:ring-arcane-500/30 focus:outline-none';

  return (
    <form onSubmit={handleSubmit(submit)} noValidate className="flex flex-col gap-4">
      {serverError && <Alert>{t(`errors.${serverError}`, t('errors.UNKNOWN'))}</Alert>}

      {!goal && (
        <div className="flex flex-col gap-1.5">
          <label htmlFor="goal-template" className="text-sm font-medium text-slate-300">
            {t('goals.form.template')}
          </label>
          <select
            id="goal-template"
            className={fieldClasses}
            defaultValue=""
            onChange={(event) => applyTemplate(event.target.value)}
          >
            <option value="">{t('goals.form.noTemplate')}</option>
            {GOAL_TEMPLATES.map((template) => (
              <option key={template.id} value={template.id}>
                {CATEGORY_ICONS[template.category]} {template.title[language]}
              </option>
            ))}
          </select>
        </div>
      )}

      <TextField
        label={t('goals.form.title')}
        maxLength={120}
        error={errorText(errors.title?.message)}
        {...register('title')}
      />

      <div className="flex flex-col gap-1.5">
        <label htmlFor="goal-description" className="text-sm font-medium text-slate-300">
          {t('goals.form.description')}
        </label>
        <textarea
          id="goal-description"
          rows={2}
          maxLength={1000}
          className={fieldClasses}
          {...register('description')}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="goal-category" className="text-sm font-medium text-slate-300">
            {t('goals.form.category')}
          </label>
          <select id="goal-category" className={fieldClasses} {...register('category')}>
            {CATEGORIES.map((category) => (
              <option key={category} value={category}>
                {CATEGORY_ICONS[category]} {t(`categories.${category}`)}
              </option>
            ))}
          </select>
        </div>
        <TextField label={t('goals.form.targetDate')} type="date" {...register('targetDate')} />
      </div>

      {!goal && (
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1 text-sm font-medium text-slate-300">
            {t('goals.form.milestones')}
          </legend>
          {milestones.fields.map((field, index) => (
            <div key={field.id} className="flex items-center gap-2">
              <span className="w-6 text-end text-sm text-slate-500">{index + 1}.</span>
              <input
                aria-label={t('goals.form.milestoneNumber', { number: index + 1 })}
                maxLength={120}
                className={fieldClasses}
                {...register(`milestones.${index}.title`)}
              />
              <button
                type="button"
                onClick={() => milestones.remove(index)}
                aria-label={t('goals.form.removeMilestone', { number: index + 1 })}
                className="px-2 text-slate-400 hover:text-rose-400"
              >
                ✕
              </button>
            </div>
          ))}
          {milestones.fields.length < MAX_MILESTONES && (
            <Button
              variant="ghost"
              className="self-start"
              onClick={() => milestones.append({ title: '' })}
            >
              + {t('goals.form.addMilestone')}
            </Button>
          )}
        </fieldset>
      )}

      <div className="flex justify-end gap-3">
        <Button variant="ghost" onClick={onCancel}>
          {t('goals.form.cancel')}
        </Button>
        <Button type="submit" isLoading={isSaving}>
          {goal ? t('goals.form.save') : t('goals.form.create')}
        </Button>
      </div>
    </form>
  );
}
