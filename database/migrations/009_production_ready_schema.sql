-- Migration: 009_production_ready_schema.sql
-- Description: Adds production-ready tables for security, monitoring, and GDPR compliance
-- Created: 2025-01-16
-- Author: AI Assistant

-- Security and monitoring tables
CREATE TABLE IF NOT EXISTS security_incidents (
    id SERIAL PRIMARY KEY,
    incident_id VARCHAR(255) UNIQUE NOT NULL,
    type VARCHAR(100) NOT NULL,
    ip_address INET NOT NULL,
    count INTEGER DEFAULT 1,
    status VARCHAR(50) DEFAULT 'ACTIVE',
    severity VARCHAR(20) DEFAULT 'MEDIUM',
    action VARCHAR(100),
    details JSONB,
    first_seen TIMESTAMP DEFAULT NOW(),
    last_seen TIMESTAMP DEFAULT NOW(),
    escalated_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS token_revocations (
    id SERIAL PRIMARY KEY,
    token VARCHAR(255) UNIQUE NOT NULL,
    reason VARCHAR(100) NOT NULL,
    user_id INTEGER,
    revoked_at TIMESTAMP DEFAULT NOW(),
    INDEX idx_token_revocations_token (token),
    INDEX idx_token_revocations_user_id (user_id),
    INDEX idx_token_revocations_revoked_at (revoked_at)
);

CREATE TABLE IF NOT EXISTS blocked_ips (
    id SERIAL PRIMARY KEY,
    ip_address INET UNIQUE NOT NULL,
    reason TEXT,
    expires_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    INDEX idx_blocked_ips_ip_address (ip_address),
    INDEX idx_blocked_ips_expires_at (expires_at)
);

CREATE TABLE IF NOT EXISTS system_metrics (
    id SERIAL PRIMARY KEY,
    requests INTEGER DEFAULT 0,
    errors INTEGER DEFAULT 0,
    avg_response_time DECIMAL(10,2),
    database_queries INTEGER DEFAULT 0,
    database_errors INTEGER DEFAULT 0,
    active_sessions INTEGER DEFAULT 0,
    memory_usage DECIMAL(5,2),
    cpu_usage DECIMAL(5,2),
    created_at TIMESTAMP DEFAULT NOW(),
    INDEX idx_system_metrics_created_at (created_at)
);

CREATE TABLE IF NOT EXISTS system_alerts (
    id SERIAL PRIMARY KEY,
    type VARCHAR(100) NOT NULL,
    severity VARCHAR(20) NOT NULL,
    message TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    INDEX idx_system_alerts_type (type),
    INDEX idx_system_alerts_severity (severity),
    INDEX idx_system_alerts_created_at (created_at)
);

-- Backup and disaster recovery tables
CREATE TABLE IF NOT EXISTS backup_history (
    id SERIAL PRIMARY KEY,
    type VARCHAR(50) NOT NULL,
    filename VARCHAR(255) NOT NULL,
    filepath VARCHAR(500),
    size BIGINT DEFAULT 0,
    description TEXT,
    status VARCHAR(50) DEFAULT 'pending',
    error_message TEXT,
    last_restored TIMESTAMP,
    restore_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    INDEX idx_backup_history_type (type),
    INDEX idx_backup_history_status (status),
    INDEX idx_backup_history_created_at (created_at)
);

-- GDPR compliance tables
CREATE TABLE IF NOT EXISTS gdpr_audit_log (
    id SERIAL PRIMARY KEY,
    action VARCHAR(100) NOT NULL,
    user_id INTEGER,
    details JSONB,
    created_at TIMESTAMP DEFAULT NOW(),
    INDEX idx_gdpr_audit_log_action (action),
    INDEX idx_gdpr_audit_log_user_id (user_id),
    INDEX idx_gdpr_audit_log_created_at (created_at)
);

-- Enhanced user activity logging
CREATE TABLE IF NOT EXISTS user_activity_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER,
    action VARCHAR(100) NOT NULL,
    resource VARCHAR(100),
    ip_address INET,
    user_agent TEXT,
    details JSONB,
    created_at TIMESTAMP DEFAULT NOW(),
    INDEX idx_user_activity_logs_user_id (user_id),
    INDEX idx_user_activity_logs_action (action),
    INDEX idx_user_activity_logs_created_at (created_at)
);

-- Page view tracking
CREATE TABLE IF NOT EXISTS page_views (
    id SERIAL PRIMARY KEY,
    user_id INTEGER,
    page VARCHAR(255) NOT NULL,
    ip_address INET,
    user_agent TEXT,
    referrer VARCHAR(500),
    session_id VARCHAR(255),
    created_at TIMESTAMP DEFAULT NOW(),
    INDEX idx_page_views_user_id (user_id),
    INDEX idx_page_views_page (page),
    INDEX idx_page_views_created_at (created_at)
);

