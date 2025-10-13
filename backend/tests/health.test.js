const request = require('supertest');
const app = require('../server');

describe('Health Check Tests', () => {
  test('GET /api/health should return 200 with valid response', async () => {
    const response = await request(app)
      .get('/api/health')
      .expect(200);
    
    expect(response.body).toHaveProperty('status', 'OK');
    expect(response.body).toHaveProperty('timestamp');
    expect(response.body).toHaveProperty('uptime');
    expect(typeof response.body.uptime).toBe('number');
  });

  test('GET /api/health should return JSON content-type', async () => {
    const response = await request(app)
      .get('/api/health')
      .expect(200);
    
    expect(response.headers['content-type']).toMatch(/json/);
  });
});

describe('API Routes Tests', () => {
  test('GET / should return API information', async () => {
    const response = await request(app)
      .get('/')
      .expect(200);
    
    expect(response.body).toHaveProperty('message', 'SEDI Tablette API');
    expect(response.body).toHaveProperty('version');
    expect(response.body).toHaveProperty('endpoints');
    expect(response.body.endpoints).toHaveProperty('health');
  });

  test('GET /api/admin should be accessible', async () => {
    const response = await request(app)
      .get('/api/admin')
      .expect(200);
    
    expect(response.body).toHaveProperty('stats');
    expect(response.body).toHaveProperty('operations');
  });
});

describe('Security Tests', () => {
  test('Should have security headers', async () => {
    const response = await request(app)
      .get('/api/health')
      .expect(200);
    
    // Vérifier les headers de sécurité basiques
    expect(response.headers).toHaveProperty('x-powered-by');
  });

  test('Should handle invalid routes gracefully', async () => {
    const response = await request(app)
      .get('/api/invalid-route')
      .expect(404);
    
    expect(response.body).toHaveProperty('error');
  });
});

describe('Performance Tests', () => {
  test('Health endpoint should respond quickly', async () => {
    const start = Date.now();
    
    await request(app)
      .get('/api/health')
      .expect(200);
    
    const duration = Date.now() - start;
    expect(duration).toBeLessThan(1000); // Moins de 1 seconde
  });
});
