// Authentication Tests for SLAM25 Application
import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import request from 'supertest';
import express from 'express';
import bcrypt from 'bcrypt';
import { executeQuery } from '../config/database.js';
import authRoutes from '../routes/auth.js';

// Mock database
jest.mock('../config/database.js', () => ({
  executeQuery: jest.fn()
}));

const app = express();
app.use(express.json());
app.use('/auth', authRoutes);

describe('Authentication Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /auth/register', () => {
    it('should register a new user successfully', async () => {
      const userData = testUtils.generateTestUser();
      
      // Mock database responses
      executeQuery
        .mockResolvedValueOnce({ rows: [] }) // No existing user
        .mockResolvedValueOnce({ 
          rows: [{ 
            id: 1, 
            username: userData.username, 
            email: userData.email,
            first_name: userData.firstName,
            last_name: userData.lastName,
            role: 'member'
          }] 
        });

      const response = await request(app)
        .post('/auth/register')
        .send(userData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.user.username).toBe(userData.username);
      expect(executeQuery).toHaveBeenCalledTimes(2);
    });

    it('should reject registration with invalid email', async () => {
      const userData = testUtils.generateTestUser({ email: 'invalid-email' });

      const response = await request(app)
        .post('/auth/register')
        .send(userData)
        .expect(400);

      expect(response.body.error).toBe('Validation failed');
      expect(response.body.details).toBeDefined();
    });

    it('should reject registration with weak password', async () => {
      const userData = testUtils.generateTestUser({ password: '123' });

      const response = await request(app)
        .post('/auth/register')
        .send(userData)
        .expect(400);

      expect(response.body.error).toBe('Validation failed');
    });

    it('should reject registration if user already exists', async () => {
      const userData = testUtils.generateTestUser();
      
      executeQuery.mockResolvedValueOnce({ 
        rows: [{ id: 1 }] // Existing user
      });

      const response = await request(app)
        .post('/auth/register')
        .send(userData)
        .expect(409);

      expect(response.body.error).toBe('User already exists');
    });
  });

  describe('POST /auth/login', () => {
    it('should login with valid credentials', async () => {
      const userData = testUtils.generateTestUser();
      const hashedPassword = await bcrypt.hash(userData.password, 12);
      
      executeQuery
        .mockResolvedValueOnce({
          rows: [{
            id: 1,
            username: userData.username,
            email: userData.email,
            password_hash: hashedPassword,
            role: 'member',
            first_name: userData.firstName,
            last_name: userData.lastName,
            is_active: true
          }]
        })
        .mockResolvedValueOnce({ rows: [{ id: 1 }] }) // Session creation
        .mockResolvedValueOnce({ rows: [] }); // Update last login

      const response = await request(app)
        .post('/auth/login')
        .send({
          email: userData.email,
          password: userData.password
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.accessToken).toBeDefined();
      expect(response.body.refreshToken).toBeDefined();
      expect(response.body.user.email).toBe(userData.email);
    });

    it('should reject login with invalid credentials', async () => {
      executeQuery.mockResolvedValueOnce({ rows: [] }); // No user found

      const response = await request(app)
        .post('/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'wrongpassword'
        })
        .expect(401);

      expect(response.body.error).toBe('Invalid credentials');
    });

    it('should reject login for deactivated account', async () => {
      const userData = testUtils.generateTestUser();
      const hashedPassword = await bcrypt.hash(userData.password, 12);
      
      executeQuery.mockResolvedValueOnce({
        rows: [{
          id: 1,
          username: userData.username,
          email: userData.email,
          password_hash: hashedPassword,
          role: 'member',
          first_name: userData.firstName,
          last_name: userData.lastName,
          is_active: false // Deactivated account
        }]
      });

      const response = await request(app)
        .post('/auth/login')
        .send({
          email: userData.email,
          password: userData.password
        })
        .expect(401);

      expect(response.body.error).toBe('Account deactivated');
    });
  });

  describe('POST /auth/refresh', () => {
    it('should refresh token with valid refresh token', async () => {
      const refreshToken = testUtils.generateTestToken();
      
      executeQuery.mockResolvedValueOnce({
        rows: [{ id: 1, user_id: 1, expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000) }]
      });

      const response = await request(app)
        .post('/auth/refresh')
        .send({ refreshToken })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.accessToken).toBeDefined();
    });

    it('should reject refresh with invalid token', async () => {
      executeQuery.mockResolvedValueOnce({ rows: [] }); // No valid session

      const response = await request(app)
        .post('/auth/refresh')
        .send({ refreshToken: 'invalid-token' })
        .expect(401);

      expect(response.body.error).toBe('Invalid refresh token');
    });
  });

  describe('POST /auth/logout', () => {
    it('should logout successfully', async () => {
      executeQuery.mockResolvedValueOnce({ rows: [] }); // Session deletion

      const response = await request(app)
        .post('/auth/logout')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Logged out successfully');
    });
  });

  describe('GET /auth/me', () => {
    it('should return current user with valid token', async () => {
      const token = testUtils.generateTestToken();
      
      executeQuery.mockResolvedValueOnce({
        rows: [{
          id: 1,
          username: 'testuser',
          email: 'test@example.com',
          first_name: 'Test',
          last_name: 'User',
          role: 'member',
          pronouns: 'they/them',
          created_at: new Date(),
          last_login: new Date()
        }]
      });

      const response = await request(app)
        .get('/auth/me')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.user.username).toBe('testuser');
    });

    it('should reject request without token', async () => {
      const response = await request(app)
        .get('/auth/me')
        .expect(401);

      expect(response.body.error).toBe('Access token required');
    });
  });
});

