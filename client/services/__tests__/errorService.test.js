/**
 * ErrorService Unit Tests
 * 
 * Tests for centralized error handling service
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ErrorService } from '../errorService.js';

describe('ErrorService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('handleError', () => {
    it('should handle validation errors correctly', () => {
      const error = new Error('Validation failed');
      error.name = 'ZodError';
      error.issues = [
        { message: 'Name ist erforderlich' },
        { message: 'Email ist ungültig' }
      ];

      const result = ErrorService.handleError(error, { context: 'form_validation' });

      expect(result.type).toBe(ErrorService.ERROR_TYPES.VALIDATION);
      expect(result.message).toBe('Name ist erforderlich, Email ist ungültig');
      expect(result.canRetry).toBe(false);
      expect(result.context).toEqual({ context: 'form_validation' });
    });

    it('should handle network errors correctly', () => {
      const error = new Error('fetch failed');
      error.name = 'NetworkError';

      const result = ErrorService.handleError(error);

      expect(result.type).toBe(ErrorService.ERROR_TYPES.NETWORK);
      expect(result.message).toBe('Netzwerkfehler. Bitte überprüfen Sie Ihre Internetverbindung');
      expect(result.canRetry).toBe(true);
    });

    it('should handle server errors correctly', () => {
      const error = new Error('Server error');
      error.response = { status: 500 };

      const result = ErrorService.handleError(error);

      expect(result.type).toBe(ErrorService.ERROR_TYPES.SERVER);
      expect(result.message).toBe('Serverfehler. Bitte versuchen Sie es später erneut');
      expect(result.canRetry).toBe(true);
    });

    it('should handle unauthorized errors correctly', () => {
      const error = new Error('Unauthorized');
      error.response = { status: 401 };

      const result = ErrorService.handleError(error);

      expect(result.type).toBe(ErrorService.ERROR_TYPES.UNAUTHORIZED);
      expect(result.message).toBe('Sie sind nicht berechtigt, diese Aktion auszuführen');
      expect(result.canRetry).toBe(false);
    });

    it('should handle forbidden errors correctly', () => {
      const error = new Error('Forbidden');
      error.response = { status: 403 };

      const result = ErrorService.handleError(error);

      expect(result.type).toBe(ErrorService.ERROR_TYPES.FORBIDDEN);
      expect(result.message).toBe('Zugriff verweigert');
      expect(result.canRetry).toBe(false);
    });

    it('should handle not found errors correctly', () => {
      const error = new Error('Not found');
      error.response = { status: 404 };

      const result = ErrorService.handleError(error);

      expect(result.type).toBe(ErrorService.ERROR_TYPES.NOT_FOUND);
      expect(result.message).toBe('Die angeforderte Ressource wurde nicht gefunden');
      expect(result.canRetry).toBe(false);
    });

    it('should handle timeout errors correctly', () => {
      const error = new Error('Request timeout');
      error.name = 'TimeoutError';

      const result = ErrorService.handleError(error);

      expect(result.type).toBe(ErrorService.ERROR_TYPES.TIMEOUT);
      expect(result.message).toBe('Die Anfrage dauerte zu lange. Bitte versuchen Sie es erneut');
      expect(result.canRetry).toBe(true);
    });

    it('should handle unknown errors correctly', () => {
      const error = new Error('Unknown error');

      const result = ErrorService.handleError(error);

      expect(result.type).toBe(ErrorService.ERROR_TYPES.UNKNOWN);
      expect(result.message).toBe('Ein unbekannter Fehler ist aufgetreten');
      expect(result.canRetry).toBe(false);
    });
  });

  describe('classifyError', () => {
    it('should classify network errors', () => {
      const error = new Error('fetch failed');
      error.name = 'NetworkError';

      const result = ErrorService.classifyError(error);
      expect(result).toBe(ErrorService.ERROR_TYPES.NETWORK);
    });

    it('should classify timeout errors', () => {
      const error = new Error('timeout');
      error.name = 'TimeoutError';

      const result = ErrorService.classifyError(error);
      expect(result).toBe(ErrorService.ERROR_TYPES.TIMEOUT);
    });

    it('should classify validation errors', () => {
      const error = new Error('validation failed');
      error.name = 'ZodError';

      const result = ErrorService.classifyError(error);
      expect(result).toBe(ErrorService.ERROR_TYPES.VALIDATION);
    });

    it('should classify HTTP status codes', () => {
      const testCases = [
        { status: 400, expected: ErrorService.ERROR_TYPES.VALIDATION },
        { status: 401, expected: ErrorService.ERROR_TYPES.UNAUTHORIZED },
        { status: 403, expected: ErrorService.ERROR_TYPES.FORBIDDEN },
        { status: 404, expected: ErrorService.ERROR_TYPES.NOT_FOUND },
        { status: 500, expected: ErrorService.ERROR_TYPES.SERVER },
        { status: 502, expected: ErrorService.ERROR_TYPES.SERVER },
        { status: 503, expected: ErrorService.ERROR_TYPES.SERVER },
        { status: 504, expected: ErrorService.ERROR_TYPES.SERVER }
      ];

      testCases.forEach(({ status, expected }) => {
        const error = new Error('HTTP error');
        error.response = { status };

        const result = ErrorService.classifyError(error);
        expect(result).toBe(expected);
      });
    });
  });

  describe('getErrorMessage', () => {
    it('should return specific message for validation errors with issues', () => {
      const error = new Error('Validation failed');
      error.issues = [{ message: 'Name ist erforderlich' }];

      const message = ErrorService.getErrorMessage(error, ErrorService.ERROR_TYPES.VALIDATION);
      expect(message).toBe('Name ist erforderlich');
    });

    it('should return specific message for validation errors with required message', () => {
      const error = new Error('Field is required');

      const message = ErrorService.getErrorMessage(error, ErrorService.ERROR_TYPES.VALIDATION);
      expect(message).toBe('Bitte füllen Sie alle Pflichtfelder aus');
    });

    it('should return server message from response', () => {
      const error = new Error('Server error');
      error.response = { data: { message: 'Custom server message' } };

      const message = ErrorService.getErrorMessage(error, ErrorService.ERROR_TYPES.SERVER);
      expect(message).toBe('Custom server message');
    });

    it('should return standard message for error type', () => {
      const error = new Error('Some error');

      const message = ErrorService.getErrorMessage(error, ErrorService.ERROR_TYPES.NETWORK);
      expect(message).toBe('Netzwerkfehler. Bitte überprüfen Sie Ihre Internetverbindung');
    });
  });

  describe('canRetry', () => {
    it('should return true for retryable error types', () => {
      const retryableTypes = [
        ErrorService.ERROR_TYPES.NETWORK,
        ErrorService.ERROR_TYPES.SERVER,
        ErrorService.ERROR_TYPES.TIMEOUT
      ];

      retryableTypes.forEach(type => {
        expect(ErrorService.canRetry(type)).toBe(true);
      });
    });

    it('should return false for non-retryable error types', () => {
      const nonRetryableTypes = [
        ErrorService.ERROR_TYPES.VALIDATION,
        ErrorService.ERROR_TYPES.NOT_FOUND,
        ErrorService.ERROR_TYPES.UNAUTHORIZED,
        ErrorService.ERROR_TYPES.FORBIDDEN,
        ErrorService.ERROR_TYPES.UNKNOWN
      ];

      nonRetryableTypes.forEach(type => {
        expect(ErrorService.canRetry(type)).toBe(false);
      });
    });
  });

  describe('createError', () => {
    it('should create a standardized error object', () => {
      const message = 'Test error';
      const type = ErrorService.ERROR_TYPES.VALIDATION;
      const details = { field: 'name' };

      const error = ErrorService.createError(message, type, details);

      expect(error.message).toBe(message);
      expect(error.type).toBe(type);
      expect(error.details).toEqual(details);
    });

    it('should use default values when not provided', () => {
      const error = ErrorService.createError('Test error');

      expect(error.message).toBe('Test error');
      expect(error.type).toBe(ErrorService.ERROR_TYPES.UNKNOWN);
      expect(error.details).toEqual({});
    });
  });

  describe('handleFormValidationError', () => {
    it('should handle form validation errors correctly', () => {
      const formErrors = {
        name: { message: 'Name ist erforderlich' },
        email: { message: 'Email ist ungültig' }
      };

      const result = ErrorService.handleFormValidationError(formErrors);

      expect(result.type).toBe(ErrorService.ERROR_TYPES.VALIDATION);
      expect(result.message).toBe('Formular-Validierung fehlgeschlagen');
      expect(result.details).toEqual({ formErrors });
    });
  });

  describe('handleApiError', () => {
    it('should handle API errors correctly', () => {
      const response = {
        status: 500,
        data: { message: 'Internal server error' },
        config: { url: '/api/test', method: 'POST' }
      };

      const result = ErrorService.handleApiError(response);

      expect(result.type).toBe(ErrorService.ERROR_TYPES.SERVER);
      expect(result.context).toEqual({
        context: 'api_call',
        url: '/api/test',
        method: 'POST'
      });
    });
  });

  describe('logError', () => {
    it('should log errors in development mode', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      const consoleSpy = vi.spyOn(console, 'group').mockImplementation(() => {});
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      const consoleGroupEndSpy = vi.spyOn(console, 'groupEnd').mockImplementation(() => {});

      const error = new Error('Test error');
      const context = { operation: 'test' };

      ErrorService.logError(error, context);

      expect(consoleSpy).toHaveBeenCalledWith('🚨 ErrorService Log');
      expect(consoleErrorSpy).toHaveBeenCalledWith('Error:', error);
      expect(consoleLogSpy).toHaveBeenCalledWith('Context:', context);

      consoleSpy.mockRestore();
      consoleErrorSpy.mockRestore();
      consoleLogSpy.mockRestore();
      consoleGroupEndSpy.mockRestore();

      process.env.NODE_ENV = originalEnv;
    });

    it('should not log errors in production mode', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      const consoleSpy = vi.spyOn(console, 'group').mockImplementation(() => {});

      const error = new Error('Test error');
      const context = { operation: 'test' };

      ErrorService.logError(error, context);

      expect(consoleSpy).not.toHaveBeenCalled();

      consoleSpy.mockRestore();
      process.env.NODE_ENV = originalEnv;
    });
  });
});
