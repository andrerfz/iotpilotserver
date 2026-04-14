import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./apps/frontend/src/__tests__/setup.ts'],
    testTimeout: 15000,
    coverage: {
      provider: 'c8',
      reporter: ['text', 'html', 'lcov'],
      exclude: [
        'node_modules/',
        'apps/frontend/src/__tests__/',
        '**/*.d.ts',
        '**/*.config.*'
      ]
    }
  },
  resolve: {
    alias: {
      '@iotpilot/core': path.resolve(__dirname, './packages/core/src'),
      '@': path.resolve(__dirname, './apps/frontend/src'),
      '@/lib': path.resolve(__dirname, './apps/frontend/src/lib'),
      '@/components': path.resolve(__dirname, './apps/frontend/src/components'),
      '@/hooks': path.resolve(__dirname, './apps/frontend/src/hooks'),
      '@/types': path.resolve(__dirname, './apps/frontend/src/types'),
      '@/utils': path.resolve(__dirname, './apps/frontend/src/utils'),
    },
  },
})
