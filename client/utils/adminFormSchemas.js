import { z } from 'zod';
import { getSlugSchemaConfig, validateSlugFormat } from '../../server/config/slugConfig.js';

/**
 * Shared form schemas for admin components
 * Provides consistent validation across all admin forms
 */

// Centralized slug validation schema
const slugSchemaConfig = getSlugSchemaConfig();
export const slugValidationSchema = z.string()
  .min(slugSchemaConfig.min, slugSchemaConfig.message.min)
  .max(slugSchemaConfig.max, slugSchemaConfig.message.max)
  .regex(slugSchemaConfig.regex, slugSchemaConfig.message.regex)
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

// Base event/round schema
export const baseEventSchema = z.object({
  title: z.string().min(1, 'Titel ist erforderlich'),
  location: z.string().min(1, 'Ort ist erforderlich'),
  description: z.string().min(1, 'Beschreibung ist erforderlich'),
  // Status is now calculated automatically based on date and time
  crew: z.array(participantSchema).optional(),
  participants: z.array(participantSchema).optional()
});

// Round-specific schema
export const roundSchema = baseEventSchema.extend({
  slug: slugValidationSchema,
  date: z.string().min(1, 'Datum ist erforderlich'),
  startTime: z.string().min(1, 'Startzeit ist erforderlich'),
  endTime: z.string().min(1, 'Endzeit ist erforderlich'),
  address: z.string().optional(),
  afterPlayReport: z.string().optional(),
  competitionType: z.string().min(1),
  totalJuryMembers: z.number().min(1).max(20),
  tournamentParticipants: z.array(participantSchema).optional(),
  groups: z.array(z.any()).optional(),
  featureArtists: z.array(participantSchema).optional(),
  moderation: z.array(participantSchema).optional()
});

// Timetable-specific schema
export const timetableSchema = baseEventSchema.extend({
  slug: slugValidationSchema,
  date: z.string().min(1, 'Datum ist erforderlich'),
  time: z.string().min(1, 'Startzeit ist erforderlich'),
  end_time: z.string().min(1, 'Endzeit ist erforderlich'),
  type: z.string().min(1),
  detailedDescription: z.string().optional(),
  internalLink: z.string().url().optional().or(z.literal('')),
  additionalLinks: z.array(z.any()).optional()
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
        startTime: '19:00',
        endTime: '22:00',
        address: '',
        afterPlayReport: '',
        competitionType: 'Einzelwettbewerb',
        totalJuryMembers: 5,
        tournamentParticipants: [],
        groups: [],
        featureArtists: [],
        moderation: []
      };
    
    case 'timetable':
      return {
        ...baseDefaults,
        slug: '',
        date: new Date().toISOString().split('T')[0],
        time: '10:00',
        end_time: '11:00',
        type: 'individual-round',
        detailedDescription: '',
        internalLink: '',
        additionalLinks: []
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
      return ['Teilnehmer', 'Jury', 'Moderator', 'Technik'];
    
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
        { value: 'upcoming', label: 'Anstehend' },
        { value: 'active', label: 'Aktiv' },
        { value: 'completed', label: 'Abgeschlossen' }
      ];
    
    case 'timetable':
      return [
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
