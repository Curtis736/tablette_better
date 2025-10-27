// Configuration Vitest pour SEDI Tablette v2
// Ce fichier s'exécute avant chaque test

// Définir l'environnement de test
process.env.NODE_ENV = 'test';

// Configuration des timeouts
process.env.VITEST_TIMEOUT = '10000';

// Configuration des mocks globaux
global.console = {
  ...console,
  // Réduire le bruit des console.log pendant les tests
  log: process.env.VITEST_VERBOSE ? console.log : () => {},
  warn: console.warn,
  error: console.error,
  info: console.info,
  debug: console.debug
};

// Mock des modules problématiques
vi.mock('../server', () => ({
  app: {
    listen: vi.fn((port, callback) => {
      console.log(`Mock server listening on port ${port}`);
      if (callback) callback();
      return {
        close: vi.fn((cb) => {
          console.log('Mock server closed');
          if (cb) cb();
        })
      };
    }),
    use: vi.fn(),
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn()
  },
  closeServer: vi.fn(() => Promise.resolve())
}));

// Mock de la base de données pour les tests
vi.mock('../config/database', () => ({
  executeQuery: vi.fn(() => Promise.resolve([])),
  executeNonQuery: vi.fn(() => Promise.resolve({ rowsAffected: 1 })),
  closeConnection: vi.fn(() => Promise.resolve())
}));

// Mock des services email
vi.mock('../services/emailService', () => ({
  sendEmail: vi.fn(() => Promise.resolve({ success: true })),
  sendEmailWithTemplate: vi.fn(() => Promise.resolve({ success: true }))
}));

vi.mock('../services/webhookEmailService', () => ({
  sendWebhookEmail: vi.fn(() => Promise.resolve({ success: true }))
}));

// Configuration des tests
beforeEach(() => {
  // Nettoyer les mocks avant chaque test
  vi.clearAllMocks();
});

afterEach(() => {
  // Nettoyer après chaque test
  vi.restoreAllMocks();
});

// Configuration globale
afterAll(async () => {
  // Nettoyage final
  console.log('🧪 Tests terminés - Nettoyage final');
});








