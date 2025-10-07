-- Data Integrity Enhancement Migration for SLAM25
-- This migration adds tables and functions to support enhanced data integrity measures

-- Create transaction audit log table
CREATE TABLE IF NOT EXISTS transaction_audit_log (
    id SERIAL PRIMARY KEY,
    audit_data JSONB NOT NULL,
    status VARCHAR(20) NOT NULL CHECK (status IN ('SUCCESS', 'FAILED')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    user_id INTEGER REFERENCES users(id),
    session_id VARCHAR(255),
    ip_address INET,
    user_agent TEXT
);

-- Create index for efficient querying
CREATE INDEX IF NOT EXISTS idx_transaction_audit_log_created_at ON transaction_audit_log(created_at);
CREATE INDEX IF NOT EXISTS idx_transaction_audit_log_status ON transaction_audit_log(status);
CREATE INDEX IF NOT EXISTS idx_transaction_audit_log_user_id ON transaction_audit_log(user_id);

-- Create integrity check reports table
CREATE TABLE IF NOT EXISTS integrity_check_reports (
    id SERIAL PRIMARY KEY,
    report_data JSONB NOT NULL,
    error_count INTEGER DEFAULT 0,
    warning_count INTEGER DEFAULT 0,
    check_duration_ms INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by INTEGER REFERENCES users(id),
    check_type VARCHAR(50) DEFAULT 'FULL'
);

-- Create index for efficient querying
CREATE INDEX IF NOT EXISTS idx_integrity_check_reports_created_at ON integrity_check_reports(created_at);
CREATE INDEX IF NOT EXISTS idx_integrity_check_reports_error_count ON integrity_check_reports(error_count);

-- Enhance existing audit_log table if it doesn't have the required columns
DO $$ 
BEGIN
    -- Check if table_name column exists in audit_log
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'audit_log' AND column_name = 'table_name'
    ) THEN
        ALTER TABLE audit_log ADD COLUMN table_name VARCHAR(100);
    END IF;
    
    -- Check if operation column exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'audit_log' AND column_name = 'operation'
    ) THEN
        ALTER TABLE audit_log ADD COLUMN operation VARCHAR(20);
    END IF;
    
    -- Check if old_values column exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'audit_log' AND column_name = 'old_values'
    ) THEN
        ALTER TABLE audit_log ADD COLUMN old_values JSONB;
    END IF;
END $$;

