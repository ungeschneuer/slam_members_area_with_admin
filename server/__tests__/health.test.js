import request from 'supertest';
import app from './server.js';

describe('GET /health', () => {
  it('responds with OK status and expected shape', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body).toBeDefined();
    expect(res.body.status).toBe('OK');
    expect(typeof res.body.timestamp).toBe('string');
    expect(typeof res.body.uptime).toBe('number');
    expect(typeof res.body.environment).toBe('string');
  });
});


