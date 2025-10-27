import { z } from 'zod';
import { participantSchema as sharedParticipantSchema } from '../../shared/schemas/participantSchema.js';
import { newsSchema as sharedNewsSchema } from '../../shared/schemas/newsSchema.js';
import { cityTipSchema as sharedCityTipSchema } from '../../shared/schemas/cityTipSchema.js';
import { roundSchema as sharedRoundSchema } from '../../shared/schemas/roundSchema.js';

/**
 * Shared form schemas for admin components
 * Provides consistent validation across all admin forms
 */

// Slug configuration constants
const SLUG_CONFIG = {
  maxLength: 50,
  min: 1,
  max: 50,
  regex: /^[a-z0-9-]+$/,
  message: {
    min: 'Slug ist erforderlich',
    max: 'Slug darf maximal 50 Zeichen lang sein',
    regex: 'Slug darf nur Kleinbuchstaben, Zahlen und Bindestriche enthalten'
  }
};

// Validate slug format
function validateSlugFormat(slug) {
  if (!slug || typeof slug !== 'string') {
    return { isValid: false, message: 'Slug is required' };
  }
  
  if (slug.length === 0) {
    return { isValid: false, message: 'Slug cannot be empty' };
  }
  
  if (slug.length > SLUG_CONFIG.maxLength) {
    return { isValid: false, message: `Slug cannot be longer than ${SLUG_CONFIG.maxLength} characters` };
  }
  
  if (!/^[a-z0-9-]+$/.test(slug)) {
    return { isValid: false, message: 'Slug can only contain lowercase letters, numbers, and hyphens' };
  }
  
  if (slug.includes('--')) {
    return { isValid: false, message: 'Slug cannot contain consecutive hyphens' };
  }
  
  if (slug.startsWith('-') || slug.endsWith('-')) {
    return { isValid: false, message: 'Slug cannot start or end with hyphens' };
  }
  
  return { isValid: true, message: 'Valid slug format' };
}

// Centralized slug validation schema
export const slugValidationSchema = z.string()
  .min(SLUG_CONFIG.min, SLUG_CONFIG.message.min)
  .max(SLUG_CONFIG.max, SLUG_CONFIG.message.max)
  .regex(SLUG_CONFIG.regex, SLUG_CONFIG.message.regex)
  .refine((slug) => {
    const validation = validateSlugFormat(slug);
    return validation.isValid;
  }, {
    message: 'Slug format is invalid'
  });

// Base participant schema
export const participantSchema = z.object({
  participantId: z.number().optional(),
  name: z.string().optional(),
  role: z.string().optional()
});

// Crew member schema - handles both single role and multiple roles
export const crewMemberSchema = z.object({
  participantId: z.number(),
  name: z.string().optional(),
  role: z.string().optional(),
  roles: z.array(z.string()).optional()
});

// Base event/round schema
export const baseEventSchema = z.object({
  title: z.string().min(1, 'Titel ist erforderlich'),
  location: z.string().min(1, 'Ort ist erforderlich'),
  description: z.string().optional(),
  // Status is now calculated automatically based on date and time
  crew: z.array(crewMemberSchema).default([]),
  participants: z.array(participantSchema).optional()
});

// Round-specific schema
export const roundSchema = baseEventSchema.extend({
  slug: slugValidationSchema,
  date: z.string().min(1, 'Datum ist erforderlich'),
  start_time: z.string().min(1, 'Startzeit ist erforderlich'),
  end_time: z.string().min(1, 'Endzeit ist erforderlich'),
  address: z.string().optional(),
  after_play_report: z.string().optional(),
  photos_cloud_url: z.string().url('Muss eine gültige URL sein (z.B. https://photos.google.com/...)').optional().or(z.literal('')),
  competition_type: z.enum(['Einzelwettbewerb', 'Teamwettbewerb']),
  total_jury_members: z.number().min(1).max(20),
  // Assignments array with roles and metadata
  assignments: z.array(z.object({
    participant_id: z.number(),
    roles: z.array(z.string()),
    metadata: z.object({}).optional()
  })).default([]),
  // Fix: groups should validate the structure properly to match backend expectations
  groups: z.union([z.array(z.object({
    id: z.number().or(z.string()).nullable().optional(),
    name: z.string().min(1, 'Group name is required'),
    displayOrder: z.number().min(0, 'Display order must be non-negative'),
    participants: z.array(z.object({
      participantId: z.number(),
      displayOrder: z.number().min(0, 'Display order must be non-negative')
    })).default([]),
    juryScores: z.record(z.array(z.number().min(0).max(10))).default({}),
    winners: z.array(z.number()).default([]) // Backend expects array of participant IDs, not objects
  })), z.null()]).transform(val => val === null ? [] : val).default([]),
});

