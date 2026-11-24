import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import './i18n';

// Self-hosted fonts (no request to Google): Inter for text, Rajdhani for headings
// and numbers, Noto Sans Arabic for Arabic.
import '@fontsource-variable/inter';
import '@fontsource-variable/noto-sans-arabic';
import '@fontsource/rajdhani/500.css';
import '@fontsource/rajdhani/600.css';
import '@fontsource/rajdhani/700.css';
import './styles/index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
