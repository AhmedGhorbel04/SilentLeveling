import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert } from '../../components/ui/Alert';
import { Button } from '../../components/ui/Button';
import { TextField } from '../../components/ui/TextField';
import { ApiError } from '../../api/client';
import type { AdminLegendaryQuest, LegendaryQuestRequest, Tier } from '../../api/claims';
import { CATEGORIES, type Category } from '../../game/constants';
import { LANGUAGES, type LanguageCode } from '../../i18n';
import { useAdminTitles, useCreateQuest, useDeleteQuest, useUpdateQuest } from './useClaims';

const fieldClasses =
  'w-full rounded-md border border-abyss-border bg-void/60 px-3 py-2.5 text-sm text-slate-100 focus:border-arcane-500 focus:outline-none';

const EMPTY: LegendaryQuestRequest = {
  title: { en: '', fr: '', ar: '' },
  category: 'FITNESS',
  tier: 'LEGENDARY',
  xpReward: 3000,
  titleId: null,
  active: true,
};

// Create or edit a legendary quest of the catalog (admin). `quest` = null creates one.
export function LegendaryQuestForm({
  quest,
  onDone,
}: {
  quest: AdminLegendaryQuest | null;
  onDone: () => void;
}) {
  const { t, i18n } = useTranslation();
  const language = (i18n.resolvedLanguage ?? 'en') as LanguageCode;
  const titles = useAdminTitles();
  const create = useCreateQuest();
  const update = useUpdateQuest();
  const remove = useDeleteQuest();
  const [form, setForm] = useState<LegendaryQuestRequest>(
    quest
      ? {
          title: quest.title,
          category: quest.category,
          tier: quest.tier,
          xpReward: quest.xpReward,
          titleId: quest.titleId,
          active: quest.active,
        }
      : EMPTY,
  );
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const set = <K extends keyof LegendaryQuestRequest>(key: K, value: LegendaryQuestRequest[K]) =>
    setForm((current) => ({ ...current, [key]: value }));

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (quest) update.mutate({ id: quest.id, ...form }, { onSuccess: onDone });
    else create.mutate(form, { onSuccess: onDone });
  }

  const mutation = quest ? update : create;
  const error = [mutation.error, remove.error].find((e) => e instanceof ApiError) ?? null;
  const fieldError = (name: string) => {
    const code = error?.details?.[name];
    return code ? t(`errors.${code}`, t('errors.UNKNOWN')) : undefined;
  };

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
      {error && !error.details && <Alert>{t(`errors.${error.code}`, t('errors.UNKNOWN'))}</Alert>}

      {LANGUAGES.map(({ code }) => (
        <TextField
          key={code}
          label={t('admin.questForm.titleIn', { language: code.toUpperCase() })}
          dir={code === 'ar' ? 'rtl' : 'ltr'}
          maxLength={120}
          value={form.title[code]}
          onChange={(e) => set('title', { ...form.title, [code]: e.target.value })}
          error={fieldError(`title.${code}`)}
        />
      ))}

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-300">
          {t('admin.questForm.category')}
          <select
            className={fieldClasses}
            value={form.category}
            onChange={(e) => set('category', e.target.value as Category)}
          >
            {CATEGORIES.map((category) => (
              <option key={category} value={category}>
                {t(`categories.${category}`)}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-300">
          {t('admin.tier')}
          <select
            className={fieldClasses}
            value={form.tier}
            onChange={(e) => set('tier', e.target.value as Tier)}
          >
            <option value="LEGENDARY">{t('rarity.LEGENDARY')}</option>
            <option value="MYTHIC">{t('rarity.MYTHIC')}</option>
          </select>
        </label>
        <TextField
          label={t('admin.questForm.xpReward')}
          type="number"
          inputMode="numeric"
          min={1}
          max={20000}
          dir="ltr"
          value={Number.isNaN(form.xpReward) ? '' : form.xpReward}
          onChange={(e) => set('xpReward', e.target.valueAsNumber)}
          error={fieldError('xpReward')}
        />
        <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-300">
          {t('admin.questForm.rewardTitle')}
          <select
            className={fieldClasses}
            value={form.titleId ?? ''}
            onChange={(e) => set('titleId', e.target.value || null)}
          >
            <option value="">{t('admin.noTitle')}</option>
            {titles.data?.map((title) => (
              <option key={title.id} value={title.id}>
                {title.name[language]} ({t(`rarity.${title.rarity}`)})
              </option>
            ))}
          </select>
        </label>
      </div>

      <label className="flex items-center gap-2 text-sm text-slate-300">
        <input
          type="checkbox"
          checked={form.active}
          onChange={(e) => set('active', e.target.checked)}
          className="accent-arcane-500"
        />
        {t('admin.questForm.active')}
      </label>

      <div className="flex flex-wrap items-center justify-between gap-3">
        {quest &&
          (confirmingDelete ? (
            <div className="flex items-center gap-2 text-sm text-rose-300">
              {t('admin.questForm.confirmDelete')}
              <Button
                variant="secondary"
                isLoading={remove.isPending}
                onClick={() => remove.mutate(quest.id, { onSuccess: onDone })}
              >
                {t('admin.questForm.delete')}
              </Button>
            </div>
          ) : (
            <Button variant="ghost" onClick={() => setConfirmingDelete(true)}>
              {t('admin.questForm.delete')}
            </Button>
          ))}
        <div className="ms-auto flex gap-3">
          <Button variant="ghost" onClick={onDone}>
            {t('goals.form.cancel')}
          </Button>
          <Button type="submit" isLoading={mutation.isPending}>
            {t('admin.questForm.save')}
          </Button>
        </div>
      </div>
    </form>
  );
}