-- Create constraint violations log table
CREATE TABLE IF NOT EXISTS constraint_violations (
    id SERIAL PRIMARY KEY,
    table_name VARCHAR(100) NOT NULL,
    constraint_name VARCHAR(100) NOT NULL,
    constraint_type VARCHAR(50) NOT NULL,
    violation_data JSONB,
    error_message TEXT,
    detected_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    resolved_at TIMESTAMP WITH TIME ZONE,
    resolution_notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_constraint_violations_table_name ON constraint_violations(table_name);
CREATE INDEX IF NOT EXISTS idx_constraint_violations_detected_at ON constraint_violations(detected_at);
CREATE INDEX IF NOT EXISTS idx_constraint_violations_resolved ON constraint_violations(resolved_at) WHERE resolved_at IS NULL;

-- Create data quality metrics table
CREATE TABLE IF NOT EXISTS data_quality_metrics (
    id SERIAL PRIMARY KEY,
    table_name VARCHAR(100) NOT NULL,
    metric_name VARCHAR(100) NOT NULL,
    metric_value NUMERIC,
    metric_data JSONB,
    measurement_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    threshold_min NUMERIC,
    threshold_max NUMERIC,
    is_within_threshold BOOLEAN GENERATED ALWAYS AS (
        CASE 
            WHEN threshold_min IS NOT NULL AND metric_value < threshold_min THEN FALSE
            WHEN threshold_max IS NOT NULL AND metric_value > threshold_max THEN FALSE
            ELSE TRUE
        END
    ) STORED
);

CREATE INDEX IF NOT EXISTS idx_data_quality_metrics_table_name ON data_quality_metrics(table_name);
CREATE INDEX IF NOT EXISTS idx_data_quality_metrics_measurement_date ON data_quality_metrics(measurement_date);
CREATE INDEX IF NOT EXISTS idx_data_quality_metrics_threshold_violations ON data_quality_metrics(is_within_threshold) WHERE is_within_threshold = FALSE;

-- Create backup verification table
CREATE TABLE IF NOT EXISTS backup_verification_log (
    id SERIAL PRIMARY KEY,
    backup_file VARCHAR(500) NOT NULL,
    verification_status VARCHAR(50) NOT NULL CHECK (verification_status IN ('PASSED', 'FAILED', 'PENDING')),
    verification_details JSONB,
    verification_duration_ms INTEGER,
    verified_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    verified_by INTEGER REFERENCES users(id),
    next_verification_date TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_backup_verification_log_backup_file ON backup_verification_log(backup_file);
CREATE INDEX IF NOT EXISTS idx_backup_verification_log_verified_at ON backup_verification_log(verified_at);
CREATE INDEX IF NOT EXISTS idx_backup_verification_log_status ON backup_verification_log(verification_status);

-- Create function to clean up old audit data
CREATE OR REPLACE FUNCTION cleanup_audit_data(retention_days INTEGER DEFAULT 90)
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER := 0;
    cutoff_date TIMESTAMP WITH TIME ZONE;
BEGIN
    cutoff_date := NOW() - (retention_days || ' days')::INTERVAL;
    
    -- Clean up transaction audit log
    DELETE FROM transaction_audit_log WHERE created_at < cutoff_date;
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    -- Clean up old integrity check reports (keep more recent ones)
    DELETE FROM integrity_check_reports 
    WHERE created_at < cutoff_date AND error_count = 0;
    
    -- Clean up resolved constraint violations older than retention period
    DELETE FROM constraint_violations 
    WHERE detected_at < cutoff_date AND resolved_at IS NOT NULL;
    
    -- Clean up old data quality metrics (keep summary data)
    DELETE FROM data_quality_metrics 
    WHERE measurement_date < cutoff_date AND is_within_threshold = TRUE;
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Create function for data integrity health check
CREATE OR REPLACE FUNCTION data_integrity_health_check()
RETURNS TABLE (
    check_name TEXT,
    status TEXT,
    details JSONB
) AS $$
BEGIN
    -- Check foreign key constraints
    RETURN QUERY
    SELECT 
        'Foreign Key Constraints'::TEXT,
        CASE WHEN COUNT(*) = 0 THEN 'HEALTHY' ELSE 'ISSUES_FOUND' END::TEXT,
        jsonb_build_object(
            'violations_count', COUNT(*),
            'details', jsonb_agg(jsonb_build_object(
                'constraint', conname,
                'table', conrelid::regclass::text,
                'referenced_table', confrelid::regclass::text
            ))
        )
    FROM pg_constraint 
    WHERE contype = 'f' 
    AND NOT EXISTS (
        SELECT 1 FROM pg_trigger WHERE tgconstraint = pg_constraint.oid
    );
    
    -- Check for recent constraint violations
    RETURN QUERY
    SELECT 
        'Recent Constraint Violations'::TEXT,
        CASE WHEN COUNT(*) = 0 THEN 'HEALTHY' ELSE 'ISSUES_FOUND' END::TEXT,
        jsonb_build_object(
            'violations_count', COUNT(*),
            'unresolved_count', COUNT(*) FILTER (WHERE resolved_at IS NULL),
            'recent_violations', jsonb_agg(
                jsonb_build_object(
                    'table', table_name,
                    'constraint', constraint_name,
                    'detected_at', detected_at
                )
            ) FILTER (WHERE detected_at >= NOW() - INTERVAL '24 hours')
        )
    FROM constraint_violations
    WHERE detected_at >= NOW() - INTERVAL '7 days';
    
    -- Check data quality metrics
    RETURN QUERY
    SELECT 
        'Data Quality Metrics'::TEXT,
        CASE WHEN COUNT(*) FILTER (WHERE NOT is_within_threshold) = 0 THEN 'HEALTHY' ELSE 'ISSUES_FOUND' END::TEXT,
        jsonb_build_object(
            'total_metrics', COUNT(*),
            'threshold_violations', COUNT(*) FILTER (WHERE NOT is_within_threshold),
            'latest_measurement', MAX(measurement_date)
        )
    FROM data_quality_metrics
    WHERE measurement_date >= NOW() - INTERVAL '24 hours';
    
END;
$$ LANGUAGE plpgsql;

-- Create function to collect data quality metrics
CREATE OR REPLACE FUNCTION collect_data_quality_metrics()
RETURNS INTEGER AS $$
DECLARE
    metrics_count INTEGER := 0;
BEGIN
    -- Collect row counts for all tables
    INSERT INTO data_quality_metrics (table_name, metric_name, metric_value)
    SELECT 
        schemaname || '.' || tablename,
        'row_count',
        n_tup_ins + n_tup_upd - n_tup_del
    FROM pg_stat_user_tables
    ON CONFLICT DO NOTHING;
    
    -- Collect null percentage for important columns
    INSERT INTO data_quality_metrics (table_name, metric_name, metric_value, threshold_max)
    SELECT 
        'participants',
        'null_percentage_name',
        (COUNT(*) FILTER (WHERE name IS NULL) * 100.0 / COUNT(*)),
        5.0 -- Max 5% null values allowed
    FROM participants
    WHERE EXISTS (SELECT 1 FROM participants LIMIT 1)
    ON CONFLICT DO NOTHING;
    
    -- Collect duplicate percentage
    INSERT INTO data_quality_metrics (table_name, metric_name, metric_value, threshold_max)
    SELECT 
        'participants',
        'duplicate_percentage',
        (COUNT(*) - COUNT(DISTINCT (name, region)) * 100.0 / COUNT(*)),
        2.0 -- Max 2% duplicates allowed
    FROM participants
    WHERE EXISTS (SELECT 1 FROM participants LIMIT 1)
    ON CONFLICT DO NOTHING;
    
    GET DIAGNOSTICS metrics_count = ROW_COUNT;
    RETURN metrics_count;
END;
$$ LANGUAGE plpgsql;

-- Create scheduled job function (requires pg_cron extension)
-- This is commented out as pg_cron may not be available in all environments
/*
-- Schedule daily data quality metrics collection
SELECT cron.schedule('collect-data-quality-metrics', '0 2 * * *', 'SELECT collect_data_quality_metrics();');

-- Schedule weekly audit data cleanup
SELECT cron.schedule('cleanup-audit-data', '0 3 * * 0', 'SELECT cleanup_audit_data(90);');
*/

-- Add comments for documentation
COMMENT ON TABLE transaction_audit_log IS 'Stores detailed audit information for database transactions';
COMMENT ON TABLE integrity_check_reports IS 'Stores results of comprehensive data integrity checks';
COMMENT ON TABLE constraint_violations IS 'Logs detected constraint violations for monitoring and resolution';
COMMENT ON TABLE data_quality_metrics IS 'Tracks data quality metrics over time with configurable thresholds';
COMMENT ON TABLE backup_verification_log IS 'Records backup verification results and schedules';

COMMENT ON FUNCTION cleanup_audit_data(INTEGER) IS 'Cleans up old audit data beyond retention period';
COMMENT ON FUNCTION data_integrity_health_check() IS 'Provides quick health check of data integrity status';
COMMENT ON FUNCTION collect_data_quality_metrics() IS 'Collects current data quality metrics for monitoring';

-- Insert initial data quality thresholds
INSERT INTO data_quality_metrics (table_name, metric_name, metric_value, threshold_min, threshold_max) VALUES
('participants', 'row_count', 0, 1, NULL),
('rounds', 'row_count', 0, 1, NULL),
('news', 'row_count', 0, 0, NULL),
('users', 'row_count', 0, 1, NULL)
ON CONFLICT DO NOTHING;

-- Create view for data integrity dashboard
CREATE OR REPLACE VIEW data_integrity_dashboard AS
SELECT 
    'Transaction Audit' as category,
    'Recent Transactions' as metric,
    COUNT(*)::TEXT as value,
    CASE WHEN COUNT(*) FILTER (WHERE status = 'FAILED') > 0 THEN 'WARNING' ELSE 'OK' END as status
FROM transaction_audit_log 
WHERE created_at >= NOW() - INTERVAL '24 hours'
UNION ALL
SELECT 
    'Integrity Checks' as category,
    'Recent Checks' as metric,
    COUNT(*)::TEXT as value,
    CASE WHEN COUNT(*) FILTER (WHERE error_count > 0) > 0 THEN 'ERROR' ELSE 'OK' END as status
FROM integrity_check_reports 
WHERE created_at >= NOW() - INTERVAL '24 hours'
UNION ALL
SELECT 
    'Constraint Violations' as category,
    'Active Violations' as metric,
    COUNT(*)::TEXT as value,
    CASE WHEN COUNT(*) > 0 THEN 'ERROR' ELSE 'OK' END as status
FROM constraint_violations 
WHERE resolved_at IS NULL
UNION ALL
SELECT 
    'Data Quality' as category,
    'Threshold Violations' as metric,
    COUNT(*)::TEXT as value,
    CASE WHEN COUNT(*) > 0 THEN 'WARNING' ELSE 'OK' END as status
FROM data_quality_metrics 
WHERE measurement_date >= NOW() - INTERVAL '24 hours' 
AND NOT is_within_threshold;

-- Grant necessary permissions
GRANT SELECT ON data_integrity_dashboard TO PUBLIC;
GRANT EXECUTE ON FUNCTION data_integrity_health_check() TO PUBLIC;

-- Success message
DO $$
BEGIN
    RAISE NOTICE 'Data Integrity Enhancement Migration completed successfully!';
    RAISE NOTICE 'New tables created: transaction_audit_log, integrity_check_reports, constraint_violations, data_quality_metrics, backup_verification_log';
    RAISE NOTICE 'New functions created: cleanup_audit_data, data_integrity_health_check, collect_data_quality_metrics';
    RAISE NOTICE 'New view created: data_integrity_dashboard';
END $$;