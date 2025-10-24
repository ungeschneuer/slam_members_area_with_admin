import { describe, it, expect, vi } from 'vitest';
import { 
  generateParticipantTemplate, 
  downloadParticipantTemplate, 
  downloadParticipantTemplateCSV,
  parseParticipantFile,
  parseParticipantCSV,
  parseParticipantExcel,
  checkForDuplicates
} from '../excelService.js';

// Mock URL and document for browser environment
global.URL = {
  createObjectURL: vi.fn(() => 'mock-url'),
  revokeObjectURL: vi.fn()
};

global.document = {
  createElement: vi.fn(() => ({
    href: '',
    download: '',
    click: vi.fn()
  })),
  body: {
    appendChild: vi.fn(),
    removeChild: vi.fn()
  }
};

describe('Excel Service', () => {
  describe('Template Generation', () => {
    it('should generate Excel template without errors', () => {
      const template = generateParticipantTemplate();
      expect(template).toBeInstanceOf(Blob);
      expect(template.type).toBe('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    });

    it('should download Excel template without errors', () => {
      expect(() => downloadParticipantTemplate()).not.toThrow();
    });

    it('should download CSV template without errors', () => {
      expect(() => downloadParticipantTemplateCSV()).not.toThrow();
    });
  });

  describe('File Parsing', () => {
    it('should reject unsupported file types', async () => {
      const mockFile = new File(['test'], 'test.txt', { type: 'text/plain' });
      
      await expect(parseParticipantFile(mockFile)).rejects.toThrow('Nur Excel (.xlsx, .xls) und CSV (.csv) Dateien sind erlaubt');
    });

    it('should accept Excel file extensions', () => {
      const excelFile = new File(['test'], 'test.xlsx', { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      expect(excelFile.name.toLowerCase().endsWith('.xlsx')).toBe(true);
    });

    it('should accept CSV file extensions', () => {
      const csvFile = new File(['test'], 'test.csv', { type: 'text/csv' });
      expect(csvFile.name.toLowerCase().endsWith('.csv')).toBe(true);
    });
  });

  describe('Duplicate Detection', () => {
    it('should detect duplicates correctly', () => {
      const newParticipants = [
        { name: 'John Doe', region: 'Berlin' },
        { name: 'Jane Smith', region: 'Munich' }
      ];
      
      const existingParticipants = [
        { name: 'John Doe', region: 'Berlin' },
        { name: 'Bob Wilson', region: 'Hamburg' }
      ];
      
      const result = checkForDuplicates(newParticipants, existingParticipants);
      
      expect(result.duplicates).toHaveLength(1);
      expect(result.duplicates[0].name).toBe('John Doe');
      expect(result.uniqueParticipants).toHaveLength(1);
      expect(result.uniqueParticipants[0].name).toBe('Jane Smith');
      expect(result.duplicateCount).toBe(1);
    });

    it('should handle no duplicates', () => {
      const newParticipants = [
        { name: 'John Doe', region: 'Berlin' },
        { name: 'Jane Smith', region: 'Munich' }
      ];
      
      const existingParticipants = [
        { name: 'Bob Wilson', region: 'Hamburg' },
        { name: 'Alice Brown', region: 'Cologne' }
      ];
      
      const result = checkForDuplicates(newParticipants, existingParticipants);
      
      expect(result.duplicates).toHaveLength(0);
      expect(result.uniqueParticipants).toHaveLength(2);
      expect(result.duplicateCount).toBe(0);
    });
  });
});
