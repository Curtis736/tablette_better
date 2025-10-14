const request = require('supertest');
const app = require('../server');

describe('Performance Tests', () => {
  // Configuration des timeouts pour les tests de performance
  const PERFORMANCE_TIMEOUT = 10000; // 10 secondes
  
  describe('Response Time Tests', () => {
    test('Health endpoint should respond within 100ms', async () => {
      const start = Date.now();
      
      await request(app)
        .get('/api/health')
        .expect(200);
      
      const duration = Date.now() - start;
      expect(duration).toBeLessThan(100);
    }, PERFORMANCE_TIMEOUT);

    test('Admin stats should load within 500ms', async () => {
      const start = Date.now();
      
      await request(app)
        .get('/api/admin/stats')
        .expect(200);
      
      const duration = Date.now() - start;
      expect(duration).toBeLessThan(500);
    }, PERFORMANCE_TIMEOUT);

    test('Operations list should load within 1s', async () => {
      const start = Date.now();
      
      await request(app)
        .get('/api/admin/operations')
        .expect(200);
      
      const duration = Date.now() - start;
      expect(duration).toBeLessThan(1000);
    }, PERFORMANCE_TIMEOUT);
  });

  describe('Concurrent Request Tests', () => {
    test('Should handle 10 concurrent health checks', async () => {
      const promises = [];
      const start = Date.now();
      
      for (let i = 0; i < 10; i++) {
        promises.push(
          request(app)
            .get('/api/health')
            .expect(200)
        );
      }
      
      const responses = await Promise.all(promises);
      const duration = Date.now() - start;
      
      expect(responses.length).toBe(10);
      expect(duration).toBeLessThan(2000); // Toutes les requêtes en moins de 2s
      
      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.status).toBe('OK');
      });
    }, PERFORMANCE_TIMEOUT);

    test('Should handle 5 concurrent admin requests', async () => {
      const promises = [];
      const start = Date.now();
      
      for (let i = 0; i < 5; i++) {
        promises.push(
          request(app)
            .get('/api/admin/stats')
            .expect(200)
        );
      }
      
      const responses = await Promise.all(promises);
      const duration = Date.now() - start;
      
      expect(responses.length).toBe(5);
      expect(duration).toBeLessThan(3000); // Toutes les requêtes en moins de 3s
      
      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('totalOperations');
      });
    }, PERFORMANCE_TIMEOUT);
  });

  describe('Memory Usage Tests', () => {
    test('Should not leak memory on multiple requests', async () => {
      const initialMemory = process.memoryUsage();
      
      // Faire 50 requêtes pour tester les fuites mémoire
      for (let i = 0; i < 50; i++) {
        await request(app)
          .get('/api/health')
          .expect(200);
      }
      
      // Forcer le garbage collection si disponible
      if (global.gc) {
        global.gc();
      }
      
      const finalMemory = process.memoryUsage();
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;
      
      // L'augmentation de mémoire ne devrait pas dépasser 10MB
      expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024);
    }, PERFORMANCE_TIMEOUT);
  });

  describe('Load Tests', () => {
    test('Should handle sustained load', async () => {
      const requestCount = 100;
      const promises = [];
      const start = Date.now();
      
      // Créer 100 requêtes simultanées
      for (let i = 0; i < requestCount; i++) {
        promises.push(
          request(app)
            .get('/api/health')
            .expect(200)
        );
      }
      
      const responses = await Promise.all(promises);
      const duration = Date.now() - start;
      
      expect(responses.length).toBe(requestCount);
      expect(duration).toBeLessThan(5000); // Toutes les requêtes en moins de 5s
      
      // Vérifier que toutes les réponses sont valides
      const successCount = responses.filter(r => r.status === 200).length;
      expect(successCount).toBe(requestCount);
      
      // Calculer le taux de succès
      const successRate = (successCount / requestCount) * 100;
      expect(successRate).toBe(100);
    }, PERFORMANCE_TIMEOUT);
  });

  describe('Database Performance Tests', () => {
    test('Database queries should be fast', async () => {
      const start = Date.now();
      
      const response = await request(app)
        .get('/api/admin/operations')
        .expect(200);
      
      const duration = Date.now() - start;
      
      // Les requêtes DB ne devraient pas prendre plus de 2s
      expect(duration).toBeLessThan(2000);
      expect(Array.isArray(response.body)).toBe(true);
    }, PERFORMANCE_TIMEOUT);

    test('Stats calculation should be efficient', async () => {
      const start = Date.now();
      
      const response = await request(app)
        .get('/api/admin/stats')
        .expect(200);
      
      const duration = Date.now() - start;
      
      // Le calcul des stats ne devrait pas prendre plus de 1s
      expect(duration).toBeLessThan(1000);
      expect(response.body).toHaveProperty('totalOperations');
      expect(response.body).toHaveProperty('activeOperations');
    }, PERFORMANCE_TIMEOUT);
  });

  describe('Error Recovery Performance', () => {
    test('Should recover quickly from errors', async () => {
      // Faire une requête invalide
      await request(app)
        .get('/api/invalid-endpoint')
        .expect(404);
      
      // Immédiatement après, faire une requête valide
      const start = Date.now();
      
      await request(app)
        .get('/api/health')
        .expect(200);
      
      const duration = Date.now() - start;
      
      // La récupération ne devrait pas prendre plus de 100ms
      expect(duration).toBeLessThan(100);
    }, PERFORMANCE_TIMEOUT);
  });
});

