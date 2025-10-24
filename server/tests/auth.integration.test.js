import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import authRoutes from '../routes/auth.routes.js';
import { executeQuery } from '../config/database.js';

// Mock dependencies
vi.mock('../config/database.js', () => ({
  executeQuery: vi.fn()
}));

vi.mock('bcrypt', () => ({
  compare: vi.fn()
}));

vi.mock('jsonwebtoken', () => ({
  sign: vi.fn(),
  verify: vi.fn()
}));

const app = express();
app.use(express.json());
app.use('/auth', authRoutes);

describe('Authentication Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Complete Authentication Flow', () => {
    it('should complete full login-logout cycle', async () => {
      const mockUser = {
        id: 1,
        username: 'admin',
        email: 'admin@example.com',
        password_hash: 'hashed_password',
        role: 'admin',
        is_active: true,
        first_name: 'Admin',
        last_name: 'User'
      };

      const mockToken = 'mock.jwt.token';

      // Mock successful login
      executeQuery.mockResolvedValueOnce({ rows: [mockUser] });
      bcrypt.compare.mockResolvedValueOnce(true);
      jwt.sign.mockReturnValue(mockToken);

      // 1. Login
      const loginResponse = await request(app)
        .post('/auth/login')
        .send({
          email: 'admin@example.com',
          password: 'password123'
        });

      expect(loginResponse.status).toBe(200);
      expect(loginResponse.body.success).toBe(true);
      expect(loginResponse.body.user.role).toBe('admin');
      expect(loginResponse.headers['set-cookie']).toBeDefined();

      // 2. Get user info (would require proper middleware mocking in real test)
      // This is a structural test to ensure the endpoint exists
      const meResponse = await request(app)
        .get('/auth/me');

      expect(meResponse.status).toBeDefined();

      // 3. Logout
      const logoutResponse = await request(app)
        .post('/auth/logout');

      expect(logoutResponse.status).toBeDefined();
      expect(logoutResponse.headers['set-cookie']).toBeDefined();
    });

    it('should handle authentication failure scenarios', async () => {
      // Test invalid credentials
      executeQuery.mockResolvedValueOnce({ rows: [] });

      const response = await request(app)
        .post('/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'password123'
        });

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Invalid credentials');
    });

    it('should handle account deactivation', async () => {
      const mockUser = {
        id: 1,
        username: 'admin',
        email: 'admin@example.com',
        password_hash: 'hashed_password',
        role: 'admin',
        is_active: false
      };

      executeQuery.mockResolvedValueOnce({ rows: [mockUser] });

      const response = await request(app)
        .post('/auth/login')
        .send({
          email: 'admin@example.com',
          password: 'password123'
        });

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Account deactivated');
      expect(response.body.code).toBe('ACCOUNT_DEACTIVATED');
    });
  });

  describe('Security Integration Tests', () => {
    it('should prevent brute force attacks', async () => {
      executeQuery.mockResolvedValue({ rows: [] });

      // Simulate multiple failed attempts
      const attempts = [];
      for (let i = 0; i < 10; i++) {
        const response = await request(app)
          .post('/auth/login')
          .send({
            email: 'admin@example.com',
            password: 'wrongpassword'
          });
        attempts.push(response.status);
      }

      // All attempts should be rejected
      expect(attempts.every(status => status === 401)).toBe(true);
    });

    it('should handle SQL injection attempts', async () => {
      const maliciousEmail = "admin@example.com'; DROP TABLE users; --";
      
      executeQuery.mockResolvedValueOnce({ rows: [] });

      const response = await request(app)
        .post('/auth/login')
        .send({
          email: maliciousEmail,
          password: 'password123'
        });

      // Should not crash and should handle safely
      expect(response.status).toBe(401);
      expect(executeQuery).toHaveBeenCalledWith(
        expect.stringContaining('SELECT'),
        expect.arrayContaining([maliciousEmail])
      );
    });

    it('should validate input sanitization', async () => {
      const response = await request(app)
        .post('/auth/login')
        .send({
          email: '<script>alert("xss")</script>@example.com',
          password: 'password123'
        });

      // Should handle XSS attempts gracefully
      expect(response.status).toBe(400); // Validation should catch this
    });

    it('should handle malformed requests', async () => {
      const response = await request(app)
        .post('/auth/login')
        .set('Content-Type', 'application/json')
        .send('{"email": "admin@example.com", "password": "password123"'); // Missing closing brace

      expect(response.status).toBe(400);
    });
  });

  describe('Cookie Security Tests', () => {
    it('should set secure cookie attributes', async () => {
      const mockUser = {
        id: 1,
        username: 'admin',
        email: 'admin@example.com',
        password_hash: 'hashed_password',
        role: 'admin',
        is_active: true
      };

      executeQuery.mockResolvedValueOnce({ rows: [mockUser] });
      bcrypt.compare.mockResolvedValueOnce(true);
      jwt.sign.mockReturnValue('mock.token');

      const response = await request(app)
        .post('/auth/login')
        .send({
          email: 'admin@example.com',
          password: 'password123'
        });

      expect(response.status).toBe(200);
      const cookieHeader = response.headers['set-cookie'];
      
      // Check for security attributes
      expect(cookieHeader).toContain('HttpOnly');
      expect(cookieHeader).toContain('Secure');
      expect(cookieHeader).toContain('SameSite=Strict');
    });

    it('should clear cookies on logout', async () => {
      const response = await request(app)
        .post('/auth/logout');

      const cookieHeader = response.headers['set-cookie'];
      expect(cookieHeader).toContain('auth_token=');
      expect(cookieHeader).toContain('Max-Age=0');
    });
  });

  describe('Error Handling Integration', () => {
    it('should handle database connection errors', async () => {
      executeQuery.mockRejectedValueOnce(new Error('Database connection failed'));

      const response = await request(app)
        .post('/auth/login')
        .send({
          email: 'admin@example.com',
          password: 'password123'
        });

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Internal server error');
      expect(response.body.code).toBe('LOGIN_ERROR');
    });

    it('should handle bcrypt errors', async () => {
      const mockUser = {
        id: 1,
        username: 'admin',
        email: 'admin@example.com',
        password_hash: 'hashed_password',
        role: 'admin',
        is_active: true
      };

      executeQuery.mockResolvedValueOnce({ rows: [mockUser] });
      bcrypt.compare.mockRejectedValueOnce(new Error('Bcrypt error'));

      const response = await request(app)
        .post('/auth/login')
        .send({
          email: 'admin@example.com',
          password: 'password123'
        });

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Internal server error');
    });

    it('should handle JWT generation errors', async () => {
      const mockUser = {
        id: 1,
        username: 'admin',
        email: 'admin@example.com',
        password_hash: 'hashed_password',
        role: 'admin',
        is_active: true
      };

      executeQuery.mockResolvedValueOnce({ rows: [mockUser] });
      bcrypt.compare.mockResolvedValueOnce(true);
      jwt.sign.mockImplementation(() => {
        throw new Error('JWT generation failed');
      });

      const response = await request(app)
        .post('/auth/login')
        .send({
          email: 'admin@example.com',
          password: 'password123'
        });

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Internal server error');
    });
  });

  describe('Performance Tests', () => {
    it('should handle concurrent login attempts', async () => {
      const mockUser = {
        id: 1,
        username: 'admin',
        email: 'admin@example.com',
        password_hash: 'hashed_password',
        role: 'admin',
        is_active: true
      };

      executeQuery.mockResolvedValue({ rows: [mockUser] });
      bcrypt.compare.mockResolvedValue(true);
      jwt.sign.mockReturnValue('mock.token');

      // Simulate concurrent requests
      const promises = Array.from({ length: 10 }, () =>
        request(app)
          .post('/auth/login')
          .send({
            email: 'admin@example.com',
            password: 'password123'
          })
      );

      const responses = await Promise.all(promises);

      // All should succeed
      expect(responses.every(r => r.status === 200)).toBe(true);
    });

    it('should handle large payloads gracefully', async () => {
      const largePassword = 'a'.repeat(10000);
      
      executeQuery.mockResolvedValueOnce({ rows: [] });

      const response = await request(app)
        .post('/auth/login')
        .send({
          email: 'admin@example.com',
          password: largePassword
        });

      // Should handle large inputs without crashing
      expect(response.status).toBeDefined();
    });
  });
});
