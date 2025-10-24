import { z } from 'zod';

// Shared validation schema for rounds - used by both frontend and backend
export const roundSchema = z.object({
  title: z.string().min(1, 'Titel ist erforderlich').max(255, 'Titel zu lang'),
  slug: z.string().min(3, 'Slug zu kurz').max(255, 'Slug zu lang').regex(/^[a-z0-9-]+$/, 'Slug darf nur Kleinbuchstaben, Zahlen und Bindestriche enthalten'),
  date: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Datum muss im Format YYYY-MM-DD sein')
    .refine((date) => {
      const parsedDate = new Date(date);
      return !isNaN(parsedDate.getTime());
    }, 'Ungültiges Datum')
    .refine((date) => {
      const parsedDate = new Date(date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return parsedDate >= today;
    }, 'Datum darf nicht in der Vergangenheit liegen'),
  start_time: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?$/, 'Startzeit muss im Format HH:MM oder HH:MM:SS sein'),
  end_time: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?$/, 'Endzeit muss im Format HH:MM oder HH:MM:SS sein'),
  location: z.string().min(1, 'Ort ist erforderlich').max(255, 'Ort zu lang'),
  address: z.string().max(500, 'Adresse zu lang').optional(),
  description: z.string().max(2000, 'Beschreibung zu lang').optional(),
  after_play_report: z.string().optional(),
  competition_type: z.enum(['Einzelwettbewerb', 'Teamwettbewerb'], {
    errorMap: () => ({ message: 'Wettbewerbstyp muss einer von sein: Einzelwettbewerb, Teamwettbewerb' })
  }),
  total_jury_members: z.number().int().min(1, 'Muss mindestens 1 Jurymitglied haben').max(20, 'Kann nicht mehr als 20 Jurymitglieder haben'),
  
  // Assignments array with roles and metadata
  assignments: z.array(z.object({
    participant_id: z.number().int().positive('Teilnehmer-ID muss positiv sein'),
    roles: z.array(z.string().min(1, 'Rolle darf nicht leer sein')).min(1, 'Muss mindestens eine Rolle haben'),
    metadata: z.object({}).optional()
  })).optional().default([]),
  
  groups: z.array(z.object({
    id: z.number().int().positive().nullable().optional(),
    name: z.string().min(1, 'Gruppenname ist erforderlich').max(255, 'Gruppenname zu lang'),
    displayOrder: z.number().int().min(0, 'Anzeigereihenfolge muss nicht-negativ sein'),
    participants: z.array(z.object({
      participantId: z.number().int().positive('Teilnehmer-ID muss positiv sein'),
      displayOrder: z.number().int().min(0, 'Anzeigereihenfolge muss nicht-negativ sein')
    })).optional().default([]),
    juryScores: z.record(z.array(z.number().min(0, 'Punktzahl muss nicht-negativ sein').max(10, 'Punktzahl darf nicht über 10 liegen'))).optional().default({}),
    winners: z.array(z.number().int().positive('Teilnehmer-ID muss positiv sein')).optional().default([])
  })).optional().default([])
});

// Validation helper functions
export const validateRound = (data) => {
  return roundSchema.safeParse(data);
};

export const validateRoundPartial = (data) => {
  return roundSchema.partial().safeParse(data);
};

// Schema for round updates (all fields optional except ID)
export const roundUpdateSchema = roundSchema.partial().extend({
  id: z.number().int().positive('Runden-ID ist für Aktualisierungen erforderlich')
});

// Validation for round creation (no ID required)
export const roundCreateSchema = roundSchema.omit({ id: true });

// Export individual field schemas for granular validation
export const roundFieldSchemas = {
  title: z.string().min(1).max(255),
  slug: z.string().min(3).max(255).regex(/^[a-z0-9-]+$/),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  start_time: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?$/),
  end_time: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?$/),
  location: z.string().min(1).max(255),
  address: z.string().max(500).optional(),
  description: z.string().max(2000).optional(),
  after_play_report: z.string().optional(),
  competition_type: z.enum(['Einzelwettbewerb', 'Teamwettbewerb', 'Show', 'Workshop']),
  total_jury_members: z.number().int().min(1).max(20)
};

