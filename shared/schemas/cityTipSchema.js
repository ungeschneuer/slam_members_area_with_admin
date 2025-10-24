import { z } from 'zod';

// Shared validation schema for city tips - used by both frontend and backend
export const cityTipSchema = z.object({
  name: z.string().min(1, 'Name ist erforderlich').max(255, 'Name zu lang'),
  category: z.string().min(1, 'Kategorie ist erforderlich').max(100, 'Kategorie zu lang'),
  description: z.string().min(1, 'Beschreibung ist erforderlich'),
  address: z.string().max(500, 'Adresse zu lang').optional(),
  latitude: z.coerce.number().min(-90, 'Ungültige Breitengrad').max(90, 'Ungültige Breitengrad').optional().nullable(),
  longitude: z.coerce.number().min(-180, 'Ungültige Längengrad').max(180, 'Ungültige Längengrad').optional().nullable(),
  price_range: z.string().max(50, 'Preisbereich zu lang').optional(),
  opening_hours: z.record(z.any()).optional().default({}),
  contact_info: z.record(z.any()).optional().default({}),
  website: z.string().url('Ungültige Website-URL').optional(),
  images: z.array(z.object({
    url: z.string().url('Ungültige Bild-URL'),
    alt: z.string().optional()
  })).optional().default([]),
  slug: z.string().min(3, 'Slug zu kurz').max(255, 'Slug zu lang').regex(/^[a-z0-9-]+$/, 'Slug darf nur Kleinbuchstaben, Zahlen und Bindestriche enthalten'),
  tips: z.string().max(2000, 'Tipps zu lang').optional(),
  is_featured: z.boolean().optional().default(false),
  status: z.enum(['ACTIVE', 'INACTIVE', 'ARCHIVED'], {
    errorMap: () => ({ message: 'Status muss einer von sein: AKTIV, INAKTIV, ARCHIVIERT' })
  }).optional().default('ACTIVE')
});

// Validation helper functions
export const validateCityTip = (data) => {
  return cityTipSchema.safeParse(data);
};

export const validateCityTipPartial = (data) => {
  return cityTipSchema.partial().safeParse(data);
};

// Schema for city tip updates (all fields optional except ID)
export const cityTipUpdateSchema = cityTipSchema.partial().extend({
  id: z.number().int().positive('Stadt-Tipp-ID ist für Aktualisierungen erforderlich')
});

// Validation for city tip creation (no ID required)
export const cityTipCreateSchema = cityTipSchema.omit({ id: true });

// Export individual field schemas for granular validation
export const cityTipFieldSchemas = {
  name: z.string().min(1).max(255),
  category: z.string().min(1).max(100),
  description: z.string().min(1),
  address: z.string().max(500).optional(),
  latitude: z.coerce.number().min(-90).max(90).optional().nullable(),
  longitude: z.coerce.number().min(-180).max(180).optional().nullable(),
  price_range: z.string().max(50).optional(),
  opening_hours: z.record(z.any()).optional(),
  contact_info: z.record(z.any()).optional(),
  website: z.string().url().optional(),
  images: z.array(z.object({
    url: z.string().url(),
    alt: z.string().optional()
  })).optional(),
  slug: z.string().min(3).max(255).regex(/^[a-z0-9-]+$/),
  tips: z.string().max(2000).optional(),
  is_featured: z.boolean().optional(),
  status: z.enum(['ACTIVE', 'INACTIVE', 'ARCHIVED'])
};
