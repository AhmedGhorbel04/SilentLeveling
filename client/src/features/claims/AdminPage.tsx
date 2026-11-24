import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert } from '../../components/ui/Alert';
import { Button } from '../../components/ui/Button';
import { Spinner } from '../../components/ui/Spinner';
import { ApiError } from '../../api/client';
import type { ApproveClaimRequest, ClaimStatus, ReviewClaim, Tier } from '../../api/claims';
import type { LanguageCode } from '../../i18n';
import { rankLabel } from '../../game/ranks';
import {
  useAdminCatalog,
  useAdminTitles,
  useApproveClaim,
  useRejectClaim,
  useReviewClaims,
  useSetQuestActive,
} from './useClaims';

const fieldClasses =
  'w-full rounded-md border border-abyss-border bg-void/60 px-3 py-2 text-sm text-slate-100 focus:border-arcane-500 focus:outline-none';

// Admin page: review claims (FR-64) and switch catalog quests on or off (FR-66).
// Only reachable by admins; the API checks the role again on every request.
export function AdminPage() {
  const { t } = useTranslation();
  const [status, setStatus] = useState<ClaimStatus>('PENDING');
  const claims = useReviewClaims(status);

  return (
    <div className="flex flex-col gap-6">
      <header>
        <p className="text-xs font-semibold tracking-[0.3em] text-rose-300 uppercase">
          {t('admin.eyebrow')}
        </p>
        <h1 className="font-display text-3xl font-bold text-white">{t('admin.title')}</h1>
      </header>

      <section aria-labelledby="claims-heading" className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="claims-heading" className="font-display text-xl font-bold text-white">
            {t('admin.claims')}
          </h2>
          <div className="flex rounded-md border border-abyss-border p-0.5" role="group">
            {(['PENDING', 'APPROVED', 'REJECTED'] as const).map((option) => (
              <button
                key={option}
                type="button"
                aria-pressed={status === option}
                onClick={() => setStatus(option)}
                className={`rounded px-3 py-1 text-sm ${status === option ? 'bg-arcane-600 text-white' : 'text-slate-400 hover:text-white'}`}
              >
                {t(`legendary.status.${option}`)}
              </button>
            ))}
          </div>
        </div>
        {claims.isPending ? (
          <Spinner />
        ) : claims.data?.length === 0 ? (
          <p className="system-panel p-6 text-center text-slate-400">{t('admin.noClaims')}</p>
        ) : (
          claims.data?.map((claim) => <ClaimReview key={claim.id} claim={claim} />)
        )}
      </section>

      <CatalogSection />
    </div>
  );
}

