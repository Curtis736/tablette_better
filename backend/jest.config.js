module.exports = {
  testEnvironment: 'node',
  testMatch: [
    '**/tests/**/*.test.js',
    '**/tests/**/*.spec.js'
  ],
  collectCoverage: true,
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html', 'json'],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  },
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
  testTimeout: 30000, // 30 secondes pour les tests de performance
  verbose: true,
  forceExit: true,
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true,
  maxWorkers: '50%', // Utiliser la moitié des CPU disponibles
  detectOpenHandles: true,
  detectLeaks: true,
  // Configuration pour les tests de performance
  // testSequencer: '<rootDir>/tests/testSequencer.js', // Commenté temporairement
  // Configuration pour les tests parallèles
  maxConcurrency: 5,
  // Configuration pour les tests de sécurité
  testEnvironmentOptions: {
    url: 'http://localhost:3000'
  }
};
