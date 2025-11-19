import { defineConfig } from 'vitest/config';
import { randomFillSync, webcrypto } from 'node:crypto';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

if (!globalThis.crypto) {
  globalThis.crypto = webcrypto ?? {};
}

if (typeof globalThis.crypto.getRandomValues !== 'function') {
  globalThis.crypto.getRandomValues = (typedArray) => {
    if (!typedArray || typeof typedArray.length !== 'number') {
      throw new TypeError('Expected typed array');
    }
    return randomFillSync(typedArray);
  };
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const coverageProviderModule = resolve(
  __dirname,
  'node_modules/@vitest/coverage-v8/dist/index.js'
);

export default defineConfig({
  resolve: {
    preserveSymlinks: true
  },
  test: {
    environment: 'node',
    include: ['**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    exclude: ['node_modules', 'dist', '.idea', '.git', '.cache'],
    testTimeout: 10000,
    hookTimeout: 10000,
    reporter: ['verbose'],
    coverage: {
      provider: 'custom',
      customProviderModule: coverageProviderModule,
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