function ClaimReview({ claim }: { claim: ReviewClaim }) {
  const { t, i18n } = useTranslation();
  const language = (i18n.resolvedLanguage ?? 'en') as LanguageCode;
  const titles = useAdminTitles();
  const approve = useApproveClaim();
  const reject = useRejectClaim();
  const quest = claim.legendaryQuest;

  // Defaults come from the catalog quest; free-form claims start empty
  const [xp, setXp] = useState(String(quest?.xpReward ?? 3000));
  const [tier, setTier] = useState<Tier>(quest?.tier ?? 'LEGENDARY');
  const [titleChoice, setTitleChoice] = useState<string>('none'); // 'none' | 'new' | title id
  const [newTitle, setNewTitle] = useState({ en: '', fr: '', ar: '' });
  const [reason, setReason] = useState('');

  function onApprove(event: FormEvent) {
    event.preventDefault();
    const body: ApproveClaimRequest = { xp: Number(xp), tier };
    if (titleChoice === 'new') body.newTitle = { name: newTitle, rarity: tier };
    else if (titleChoice !== 'none') body.titleId = titleChoice;
    approve.mutate({ id: claim.id, ...body });
  }

  const error = approve.error ?? reject.error;
  const pending = claim.status === 'PENDING';

  return (
    <article className="system-panel flex flex-col gap-3 p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="font-display text-lg font-bold text-white">{claim.title[language]}</h3>
        <span className="text-sm text-slate-400" dir="ltr">
          {claim.player.username} · {t('status.level', { level: claim.player.level })} ·{' '}
          {rankLabel(claim.player.rank)}
        </span>
      </div>
      <p className="whitespace-pre-line text-sm text-slate-300">{claim.description}</p>
      {/* External link: opened in a new tab, without giving that site access to this page */}
      <a
        href={claim.proofUrl}
        target="_blank"
        rel="noopener noreferrer nofollow"
        className="text-sm break-all text-azure-400 underline hover:text-azure-300"
        dir="ltr"
      >
        {claim.proofUrl}
      </a>

      {error && (
        <Alert>
          {t(`errors.${error instanceof ApiError ? error.code : 'UNKNOWN'}`, t('errors.UNKNOWN'))}
        </Alert>
      )}

      {pending ? (
        <div className="grid gap-4 border-t border-abyss-border pt-3 lg:grid-cols-2">
          <form onSubmit={onApprove} className="flex flex-col gap-2">
            <div className="grid grid-cols-2 gap-2">
              <label className="text-xs text-slate-400">
                XP
                <input
                  type="number"
                  min={1}
                  max={20000}
                  value={xp}
                  onChange={(e) => setXp(e.target.value)}
                  className={fieldClasses}
                />
              </label>
              <label className="text-xs text-slate-400">
                {t('admin.tier')}
                <select
                  value={tier}
                  onChange={(e) => setTier(e.target.value as Tier)}
                  className={fieldClasses}
                >
                  <option value="LEGENDARY">{t('rarity.LEGENDARY')}</option>
                  <option value="MYTHIC">{t('rarity.MYTHIC')}</option>
                </select>
              </label>
            </div>
            <label className="text-xs text-slate-400">
              {t('admin.titleToGrant')}
              <select
                value={titleChoice}
                onChange={(e) => setTitleChoice(e.target.value)}
                className={fieldClasses}
              >
                <option value="none">{t('admin.noTitle')}</option>
                <option value="new">{t('admin.newTitle')}</option>
                {titles.data?.map((title) => (
                  <option key={title.id} value={title.id}>
                    {title.name[language]} ({t(`rarity.${title.rarity}`)})
                  </option>
                ))}
              </select>
            </label>
            {titleChoice === 'new' &&
              (['en', 'fr', 'ar'] as const).map((lang) => (
                <input
                  key={lang}
                  aria-label={t('admin.newTitleIn', { language: lang.toUpperCase() })}
                  placeholder={t('admin.newTitleIn', { language: lang.toUpperCase() })}
                  value={newTitle[lang]}
                  maxLength={40}
                  dir={lang === 'ar' ? 'rtl' : 'ltr'}
                  onChange={(e) => setNewTitle({ ...newTitle, [lang]: e.target.value })}
                  className={fieldClasses}
                />
              ))}
            <Button type="submit" isLoading={approve.isPending}>
              ✓ {t('admin.approve')}
            </Button>
          </form>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              reject.mutate({ id: claim.id, reason });
            }}
            className="flex flex-col gap-2"
          >
            <label className="text-xs text-slate-400">
              {t('admin.rejectReason')}
              <textarea
                rows={3}
                value={reason}
                maxLength={500}
                onChange={(e) => setReason(e.target.value)}
                className={fieldClasses}
              />
            </label>
            <Button type="submit" variant="secondary" isLoading={reject.isPending}>
              ✕ {t('admin.reject')}
            </Button>
          </form>
        </div>
      ) : (
        <p className="text-sm text-slate-400">
          {claim.status === 'APPROVED'
            ? `+${claim.xpAwarded} XP · ${t(`rarity.${claim.tierAwarded}`)}`
            : claim.reviewNote}
        </p>
      )}
    </article>
  );
}

function CatalogSection() {
  const { t, i18n } = useTranslation();
  const language = (i18n.resolvedLanguage ?? 'en') as LanguageCode;
  const catalog = useAdminCatalog();
  const setActive = useSetQuestActive();

  return (
    <section aria-labelledby="catalog-heading" className="system-panel p-5">
      <h2 id="catalog-heading" className="mb-3 font-display text-xl font-bold text-white">
        {t('admin.catalog')}
      </h2>
      <ul className="flex flex-col gap-1">
        {catalog.data?.map((quest) => (
          <li
            key={quest.id}
            className="flex items-center gap-3 rounded-md px-2 py-1.5 hover:bg-abyss-light/60"
          >
            <input
              type="checkbox"
              checked={quest.active}
              onChange={() => setActive.mutate({ id: quest.id, active: !quest.active })}
              aria-label={t('admin.activeToggle', { title: quest.title[language] })}
              className="accent-arcane-500"
            />
            <span
              className={`flex-1 text-sm ${quest.active ? 'text-slate-200' : 'text-slate-500 line-through'}`}
            >
              {quest.title[language]}
            </span>
            <span className="text-xs text-slate-400" dir="ltr">
              {quest.xpReward} XP · {t(`rarity.${quest.tier}`)}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
