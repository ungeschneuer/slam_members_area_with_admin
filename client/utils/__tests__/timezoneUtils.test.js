import { describe, it, expect } from 'vitest';
import { getTodayBerlinDateString, isFutureDateBerlin } from '../timezoneUtils';

describe('timezoneUtils - Smart Day Selection', () => {
  describe('getTodayBerlinDateString', () => {
    it('returns a string in YYYY-MM-DD format', () => {
      const result = getTodayBerlinDateString();
      
      // Check format matches YYYY-MM-DD
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });
    
    it('returns a valid date', () => {
      const result = getTodayBerlinDateString();
      const date = new Date(result);
      
      // Check if it's a valid date
      expect(date.toString()).not.toBe('Invalid Date');
    });
    
    it('returns today\'s date (within reasonable bounds)', () => {
      const result = getTodayBerlinDateString();
      const date = new Date(result);
      const now = new Date();
      
      // Allow for timezone differences - should be within 2 days of now
      const diffInDays = Math.abs((date - now) / (1000 * 60 * 60 * 24));
      expect(diffInDays).toBeLessThan(2);
    });
  });

  describe('isFutureDateBerlin', () => {
    it('correctly identifies far future dates as future', () => {
      const futureDate = '2099-12-31';
      expect(isFutureDateBerlin(futureDate)).toBe(true);
    });
    
    it('correctly identifies far past dates as not future', () => {
      const pastDate = '2020-01-01';
      expect(isFutureDateBerlin(pastDate)).toBe(false);
    });
    
    it('uses string comparison for YYYY-MM-DD format', () => {
      // This tests that the function works with lexicographic comparison
      expect(isFutureDateBerlin('2099-01-01')).toBe(true);
      expect(isFutureDateBerlin('2020-12-31')).toBe(false);
    });
    
    it('handles edge case dates correctly', () => {
      const today = getTodayBerlinDateString();
      
      // Today should not be in the future
      expect(isFutureDateBerlin(today)).toBe(false);
      
      // Tomorrow should be in the future
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 2); // +2 to account for timezone differences
      const tomorrowStr = tomorrow.toISOString().split('T')[0];
      expect(isFutureDateBerlin(tomorrowStr)).toBe(true);
    });
  });

  describe('Smart day selection integration', () => {
    it('getTodayBerlinDateString and isFutureDateBerlin work together', () => {
      const today = getTodayBerlinDateString();
      
      // Today should not be considered future
      expect(isFutureDateBerlin(today)).toBe(false);
      
      // A date far in the future should be considered future
      expect(isFutureDateBerlin('2099-12-31')).toBe(true);
      
      // A date far in the past should not be considered future
      expect(isFutureDateBerlin('2020-01-01')).toBe(false);
    });
    
    it('correctly sorts and filters dates for smart selection', () => {
      const mockEventDates = [
        '2024-12-01',  // Past
        '2024-12-15',  // Past
        '2099-01-25',  // Future
        '2099-01-30'   // Future
      ];
      
      // Filter future and past dates
      const futureDates = mockEventDates.filter(date => isFutureDateBerlin(date));
      const pastDates = mockEventDates.filter(date => !isFutureDateBerlin(date));
      
      // Should have 2 future dates and 2 past dates
      expect(futureDates).toHaveLength(2);
      expect(pastDates).toHaveLength(2);
      expect(futureDates[0]).toBe('2099-01-25');
      expect(futureDates[1]).toBe('2099-01-30');
    });
    
    it('handles all-future events scenario', () => {
      const allFutureDates = [
        '2099-01-25',  // Future
        '2099-01-30',  // Future
        '2099-02-15'   // Future
      ];
      
      const futureDates = allFutureDates.filter(date => isFutureDateBerlin(date));
      const pastDates = allFutureDates.filter(date => !isFutureDateBerlin(date));
      
      // Should have 3 future dates and 0 past dates
      expect(futureDates).toHaveLength(3);
      expect(pastDates).toHaveLength(0);
    });
    
    it('handles all-past events scenario', () => {
      const allPastDates = [
        '2024-12-01',  // Past
        '2024-12-15',  // Past
        '2024-12-30'   // Past
      ];
      
      const futureDates = allPastDates.filter(date => isFutureDateBerlin(date));
      const pastDates = allPastDates.filter(date => !isFutureDateBerlin(date));
      
      // Should have 0 future dates and 3 past dates
      expect(futureDates).toHaveLength(0);
      expect(pastDates).toHaveLength(3);
    });
  });
});