// Timetable-specific schema
export const timetableSchema = baseEventSchema.extend({
  slug: slugValidationSchema,
  date: z.string().min(1, 'Datum ist erforderlich'),
  time: z.string().min(1, 'Startzeit ist erforderlich'),
  end_time: z.string().min(1, 'Endzeit ist erforderlich'),
  address: z.string().max(500, 'Adresse ist zu lang').optional(),
  type: z.string().min(1),
  detailed_description: z.string().optional(),
  internal_link: z.string().url().optional().or(z.literal('')),
  additional_links: z.array(z.any()).optional()
});

// Default values for forms
export const getDefaultValues = (type) => {
  const baseDefaults = {
    title: '',
    location: '',
    description: '',
    // Status is now calculated automatically
    crew: [],
    participants: []
  };

  switch (type) {
    case 'round':
      return {
        ...baseDefaults,
        slug: '',
        date: new Date().toISOString().split('T')[0],
        start_time: '19:00',
        end_time: '22:00',
        address: '',
        after_play_report: '',
        photos_cloud_url: '',
        competition_type: 'Einzelwettbewerb',
        total_jury_members: 5,
        assignments: [],
        groups: []
      };
    
    case 'timetable':
      return {
        ...baseDefaults,
        slug: '',
        date: new Date().toISOString().split('T')[0],
        time: '10:00',
        end_time: '11:00',
        address: '',
        type: 'individual-round',
        detailed_description: '',
        internal_link: '',
        additional_links: []
      };
    
    case 'cityTip':
      return {
        name: '',
        slug: '',
        category: 'culture',
        description: 'Beschreibung des Stadt-Tipps',
        address: '',
        latitude: null,
        longitude: null,
        price_range: '€',
        opening_hours: '',
        website: '',
        images: [],
        tips: '',
        is_featured: false,
        status: 'ACTIVE'
      };
    
    default:
      return baseDefaults;
  }
};

// Role options for different participant types
export const getRoleOptions = (type) => {
  switch (type) {
    case 'crew':
      return [
        'Locationmanagement',
        'Abendleitung',
        'Laptop / Technik',
        'Moderation',
        'Wettbewerbsleitung',
        'DJ',
        'Backstage Betreuung',
        'Akkreditierung',
        'Fotos',
        'Büchertisch',
        'Einlass',
        'Social Media',
        'Runner',
        'Ticker'
      ];
    
    case 'participants':
      return ['Teilnehmer', 'Moderator', 'Technik'];
    
    case 'featureArtists':
      return ['Feature Artist', 'Support Act', 'Special Guest'];
    
    default:
      return ['Teilnehmer'];
  }
};

// Status options
export const getStatusOptions = (type) => {
  switch (type) {
    case 'round':
      return [
        { value: 'confirmed', label: 'Bestätigt' },
        { value: 'tentative', label: 'Vorläufig' },
        { value: 'upcoming', label: 'Anstehend' },
        { value: 'active', label: 'Aktiv' },
        { value: 'completed', label: 'Abgeschlossen' },
        { value: 'cancelled', label: 'Abgesagt' },
        { value: 'postponed', label: 'Verschoben' }
      ];
    
    case 'timetable':
      return [
        { value: 'confirmed', label: 'Bestätigt' },
        { value: 'tentative', label: 'Vorläufig' },
        { value: 'upcoming', label: 'Anstehend' },
        { value: 'active', label: 'Aktiv' },
        { value: 'completed', label: 'Abgeschlossen' },
        { value: 'cancelled', label: 'Abgesagt' }
      ];
    
    default:
      return [
        { value: 'upcoming', label: 'Anstehend' },
        { value: 'active', label: 'Aktiv' },
        { value: 'completed', label: 'Abgeschlossen' }
      ];
  }
};

export default {
  participantSchema,
  baseEventSchema,
  roundSchema,
  timetableSchema,
  getDefaultValues,
  getRoleOptions,
  getStatusOptions
};
