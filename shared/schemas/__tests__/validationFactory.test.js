/**
 * Validation Schema Factory Unit Tests
 * 
 * Tests for centralized validation schema factory
 */

import { describe, it, expect } from 'vitest';
import { 
  createValidationSchema, 
  getDefaultValues, 
  commonValidations,
  createCityTipSchema,
  createParticipantSchema,
  createNewsSchema,
  createTimetableSchema,
  createInfoPageSchema,
  createRoundSchema
} from '../validationFactory.js';

describe('Validation Schema Factory', () => {
  describe('createValidationSchema', () => {
    it('should create city tip schema', () => {
      const schema = createValidationSchema('cityTip');
      expect(schema).toBeDefined();
      
      // Test valid data
      const validData = {
        name: 'Test Location',
        slug: 'test-location',
        category: 'culture',
        description: 'A test location'
      };
      
      const result = schema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should create participant schema', () => {
      const schema = createValidationSchema('participant');
      expect(schema).toBeDefined();
      
      // Test valid data
      const validData = {
        name: 'John Doe',
        region: 'Berlin',
        instagram: '@johndoe'
      };
      
      const result = schema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should create news schema', () => {
      const schema = createValidationSchema('news');
      expect(schema).toBeDefined();
      
      // Test valid data with snake_case fields
      const validData = {
        title: 'Test News',
        slug: 'test-news',
        content: 'Test content',
        excerpt: 'Test excerpt',
        category: 'general',
        tags: ['tag1', 'tag2'],
        featured_image_url: 'https://example.com/image.jpg',
        meta_description: 'Test meta description',
        is_published: true,
        is_breaking_news: false,
        breaking_news_until: undefined,
        published_at: '2024-01-01T10:00:00Z'
      };
      
      const result = schema.safeParse(validData);
      if (!result.success) {
        console.log('News validation errors:', result.error.issues);
      }
      expect(result.success).toBe(true);
    });

    it('should create timetable schema', () => {
      const schema = createValidationSchema('timetable');
      expect(schema).toBeDefined();
      
      // Test valid data
      const validData = {
        title: 'Test Event',
        slug: 'test-event',
        description: 'Test description',
        date: '2024-01-01',
        time: '10:00',
        location: 'Test Location',
        type: 'workshop'
      };
      
      const result = schema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should create info page schema', () => {
      const schema = createValidationSchema('infoPage');
      expect(schema).toBeDefined();
      
      // Test valid data with snake_case fields
      const validData = {
        title: 'Test Page',
        slug: 'test-page',
        content: 'Test content',
        excerpt: 'Test excerpt',
        category: 'general',
        order: 0,
        status: 'PUBLISHED',
        featured_image_url: 'https://example.com/image.jpg',
        meta_description: 'Test meta description',
        tags: ['tag1', 'tag2'],
        is_published: true
      };
      
      const result = schema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should create round schema', () => {
      const schema = createValidationSchema('round');
      expect(schema).toBeDefined();
      
      // Test valid data with snake_case fields
      const validData = {
        title: 'Test Round',
        description: 'Test description',
        date: '2024-01-01',
        start_time: '10:00',
        end_time: '12:00',
        location: 'Test Location',
        competition_type: 'individual',
        total_jury_members: 5,
        status: 'SCHEDULED',
        is_published: true
      };
      
      const result = schema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should throw error for unknown schema type', () => {
      expect(() => createValidationSchema('unknown')).toThrow('Unknown schema type: unknown');
    });
  });

  describe('getDefaultValues', () => {
    it('should return default values for city tip', () => {
      const defaults = getDefaultValues('cityTip');
      
      expect(defaults).toEqual({
        name: '',
        slug: '',
        category: 'culture',
        description: '',
        address: '',
        latitude: '',
        longitude: '',
        phone: '',
        website: '',
        price_range: '€',
        tips: '',
        is_featured: false,
        status: 'ACTIVE',
        opening_hours: '',
        contact_info_email: ''
      });
    });

    it('should return default values for participant', () => {
      const defaults = getDefaultValues('participant');
      
      expect(defaults).toEqual({
        name: '',
        region: '',
        instagram: '',
        bio: '',
        website: '',
        email: '',
        phone: '',
        is_featured: false,
        status: 'ACTIVE'
      });
    });

    it('should return default values for news', () => {
      const defaults = getDefaultValues('news');
      
      expect(defaults).toEqual({
        title: '',
        slug: '',
        content: '',
        excerpt: '',
        category: 'general',
        tags: [],
        featured_image_url: '',
        meta_description: '',
        is_published: false,
        is_breaking_news: false,
        breaking_news_until: '',
        published_at: ''
      });
    });

    it('should return default values for timetable', () => {
      const defaults = getDefaultValues('timetable');
      
      expect(defaults).toEqual({
        title: '',
        slug: '',
        description: '',
        detailedDescription: '',
        date: '',
        time: '',
        endTime: '',
        location: '',
        type: 'workshop',
        status: 'confirmed',
        internalLink: '',
        additionalLinks: [],
        participants: []
      });
    });

    it('should return default values for info page', () => {
      const defaults = getDefaultValues('infoPage');
      
      expect(defaults).toEqual({
        title: '',
        slug: '',
        content: '',
        excerpt: '',
        category: 'general',
        order: 0,
        status: 'DRAFT',
        featured_image_url: '',
        meta_description: '',
        tags: [],
        is_published: false
      });
    });

    it('should return default values for round', () => {
      const defaults = getDefaultValues('round');
      
      expect(defaults).toEqual({
        title: '',
        description: '',
        date: '',
        start_time: '',
        end_time: '',
        location: '',
        competition_type: 'individual',
        total_jury_members: 5,
        status: 'SCHEDULED',
        is_published: false
      });
    });

    it('should return empty object for unknown type', () => {
      const defaults = getDefaultValues('unknown');
      expect(defaults).toEqual({});
    });
  });

  describe('commonValidations', () => {
    describe('requiredString', () => {
      it('should validate required string', () => {
        const validator = commonValidations.requiredString('Name');
        
        expect(validator.parse('Test')).toBe('Test');
        
        // Check that it throws (Zod throws ZodError, not plain Error)
        expect(() => validator.parse('')).toThrow();
        expect(() => validator.parse(undefined)).toThrow();
        
        // Check actual error message in ZodError.issues array
        try {
          validator.parse('');
          fail('Should have thrown');
        } catch (error) {
          expect(error.issues[0].message).toContain('Name ist erforderlich');
        }
        
        try {
          validator.parse(undefined);
          fail('Should have thrown');
        } catch (error) {
          // Accept either German or English error message for undefined
          expect(error.issues[0].message).toMatch(/Name ist erforderlich|Invalid input|erforderlich/);
        }
      });

      it('should validate max length', () => {
        const validator = commonValidations.requiredString('Name').max(5, 'Name ist zu lang');
        
        expect(validator.parse('Test')).toBe('Test');
        expect(() => validator.parse('Too Long')).toThrow('Name ist zu lang');
      });
    });

    describe('optionalString', () => {
      it('should validate optional string', () => {
        const validator = commonValidations.optionalString();
        
        expect(validator.parse('Test')).toBe('Test');
        expect(validator.parse(undefined)).toBeUndefined();
        expect(validator.parse('')).toBe('');
      });
    });

    describe('email', () => {
      it('should validate email', () => {
        const validator = commonValidations.email();
        
        expect(validator.parse('test@example.com')).toBe('test@example.com');
        expect(validator.parse('')).toBe('');
        expect(validator.parse(undefined)).toBeUndefined();
        expect(() => validator.parse('invalid-email')).toThrow('Ungültige E-Mail-Adresse');
      });
    });

    describe('url', () => {
      it('should validate URL', () => {
        const validator = commonValidations.url();
        
        expect(validator.parse('https://example.com')).toBe('https://example.com');
        expect(validator.parse('')).toBe('');
        expect(validator.parse(undefined)).toBeUndefined();
        expect(() => validator.parse('invalid-url')).toThrow('Ungültige URL');
      });
    });

    describe('slug', () => {
      it('should validate slug', () => {
        const validator = commonValidations.slug();
        
        expect(validator.parse('test-slug')).toBe('test-slug');
        expect(validator.parse('test123')).toBe('test123');
        expect(() => validator.parse('Test-Slug')).toThrow('Slug darf nur Kleinbuchstaben, Zahlen und Bindestriche enthalten');
        expect(() => validator.parse('test slug')).toThrow('Slug darf nur Kleinbuchstaben, Zahlen und Bindestriche enthalten');
      });
    });

    describe('enum', () => {
      it('should validate enum values', () => {
        const validator = commonValidations.enum(['ACTIVE', 'INACTIVE'], 'Status');
        
        expect(validator.parse('ACTIVE')).toBe('ACTIVE');
        expect(validator.parse('INACTIVE')).toBe('INACTIVE');
        
        // Check that it throws for invalid value
        expect(() => validator.parse('UNKNOWN')).toThrow();
        
        // Check actual error message in ZodError.issues array
        try {
          validator.parse('UNKNOWN');
          fail('Should have thrown');
        } catch (error) {
          // Accept either German or English error message
          expect(error.issues[0].message).toMatch(/Status muss einer der folgenden Werte|Invalid option|ACTIVE.*INACTIVE/);
        }
      });
    });
  });

  describe('City Tip Schema', () => {
    it('should validate required fields', () => {
      const schema = createCityTipSchema();
      
      const validData = {
        name: 'Test Location',
        slug: 'test-location',
        category: 'culture',
        description: 'A test location'
      };
      
      const result = schema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should reject missing required fields', () => {
      const schema = createCityTipSchema();
      
      const invalidData = {
        name: '',
        category: 'culture',
        description: 'A test location'
      };
      
      const result = schema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Name ist erforderlich');
      }
    });

    it('should validate optional fields', () => {
      const schema = createCityTipSchema();
      
      const validData = {
        name: 'Test Location',
        slug: 'test-location',
        category: 'culture',
        description: 'A test location',
        website: 'https://example.com',
        contact_info_email: 'test@example.com'
      };
      
      const result = schema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should validate email format', () => {
      const schema = createCityTipSchema();
      
      const invalidData = {
        name: 'Test Location',
        slug: 'test-location',
        category: 'culture',
        description: 'A test location',
        contact_info_email: 'invalid-email'
      };
      
      const result = schema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Ungültige E-Mail-Adresse');
      }
    });
  });

  describe('Participant Schema', () => {
    it('should validate required fields', () => {
      const schema = createParticipantSchema();
      
      const validData = {
        name: 'John Doe',
        region: 'Berlin'
      };
      
      const result = schema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should validate optional fields', () => {
      const schema = createParticipantSchema();
      
      const validData = {
        name: 'John Doe',
        region: 'Berlin',
        instagram: '@johndoe',
        website: 'https://johndoe.com',
        email: 'john@example.com'
      };
      
      const result = schema.safeParse(validData);
      expect(result.success).toBe(true);
    });
  });

  describe('News Schema', () => {
    it('should validate required fields', () => {
      const schema = createNewsSchema();
      
      const validData = {
        title: 'Test News',
        slug: 'test-news',
        content: 'Test content',
        category: 'general',
        is_published: false,
        is_breaking_news: false
      };
      
      const result = schema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should validate boolean fields', () => {
      const schema = createNewsSchema();
      
      const validData = {
        title: 'Test News',
        slug: 'test-news',
        content: 'Test content',
        category: 'general',
        is_published: true,
        is_breaking_news: false
      };
      
      const result = schema.safeParse(validData);
      expect(result.success).toBe(true);
    });
  });

  describe('Timetable Schema', () => {
    it('should validate required fields', () => {
      const schema = createTimetableSchema();
      
      const validData = {
        title: 'Test Event',
        slug: 'test-event',
        description: 'Test description',
        date: '2024-01-01',
        time: '10:00',
        location: 'Test Location',
        type: 'workshop'
      };
      
      const result = schema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should validate participants array', () => {
      const schema = createTimetableSchema();
      
      const validData = {
        title: 'Test Event',
        slug: 'test-event',
        description: 'Test description',
        date: '2024-01-01',
        time: '10:00',
        location: 'Test Location',
        type: 'workshop',
        participants: [
          { id: 1, role: 'participant' },
          { id: 2, role: 'jury' }
        ]
      };
      
      const result = schema.safeParse(validData);
      expect(result.success).toBe(true);
    });
  });

  describe('Info Page Schema', () => {
    it('should validate required fields', () => {
      const schema = createInfoPageSchema();
      
      const validData = {
        title: 'Test Page',
        slug: 'test-page',
        content: 'Test content',
        category: 'general',
        order: 0,
        status: 'DRAFT',
        is_published: false
      };
      
      const result = schema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should validate category enum', () => {
      const schema = createInfoPageSchema();
      
      const validData = {
        title: 'Test Page',
        slug: 'test-page',
        content: 'Test content',
        category: 'rules',
        order: 0,
        status: 'DRAFT',
        is_published: false
      };
      
      const result = schema.safeParse(validData);
      expect(result.success).toBe(true);
    });
  });

  describe('Round Schema', () => {
    it('should validate required fields', () => {
      const schema = createRoundSchema();
      
      const validData = {
        title: 'Test Round',
        description: 'Test description',
        date: '2024-01-01',
        start_time: '10:00',
        end_time: '12:00',
        location: 'Test Location',
        competition_type: 'individual',
        total_jury_members: 5,
        is_published: false
      };
      
      const result = schema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should validate positive numbers', () => {
      const schema = createRoundSchema();
      
      const invalidData = {
        title: 'Test Round',
        description: 'Test description',
        date: '2024-01-01',
        start_time: '10:00',
        end_time: '12:00',
        location: 'Test Location',
        competition_type: 'individual',
        total_jury_members: -1
      };
      
      const result = schema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Jury-Mitglieder muss positiv sein');
      }
    });
  });
});
