import { describe, it, expect, beforeEach, vi } from 'vitest';
import errorReportingService from './errorReportingService.js';

// Mock window and localStorage for Node.js environment
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};

// Mock window object
Object.defineProperty(global, 'window', {
  value: {
    location: { href: process.env.VITE_TEST_URL || 'http://localhost:3000' },
    navigator: { userAgent: 'test-agent' },
    localStorage: localStorageMock,
  },
  writable: true,
});

describe('ErrorReportingService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    errorReportingService.clearErrors();
    localStorageMock.getItem.mockReturnValue('[]');
  });

  it('should log error with context', () => {
    const error = new Error('Test error');
    const result = errorReportingService.logError(error, null, 'TestContext');

    expect(result).toHaveProperty('shouldRetry');
    expect(result).toHaveProperty('attempt');
    expect(localStorageMock.setItem).toHaveBeenCalled();
  });

  it('should categorize errors correctly', () => {
    const networkError = new Error('Network request failed');
    const databaseError = new Error('Database connection failed');
    const validationError = new Error('Validation failed');

    const networkResult = errorReportingService.logError(networkError, null, 'Test');
    const databaseResult = errorReportingService.logError(databaseError, null, 'Test');
    const validationResult = errorReportingService.logError(validationError, null, 'Test');

    expect(networkResult).toBeDefined();
    expect(databaseResult).toBeDefined();
    expect(validationResult).toBeDefined();
  });

  it('should suppress duplicate errors', () => {
    const error = new Error('Duplicate test error');
    
    const result1 = errorReportingService.logError(error, null, 'Test');
    const result2 = errorReportingService.logError(error, null, 'Test');

    expect(result1.suppressed).toBeFalsy();
    expect(result2.suppressed).toBeTruthy();
  });

  it('should clear errors', () => {
    const error = new Error('Test error');
    errorReportingService.logError(error, null, 'Test');
    
    errorReportingService.clearErrors();
    
    const stats = errorReportingService.getErrorStats();
    expect(stats.totalErrors).toBe(0);
  });

  it('should get error statistics', () => {
    const error = new Error('Test error');
    errorReportingService.logError(error, null, 'Test');
    
    const stats = errorReportingService.getErrorStats();
    expect(stats).toHaveProperty('counts');
    expect(stats).toHaveProperty('history');
    expect(stats).toHaveProperty('totalErrors');
  });
});
