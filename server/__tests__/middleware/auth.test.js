import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import jwt from 'jsonwebtoken';
import { authenticate, adminMiddleware, generateToken } from './simpleAuth.js';

// Mock JWT
vi.mock('jsonwebtoken', () => ({
  verify: vi.fn(),
  sign: vi.fn()
}));

describe('Authentication Middleware', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('generateToken', () => {
    it('should generate a valid JWT token', () => {
      const mockToken = 'mock.jwt.token';
      jwt.sign.mockReturnValue(mockToken);

      const payload = {
        userId: 1,
        username: 'admin',
        email: 'admin@example.com',
        role: 'admin'
      };

      const token = generateToken(payload);

      expect(jwt.sign).toHaveBeenCalledWith(
        payload,
        process.env.JWT_SECRET,
        expect.objectContaining({
          expiresIn: expect.any(String)
        })
      );
      expect(token).toBe(mockToken);
    });

    it('should include required fields in token payload', () => {
      const mockToken = 'mock.jwt.token';
      jwt.sign.mockReturnValue(mockToken);

      const payload = {
        userId: 1,
        username: 'admin',
        email: 'admin@example.com',
        role: 'admin'
      };

      generateToken(payload);

      expect(jwt.sign).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 1,
          username: 'admin',
          email: 'admin@example.com',
          role: 'admin'
        }),
        process.env.JWT_SECRET,
        expect.any(Object)
      );
    });
  });

  describe('authenticate middleware', () => {
    let req, res, next;

    beforeEach(() => {
      req = {
        cookies: {},
        headers: {}
      };
      res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn()
      };
      next = vi.fn();
    });

    it('should authenticate with valid token', () => {
      const mockUser = {
        id: 1,
        username: 'admin',
        email: 'admin@example.com',
        role: 'admin'
      };

      req.cookies.auth_token = 'valid.token.here';
      jwt.verify.mockReturnValue(mockUser);

      authenticate(req, res, next);

      expect(jwt.verify).toHaveBeenCalledWith('valid.token.here', process.env.JWT_SECRET);
      expect(req.user).toEqual(mockUser);
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should reject request without token', () => {
      authenticate(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Authentication required',
        code: 'NO_TOKEN'
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should reject request with invalid token', () => {
      req.cookies.auth_token = 'invalid.token';
      jwt.verify.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      authenticate(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Invalid token',
        code: 'INVALID_TOKEN'
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should reject request with expired token', () => {
      req.cookies.auth_token = 'expired.token';
      jwt.verify.mockImplementation(() => {
        const error = new Error('Token expired');
        error.name = 'TokenExpiredError';
        throw error;
      });

      authenticate(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Token expired',
        code: 'TOKEN_EXPIRED'
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should handle malformed token', () => {
      req.cookies.auth_token = 'malformed.token';
      jwt.verify.mockImplementation(() => {
        const error = new Error('Malformed token');
        error.name = 'JsonWebTokenError';
        throw error;
      });

      authenticate(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Invalid token',
        code: 'INVALID_TOKEN'
      });
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('adminMiddleware', () => {
    let req, res, next;

    beforeEach(() => {
      req = {
        user: null
      };
      res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn()
      };
      next = vi.fn();
    });

    it('should allow admin users', () => {
      req.user = {
        id: 1,
        username: 'admin',
        email: 'admin@example.com',
        role: 'admin'
      };

      const middleware = adminMiddleware();
      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should allow organizer users', () => {
      req.user = {
        id: 2,
        username: 'organizer',
        email: 'organizer@example.com',
        role: 'organizer'
      };

      const middleware = adminMiddleware();
      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should reject non-admin users', () => {
      req.user = {
        id: 3,
        username: 'user',
        email: 'user@example.com',
        role: 'user'
      };

      const middleware = adminMiddleware();
      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Admin access required',
        code: 'INSUFFICIENT_PERMISSIONS'
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should reject requests without user', () => {
      const middleware = adminMiddleware();
      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Authentication required',
        code: 'NO_TOKEN'
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should handle multiple roles in adminMiddleware', () => {
      req.user = {
        id: 1,
        username: 'admin',
        email: 'admin@example.com',
        role: 'admin'
      };

      // Test that adminMiddleware returns an array of middleware functions
      const middleware = adminMiddleware();
      expect(Array.isArray(middleware)).toBe(true);
      expect(middleware.length).toBe(1);

      // Execute the middleware
      middleware[0](req, res, next);
      expect(next).toHaveBeenCalled();
    });
  });

  describe('Security Tests', () => {
    let req, res, next;

    beforeEach(() => {
      req = {
        cookies: {},
        headers: {}
      };
      res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn()
      };
      next = vi.fn();
    });

    it('should not expose sensitive information in error messages', () => {
      req.cookies.auth_token = 'invalid.token';
      jwt.verify.mockImplementation(() => {
        throw new Error('JWT_SECRET is undefined');
      });

      authenticate(req, res, next);

      expect(res.json).toHaveBeenCalledWith({
        error: 'Invalid token',
        code: 'INVALID_TOKEN'
      });
      expect(res.json).not.toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.stringContaining('JWT_SECRET')
        })
      );
    });

    it('should handle missing JWT_SECRET gracefully', () => {
      const originalSecret = process.env.JWT_SECRET;
      delete process.env.JWT_SECRET;

      req.cookies.auth_token = 'some.token';
      jwt.verify.mockImplementation(() => {
        throw new Error('JWT_SECRET is undefined');
      });

      authenticate(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Invalid token',
        code: 'INVALID_TOKEN'
      });

      // Restore original secret
      process.env.JWT_SECRET = originalSecret;
    });

    it('should validate token structure', () => {
      req.cookies.auth_token = 'not.a.valid.jwt';
      jwt.verify.mockImplementation(() => {
        throw new Error('Invalid token format');
      });

      authenticate(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Invalid token',
        code: 'INVALID_TOKEN'
      });
    });
  });

  describe('Edge Cases', () => {
    let req, res, next;

    beforeEach(() => {
      req = {
        cookies: {},
        headers: {}
      };
      res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn()
      };
      next = vi.fn();
    });

    it('should handle empty token', () => {
      req.cookies.auth_token = '';

      authenticate(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Authentication required',
        code: 'NO_TOKEN'
      });
    });

    it('should handle null token', () => {
      req.cookies.auth_token = null;

      authenticate(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Authentication required',
        code: 'NO_TOKEN'
      });
    });

    it('should handle undefined token', () => {
      delete req.cookies.auth_token;

      authenticate(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Authentication required',
        code: 'NO_TOKEN'
      });
    });

    it('should handle token with missing required fields', () => {
      req.cookies.auth_token = 'valid.token';
      jwt.verify.mockReturnValue({
        id: 1
        // Missing username, email, role
      });

      authenticate(req, res, next);

      // Should still work if basic structure is valid
      expect(next).toHaveBeenCalled();
      expect(req.user).toEqual({
        id: 1
      });
    });
  });
});
