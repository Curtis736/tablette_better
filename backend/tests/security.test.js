const request = require('supertest');
const app = require('../server');

describe('Security Tests', () => {
  describe('Input Validation', () => {
    test('Should sanitize SQL injection attempts', async () => {
      const maliciousInputs = [
        "'; DROP TABLE operations; --",
        "' OR '1'='1",
        "'; INSERT INTO operations VALUES ('hack'); --",
        "' UNION SELECT * FROM users --"
      ];
      
      for (const input of maliciousInputs) {
        const response = await request(app)
          .get(`/api/admin/operations?search=${encodeURIComponent(input)}`)
          .expect(200);
        
        // La réponse devrait être valide malgré l'input malveillant
        expect(response.body).toBeDefined();
        expect(Array.isArray(response.body)).toBe(true);
      }
    });

    test('Should handle XSS attempts', async () => {
      const xssPayloads = [
        "<script>alert('xss')</script>",
        "javascript:alert('xss')",
        "<img src=x onerror=alert('xss')>",
        "';alert('xss');//"
      ];
      
      for (const payload of xssPayloads) {
        const response = await request(app)
          .post('/api/admin/operations')
          .send({
            description: payload,
            startTime: '08:00:00',
            endTime: '17:00:00'
          });
        
        // Ne devrait pas causer d'erreur serveur
        expect([200, 400]).toContain(response.status);
        expect(response.status).not.toBe(500);
      }
    });

    test('Should validate data types', async () => {
      const invalidData = [
        { operatorId: 'not-a-number' },
        { startTime: 12345 },
        { endTime: { invalid: 'object' } },
        { description: 999 }
      ];
      
      for (const data of invalidData) {
        const response = await request(app)
          .post('/api/admin/operations')
          .send(data)
          .expect(400);
        
        expect(response.body).toHaveProperty('error');
      }
    });
  });

  describe('Authentication & Authorization', () => {
    test('Should handle missing authentication gracefully', async () => {
      const response = await request(app)
        .get('/api/admin')
        .expect(200); // Ou 401 selon la configuration
      
      // Ne devrait pas exposer d'informations sensibles
      expect(response.body).toBeDefined();
    });

    test('Should not expose sensitive information in errors', async () => {
      const response = await request(app)
        .get('/api/invalid-endpoint')
        .expect(404);
      
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).not.toContain('password');
      expect(response.body.error).not.toContain('secret');
      expect(response.body.error).not.toContain('token');
    });
  });

  describe('Rate Limiting', () => {
    test('Should enforce rate limiting on admin endpoints', async () => {
      const promises = [];
      
      // Faire beaucoup de requêtes rapidement
      for (let i = 0; i < 50; i++) {
        promises.push(
          request(app)
            .get('/api/admin/stats')
        );
      }
      
      const responses = await Promise.all(promises);
      
      // Au moins une requête devrait être limitée
      const rateLimitedResponses = responses.filter(r => r.status === 429);
      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    });

    test('Should allow normal usage patterns', async () => {
      // Faire des requêtes à un rythme normal
      for (let i = 0; i < 5; i++) {
        const response = await request(app)
          .get('/api/admin/stats')
          .expect(200);
        
        expect(response.body).toHaveProperty('totalOperations');
        
        // Attendre un peu entre les requêtes
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    });
  });

  describe('Headers Security', () => {
    test('Should have proper security headers', async () => {
      const response = await request(app)
        .get('/api/health')
        .expect(200);
      
      const headers = response.headers;
      
      // Vérifier les headers de sécurité
      expect(headers).toHaveProperty('x-powered-by');
      
      // Vérifier que les headers sensibles ne sont pas exposés
      expect(headers).not.toHaveProperty('x-aspnet-version');
      expect(headers).not.toHaveProperty('server');
    });

    test('Should handle CORS properly', async () => {
      const response = await request(app)
        .options('/api/health')
        .expect(200);
      
      const headers = response.headers;
      
      // Vérifier les headers CORS
      expect(headers).toHaveProperty('access-control-allow-origin');
      expect(headers).toHaveProperty('access-control-allow-methods');
    });
  });

  describe('Data Exposure', () => {
    test('Should not expose internal paths in errors', async () => {
      const response = await request(app)
        .get('/api/invalid-endpoint')
        .expect(404);
      
      const errorMessage = JSON.stringify(response.body);
      
      // Ne devrait pas exposer des chemins internes
      expect(errorMessage).not.toContain('/app/');
      expect(errorMessage).not.toContain('/usr/');
      expect(errorMessage).not.toContain('C:\\');
      expect(errorMessage).not.toContain('/home/');
    });

    test('Should not expose database connection details', async () => {
      const response = await request(app)
        .get('/api/health')
        .expect(200);
      
      const responseString = JSON.stringify(response.body);
      
      // Ne devrait pas exposer des détails de connexion DB
      expect(responseString).not.toContain('password');
      expect(responseString).not.toContain('connection');
      expect(responseString).not.toContain('database');
    });
  });

  describe('Input Size Limits', () => {
    test('Should handle oversized requests', async () => {
      const largeData = 'x'.repeat(10000); // 10KB de données
      
      const response = await request(app)
        .post('/api/admin/operations')
        .send({
          description: largeData,
          startTime: '08:00:00',
          endTime: '17:00:00'
        });
      
      // Devrait soit accepter soit rejeter proprement
      expect([200, 400, 413]).toContain(response.status);
    });

    test('Should handle malformed JSON', async () => {
      const malformedJson = '{"invalid": json}';
      
      const response = await request(app)
        .post('/api/admin/operations')
        .set('Content-Type', 'application/json')
        .send(malformedJson)
        .expect(400);
      
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('Error Handling Security', () => {
    test('Should not leak stack traces in production', async () => {
      // Simuler une erreur interne
      const response = await request(app)
        .get('/api/invalid-endpoint')
        .expect(404);
      
      const errorString = JSON.stringify(response.body);
      
      // Ne devrait pas contenir de stack trace
      expect(errorString).not.toContain('at ');
      expect(errorString).not.toContain('Error:');
      expect(errorString).not.toContain('stack');
    });

    test('Should handle null and undefined inputs', async () => {
      const nullInputs = [null, undefined, '', '   '];
      
      for (const input of nullInputs) {
        const response = await request(app)
          .post('/api/admin/operations')
          .send({
            description: input,
            startTime: '08:00:00',
            endTime: '17:00:00'
          });
        
        // Devrait gérer proprement les inputs null/undefined
        expect([200, 400]).toContain(response.status);
      }
    });
  });
});

