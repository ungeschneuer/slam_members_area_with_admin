-- SLAM25 Database Schema
-- PostgreSQL Database Design for Poetry Slam Management System
-- Updated to match actual database structure

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

-- User sessions table (REMOVED - using stateless JWT authentication)
-- Sessions are now handled via JWT tokens in httpOnly cookies

-- Participants table (simplified structure)
CREATE TABLE participants (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    role VARCHAR(100) NOT NULL,
    region VARCHAR(100) NOT NULL,
    pronouns VARCHAR(50),
    instagram VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Rounds table (simplified structure)
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
    crew JSONB DEFAULT '[]',
    "tournamentParticipants" INTEGER[] DEFAULT '{}',
    groups JSONB DEFAULT '[]',
    "featureArtists" JSONB DEFAULT '[]',
    "totalJuryMembers" INTEGER DEFAULT 5,
    status VARCHAR(50) DEFAULT 'SCHEDULED',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    slug VARCHAR(255) NOT NULL UNIQUE,
    CONSTRAINT rounds_time_check CHECK ("endTime" > "startTime")
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
    -- "authorId" VARCHAR(100), -- Removed: No author tracking needed
    "featuredImageUrl" TEXT,
    "publishedAt" TIMESTAMP,
    "isBreakingNews" BOOLEAN DEFAULT false,
    "breakingNewsUntil" TIMESTAMP
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
    type VARCHAR(100) DEFAULT 'general', -- Valid values: team-round, individual-round, workshop, fun, aftershow, general
    status VARCHAR(50) DEFAULT 'confirmed',
    participants JSONB DEFAULT '[]',
    "additionalLinks" JSONB DEFAULT '[]',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    end_time TIME,
    internal_link VARCHAR(255),
    round_id INTEGER REFERENCES rounds(id) ON DELETE CASCADE
);

-- City tips table (renamed from city_locations)
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

-- Analytics tables removed - not needed for read-only portal

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

