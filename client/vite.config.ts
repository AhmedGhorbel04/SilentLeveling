import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
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
