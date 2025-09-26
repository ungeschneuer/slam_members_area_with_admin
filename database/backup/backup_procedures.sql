-- Database Backup and Recovery Procedures
-- SLAM25 Database Management Scripts

-- =====================================================
-- BACKUP PROCEDURES
-- =====================================================

-- Function to create a full database backup
CREATE OR REPLACE FUNCTION create_full_backup(backup_path TEXT DEFAULT '/var/backups/slam25/')
RETURNS TEXT AS $$
DECLARE
    backup_file TEXT;
    backup_name TEXT;
    timestamp_str TEXT;
BEGIN
    -- Create timestamp for backup name
    timestamp_str := to_char(CURRENT_TIMESTAMP, 'YYYY-MM-DD_HH24-MI-SS');
    backup_name := 'slam25_full_backup_' || timestamp_str || '.sql';
    backup_file := backup_path || backup_name;
    
    -- Execute pg_dump command (this would need to be run from shell)
    -- For now, we'll return the command that should be executed
    RETURN 'pg_dump -h localhost -U slam_user -d slam25_db -f ' || backup_file || ' --verbose --clean --if-exists';
END;
$$ LANGUAGE plpgsql;

-- Function to create a data-only backup (without schema)
CREATE OR REPLACE FUNCTION create_data_backup(backup_path TEXT DEFAULT '/var/backups/slam25/')
RETURNS TEXT AS $$
DECLARE
    backup_file TEXT;
    backup_name TEXT;
    timestamp_str TEXT;
BEGIN
    timestamp_str := to_char(CURRENT_TIMESTAMP, 'YYYY-MM-DD_HH24-MI-SS');
    backup_name := 'slam25_data_backup_' || timestamp_str || '.sql';
    backup_file := backup_path || backup_name;
    
    RETURN 'pg_dump -h localhost -U slam_user -d slam25_db -f ' || backup_file || ' --data-only --verbose';
END;
$$ LANGUAGE plpgsql;

-- Function to create a schema-only backup
CREATE OR REPLACE FUNCTION create_schema_backup(backup_path TEXT DEFAULT '/var/backups/slam25/')
RETURNS TEXT AS $$
DECLARE
    backup_file TEXT;
    backup_name TEXT;
    timestamp_str TEXT;
BEGIN
    timestamp_str := to_char(CURRENT_TIMESTAMP, 'YYYY-MM-DD_HH24-MI-SS');
    backup_name := 'slam25_schema_backup_' || timestamp_str || '.sql';
    backup_file := backup_path || backup_name;
    
    RETURN 'pg_dump -h localhost -U slam_user -d slam25_db -f ' || backup_file || ' --schema-only --verbose';
END;
$$ LANGUAGE plpgsql;

-- Function to create a compressed backup
CREATE OR REPLACE FUNCTION create_compressed_backup(backup_path TEXT DEFAULT '/var/backups/slam25/')
RETURNS TEXT AS $$
DECLARE
    backup_file TEXT;
    backup_name TEXT;
    timestamp_str TEXT;
BEGIN
    timestamp_str := to_char(CURRENT_TIMESTAMP, 'YYYY-MM-DD_HH24-MI-SS');
    backup_name := 'slam25_compressed_backup_' || timestamp_str || '.sql.gz';
    backup_file := backup_path || backup_name;
    
    RETURN 'pg_dump -h localhost -U slam_user -d slam25_db | gzip > ' || backup_file;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- RECOVERY PROCEDURES
-- =====================================================

-- Function to restore from a full backup
CREATE OR REPLACE FUNCTION restore_from_backup(backup_file TEXT)
RETURNS TEXT AS $$
BEGIN
    RETURN 'psql -h localhost -U slam_user -d slam25_db -f ' || backup_file;
END;
$$ LANGUAGE plpgsql;

-- Function to restore from a compressed backup
CREATE OR REPLACE FUNCTION restore_from_compressed_backup(backup_file TEXT)
RETURNS TEXT AS $$
BEGIN
    RETURN 'gunzip -c ' || backup_file || ' | psql -h localhost -U slam_user -d slam25_db';
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- MAINTENANCE PROCEDURES
-- =====================================================

-- Function to clean up old backups (keep last 30 days)
CREATE OR REPLACE FUNCTION cleanup_old_backups(backup_path TEXT DEFAULT '/var/backups/slam25/', days_to_keep INTEGER DEFAULT 30)
RETURNS TEXT AS $$
BEGIN
    RETURN 'find ' || backup_path || ' -name "slam25_*_backup_*.sql*" -mtime +' || days_to_keep || ' -delete';
END;
$$ LANGUAGE plpgsql;

-- Function to vacuum and analyze database
CREATE OR REPLACE FUNCTION maintain_database()
RETURNS VOID AS $$
BEGIN
    -- Vacuum all tables
    VACUUM ANALYZE;
    
    -- Update table statistics
    ANALYZE;
    
    -- Clean up expired sessions
    PERFORM cleanup_expired_sessions();
    
    -- Log maintenance
    INSERT INTO audit_log (action, table_name, new_values)
    VALUES ('MAINTENANCE', 'DATABASE', jsonb_build_object('maintenance_type', 'vacuum_analyze', 'timestamp', CURRENT_TIMESTAMP));
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- MONITORING AND HEALTH CHECKS
-- =====================================================

