import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

// base relative : l'appli fonctionne quel que soit le chemin de publication
// (GitHub Pages /chasseur-biens-alsace/, Vercel, ou ouverte en local).
export default defineConfig({
  base: './',
  plugins: [react()],
  test: {
    include: ['tests/**/*.test.ts'],
  },
});