-- Info page images table
CREATE TABLE info_page_images (
    id SERIAL PRIMARY KEY,
    "pageId" INTEGER NOT NULL REFERENCES info_pages(id) ON DELETE CASCADE,
    "fileName" VARCHAR(255) NOT NULL,
    "originalName" VARCHAR(255) NOT NULL,
    "filePath" VARCHAR(500) NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "mimeType" VARCHAR(100) NOT NULL,
    "uploadedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
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

-- Audit log table
CREATE TABLE audit_log (
    id SERIAL PRIMARY KEY,
    action VARCHAR(10) NOT NULL,
    table_name VARCHAR(50) NOT NULL,
    record_id INTEGER,
    old_values JSONB,
    new_values JSONB,
    created_at TIMESTAMP DEFAULT now()
);

-- Security incidents table
CREATE TABLE security_incidents (
    id SERIAL PRIMARY KEY,
    incident_id VARCHAR(255) NOT NULL UNIQUE,
    type VARCHAR(100) NOT NULL,
    ip_address INET NOT NULL,
    count INTEGER DEFAULT 1,
    status VARCHAR(50) DEFAULT 'ACTIVE',
    severity VARCHAR(20) DEFAULT 'MEDIUM',
    action VARCHAR(100),
    details JSONB,
    first_seen TIMESTAMP DEFAULT now(),
    last_seen TIMESTAMP DEFAULT now(),
    escalated_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT now()
);

-- System metrics table
CREATE TABLE system_metrics (
    id SERIAL PRIMARY KEY,
    metric_name VARCHAR(100) NOT NULL,
    metric_value NUMERIC(15,4) NOT NULL,
    unit VARCHAR(20),
    tags JSONB,
    created_at TIMESTAMP DEFAULT now()
);

-- System alerts table
CREATE TABLE system_alerts (
    id SERIAL PRIMARY KEY,
    alert_type VARCHAR(100) NOT NULL,
    severity VARCHAR(20) NOT NULL,
    message TEXT NOT NULL,
    details JSONB,
    is_resolved BOOLEAN DEFAULT false,
    resolved_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT now()
);

-- Token revocations table
CREATE TABLE token_revocations (
    id SERIAL PRIMARY KEY,
    token_hash VARCHAR(255) NOT NULL UNIQUE,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    revoked_at TIMESTAMP DEFAULT now(),
    reason VARCHAR(100)
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
-- User session indexes (REMOVED - no longer needed with JWT authentication)
CREATE INDEX idx_participants_name ON participants(name);
CREATE INDEX idx_participants_region ON participants(region);
CREATE INDEX idx_participants_role ON participants(role);
CREATE INDEX idx_participants_created_at ON participants(created_at);
CREATE INDEX idx_rounds_title ON rounds(title);
CREATE INDEX idx_rounds_startdatetime ON rounds("startDateTime");
CREATE INDEX idx_rounds_location ON rounds(location);
CREATE INDEX idx_rounds_competitiontype ON rounds("competitionType");
CREATE INDEX idx_rounds_status ON rounds(status);
CREATE INDEX idx_rounds_slug ON rounds(slug);
CREATE INDEX idx_news_title ON news(title);
CREATE INDEX idx_news_category ON news(category);
CREATE INDEX idx_news_status ON news(status);
CREATE INDEX idx_news_publishedat ON news("publishedAt");
CREATE INDEX idx_news_breaking_news ON news("isBreakingNews", "breakingNewsUntil") WHERE "isBreakingNews" = true;
CREATE INDEX idx_timetable_title ON timetable_entries(title);
CREATE INDEX idx_timetable_date ON timetable_entries(date);
CREATE INDEX idx_timetable_type ON timetable_entries(type);
CREATE INDEX idx_timetable_status ON timetable_entries(status);
CREATE INDEX idx_timetable_end_time ON timetable_entries(end_time);
CREATE INDEX idx_timetable_round_id ON timetable_entries(round_id);
CREATE INDEX idx_city_tips_name ON city_tips(name);
CREATE INDEX idx_city_tips_category ON city_tips(category);
-- CREATE INDEX idx_city_tips_rating ON city_tips(rating); -- Rating column removed
CREATE INDEX idx_city_tips_slug ON city_tips(slug);
CREATE INDEX idx_city_tips_featured ON city_tips(is_featured);
CREATE INDEX idx_city_tips_status ON city_tips(status);
-- Analytics table indexes removed
CREATE INDEX idx_info_pages_slug ON info_pages(slug);
CREATE INDEX idx_info_pages_category ON info_pages(category);
CREATE INDEX idx_info_pages_status ON info_pages(status);
CREATE INDEX idx_info_pages_published ON info_pages("isPublished");
CREATE INDEX idx_info_pages_order ON info_pages("order");
CREATE INDEX idx_info_pages_created_at ON info_pages("createdAt");
CREATE INDEX idx_links_active ON links(is_active);
CREATE INDEX idx_links_category ON links(category);
CREATE INDEX idx_links_sort ON links(sort_order);
CREATE INDEX idx_links_sort_order ON links(sort_order);
CREATE INDEX idx_links_created_at ON links(created_at);
CREATE INDEX idx_countdown_config_active ON countdown_config(is_active);
CREATE INDEX idx_countdown_config_updated ON countdown_config(updated_at);

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
CREATE TRIGGER update_news_updated_at BEFORE UPDATE ON news FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_timetable_updated_at BEFORE UPDATE ON timetable_entries FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
-- CREATE TRIGGER update_city_locations_updated_at BEFORE UPDATE ON city_locations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column(); -- Table renamed to city_tips
CREATE TRIGGER update_city_tips_updated_at BEFORE UPDATE ON city_tips FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create views for common queries
-- CREATE VIEW published_news AS
-- SELECT * FROM news WHERE is_published = true AND published_at IS NOT NULL; -- View removed, using direct queries instead

CREATE VIEW upcoming_rounds AS
SELECT * FROM rounds WHERE startdatetime > CURRENT_TIMESTAMP ORDER BY startdatetime ASC;

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

CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    -- No longer needed with JWT authentication
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Grant permissions (adjust as needed for your setup)
-- GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO slam_user;
-- GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO slam_user;
-- GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO slam_user;
