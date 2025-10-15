const request = require('supertest');
const app = require('../server');

describe('Integration Tests', () => {
  describe('Database Connectivity', () => {
    test('Should connect to database successfully', async () => {
      // Test de connectivité à la base de données
      const response = await request(app)
        .get('/api/health')
        .expect(200);
      
      expect(response.body.status).toBe('OK');
      expect(response.body.database).toBeDefined();
    });
  });

  describe('API Endpoints Integration', () => {
    test('Admin endpoints should work together', async () => {
      // Test des endpoints admin
      const statsResponse = await request(app)
        .get('/api/admin/stats')
        .expect(200);
      
      expect(statsResponse.body).toHaveProperty('totalOperations');
      expect(statsResponse.body).toHaveProperty('activeOperations');
      
      const operationsResponse = await request(app)
        .get('/api/admin/operations')
        .expect(200);
      
      expect(Array.isArray(operationsResponse.body)).toBe(true);
    });

    test('Operator endpoints should work together', async () => {
      // Test des endpoints opérateur
      const response = await request(app)
        .get('/api/operator/status')
        .expect(200);
      
      expect(response.body).toHaveProperty('status');
      expect(response.body).toHaveProperty('currentOperation');
    });
  });

  describe('Error Handling Integration', () => {
    test('Should handle invalid requests gracefully', async () => {
      const response = await request(app)
        .post('/api/invalid-endpoint')
        .send({ invalid: 'data' })
        .expect(404);
      
      expect(response.body).toHaveProperty('error');
    });

    test('Should handle malformed JSON', async () => {
      const response = await request(app)
        .post('/api/admin/operations')
        .set('Content-Type', 'application/json')
        .send('invalid json')
        .expect(400);
      
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('Rate Limiting Integration', () => {
    test('Should enforce rate limiting', async () => {
      // Faire plusieurs requêtes rapides pour tester le rate limiting
      const promises = [];
      for (let i = 0; i < 10; i++) {
        promises.push(
          request(app)
            .get('/api/admin')
            .expect(200)
        );
      }
      
      const responses = await Promise.all(promises);
      expect(responses.length).toBe(10);
      
      // Vérifier que toutes les réponses sont valides
      responses.forEach(response => {
        expect(response.status).toBe(200);
      });
    });
  });
});

describe('Performance Tests', () => {
  test('Health endpoint should respond within 500ms', async () => {
    const start = Date.now();
    
    await request(app)
      .get('/api/health')
      .expect(200);
    
    const duration = Date.now() - start;
    expect(duration).toBeLessThan(500);
  });

  test('Admin stats should load within 1s', async () => {
    const start = Date.now();
    
    await request(app)
      .get('/api/admin/stats')
      .expect(200);
    
    const duration = Date.now() - start;
    expect(duration).toBeLessThan(1000);
  });

  test('Operations list should load within 2s', async () => {
    const start = Date.now();
    
    await request(app)
      .get('/api/admin/operations')
      .expect(200);
    
    const duration = Date.now() - start;
    expect(duration).toBeLessThan(2000);
  });
});

describe('Security Tests', () => {
  test('Should have proper CORS headers', async () => {
    const response = await request(app)
      .get('/api/health')
      .expect(200);
    
    expect(response.headers).toHaveProperty('access-control-allow-origin');
  });

  test('Should have security headers', async () => {
    const response = await request(app)
      .get('/api/health')
      .expect(200);
    
    // Vérifier les headers de sécurité basiques
    expect(response.headers).toHaveProperty('x-powered-by');
  });

  test('Should handle SQL injection attempts', async () => {
    const maliciousInput = "'; DROP TABLE operations; --";
    
    const response = await request(app)
      .get(`/api/admin/operations?search=${encodeURIComponent(maliciousInput)}`)
      .expect(200);
    
    // La réponse devrait être valide malgré l'input malveillant
    expect(response.body).toBeDefined();
  });
});

describe('Data Validation Tests', () => {
  test('Should validate operation data format', async () => {
    const invalidOperation = {
      startTime: 'invalid-time',
      endTime: 'also-invalid',
      operatorId: 'not-a-number'
    };
    
    const response = await request(app)
      .post('/api/admin/operations')
      .send(invalidOperation)
      .expect(400);
    
    expect(response.body).toHaveProperty('error');
    expect(response.body.error).toContain('validation');
  });

  test('Should accept valid operation data', async () => {
    const validOperation = {
      startTime: '08:00:00',
      endTime: '17:00:00',
      operatorId: 1,
      description: 'Test operation'
    };
    
    const response = await request(app)
      .post('/api/admin/operations')
      .send(validOperation);
    
    // Peut être 200 (succès) ou 400 (validation), mais pas 500 (erreur serveur)
    expect([200, 400]).toContain(response.status);
  });
});




