// Test setup for SLAM25 Application
import { jest } from '@jest/globals';

// Mock environment variables
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test_jwt_secret_key';
process.env.DB_NAME = 'slam25_test_db';
process.env.DB_USER = 'test_user';
process.env.DB_PASSWORD = 'test_password';
process.env.DB_HOST = 'localhost';
process.env.DB_PORT = '5432';

// Global test timeout
jest.setTimeout(10000);

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

// Clean up after each test
afterEach(() => {
  jest.clearAllMocks();
});

// Global test utilities
global.testUtils = {
  // Generate test user data
  generateTestUser: (overrides = {}) => ({
    username: 'testuser',
    email: 'test@example.com',
    password: 'TestPassword123',
    firstName: 'Test',
    lastName: 'User',
    pronouns: 'they/them',
    ...overrides
  }),

  // Generate test participant data
  generateTestParticipant: (overrides = {}) => ({
    name: 'Test Participant',
    role: 'Teilnehmer',
    region: 'Berlin',
    pronouns: 'they/them',
    instagram: '@testparticipant',
    ...overrides
  }),

  // Generate test round data
  generateTestRound: (overrides = {}) => ({
    title: 'Test Round',
    startDateTime: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
    endDateTime: new Date(Date.now() + 25 * 60 * 60 * 1000), // Tomorrow + 1 hour
    location: 'Test Location',
    address: 'Test Address 123',
    description: 'Test round description',
    competitionType: 'Einzelwettbewerb',
    status: 'SCHEDULED',
    ...overrides
  }),

  // Generate test news data
  generateTestNews: (overrides = {}) => ({
    title: 'Test News',
    content: 'Test news content',
    category: 'announcement',
    priority: 'NORMAL',
    status: 'DRAFT',
    ...overrides
  }),

  // Wait for async operations
  waitFor: (ms) => new Promise(resolve => setTimeout(resolve, ms)),

  // Generate JWT token for testing
  generateTestToken: async (payload = {}) => {
    const jwt = await import('jsonwebtoken');
    return jwt.default.sign({
      userId: 1,
      username: 'testuser',
      email: 'test@example.com',
      role: 'admin',
      ...payload
    }, process.env.JWT_SECRET, { expiresIn: '1h' });
  }
};

