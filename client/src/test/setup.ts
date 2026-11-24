import '@testing-library/jest-dom/vitest';
import { afterEach, beforeEach } from 'vitest';
import { cleanup } from '@testing-library/react';
import i18n from '../i18n';

// Every test starts in English
beforeEach(async () => {
  await i18n.changeLanguage('en');
});

// Unmount rendered components between tests
afterEach(() => {
  cleanup();
});
