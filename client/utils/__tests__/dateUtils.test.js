import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  formatDateForInput,
  formatDateForDisplay,
  getTodayBerlinDateString,
  isFutureDateBerlin,
  isValidDateString,
  createDateTime,
  getCurrentBerlinTime,
  BERLIN_TIMEZONE
} from '../dateUtils.js';

describe('Date Utils', () => {
  describe('formatDateForInput', () => {
    it('formats valid date string correctly', () => {
      expect(formatDateForInput('2024-10-30')).toBe('2024-10-30');
      expect(formatDateForInput('2024-12-25')).toBe('2024-12-25');
    });

    it('handles ISO date strings', () => {
      expect(formatDateForInput('2024-10-30T00:00:00Z')).toBe('2024-10-30');
      expect(formatDateForInput('2024-10-30T12:30:45.123Z')).toBe('2024-10-30');
    });

    it('handles Date objects', () => {
      const date = new Date('2024-10-30');
      expect(formatDateForInput(date)).toBe('2024-10-30');
    });

    it('returns empty string for invalid input', () => {
      expect(formatDateForInput('')).toBe('');
      expect(formatDateForInput(null)).toBe('');
      expect(formatDateForInput(undefined)).toBe('');
      expect(formatDateForInput('invalid-date')).toBe('');
    });

    it('handles timezone edge cases', () => {
      // Test that timezone shifts don't affect the date
      // Note: This test may fail in certain timezones where UTC midnight
      // falls on a different day. This is expected behavior.
      const dateString = '2024-10-30T12:00:00Z';
      expect(formatDateForInput(dateString)).toBe('2024-10-30');
    });
  });

  describe('formatDateForDisplay', () => {
    it('formats date for German display', () => {
      const result = formatDateForDisplay('2024-10-30');
      expect(result).toMatch(/\d{2}\.\d{2}\.\d{4}/); // German date format
    });

    it('handles custom options', () => {
      const result = formatDateForDisplay('2024-10-30', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
      expect(result).toContain('2024');
    });

    it('returns empty string for invalid input', () => {
      expect(formatDateForDisplay('')).toBe('');
      expect(formatDateForDisplay(null)).toBe('');
    });
  });

  describe('getTodayBerlinDateString', () => {
    it('returns date in YYYY-MM-DD format', () => {
      const result = getTodayBerlinDateString();
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it('returns current date in Berlin timezone', () => {
      const result = getTodayBerlinDateString();
      const today = new Date();
      const expectedYear = today.getFullYear();
      expect(result).toContain(expectedYear.toString());
    });
  });

  describe('isFutureDateBerlin', () => {
    it('returns true for future dates', () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowStr = tomorrow.toISOString().split('T')[0];
      expect(isFutureDateBerlin(tomorrowStr)).toBe(true);
    });

    it('returns false for past dates', () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];
      expect(isFutureDateBerlin(yesterdayStr)).toBe(false);
    });

    it('returns false for invalid input', () => {
      expect(isFutureDateBerlin('')).toBe(false);
      expect(isFutureDateBerlin(null)).toBe(false);
      expect(isFutureDateBerlin('invalid-date')).toBe(false);
    });
  });

  describe('isValidDateString', () => {
    it('validates correct date format', () => {
      expect(isValidDateString('2024-10-30')).toBe(true);
      expect(isValidDateString('2024-12-25')).toBe(true);
      expect(isValidDateString('2024-02-29')).toBe(true); // Leap year
    });

    it('rejects invalid formats', () => {
      expect(isValidDateString('30-10-2024')).toBe(false);
      expect(isValidDateString('2024/10/30')).toBe(false);
      expect(isValidDateString('2024-10-30T12:00:00Z')).toBe(false);
    });

    it('rejects invalid dates', () => {
      expect(isValidDateString('2024-13-01')).toBe(false);
      expect(isValidDateString('2024-02-30')).toBe(false);
      expect(isValidDateString('2024-04-31')).toBe(false);
    });

    it('rejects non-string input', () => {
      expect(isValidDateString(123)).toBe(false);
      expect(isValidDateString(null)).toBe(false);
      expect(isValidDateString(undefined)).toBe(false);
    });
  });

  describe('createDateTime', () => {
    it('creates valid datetime from date and time', () => {
      const result = createDateTime('2024-10-30', '14:30');
      expect(result).toBeInstanceOf(Date);
      expect(result.getFullYear()).toBe(2024);
      expect(result.getMonth()).toBe(9); // October (0-indexed)
      expect(result.getDate()).toBe(30);
      expect(result.getHours()).toBe(14);
      expect(result.getMinutes()).toBe(30);
    });

    it('handles time with seconds', () => {
      const result = createDateTime('2024-10-30', '14:30:45');
      expect(result).toBeInstanceOf(Date);
      expect(result.getSeconds()).toBe(45);
    });

    it('returns null for invalid input', () => {
      expect(createDateTime('', '14:30')).toBe(null);
      expect(createDateTime('2024-10-30', '')).toBe(null);
      expect(createDateTime('invalid-date', '14:30')).toBe(null);
      expect(createDateTime('2024-10-30', 'invalid-time')).toBe(null);
    });

    it('handles edge cases', () => {
      // Midnight
      const midnight = createDateTime('2024-10-30', '00:00');
      expect(midnight.getHours()).toBe(0);
      expect(midnight.getMinutes()).toBe(0);

      // End of day
      const endOfDay = createDateTime('2024-10-30', '23:59');
      expect(endOfDay.getHours()).toBe(23);
      expect(endOfDay.getMinutes()).toBe(59);
    });
  });

  describe('getCurrentBerlinTime', () => {
    it('returns current time in Berlin timezone', () => {
      const result = getCurrentBerlinTime();
      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
    });
  });

  describe('BERLIN_TIMEZONE constant', () => {
    it('has correct timezone value', () => {
      expect(BERLIN_TIMEZONE).toBe('Europe/Berlin');
    });
  });

  describe('Error handling', () => {
    let consoleSpy;

    beforeEach(() => {
      consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    });

    afterEach(() => {
      consoleSpy.mockRestore();
    });

    it('logs errors for invalid date formatting', () => {
      // formatDateForInput uses console.warn, not console.error
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      formatDateForInput('invalid-date');
      expect(warnSpy).toHaveBeenCalled();
      warnSpy.mockRestore();
    });

    it('logs errors for invalid datetime creation', () => {
      createDateTime('invalid-date', 'invalid-time');
      expect(consoleSpy).toHaveBeenCalled();
    });
  });
});
