import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Environnement de test
    environment: 'node',
    
    // Patterns des fichiers de test
    include: ['**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    
    // Exclusions
    exclude: ['node_modules', 'dist', '.idea', '.git', '.cache'],
    
    // Configuration des timeouts
    testTimeout: 10000,
    hookTimeout: 10000,
    
    // Configuration des reporters
    reporter: ['verbose'],
    
    // Configuration de la couverture
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
    
    // Configuration des globals
    globals: true,
    
    // Configuration des mocks
    mockReset: true,
    restoreMocks: true,
    clearMocks: true,
    
    // Configuration des workers
    maxConcurrency: 5,
    minThreads: 1,
    maxThreads: 4,
    
    // Configuration des hooks
    setupFiles: ['./tests/vitest.setup.js'],
    
    // Configuration des variables d'environnement
    env: {
      NODE_ENV: 'test'
    }
  }
});
