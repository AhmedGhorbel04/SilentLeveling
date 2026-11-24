import { describe, expect, it } from 'vitest';
import i18n from '.';
import en from './locales/en.json';
import fr from './locales/fr.json';
import ar from './locales/ar.json';

// Lists every key of a nested translation object, e.g. "auth.login.title"
function keysOf(object: object, prefix = ''): string[] {
  return Object.entries(object).flatMap(([key, value]) =>
    typeof value === 'object' ? keysOf(value, `${prefix}${key}.`) : [`${prefix}${key}`],
  );
}

describe('i18n', () => {
  it('switches the page to right-to-left in Arabic and back', async () => {
    await i18n.changeLanguage('ar');
    expect(document.documentElement.dir).toBe('rtl');
    expect(document.documentElement.lang).toBe('ar');

    await i18n.changeLanguage('fr');
    expect(document.documentElement.dir).toBe('ltr');
    expect(document.documentElement.lang).toBe('fr');
  });

  it('has exactly the same keys in all three languages', () => {
    const englishKeys = keysOf(en).sort();

    expect(keysOf(fr).sort()).toEqual(englishKeys);
    expect(keysOf(ar).sort()).toEqual(englishKeys);
  });
});
