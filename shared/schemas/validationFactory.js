/**
 * Validation Schema Factory
 * 
 * Centralized factory for creating validation schemas with consistent patterns.
 * Provides standardized validation rules and German error messages.
 */

import { z } from 'zod';
import { roundSchema } from './roundSchema.js';

/**
 * Common validation patterns with German error messages
 */
export const commonValidations = {
  // Text validations
  requiredString: (fieldName = 'Feld') => 
    z.string({ 
      required_error: `${fieldName} ist erforderlich`, 
      invalid_type_error: `${fieldName} ist erforderlich` 
    }).min(1, `${fieldName} ist erforderlich`),
  optionalString: () => z.string().optional(),
  maxLength: (max, fieldName = 'Feld') => z.string().max(max, `${fieldName} darf maximal ${max} Zeichen haben`),
  minLength: (min, fieldName = 'Feld') => z.string().min(min, `${fieldName} muss mindestens ${min} Zeichen haben`),
  
  // Number validations
  requiredNumber: (fieldName = 'Feld') => 
    z.number({ 
      required_error: `${fieldName} ist erforderlich`,
      invalid_type_error: `${fieldName} muss eine Zahl sein` 
    }),
  optionalNumber: () => z.number().optional(),
  positiveNumber: (fieldName = 'Feld') => z.number().positive(`${fieldName} muss positiv sein`),
  nonNegativeNumber: (fieldName = 'Feld') => z.number().nonnegative(`${fieldName} muss größer oder gleich 0 sein`),
  
  // Email validation
  email: () => z.string().email('Ungültige E-Mail-Adresse').optional().or(z.literal('')),
  
  // URL validation
  url: () => z.string().url('Ungültige URL').optional().or(z.literal('')),
  
  // Boolean validation
  boolean: () => z.boolean({ invalid_type_error: 'Muss wahr oder falsch sein' }),
  
  // Date validation
  date: (fieldName = 'Datum') => z.string().min(1, `${fieldName} ist erforderlich`),
  optionalDate: () => z.string().optional(),
  
  // Time validation
  time: (fieldName = 'Zeit') => z.string().min(1, `${fieldName} ist erforderlich`),
  optionalTime: () => z.string().optional(),
  
  // Slug validation
  slug: () => z.string().min(1, 'Slug ist erforderlich').regex(/^[a-z0-9-]+$/, 'Slug darf nur Kleinbuchstaben, Zahlen und Bindestriche enthalten'),
  
  // JSON validation
  json: (fieldName = 'JSON') => z.string().refine(
    (val) => {
      try {
        JSON.parse(val);
        return true;
      } catch {
        return false;
      }
    },
    { message: `${fieldName} muss gültiges JSON sein` }
  ).optional(),
  
  // Array validation
  array: (fieldName = 'Liste') => z.array(z.string()).optional(),
  
  // Enum validation
  enum: (values, fieldName = 'Feld') => z.enum(values, { 
    required_error: `${fieldName} ist erforderlich`,
    invalid_type_error: `${fieldName} muss einer der folgenden Werte sein: ${values.join(', ')}`
  })
};

/**
 * Create a city tip validation schema
 */
export function createCityTipSchema() {
  return z.object({
    name: commonValidations.requiredString('Name').max(255, 'Name ist zu lang'),
    slug: commonValidations.slug(),
    category: commonValidations.requiredString('Kategorie'),
    description: commonValidations.requiredString('Beschreibung'),
    address: commonValidations.optionalString(),
    latitude: z.union([z.string(), z.number()]).optional(),
    longitude: z.union([z.string(), z.number()]).optional(),
    // REMOVED: phone field - database table doesn't have this column
    website: commonValidations.url(),
    price_range: commonValidations.optionalString(),
    tips: commonValidations.optionalString(),
    // REMOVED: is_featured field - removed from form
    status: commonValidations.enum(['ACTIVE', 'INACTIVE'], 'Status').optional(),
    opening_hours: commonValidations.optionalString(),
    contact_info_email: commonValidations.email()
  });
}

/**
 * Create a participant validation schema
 */
export function createParticipantSchema() {
  return z.object({
    name: commonValidations.requiredString('Name').max(255, 'Name ist zu lang'),
    region: commonValidations.optionalString().max(255, 'Region ist zu lang'),
    instagram: commonValidations.optionalString(),
    bio: commonValidations.optionalString(),
    website: commonValidations.url(),
    email: commonValidations.email(),
    phone: commonValidations.optionalString(),
    is_featured: commonValidations.boolean().optional(),
    status: commonValidations.enum(['ACTIVE', 'INACTIVE'], 'Status').optional()
  });
}

/**
 * Create a news validation schema
 */
