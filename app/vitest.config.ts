import {defineConfig} from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
    plugins: [react()],
    test: {
        globals: true,
        environment: 'jsdom',
        setupFiles: ['./src/__tests__/setup.ts'],
        testTimeout: 15000,
        // Use forks pool to support AsyncLocalStorage properly
        pool: 'forks',
        poolOptions: {
            forks: {
                // Use single fork for proper AsyncLocalStorage context propagation
                singleFork: true
            }
        },
        coverage: {
            provider: 'v8',
            reporter: ['text', 'html', 'lcov'],
            exclude: [
                'node_modules/',
                'src/__tests__/',
                '**/*.d.ts',
                '**/*.config.*'
            ]
        }
    },
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src')
        },
    },
})