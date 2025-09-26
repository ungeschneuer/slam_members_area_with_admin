// Integration Tests for SLAM25 Application
import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from '@jest/globals';
import request from 'supertest';
import app from '../server.js';
import { executeQuery } from '../config/database.js';
import logger from '../config/logger.js';

describe('SLAM25 Integration Tests', () => {
  beforeAll(async () => {
    // Setup test environment
    logger.info('Starting integration tests');
  });

  afterAll(async () => {
    // Cleanup
    logger.info('Integration tests completed');
  });

  describe('Health Check', () => {
    it('should return health status', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body).toHaveProperty('status');
      expect(response.body).toHaveProperty('timestamp');
    });
  });

  describe('Security Middleware', () => {
    it('should sanitize XSS input', async () => {
      const maliciousInput = '<script>alert("XSS")</script>';
      
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: maliciousInput,
          password: 'test123'
        })
        .expect(400);

      // Should not contain script tags in response
      expect(JSON.stringify(response.body)).not.toContain('<script>');
    });

    it('should handle rate limiting', async () => {
      const requests = [];
      
      // Make multiple requests quickly
      for (let i = 0; i < 10; i++) {
        requests.push(
          request(app)
            .get('/api/participants')
        );
      }
      
      const responses = await Promise.all(requests);
      
      // At least one should be rate limited
      const rateLimited = responses.some(res => res.status === 429);
      expect(rateLimited).toBe(true);
    });
  });

  describe('Database Integration', () => {
    it('should connect to database', async () => {
      try {
        const result = await executeQuery('SELECT NOW()');
        expect(result.rows).toHaveLength(1);
        expect(result.rows[0].now).toBeDefined();
      } catch (error) {
        fail('Database connection failed: ' + error.message);
      }
    });

    it('should handle database errors gracefully', async () => {
      try {
        await executeQuery('SELECT * FROM non_existent_table');
        fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeDefined();
        expect(error.message).toContain('relation "non_existent_table" does not exist');
      }
    });
  });

  describe('Authentication Flow', () => {
    it('should validate login input', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'invalid-email',
          password: '123'
        })
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body).toHaveProperty('details');
    });

    it('should require authentication for protected routes', async () => {
      const response = await request(app)
        .get('/api/participants')
        .expect(401);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('Error Handling', () => {
    it('should handle 404 errors', async () => {
      const response = await request(app)
        .get('/api/non-existent-endpoint')
        .expect(404);

      expect(response.body).toHaveProperty('error');
    });

    it('should handle malformed JSON', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .set('Content-Type', 'application/json')
        .send('{"invalid": json}')
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('Security Headers', () => {
    it('should include security headers', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.headers).toHaveProperty('x-content-type-options');
      expect(response.headers).toHaveProperty('x-frame-options');
      expect(response.headers).toHaveProperty('x-xss-protection');
    });
  });

  describe('CORS Configuration', () => {
    it('should handle CORS preflight', async () => {
      const response = await request(app)
        .options('/api/participants')
        .set('Origin', 'http://localhost:5173')
        .set('Access-Control-Request-Method', 'GET')
        .expect(204);

      expect(response.headers).toHaveProperty('access-control-allow-origin');
    });
  });

  describe('Logging Integration', () => {
    it('should log requests', async () => {
      const originalLog = logger.info;
      let logCalled = false;
      
      logger.info = jest.fn(() => {
        logCalled = true;
      });

      await request(app)
        .get('/health')
        .expect(200);

      // Restore original logger
      logger.info = originalLog;
      
      expect(logCalled).toBe(true);
    });
  });
});