export function createNewsSchema() {
  return z.object({
    title: commonValidations.requiredString('Titel').max(255, 'Titel ist zu lang'),
    slug: commonValidations.slug(),
    content: commonValidations.requiredString('Inhalt'),
    excerpt: commonValidations.optionalString(),
    category: commonValidations.requiredString('Kategorie'),
    tags: commonValidations.array('Tags'),
    featured_image_url: commonValidations.url(),
    meta_description: commonValidations.optionalString(),
    is_published: commonValidations.boolean(),
    is_breaking_news: commonValidations.boolean().optional(),
    breaking_news_until: commonValidations.optionalDate(),
    published_at: commonValidations.optionalDate()
  });
}

/**
 * Create a timetable event validation schema
 */
export function createTimetableSchema() {
  return z.object({
    title: commonValidations.requiredString('Titel').max(255, 'Titel ist zu lang'),
    slug: commonValidations.slug(),
    description: commonValidations.requiredString('Beschreibung'),
    detailedDescription: commonValidations.optionalString(),
    date: commonValidations.date('Datum'),
    time: commonValidations.time('Startzeit'),
    endTime: commonValidations.optionalTime(),
    location: commonValidations.requiredString('Ort'),
    type: commonValidations.enum(['team-round', 'individual-round', 'workshop', 'fun', 'aftershow', 'panel', 'general', 'technical', 'registration', 'party', 'celebration'], 'Typ'),
    status: commonValidations.enum(['confirmed', 'tentative', 'upcoming', 'active', 'completed', 'cancelled'], 'Status').optional(),
    internalLink: commonValidations.url(),
    additionalLinks: z.array(z.object({
      type: z.string().min(1, 'Link-Typ ist erforderlich'),
      title: z.string().min(1, 'Link-Titel ist erforderlich'),
      url: z.string().url('Ungültige URL').or(z.literal(''))  // Allow empty string
    })).optional(),
    participants: z.array(z.object({
      id: z.union([z.number(), z.string()]).optional(),  // Accept both number and string
      role: z.string().optional()  // Make role optional
    })).optional()
  });
}

/**
 * Create an info page validation schema
 */
export function createInfoPageSchema() {
  return z.object({
    title: commonValidations.requiredString('Titel').max(255, 'Titel ist zu lang'),
    slug: commonValidations.slug(),
    content: commonValidations.requiredString('Inhalt'),
    excerpt: commonValidations.optionalString(),
    category: commonValidations.enum(['general', 'rules', 'legal', 'help'], 'Kategorie'),
    order: commonValidations.nonNegativeNumber('Reihenfolge'),
    status: commonValidations.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED'], 'Status'),
    featured_image_url: commonValidations.url(),
    meta_description: commonValidations.optionalString(),
    tags: commonValidations.array('Tags'),
    is_published: commonValidations.boolean()
  });
}

/**
 * Create a round validation schema
 */
export function createRoundSchema() {
  return z.object({
    title: commonValidations.requiredString('Titel').max(255, 'Titel ist zu lang'),
    description: commonValidations.requiredString('Beschreibung'),
    date: commonValidations.date('Datum'),
    start_time: commonValidations.time('Startzeit'),
    end_time: commonValidations.time('Endzeit'),
    location: commonValidations.requiredString('Ort'),
    competition_type: commonValidations.enum(['individual', 'team', 'open'], 'Wettbewerbstyp'),
    total_jury_members: commonValidations.positiveNumber('Jury-Mitglieder'),
    status: commonValidations.enum(['SCHEDULED', 'ONGOING', 'COMPLETED', 'CANCELLED'], 'Status').optional(),
    is_published: commonValidations.boolean()
  });
}

/**
 * Schema factory function
 * @param {string} type - The type of schema to create
 * @returns {z.ZodSchema} The validation schema
 */
export function createValidationSchema(type) {
  const schemas = {
    cityTip: createCityTipSchema,
    participant: createParticipantSchema,
    news: createNewsSchema,
    timetable: createTimetableSchema,
    infoPage: createInfoPageSchema,
    round: createRoundSchema
  };

  const schemaFactory = schemas[type];
  if (!schemaFactory) {
    throw new Error(`Unknown schema type: ${type}. Available types: ${Object.keys(schemas).join(', ')}`);
  }

  return schemaFactory();
}

/**
 * Get default values for a schema type
 * @param {string} type - The type of schema
 * @returns {Object} Default values object
 */
export function getDefaultValues(type) {
  const defaults = {
    cityTip: {
      name: '',
      slug: '',
      category: 'culture',
      description: '',
      address: '',
      latitude: '',
      longitude: '',
      // REMOVED: phone field - database table doesn't have this column
      website: '',
      price_range: '€',
      tips: '',
      // REMOVED: is_featured field - removed from form
      status: 'ACTIVE',
      opening_hours: '',
      contact_info_email: ''
    },
    participant: {
      name: '',
      region: '',
      instagram: '',
      bio: '',
      website: '',
      email: '',
      phone: '',
      is_featured: false,
      status: 'ACTIVE'
    },
    news: {
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
    },
    timetable: {
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
    },
    infoPage: {
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
    },
    round: {
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
    }
  };

  return defaults[type] || {};
}

export default {
  createValidationSchema,
  getDefaultValues,
  commonValidations
};
