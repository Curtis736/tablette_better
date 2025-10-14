// Configuration globale pour les tests Jest
const { execSync } = require('child_process');

// Configuration des variables d'environnement pour les tests
process.env.NODE_ENV = 'test';
process.env.PORT = '3001';
process.env.DB_SERVER = 'localhost';
process.env.DB_DATABASE = 'test_db';
process.env.DB_USER = 'test_user';
process.env.DB_PASSWORD = 'test_password';
process.env.DB_ENCRYPT = 'false';
process.env.DB_TRUST_CERT = 'true';
process.env.FRONTEND_URL = 'http://localhost:8080';
process.env.API_TIMEOUT = '5000';
process.env.CACHE_ENABLED = 'false';
process.env.LOG_LEVEL = 'error';

// Configuration globale des timeouts
jest.setTimeout(10000);

// Nettoyage après chaque test
afterEach(() => {
  jest.clearAllMocks();
});

// Nettoyage global après tous les tests
afterAll(() => {
  // Arrêter tous les processus en cours
  process.exit(0);
});

// Gestion des erreurs non capturées
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
});

