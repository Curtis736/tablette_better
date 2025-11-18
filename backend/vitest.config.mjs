import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    exclude: ['node_modules', 'dist', '.idea', '.git', '.cache'],
    testTimeout: 10000,
    hookTimeout: 10000,
    reporter: ['verbose'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      reportsDirectory: './coverage',
      include: ['**/*.js'],
      exclude: [
        'node_modules/**',
        'coverage/**',
        '**/*.test.js',
        '**/*.spec.js',
        'scripts/**',
        'sql/**',
        'data/**',
        'test-email*.js'
      ],
      thresholds: {
        global: {
          branches: 80,
          functions: 80,
          lines: 80,
          statements: 80
        }
      }
    },
    globals: true,
    mockReset: true,
    restoreMocks: true,
    clearMocks: true,
    maxConcurrency: 5,
    minThreads: 1,
    maxThreads: 4,
    setupFiles: ['./tests/vitest.setup.js'],
    env: {
      NODE_ENV: 'test'
    }
  }
});

