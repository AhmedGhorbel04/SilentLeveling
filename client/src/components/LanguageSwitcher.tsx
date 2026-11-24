import { useTranslation } from 'react-i18next';
import { LANGUAGES } from '../i18n';

export function LanguageSwitcher() {
  const { t, i18n } = useTranslation();

  return (
    <label className="inline-flex items-center gap-2 text-sm text-slate-400">
      <span className="sr-only">{t('common.language')}</span>
      <span aria-hidden="true">🌐</span>
      <select
        value={i18n.resolvedLanguage}
        onChange={(e) => void i18n.changeLanguage(e.target.value)}
        className="cursor-pointer rounded-md border border-abyss-border bg-abyss px-2 py-1.5 text-slate-200 hover:border-arcane-500/60 focus:outline-none focus:ring-2 focus:ring-arcane-500/30"
      >
        {LANGUAGES.map((language) => (
          <option key={language.code} value={language.code}>
            {language.label}
          </option>
        ))}
      </select>
    </label>
  );
}
