import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';

// Installable app (M11): the manifest lets phones and PCs install it, and the
// service worker keeps the app's files so it opens offline. Data is not cached
// here: TanStack Query saves it (src/offline/queryClient.ts).
const pwa = VitePWA({
  registerType: 'autoUpdate', // a new deploy replaces the old version on next visit
  includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
  manifest: {
    name: 'SilentLeveling',
    short_name: 'SilentLeveling',
    description: 'Your real life. Leveled up.',
    start_url: '/dashboard',
    scope: '/',
    display: 'standalone',
    background_color: '#05060f',
    theme_color: '#05060f',
    icons: [
      { src: 'pwa-192.png', sizes: '192x192', type: 'image/png' },
      { src: 'pwa-512.png', sizes: '512x512', type: 'image/png' },
      { src: 'pwa-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  },
  workbox: {
    // Shows the quest reminders (push notifications)
    importScripts: ['push-sw.js'],
    globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
    // Font subsets the app never shows (Devanagari, Cyrillic, Greek, Vietnamese)
    globIgnores: ['**/*-{devanagari,cyrillic,cyrillic-ext,greek,vietnamese}-*'],
    // Any page opened offline gets the app, which then routes it; never the API
    navigateFallback: '/index.html',
    navigateFallbackDenylist: [/^\/api\//],
  },
});

export default defineConfig({
  plugins: [react(), tailwindcss(), ...(process.env.VITEST ? [] : [pwa])],
  server: {
    port: 5173,
    // In development, forward /api calls to the backend so the browser sees a single origin,
    // exactly like the Vercel rewrite in production (SRS §6.1).
    proxy: {
      '/api': 'http://localhost:4000',
    },
  },
  // `npm run preview` (production build) talks to the local API the same way
  preview: {
    proxy: {
      '/api': 'http://localhost:4000',
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
  },
});
