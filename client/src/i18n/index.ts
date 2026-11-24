import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import en from './locales/en.json';
import fr from './locales/fr.json';
import ar from './locales/ar.json';

export const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'fr', label: 'Français' },
  { code: 'ar', label: 'العربية' },
] as const;

export type LanguageCode = (typeof LANGUAGES)[number]['code'];

// Sets <html lang="ar" dir="rtl"> so the browser, screen readers and our logical
// CSS utilities all switch direction together.
function applyToDocument(language: string) {
  document.documentElement.lang = language;
  document.documentElement.dir = i18n.dir(language);
}

i18n.on('languageChanged', applyToDocument);

void i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      fr: { translation: fr },
      ar: { translation: ar },
    },
    supportedLngs: LANGUAGES.map((l) => l.code),
    fallbackLng: 'en',
    load: 'languageOnly', // "fr-FR" in the browser becomes "fr"
    interpolation: { escapeValue: false }, // React already escapes output
    detection: {
      // 1. language chosen before (saved in localStorage), 2. browser language
      order: ['localStorage', 'navigator'],
      lookupLocalStorage: 'sl_language',
      caches: ['localStorage'],
    },
  });

applyToDocument(i18n.resolvedLanguage ?? 'en');

export default i18n;
