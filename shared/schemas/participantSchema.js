import { z } from 'zod';
import { ALLOWED_PARTICIPANT_ROLES } from '../constants/roles.js';

// Shared validation schema for participants - used by both frontend and backend
export const participantSchema = z.object({
  name: z.string().min(1, 'Name ist erforderlich').max(255, 'Name zu lang'),
  role: z.enum(ALLOWED_PARTICIPANT_ROLES, {
    errorMap: () => ({ message: `Rolle muss einer der erlaubten Werte sein: ${ALLOWED_PARTICIPANT_ROLES.join(', ')}` })
  }),
  region: z.string().max(100, 'Region zu lang').optional().or(z.literal('')),
  pronouns: z.string().max(50, 'Pronomen zu lang').optional(),
  instagram: z.string().max(100, 'Instagram-Handle zu lang').optional(),
  slug: z.string().min(3, 'Slug zu kurz').max(255, 'Slug zu lang').regex(/^[a-z0-9-]+$/, 'Slug darf nur Kleinbuchstaben, Zahlen und Bindestriche enthalten')
});

// Validation helper functions
export const validateParticipant = (data) => {
  return participantSchema.safeParse(data);
};

export const validateParticipantPartial = (data) => {
  return participantSchema.partial().safeParse(data);
};

// Schema for participant updates (all fields optional except ID)
export const participantUpdateSchema = participantSchema.partial().extend({
  id: z.number().int().positive('Teilnehmer-ID ist für Aktualisierungen erforderlich')
});

// Validation for participant creation (no ID required)
export const participantCreateSchema = participantSchema.omit({ id: true });

// Bulk import schema
export const participantBulkSchema = z.array(participantSchema);

// Export individual field schemas for granular validation
export const participantFieldSchemas = {
  name: z.string().min(1).max(255),
  role: z.string().min(1).max(100),
  region: z.string().max(100).optional().or(z.literal('')),
  pronouns: z.string().max(50).optional(),
  instagram: z.string().max(100).optional(),
  slug: z.string().min(3).max(255).regex(/^[a-z0-9-]+$/)
};
