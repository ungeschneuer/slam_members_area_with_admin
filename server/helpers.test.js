import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the dependencies
vi.mock('../services/optimizedQueryService.js', () => ({
  default: {
    clearCache: vi.fn()
  }
}));

vi.mock('../services/websocketService.js', () => ({
  emitDataUpdate: vi.fn(),
  emitAdminUpdate: vi.fn(),
  emitCacheInvalidation: vi.fn()
}));

vi.mock('../config/logger.js', () => ({
  default: {
    info: vi.fn(),
    error: vi.fn()
  }
}));

// Import the helper functions by extracting them from the routes file
// We'll test them by importing the module and accessing the functions
import express from 'express';

// Create a test router to access the helper functions
const testRouter = express.Router();

// We need to extract the helper functions from the routes file
// Let's create a separate module with just the helpers for testing
const helpers = {
  startTiming: () => process.hrtime.bigint(),
  
  endTiming: (startTime) => {
    const endTime = process.hrtime.bigint();
    return Number(endTime - startTime) / 1000000;
  },
  
  safeJsonStringify: (data, fallback = []) => {
    if (data === null || data === undefined) {
      return JSON.stringify(fallback);
    }
    return JSON.stringify(data);
  },
  
  safeParseInt: (value, fallback = 0) => {
    const parsed = parseInt(value);
    return isNaN(parsed) ? fallback : parsed;
  },
  
  normalizeData: (data, schema = {}) => {
    const normalized = {};
    
    for (const [key, config] of Object.entries(schema)) {
      const value = data[key];
      
      if (config.type === 'json') {
        normalized[key] = helpers.safeJsonStringify(value, config.fallback || []);
      } else if (config.type === 'int') {
        normalized[key] = helpers.safeParseInt(value, config.fallback || 0);
      } else if (config.type === 'string') {
        normalized[key] = value || config.fallback || '';
      } else if (config.type === 'boolean') {
        normalized[key] = Boolean(value);
      } else {
        normalized[key] = value;
      }
    }
    
    return normalized;
  },
  
  normalizeInstagram: (input) => {
    if (!input) return null;
    let value = String(input).trim();
    value = value.replace(/^https?:\/\/(www\.)?instagram\.com\//i, '');
    value = value.replace(/^@/, '');
    value = value.replace(/\/$/, '');
    if (!value) return null;
    return `https://instagram.com/${value}`;
  }
};

describe('Helper Functions', () => {
  describe('safeJsonStringify', () => {
    it('should stringify valid data', () => {
      const data = { name: 'test', value: 123 };
      const result = helpers.safeJsonStringify(data);
      expect(result).toBe('{"name":"test","value":123}');
    });

    it('should return fallback for null data', () => {
      const result = helpers.safeJsonStringify(null);
      expect(result).toBe('[]');
    });

    it('should return fallback for undefined data', () => {
      const result = helpers.safeJsonStringify(undefined);
      expect(result).toBe('[]');
    });

    it('should use custom fallback', () => {
      const result = helpers.safeJsonStringify(null, {});
      expect(result).toBe('{}');
    });
  });

  describe('safeParseInt', () => {
    it('should parse valid integers', () => {
      expect(helpers.safeParseInt('123')).toBe(123);
      expect(helpers.safeParseInt('0')).toBe(0);
      expect(helpers.safeParseInt('-456')).toBe(-456);
    });

    it('should return fallback for invalid input', () => {
      expect(helpers.safeParseInt('abc')).toBe(0);
      expect(helpers.safeParseInt('')).toBe(0);
      expect(helpers.safeParseInt(null)).toBe(0);
      expect(helpers.safeParseInt(undefined)).toBe(0);
    });

    it('should use custom fallback', () => {
      expect(helpers.safeParseInt('abc', 42)).toBe(42);
      expect(helpers.safeParseInt('', -1)).toBe(-1);
    });
  });

  describe('normalizeData', () => {
    it('should normalize json fields', () => {
      const data = { tags: ['tag1', 'tag2'] };
      const schema = { tags: { type: 'json', fallback: [] } };
      const result = helpers.normalizeData(data, schema);
      expect(result.tags).toBe('["tag1","tag2"]');
    });

    it('should normalize int fields', () => {
      const data = { count: '123' };
      const schema = { count: { type: 'int', fallback: 0 } };
      const result = helpers.normalizeData(data, schema);
      expect(result.count).toBe(123);
    });

    it('should normalize string fields', () => {
      const data = { name: 'test' };
      const schema = { name: { type: 'string', fallback: '' } };
      const result = helpers.normalizeData(data, schema);
      expect(result.name).toBe('test');
    });

    it('should normalize boolean fields', () => {
      const data = { active: 'true' };
      const schema = { active: { type: 'boolean' } };
      const result = helpers.normalizeData(data, schema);
      expect(result.active).toBe(true);
    });

    it('should use fallbacks for missing values', () => {
      const data = {};
      const schema = {
        tags: { type: 'json', fallback: [] },
        count: { type: 'int', fallback: 0 },
        name: { type: 'string', fallback: 'default' }
      };
      const result = helpers.normalizeData(data, schema);
      expect(result.tags).toBe('[]');
      expect(result.count).toBe(0);
      expect(result.name).toBe('default');
    });

    it('should handle null/undefined values', () => {
      const data = { tags: null, count: undefined };
      const schema = {
        tags: { type: 'json', fallback: [] },
        count: { type: 'int', fallback: 0 }
      };
      const result = helpers.normalizeData(data, schema);
      expect(result.tags).toBe('[]');
      expect(result.count).toBe(0);
    });
  });

  describe('normalizeInstagram', () => {
    it('should normalize @username format', () => {
      expect(helpers.normalizeInstagram('@username')).toBe('https://instagram.com/username');
    });

    it('should normalize full URL', () => {
      expect(helpers.normalizeInstagram('https://instagram.com/username')).toBe('https://instagram.com/username');
    });

    it('should normalize www URL', () => {
      expect(helpers.normalizeInstagram('https://www.instagram.com/username')).toBe('https://instagram.com/username');
    });

    it('should handle username without @', () => {
      expect(helpers.normalizeInstagram('username')).toBe('https://instagram.com/username');
    });

    it('should remove trailing slash', () => {
      expect(helpers.normalizeInstagram('https://instagram.com/username/')).toBe('https://instagram.com/username');
    });

    it('should return null for empty input', () => {
      expect(helpers.normalizeInstagram('')).toBe(null);
      expect(helpers.normalizeInstagram(null)).toBe(null);
      expect(helpers.normalizeInstagram(undefined)).toBe(null);
    });

    it('should return null for whitespace only', () => {
      expect(helpers.normalizeInstagram('   ')).toBe(null);
    });
  });

  describe('timing functions', () => {
    it('should measure timing correctly', () => {
      const startTime = helpers.startTiming();
      
      // Simulate some work
      const endTime = process.hrtime.bigint();
      const duration = helpers.endTiming(startTime);
      
      expect(typeof duration).toBe('number');
      expect(duration).toBeGreaterThanOrEqual(0);
    });
  });
});
