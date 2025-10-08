-- SLAM25 Database Schema
-- PostgreSQL Database Design for Poetry Slam Management System
-- Updated to match actual database structure after cleanup

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Users table
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(100) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'user',
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    phone VARCHAR(20),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP,
    is_active BOOLEAN DEFAULT true,
    email_verified BOOLEAN DEFAULT false
);

-- Participants table
CREATE TABLE participants (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    role VARCHAR(100) NOT NULL,
    region VARCHAR(100) NOT NULL,
    pronouns VARCHAR(50),
    instagram VARCHAR(255),
    slug VARCHAR(255) NOT NULL UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Rounds table
CREATE TABLE rounds (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    date DATE NOT NULL,
    "startTime" TIME NOT NULL,
    "endTime" TIME NOT NULL,
    location VARCHAR(255) NOT NULL,
    address TEXT,
    description TEXT,
    "afterPlayReport" TEXT,
    "competitionType" VARCHAR(100) DEFAULT 'Einzelwettbewerb',
    "totalJuryMembers" INTEGER DEFAULT 5,
    status VARCHAR(50) DEFAULT 'SCHEDULED',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    slug VARCHAR(255) NOT NULL UNIQUE,
    CONSTRAINT rounds_time_check CHECK ("endTime" > "startTime")
);

-- Round participants junction table
CREATE TABLE round_participants (
    id SERIAL PRIMARY KEY,
    round_id INTEGER NOT NULL REFERENCES rounds(id) ON DELETE CASCADE,
    participant_id INTEGER NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
    role VARCHAR(100) DEFAULT 'Teilnehmer',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT round_participants_round_id_participant_id_key UNIQUE (round_id, participant_id)
);

-- Round crew junction table
CREATE TABLE round_crew (
    id SERIAL PRIMARY KEY,
    round_id INTEGER NOT NULL REFERENCES rounds(id) ON DELETE CASCADE,
    participant_id INTEGER NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
    role VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT round_crew_round_id_participant_id_key UNIQUE (round_id, participant_id)
);

-- News table
CREATE TABLE news (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    excerpt TEXT,
    category VARCHAR(100),
    priority VARCHAR(50) DEFAULT 'NORMAL',
    tags TEXT[] DEFAULT '{}',
    status VARCHAR(50) DEFAULT 'DRAFT',
    "featuredImageUrl" TEXT,
    "publishedAt" TIMESTAMP,
    "isBreakingNews" BOOLEAN DEFAULT false,
    "breakingNewsUntil" TIMESTAMP,
    slug VARCHAR(255) NOT NULL UNIQUE
);

-- Timetable entries table
CREATE TABLE timetable_entries (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    "detailedDescription" TEXT,
    location VARCHAR(255),
    date DATE NOT NULL,
    time TIME NOT NULL,
    end_time TIME,
    type VARCHAR(100) DEFAULT 'general',
    status VARCHAR(50) DEFAULT 'confirmed',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    internal_link VARCHAR(255),
    round_id INTEGER REFERENCES rounds(id) ON DELETE CASCADE,
    slug VARCHAR(255) NOT NULL UNIQUE
);

-- City tips table
CREATE TABLE city_tips (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(100) NOT NULL,
    description TEXT,
    address TEXT,
    latitude NUMERIC(10, 8),
    longitude NUMERIC(11, 8),
    price_range VARCHAR(50),
    opening_hours JSONB,
    contact_info JSONB,
    website VARCHAR(255),
    images JSONB DEFAULT '[]',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    slug VARCHAR(255) NOT NULL UNIQUE,
    tips TEXT,
    is_featured BOOLEAN DEFAULT false,
    status VARCHAR(50) DEFAULT 'ACTIVE',
    CONSTRAINT city_tips_latitude_check CHECK (latitude IS NULL OR (latitude BETWEEN -90 AND 90)),
    CONSTRAINT city_tips_longitude_check CHECK (longitude IS NULL OR (longitude BETWEEN -180 AND 180)),
    CONSTRAINT city_tips_slug_format CHECK (slug ~ '^[a-z0-9-]+$'),
    CONSTRAINT city_tips_status_check CHECK (status IN ('ACTIVE', 'INACTIVE', 'DRAFT', 'ARCHIVED'))
);

-- Info pages table
CREATE TABLE info_pages (
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

-- Links table
CREATE TABLE links (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    url TEXT NOT NULL,
    icon VARCHAR(10) DEFAULT '🔗',
    category VARCHAR(100) DEFAULT 'Sonstiges',
    is_external BOOLEAN DEFAULT true,
    color VARCHAR(20) DEFAULT 'blue',
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Schnellzugriff links table
CREATE TABLE schnellzugriff_links (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    url VARCHAR(500) NOT NULL,
    icon VARCHAR(10) DEFAULT '🔗',
    color VARCHAR(20) DEFAULT 'blue',
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    is_external BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT schnellzugriff_links_color_check CHECK (color IN ('blue', 'purple', 'green', 'red', 'yellow', 'indigo', 'pink', 'orange', 'teal', 'cyan')),
    CONSTRAINT schnellzugriff_links_title_length CHECK (char_length(title) >= 1),
    CONSTRAINT schnellzugriff_links_url_length CHECK (char_length(url) >= 1)
);

-- Countdown configuration table
CREATE TABLE countdown_config (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL DEFAULT 'Countdown zum SLAM25',
    subtitle VARCHAR(500) NOT NULL DEFAULT '28. Oktober 2025 • 12:00 Uhr (Berlin Zeit)',
    target_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT '2025-10-28 11:00:00+01',
    button_text VARCHAR(100) NOT NULL DEFAULT 'Zum Zeitplan',
    button_emoji VARCHAR(10) NOT NULL DEFAULT '📅',
    button_link VARCHAR(500) NOT NULL DEFAULT '/timetable',
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Settings table
CREATE TABLE settings (
    id SERIAL PRIMARY KEY,
    key VARCHAR(255) NOT NULL UNIQUE,
    value TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Migrations table
CREATE TABLE migrations (
    id SERIAL PRIMARY KEY,
    migration_name VARCHAR(255) NOT NULL UNIQUE,
    applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_created_at ON users(created_at);

CREATE INDEX idx_participants_name ON participants(name);
CREATE INDEX idx_participants_region ON participants(region);
CREATE INDEX idx_participants_role ON participants(role);
CREATE INDEX idx_participants_created_at ON participants(created_at);
CREATE INDEX idx_participants_slug ON participants(slug);

CREATE INDEX idx_rounds_title ON rounds(title);
CREATE INDEX idx_rounds_location ON rounds(location);
CREATE INDEX idx_rounds_competitiontype ON rounds("competitionType");
CREATE INDEX idx_rounds_status ON rounds(status);
CREATE INDEX idx_rounds_slug ON rounds(slug);

CREATE INDEX idx_round_participants_round_id ON round_participants(round_id);
CREATE INDEX idx_round_participants_participant_id ON round_participants(participant_id);
CREATE INDEX idx_round_participants_role ON round_participants(role);
CREATE INDEX idx_round_participants_created_at ON round_participants(created_at);

CREATE INDEX idx_round_crew_round_id ON round_crew(round_id);
CREATE INDEX idx_round_crew_participant_id ON round_crew(participant_id);
CREATE INDEX idx_round_crew_role ON round_crew(role);

CREATE INDEX idx_news_title ON news(title);
CREATE INDEX idx_news_category ON news(category);
CREATE INDEX idx_news_status ON news(status);
CREATE INDEX idx_news_publishedat ON news("publishedAt");
CREATE INDEX idx_news_breaking_news ON news("isBreakingNews", "breakingNewsUntil") WHERE "isBreakingNews" = true;
CREATE INDEX idx_news_slug ON news(slug);

CREATE INDEX idx_timetable_title ON timetable_entries(title);
CREATE INDEX idx_timetable_date ON timetable_entries(date);
CREATE INDEX idx_timetable_type ON timetable_entries(type);
CREATE INDEX idx_timetable_status ON timetable_entries(status);
CREATE INDEX idx_timetable_slug ON timetable_entries(slug);

CREATE INDEX idx_city_tips_name ON city_tips(name);
CREATE INDEX idx_city_tips_category ON city_tips(category);
CREATE INDEX idx_city_tips_slug ON city_tips(slug);
CREATE INDEX idx_city_tips_featured ON city_tips(is_featured);
CREATE INDEX idx_city_tips_status ON city_tips(status);

CREATE INDEX idx_info_pages_slug ON info_pages(slug);
CREATE INDEX idx_info_pages_category ON info_pages(category);
CREATE INDEX idx_info_pages_status ON info_pages(status);
CREATE INDEX idx_info_pages_published ON info_pages("isPublished");
CREATE INDEX idx_info_pages_order ON info_pages("order");
CREATE INDEX idx_info_pages_created_at ON info_pages("createdAt");

CREATE INDEX idx_links_active ON links(is_active);
CREATE INDEX idx_links_category ON links(category);
CREATE INDEX idx_links_sort_order ON links(sort_order);
CREATE INDEX idx_links_created_at ON links(created_at);

CREATE INDEX idx_schnellzugriff_links_active ON schnellzugriff_links(is_active);
CREATE INDEX idx_schnellzugriff_links_sort_order ON schnellzugriff_links(sort_order);
CREATE INDEX idx_schnellzugriff_links_created_at ON schnellzugriff_links(created_at);

CREATE INDEX idx_countdown_config_active ON countdown_config(is_active);
CREATE INDEX idx_countdown_config_updated ON countdown_config(updated_at);

CREATE INDEX idx_settings_key ON settings(key);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_participants_updated_at BEFORE UPDATE ON participants FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_rounds_updated_at BEFORE UPDATE ON rounds FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_round_participants_updated_at BEFORE UPDATE ON round_participants FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_round_crew_updated_at BEFORE UPDATE ON round_crew FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_news_updated_at BEFORE UPDATE ON news FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_timetable_updated_at BEFORE UPDATE ON timetable_entries FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_city_tips_updated_at BEFORE UPDATE ON city_tips FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_info_pages_updated_at BEFORE UPDATE ON info_pages FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_links_updated_at BEFORE UPDATE ON links FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_schnellzugriff_links_updated_at BEFORE UPDATE ON schnellzugriff_links FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_countdown_config_updated_at BEFORE UPDATE ON countdown_config FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_settings_updated_at BEFORE UPDATE ON settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create views for common queries
CREATE VIEW upcoming_rounds AS
SELECT * FROM rounds WHERE date > CURRENT_DATE ORDER BY date ASC;

CREATE VIEW active_participants AS
SELECT * FROM participants ORDER BY name ASC;

-- Create functions for common operations
CREATE OR REPLACE FUNCTION get_participant_count()
RETURNS INTEGER AS $$
BEGIN
    RETURN (SELECT COUNT(*) FROM participants);
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION get_round_count()
RETURNS INTEGER AS $$
BEGIN
    RETURN (SELECT COUNT(*) FROM rounds);
END;
$$ LANGUAGE plpgsql;

-- Grant permissions (adjust as needed for your setup)
-- GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO slam_user;
-- GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO slam_user;
-- GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO slam_user;