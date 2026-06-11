/// <reference types="vitest" />
import angular from '@analogjs/vite-plugin-angular';
import { resolve } from 'path';
import { defineConfig } from 'vite';

// Vitest via @analogjs/vite-plugin-angular (fe-foundation Q4). jsdom + Testing
// Library Angular; 15s timeout to match the repo's Vitest convention.
export default defineConfig(() => ({
  plugins: [angular()],
  resolve: {
    alias: {
      // Mirror tsconfig.json "paths": { "@ng/*": ["src/app/*"] }
      '@ng': resolve(__dirname, 'src/app'),
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['src/test-setup.ts'],
    include: ['src/**/*.spec.ts'],
    reporters: ['default'],
    testTimeout: 15000,
    // @ionic/core ships ESM inside a CommonJS package; inline it so Vitest
    // transforms it (lets specs import Ionic providers like ToastController).
    server: {
      deps: {
        inline: [/@ionic\//],
      },
    },
  },
}));
