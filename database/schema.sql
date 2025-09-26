-- SLAM25 Database Schema
-- PostgreSQL Database Design for Poetry Slam Management System
-- Updated to match actual database structure

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Users table
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'member',
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    pronouns VARCHAR(50),
    phone VARCHAR(20),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP,
    is_active BOOLEAN DEFAULT true,
    email_verified BOOLEAN DEFAULT false,
    CONSTRAINT users_email_check CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
    CONSTRAINT users_username_check CHECK (username ~* '^[a-zA-Z0-9_-]{3,50}$')
);

-- User sessions table
CREATE TABLE user_sessions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    session_token VARCHAR(255) UNIQUE NOT NULL,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NOT NULL,
    is_remember_me BOOLEAN DEFAULT false,
    last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT user_sessions_expires_at_check CHECK (expires_at > created_at)
);

-- Participants table (simplified structure)
CREATE TABLE participants (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    rolle VARCHAR(100) NOT NULL,
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
    startdatetime TIMESTAMP NOT NULL,
    enddatetime TIMESTAMP NOT NULL,
    location VARCHAR(255) NOT NULL,
    address TEXT,
    description TEXT,
    afterplayreport TEXT,
    competitiontype VARCHAR(100) DEFAULT 'Einzelwettbewerb',
    crew JSONB DEFAULT '[]',
    tournamentparticipants INTEGER[] DEFAULT '{}',
    groups JSONB DEFAULT '[]',
    featureartists JSONB DEFAULT '[]',
    totaljurymembers INTEGER DEFAULT 5,
    status VARCHAR(50) DEFAULT 'SCHEDULED',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT rounds_time_check CHECK (enddatetime > startdatetime)
);

-- News table
CREATE TABLE news (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    content_type VARCHAR(100) DEFAULT 'announcement',
    is_published BOOLEAN DEFAULT false,
    published_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT news_title_length_check CHECK (char_length(title) >= 3)
);

-- Timetable entries table
CREATE TABLE timetable_entries (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    detaileddescription TEXT,
    location VARCHAR(255),
    date DATE NOT NULL,
    time TIME NOT NULL,
    type VARCHAR(100) DEFAULT 'general',
    status VARCHAR(50) DEFAULT 'confirmed',
    participants JSONB DEFAULT '[]',
    additionallinks JSONB DEFAULT '[]',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- City locations table
CREATE TABLE city_locations (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(100) NOT NULL,
    description TEXT,
    address TEXT,
    latitude NUMERIC(10, 8),
    longitude NUMERIC(11, 8),
    rating NUMERIC(3, 2),
    price_range VARCHAR(50),
    opening_hours JSONB,
    contact_info JSONB,
    website VARCHAR(255),
    images JSONB DEFAULT '[]',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT city_locations_latitude_check CHECK (latitude IS NULL OR (latitude BETWEEN -90 AND 90)),
    CONSTRAINT city_locations_longitude_check CHECK (longitude IS NULL OR (longitude BETWEEN -180 AND 180)),
    CONSTRAINT city_locations_rating_check CHECK (rating IS NULL OR (rating >= 0 AND rating <= 5))
);

-- User activity log table
CREATE TABLE user_activity_log (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    details JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Page views table
CREATE TABLE page_views (
    id SERIAL PRIMARY KEY,
    page_name VARCHAR(255) NOT NULL,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    session_id VARCHAR(255),
    ip_address INET,
    user_agent TEXT,
    referrer VARCHAR(500),
    visit_duration INTEGER, -- in seconds
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
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
CREATE INDEX idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX idx_user_sessions_token ON user_sessions(session_token);
CREATE INDEX idx_user_sessions_expires_at ON user_sessions(expires_at);
CREATE INDEX idx_participants_name ON participants(name);
CREATE INDEX idx_participants_region ON participants(region);
CREATE INDEX idx_participants_rolle ON participants(rolle);
CREATE INDEX idx_participants_created_at ON participants(created_at);
CREATE INDEX idx_rounds_title ON rounds(title);
CREATE INDEX idx_rounds_startdatetime ON rounds(startdatetime);
CREATE INDEX idx_rounds_location ON rounds(location);
CREATE INDEX idx_rounds_competitiontype ON rounds(competitiontype);
CREATE INDEX idx_rounds_status ON rounds(status);
CREATE INDEX idx_news_title ON news(title);
CREATE INDEX idx_news_content_type ON news(content_type);
CREATE INDEX idx_news_is_published ON news(is_published);
CREATE INDEX idx_news_published_at ON news(published_at);
CREATE INDEX idx_timetable_title ON timetable_entries(title);
CREATE INDEX idx_timetable_date ON timetable_entries(date);
CREATE INDEX idx_timetable_type ON timetable_entries(type);
CREATE INDEX idx_timetable_status ON timetable_entries(status);
CREATE INDEX idx_city_locations_name ON city_locations(name);
CREATE INDEX idx_city_locations_category ON city_locations(category);
CREATE INDEX idx_city_locations_rating ON city_locations(rating);
CREATE INDEX idx_user_activity_log_user_id ON user_activity_log(user_id);
CREATE INDEX idx_user_activity_log_created_at ON user_activity_log(created_at);
CREATE INDEX idx_page_views_page_name ON page_views(page_name);
CREATE INDEX idx_page_views_created_at ON page_views(created_at);

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
CREATE TRIGGER update_city_locations_updated_at BEFORE UPDATE ON city_locations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create views for common queries
CREATE VIEW published_news AS
SELECT * FROM news WHERE is_published = true AND published_at IS NOT NULL;

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
    DELETE FROM user_sessions WHERE expires_at < CURRENT_TIMESTAMP;
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Grant permissions (adjust as needed for your setup)
-- GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO slam_user;
-- GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO slam_user;
-- GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO slam_user;
