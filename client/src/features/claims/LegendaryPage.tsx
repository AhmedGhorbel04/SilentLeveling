import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert } from '../../components/ui/Alert';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { Spinner } from '../../components/ui/Spinner';
import { TextField } from '../../components/ui/TextField';
import { ApiError } from '../../api/client';
import type { ClaimStatus, LegendaryQuest } from '../../api/claims';
import { CATEGORY_ICONS } from '../../game/constants';
import type { LanguageCode } from '../../i18n';
import { TitleBadge } from '../achievements/TitleBadge';
import { useLegendaryCatalog, useMyClaims, useSubmitClaim } from './useClaims';

const STATUS_STYLES: Record<ClaimStatus, string> = {
  PENDING: 'border-amber-500/50 text-amber-300',
  APPROVED: 'border-emerald-500/50 text-emerald-300',
  REJECTED: 'border-rose-500/50 text-rose-300',
};

// Real-life achievements: the catalog, claiming with a proof, and my claims (FR-60 to FR-62)
export function LegendaryPage() {
  const { t, i18n } = useTranslation();
  const language = (i18n.resolvedLanguage ?? 'en') as LanguageCode;
  const catalog = useLegendaryCatalog();
  const claims = useMyClaims();
  // null = closed, 'free' = extraordinary achievement, otherwise the catalog quest
  const [claiming, setClaiming] = useState<LegendaryQuest | 'free' | null>(null);

  if (catalog.isPending || claims.isPending) {
    return (
      <div className="grid place-items-center py-16 text-arcane-400" role="status">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold tracking-[0.3em] text-amber-300 uppercase">
            {t('legendary.eyebrow')}
          </p>
          <h1 className="font-display text-3xl font-bold text-white">{t('legendary.title')}</h1>
          <p className="mt-1 max-w-2xl text-slate-400">{t('legendary.subtitle')}</p>
        </div>
        <Button variant="secondary" onClick={() => setClaiming('free')}>
          {t('legendary.claimOther')}
        </Button>
      </header>

      {claiming && (
        <Modal
          title={claiming === 'free' ? t('legendary.claimOther') : claiming.title[language]}
          onClose={() => setClaiming(null)}
        >
          <ClaimForm
            quest={claiming === 'free' ? null : claiming}
            onDone={() => setClaiming(null)}
          />
        </Modal>
      )}

      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {catalog.data?.map((quest) => (
          <li
            key={quest.id}
            className={`system-panel flex flex-col gap-2 p-5 ${
              quest.tier === 'MYTHIC' ? 'border-rarity-mythic/50' : 'border-rarity-legendary/50'
            }`}
          >
            <div className="flex items-center justify-between gap-2 text-xs">
              <span className="text-slate-400">
                <span aria-hidden="true">{CATEGORY_ICONS[quest.category]}</span>{' '}
                {t(`categories.${quest.category}`)}
              </span>
              <span
                className={`font-semibold ${quest.tier === 'MYTHIC' ? 'text-rarity-mythic' : 'text-rarity-legendary'}`}
              >
                {t(`rarity.${quest.tier}`)}
              </span>
            </div>
            <h2 className="font-display text-lg font-bold text-white">{quest.title[language]}</h2>
            <p className="text-sm text-azure-400" dir="ltr">
              +{quest.xpReward.toLocaleString()} XP
            </p>
            {quest.rewardTitle && <TitleBadge title={quest.rewardTitle} />}
            <div className="mt-auto pt-2">
              {quest.myClaimStatus === 'PENDING' || quest.myClaimStatus === 'APPROVED' ? (
                <span
                  className={`rounded border px-2 py-1 text-xs ${STATUS_STYLES[quest.myClaimStatus]}`}
                >
                  {t(`legendary.status.${quest.myClaimStatus}`)}
                </span>
              ) : (
                <Button onClick={() => setClaiming(quest)} className="w-full">
                  {t('legendary.claim')}
                </Button>
              )}
            </div>
          </li>
        ))}
      </ul>

      <section aria-labelledby="my-claims" className="system-panel p-5">
        <h2 id="my-claims" className="mb-3 font-display text-xl font-bold text-white">
          {t('legendary.myClaims')}
        </h2>
        {claims.data?.length === 0 ? (
          <p className="text-sm text-slate-400">{t('legendary.noClaims')}</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {claims.data?.map((claim) => (
              <li
                key={claim.id}
                className="rounded-lg border border-abyss-border bg-abyss-light/40 px-4 py-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-semibold text-white">{claim.title[language]}</span>
                  <span
                    className={`rounded border px-2 py-0.5 text-xs ${STATUS_STYLES[claim.status]}`}
                  >
                    {t(`legendary.status.${claim.status}`)}
                  </span>
                </div>
                {claim.status === 'APPROVED' && (
                  <p className="mt-1 text-sm text-emerald-300" dir="ltr">
                    +{claim.xpAwarded} XP
                  </p>
                )}
                {claim.reviewNote && (
                  <p className="mt-1 text-sm text-slate-400">
                    {t('legendary.reviewNote', { note: claim.reviewNote })}
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function ClaimForm({ quest, onDone }: { quest: LegendaryQuest | null; onDone: () => void }) {
  const { t } = useTranslation();
  const submit = useSubmitClaim();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [proofUrl, setProofUrl] = useState('');

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    submit.mutate(
      quest
        ? { legendaryQuestId: quest.id, description, proofUrl }
        : { title, description, proofUrl },
      { onSuccess: onDone },
    );
  }

  const error = submit.error instanceof ApiError ? submit.error : null;
  const fieldError = (name: string) => {
    const code = error?.details?.[name];
    return code ? t(`errors.${code}`, t('errors.UNKNOWN')) : undefined;
  };

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
      <p className="text-sm text-slate-400">{t('legendary.formIntro')}</p>
      {error && !error.details && <Alert>{t(`errors.${error.code}`, t('errors.UNKNOWN'))}</Alert>}
      {!quest && (
        <TextField
          label={t('legendary.form.title')}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={120}
          error={fieldError('title')}
        />
      )}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="claim-description" className="text-sm font-medium text-slate-300">
          {t('legendary.form.description')}
        </label>
        <textarea
          id="claim-description"
          rows={4}
          maxLength={2000}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          aria-invalid={fieldError('description') ? true : undefined}
          className="rounded-md border border-abyss-border bg-void/60 px-3 py-2.5 text-slate-100 focus:border-arcane-500 focus:outline-none"
        />
        {fieldError('description') && (
          <p role="alert" className="text-xs text-rose-400">
            {fieldError('description')}
          </p>
        )}
      </div>
      <TextField
        label={t('legendary.form.proofUrl')}
        hint={t('legendary.form.proofHint')}
        type="url"
        dir="ltr"
        value={proofUrl}
        onChange={(e) => setProofUrl(e.target.value)}
        error={fieldError('proofUrl')}
      />
      <div className="flex justify-end gap-3">
        <Button variant="ghost" onClick={onDone}>
          {t('goals.form.cancel')}
        </Button>
        <Button type="submit" isLoading={submit.isPending}>
          {t('legendary.form.submit')}
        </Button>
      </div>
    </form>
  );
}
