import { z } from 'zod';

// Shared validation schema for news - used by both frontend and backend
export const newsSchema = z.object({
  title: z.string().min(1, 'Titel ist erforderlich').max(255, 'Titel zu lang'),
  content: z.string().min(1, 'Inhalt ist erforderlich'),
  excerpt: z.string().max(500, 'Auszug zu lang').optional(),
  category: z.string().min(1, 'Kategorie ist erforderlich').max(100, 'Kategorie zu lang'),
  priority: z.enum(['NORMAL', 'HIGH', 'URGENT'], {
    errorMap: () => ({ message: 'Priorität muss einer von sein: NORMAL, HIGH, URGENT' })
  }).optional().default('NORMAL'),
  featured_image_url: z.string().url('Ungültige Bild-URL').optional(),
  tags: z.array(z.string().min(1, 'Tag darf nicht leer sein')).optional().default([]),
  status: z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED'], {
    errorMap: () => ({ message: 'Status muss einer von sein: ENTWURF, VERÖFFENTLICHT, ARCHIVIERT' })
  }).optional().default('DRAFT'),
  published_at: z.string().datetime('Ungültiges Veröffentlichungsdatum').optional(),
  slug: z.string().min(3, 'Slug zu kurz').max(255, 'Slug zu lang').regex(/^[a-z0-9-]+$/, 'Slug darf nur Kleinbuchstaben, Zahlen und Bindestriche enthalten'),
  is_breaking_news: z.boolean().optional().default(false),
  breaking_news_until: z.string().datetime('Ungültiges Ablaufdatum für Eilmeldung').optional()
});

// Validation helper functions
export const validateNews = (data) => {
  return newsSchema.safeParse(data);
};

export const validateNewsPartial = (data) => {
  return newsSchema.partial().safeParse(data);
};

// Schema for news updates (all fields optional except ID)
export const newsUpdateSchema = newsSchema.partial().extend({
  id: z.number().int().positive('Nachrichten-ID ist für Aktualisierungen erforderlich')
});

// Validation for news creation (no ID required)
export const newsCreateSchema = newsSchema.omit({ id: true });

// Breaking news schema
export const breakingNewsSchema = z.object({
  breaking_news_until: z.string().datetime('Ungültiges Ablaufdatum für Eilmeldung')
});

// Export individual field schemas for granular validation
export const newsFieldSchemas = {
  title: z.string().min(1).max(255),
  content: z.string().min(1),
  excerpt: z.string().max(500).optional(),
  category: z.string().min(1).max(100),
  priority: z.enum(['NORMAL', 'HIGH', 'URGENT']).optional(),
  featured_image_url: z.string().url().optional(),
  tags: z.array(z.string().min(1)).optional(),
  status: z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED']),
  published_at: z.string().datetime().optional(),
  slug: z.string().min(3).max(255).regex(/^[a-z0-9-]+$/),
  is_breaking_news: z.boolean().optional(),
  breaking_news_until: z.string().datetime().optional()
};
