import { defineConfig } from 'vite';
import { resolve } from 'path';

// Mirrors tsconfig.json's "@iotpilot/core/*" -> "./src/*" path mapping so
// vitest can resolve the same imports the TypeScript compiler does.
export default defineConfig(() => ({
  resolve: {
    alias: [
      { find: /^@iotpilot\/core\/(.*)$/, replacement: resolve(__dirname, 'src/$1') },
    ],
  },
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts', 'src/**/*.spec.ts'],
    reporters: ['default'],
    testTimeout: 15000,
  },
}));
