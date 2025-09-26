-- Migration: Create info_pages table
-- Description: Adds table for dynamic info pages with markdown support and image uploads

CREATE TABLE IF NOT EXISTS info_pages (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL UNIQUE,
    content TEXT NOT NULL,
    excerpt TEXT,
    category VARCHAR(100) DEFAULT 'general',
    "order" INTEGER DEFAULT 0,
    status VARCHAR(50) DEFAULT 'DRAFT',
    "featuredImageUrl" TEXT,
    "metaDescription" TEXT,
    tags TEXT[] DEFAULT '{}',
    "isPublished" BOOLEAN DEFAULT false,
    "publishedAt" TIMESTAMP,
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_info_pages_slug ON info_pages(slug);
CREATE INDEX IF NOT EXISTS idx_info_pages_category ON info_pages(category);
CREATE INDEX IF NOT EXISTS idx_info_pages_status ON info_pages(status);
CREATE INDEX IF NOT EXISTS idx_info_pages_published ON info_pages("isPublished");
CREATE INDEX IF NOT EXISTS idx_info_pages_order ON info_pages("order");
CREATE INDEX IF NOT EXISTS idx_info_pages_created_at ON info_pages("createdAt");

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_info_pages_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW."updatedAt" = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_info_pages_updated_at 
    BEFORE UPDATE ON info_pages 
    FOR EACH ROW 
    EXECUTE FUNCTION update_info_pages_updated_at();

-- Insert default info pages
INSERT INTO info_pages (title, slug, content, category, "order", status, "isPublished", "publishedAt") VALUES
(
    'Awareness-Regeln',
    'awareness-regeln',
    '# Awareness-Regeln

## Grundprinzipien

Unsere Awareness-Regeln bilden die Grundlage für einen respektvollen und inklusiven Umgang miteinander.

### 1. Respekt und Wertschätzung
- Behandle alle Teilnehmer*innen mit Respekt und Würde
- Achte auf die Grenzen und Bedürfnisse anderer
- Verwende inklusive Sprache

### 2. Einvernehmlichkeit
- Hole immer explizite Zustimmung ein
- Respektiere ein "Nein" ohne Diskussion
- Achte auf non-verbale Signale

### 3. Verantwortung
- Übernimm Verantwortung für dein Handeln
- Sprich an, wenn du unangemessenes Verhalten beobachtest
- Unterstütze andere, die Hilfe benötigen

### 4. Sicherheit
- Schaffe sichere Räume für alle
- Melde Vorfälle den Awareness-Teams
- Vertraue auf dein Bauchgefühl

## Kontakt

Bei Fragen oder Vorfällen wende dich an unser Awareness-Team.',
    'rules',
    1,
    'PUBLISHED',
    true,
    CURRENT_TIMESTAMP
),
(
    'Wettbewerbsregeln',
    'wettbewerbsregeln',
    '# Wettbewerbsregeln

## Allgemeine Bestimmungen

### Teilnahme
- Offen für alle Slam-Poet*innen
- Anmeldung bis 24h vor dem Event
- Maximal 3 Minuten Performance-Zeit

### Bewertungskriterien
1. **Inhalt & Botschaft** (1-10 Punkte)
2. **Performance & Präsentation** (1-10 Punkte)
3. **Originalität & Kreativität** (1-10 Punkte)
4. **Publikumsreaktion** (1-10 Punkte)

### Jury
- 5-köpfige Jury aus Publikum
- Zufällige Auswahl vor dem Event
- Jury-Mitglieder können nicht selbst teilnehmen

### Finale
- Top 3 Teilnehmer*innen qualifizieren sich
- Finale am Ende des Abends
- Gesamtsieger*in wird gekürt

## Fairplay
- Keine Diskriminierung
- Respektvoller Umgang
- Jury-Entscheidungen sind final',
    'rules',
    2,
    'PUBLISHED',
    true,
    CURRENT_TIMESTAMP
),
(
    'Code of Conduct',
    'code-of-conduct',
    '# Code of Conduct

## Unsere Werte

Wir schaffen einen sicheren, inklusiven und respektvollen Raum für alle.

### Was wir fördern:
- **Inklusivität**: Alle sind willkommen, unabhängig von Herkunft, Geschlecht, Sexualität, Religion oder Behinderung
- **Respekt**: Behandle andere so, wie du behandelt werden möchtest
- **Kreativität**: Ermutige und unterstütze künstlerischen Ausdruck
- **Lernen**: Sei offen für neue Perspektiven und Erfahrungen

### Was wir nicht tolerieren:
- **Belästigung**: Keine Form von Belästigung, Mobbing oder Diskriminierung
- **Gewalt**: Keine physische oder verbale Gewalt
- **Drogen**: Kein Konsum illegaler Substanzen
- **Störungen**: Respektiere Performances und Veranstaltungen

### Bei Vorfällen:
1. Sprich die Person direkt an (wenn sicher)
2. Kontaktiere das Awareness-Team
3. Dokumentiere den Vorfall
4. Folge den Anweisungen des Teams

## Kontakt
- Awareness-Team: awareness@slam25.de
- Notfall: 110 (Polizei) oder 112 (Rettung)',
    'rules',
    3,
    'PUBLISHED',
    true,
    CURRENT_TIMESTAMP
);

-- Create table for uploaded images
CREATE TABLE IF NOT EXISTS info_page_images (
    id SERIAL PRIMARY KEY,
    "pageId" INTEGER REFERENCES info_pages(id) ON DELETE CASCADE,
    "fileName" VARCHAR(255) NOT NULL,
    "originalName" VARCHAR(255) NOT NULL,
    "filePath" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "mimeType" VARCHAR(100) NOT NULL,
    "uploadedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_info_page_images_page_id ON info_page_images("pageId");