-- Enhanced audit logging
CREATE TABLE IF NOT EXISTS audit_log (
    id SERIAL PRIMARY KEY,
    action VARCHAR(100) NOT NULL,
    table_name VARCHAR(100),
    record_id INTEGER,
    old_values JSONB,
    new_values JSONB,
    user_id INTEGER,
    ip_address INET,
    created_at TIMESTAMP DEFAULT NOW(),
    INDEX idx_audit_log_action (action),
    INDEX idx_audit_log_table_name (table_name),
    INDEX idx_audit_log_user_id (user_id),
    INDEX idx_audit_log_created_at (created_at)
);

-- Performance monitoring
CREATE TABLE IF NOT EXISTS performance_metrics (
    id SERIAL PRIMARY KEY,
    endpoint VARCHAR(255) NOT NULL,
    method VARCHAR(10) NOT NULL,
    response_time INTEGER NOT NULL,
    status_code INTEGER NOT NULL,
    user_id INTEGER,
    ip_address INET,
    created_at TIMESTAMP DEFAULT NOW(),
    INDEX idx_performance_metrics_endpoint (endpoint),
    INDEX idx_performance_metrics_response_time (response_time),
    INDEX idx_performance_metrics_created_at (created_at)
);

-- Rate limiting tracking
CREATE TABLE IF NOT EXISTS rate_limit_tracking (
    id SERIAL PRIMARY KEY,
    ip_address INET NOT NULL,
    endpoint VARCHAR(255) NOT NULL,
    request_count INTEGER DEFAULT 1,
    window_start TIMESTAMP DEFAULT NOW(),
    window_end TIMESTAMP DEFAULT NOW() + INTERVAL '15 minutes',
    created_at TIMESTAMP DEFAULT NOW(),
    INDEX idx_rate_limit_tracking_ip_endpoint (ip_address, endpoint),
    INDEX idx_rate_limit_tracking_window (window_start, window_end)
);

-- Security functions
CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM user_sessions WHERE expires_at < NOW();
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION cleanup_expired_tokens()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM token_revocations WHERE revoked_at < NOW() - INTERVAL '30 days';
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION cleanup_old_metrics()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM system_metrics WHERE created_at < NOW() - INTERVAL '7 days';
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Triggers for audit logging
CREATE OR REPLACE FUNCTION audit_trigger_function()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO audit_log (action, table_name, record_id, new_values, created_at)
        VALUES ('INSERT', TG_TABLE_NAME, NEW.id, row_to_json(NEW), NOW());
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        INSERT INTO audit_log (action, table_name, record_id, old_values, new_values, created_at)
        VALUES ('UPDATE', TG_TABLE_NAME, NEW.id, row_to_json(OLD), row_to_json(NEW), NOW());
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        INSERT INTO audit_log (action, table_name, record_id, old_values, created_at)
        VALUES ('DELETE', TG_TABLE_NAME, OLD.id, row_to_json(OLD), NOW());
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Apply audit triggers to sensitive tables
CREATE TRIGGER users_audit_trigger
    AFTER INSERT OR UPDATE OR DELETE ON users
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

CREATE TRIGGER user_sessions_audit_trigger
    AFTER INSERT OR UPDATE OR DELETE ON user_sessions
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

CREATE TRIGGER participants_audit_trigger
    AFTER INSERT OR UPDATE OR DELETE ON participants
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at);

CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_session_token ON user_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_user_sessions_expires_at ON user_sessions(expires_at);

CREATE INDEX IF NOT EXISTS idx_participants_name ON participants(name);
CREATE INDEX IF NOT EXISTS idx_participants_role ON participants(role);
CREATE INDEX IF NOT EXISTS idx_participants_region ON participants(region);

-- Views for monitoring
CREATE OR REPLACE VIEW system_health AS
SELECT 
    (SELECT COUNT(*) FROM users) as total_users,
    (SELECT COUNT(*) FROM user_sessions WHERE expires_at > NOW()) as active_sessions,
    (SELECT COUNT(*) FROM participants) as total_participants,
    (SELECT COUNT(*) FROM system_alerts WHERE created_at > NOW() - INTERVAL '1 hour') as recent_alerts,
    (SELECT AVG(avg_response_time) FROM system_metrics WHERE created_at > NOW() - INTERVAL '1 hour') as avg_response_time,
    (SELECT COUNT(*) FROM blocked_ips WHERE expires_at > NOW()) as blocked_ips;

-- Insert migration record
INSERT INTO migrations (migration_name) VALUES ('009_production_ready_schema.sql');

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO slam_user;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO slam_user;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO slam_user;