-- Function to check database health
CREATE OR REPLACE FUNCTION check_database_health()
RETURNS TABLE (
    check_name TEXT,
    status TEXT,
    details JSONB
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        'Database Size'::TEXT,
        CASE 
            WHEN pg_database_size(current_database()) < 1073741824 THEN 'OK' -- Less than 1GB
            ELSE 'WARNING'
        END::TEXT,
        jsonb_build_object(
            'size_bytes', pg_database_size(current_database()),
            'size_mb', round(pg_database_size(current_database()) / 1048576.0, 2)
        );
    
    RETURN QUERY
    SELECT 
        'Active Sessions'::TEXT,
        CASE 
            WHEN count(*) < 100 THEN 'OK'
            ELSE 'WARNING'
        END::TEXT,
        jsonb_build_object('active_sessions', count(*))
    FROM user_sessions 
    WHERE expires_at > CURRENT_TIMESTAMP;
    
    RETURN QUERY
    SELECT 
        'Expired Sessions'::TEXT,
        CASE 
            WHEN count(*) < 1000 THEN 'OK'
            ELSE 'WARNING'
        END::TEXT,
        jsonb_build_object('expired_sessions', count(*))
    FROM user_sessions 
    WHERE expires_at <= CURRENT_TIMESTAMP;
    
    RETURN QUERY
    SELECT 
        'Audit Log Size'::TEXT,
        CASE 
            WHEN count(*) < 10000 THEN 'OK'
            ELSE 'WARNING'
        END::TEXT,
        jsonb_build_object('audit_entries', count(*))
    FROM audit_log;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- AUTOMATED BACKUP SCHEDULING
-- =====================================================

-- Create a table to track backup history
CREATE TABLE IF NOT EXISTS backup_history (
    id SERIAL PRIMARY KEY,
    backup_type VARCHAR(50) NOT NULL,
    backup_file VARCHAR(500) NOT NULL,
    backup_size BIGINT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(20) DEFAULT 'completed',
    error_message TEXT
);

-- Function to log backup attempt
CREATE OR REPLACE FUNCTION log_backup_attempt(
    backup_type_param VARCHAR(50),
    backup_file_param VARCHAR(500),
    backup_size_param BIGINT DEFAULT NULL,
    status_param VARCHAR(20) DEFAULT 'completed',
    error_message_param TEXT DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
    INSERT INTO backup_history (
        backup_type, 
        backup_file, 
        backup_size, 
        status, 
        error_message
    ) VALUES (
        backup_type_param,
        backup_file_param,
        backup_size_param,
        status_param,
        error_message_param
    );
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- DATA VALIDATION FUNCTIONS
-- =====================================================

-- Function to validate email addresses
CREATE OR REPLACE FUNCTION validate_email(email_address TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN email_address ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$';
END;
$$ LANGUAGE plpgsql;

-- Function to validate phone numbers (German format)
CREATE OR REPLACE FUNCTION validate_phone(phone_number TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN phone_number ~* '^\+49 [0-9]{2,4} [0-9]{6,8}$';
END;
$$ LANGUAGE plpgsql;

-- Function to validate coordinates
CREATE OR REPLACE FUNCTION validate_coordinates(lat DECIMAL, lng DECIMAL)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN lat BETWEEN -90 AND 90 AND lng BETWEEN -180 AND 180;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- SECURITY FUNCTIONS
-- =====================================================

-- Function to encrypt sensitive data
CREATE OR REPLACE FUNCTION encrypt_sensitive_data(data TEXT, encryption_key TEXT)
RETURNS TEXT AS $$
BEGIN
    -- This is a placeholder - in production, use proper encryption
    RETURN encode(encrypt_iv(data::bytea, encryption_key::bytea, '0123456789012345'::bytea, 'aes-cbc'), 'base64');
END;
$$ LANGUAGE plpgsql;

-- Function to decrypt sensitive data
CREATE OR REPLACE FUNCTION decrypt_sensitive_data(encrypted_data TEXT, encryption_key TEXT)
RETURNS TEXT AS $$
BEGIN
    -- This is a placeholder - in production, use proper encryption
    RETURN convert_from(decrypt_iv(decode(encrypted_data, 'base64'), encryption_key::bytea, '0123456789012345'::bytea, 'aes-cbc'), 'utf8');
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- USAGE EXAMPLES
-- =====================================================

/*
-- Example usage:

-- Create a full backup
SELECT create_full_backup('/tmp/backups/');

-- Create a compressed backup
SELECT create_compressed_backup('/tmp/backups/');

-- Check database health
SELECT * FROM check_database_health();

-- Run maintenance
SELECT maintain_database();

-- Log a backup attempt
SELECT log_backup_attempt('full', '/tmp/backups/slam25_backup.sql', 1048576);

-- Validate data
SELECT validate_email('test@example.com');
SELECT validate_phone('+49 371 123456');
SELECT validate_coordinates(50.8278, 12.9244);
*/
