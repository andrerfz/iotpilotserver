/// <reference types="vitest" />
import angular from '@analogjs/vite-plugin-angular';
import { defineConfig } from 'vite';

// Vitest via @analogjs/vite-plugin-angular (fe-foundation Q4). jsdom + Testing
// Library Angular; 15s timeout to match the repo's Vitest convention.
export default defineConfig(() => ({
  plugins: [angular()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['src/test-setup.ts'],
    include: ['src/**/*.spec.ts'],
    reporters: ['default'],
    testTimeout: 15000,
  },
}));
