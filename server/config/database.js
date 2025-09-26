import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

// Enhanced Database configuration for production
const pool = new Pool({
  user: process.env.DB_USER || 'slam_user',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'slam25_db',
  password: process.env.DB_PASSWORD || 'slam25_secure_password_2025',
  port: process.env.DB_PORT || 5432,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: parseInt(process.env.DB_MAX_CONNECTIONS) || 100, // Increased for production
  min: parseInt(process.env.DB_MIN_CONNECTIONS) || 10, // Minimum connections
  idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT) || 30000,
  connectionTimeoutMillis: parseInt(process.env.DB_CONNECTION_TIMEOUT) || 10000,
  acquireTimeoutMillis: parseInt(process.env.DB_ACQUIRE_TIMEOUT) || 60000,
  createTimeoutMillis: parseInt(process.env.DB_CREATE_TIMEOUT) || 30000,
  destroyTimeoutMillis: parseInt(process.env.DB_DESTROY_TIMEOUT) || 5000,
  reapIntervalMillis: parseInt(process.env.DB_REAP_INTERVAL) || 1000,
  createRetryIntervalMillis: parseInt(process.env.DB_CREATE_RETRY_INTERVAL) || 200,
  // Connection validation
  allowExitOnIdle: false,
  // Connection pooling options
  statement_timeout: parseInt(process.env.DB_STATEMENT_TIMEOUT) || 30000,
  query_timeout: parseInt(process.env.DB_QUERY_TIMEOUT) || 30000,
  // Application name for monitoring
  application_name: 'slam25-api-server'
});

// Test database connection
pool.on('connect', () => {
  console.log('✅ Connected to PostgreSQL database');
});

pool.on('error', (err) => {
  console.error('❌ Unexpected error on idle client', err);
  process.exit(-1);
});

// Health check function
export const checkDatabaseHealth = async () => {
  try {
    const client = await pool.connect();
    const result = await client.query('SELECT NOW()');
    client.release();
    return {
      status: 'healthy',
      timestamp: result.rows[0].now,
      connection: 'active',
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      error: error.message,
      connection: 'failed',
    };
  }
};

// Database utilities
export const executeQuery = async (query, params = []) => {
  const client = await pool.connect();
  try {
    const result = await client.query(query, params);
    return result;
  } finally {
    client.release();
  }
};

export const executeTransaction = async (queries) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const results = [];
    
    for (const { query, params } of queries) {
      const result = await client.query(query, params);
      results.push(result);
    }
    
    await client.query('COMMIT');
    return results;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};



// Backup utilities
export const createBackup = async (backupType = 'full') => {
  const { exec } = await import('child_process');
  const { promisify } = await import('util');
  const execAsync = promisify(exec);
  
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupPath = process.env.BACKUP_DIR || '/var/backups/slam25';
  const backupFile = `${backupPath}/slam25_${backupType}_backup_${timestamp}.sql`;
  
  try {
    const command = `pg_dump -h ${process.env.DB_HOST || 'localhost'} -U ${process.env.DB_USER || 'slam_user'} -d ${process.env.DB_NAME || 'slam25_db'} -f ${backupFile}`;
    
    if (backupType === 'data-only') {
      command += ' --data-only';
    } else if (backupType === 'schema-only') {
      command += ' --schema-only';
    }
    
    await execAsync(command);
    
    // Log backup in database
    await executeQuery(
      'INSERT INTO backup_history (backup_type, backup_file, status) VALUES ($1, $2, $3)',
      [backupType, backupFile, 'completed']
    );
    
    return { success: true, file: backupFile };
  } catch (error) {
    console.error('Backup failed:', error);
    
    // Log failed backup
    await executeQuery(
      'INSERT INTO backup_history (backup_type, backup_file, status, error_message) VALUES ($1, $2, $3, $4)',
      [backupType, backupFile, 'failed', error.message]
    );
    
    throw error;
  }
};

// Maintenance utilities
export const runMaintenance = async () => {
  try {
    // Vacuum and analyze
    await executeQuery('VACUUM ANALYZE');
    
    // Clean up expired sessions
    const result = await executeQuery('SELECT cleanup_expired_sessions()');
    
    // Log maintenance
    await executeQuery(
      'INSERT INTO audit_log (action, table_name, new_values) VALUES ($1, $2, $3)',
      ['MAINTENANCE', 'DATABASE', JSON.stringify({ maintenance_type: 'vacuum_analyze', timestamp: new Date().toISOString() })]
    );
    
    return {
      success: true,
      expiredSessionsCleaned: result.rows[0]?.cleanup_expired_sessions || 0,
    };
  } catch (error) {
    console.error('Maintenance failed:', error);
    throw error;
  }
};

// Statistics utilities
export const getDatabaseStats = async () => {
  try {
    const stats = {};
    
    // Database size
    const sizeResult = await executeQuery(
      'SELECT pg_size_pretty(pg_database_size($1)) as size',
      [process.env.DB_NAME || 'slam25_db']
    );
    stats.databaseSize = sizeResult.rows[0].size;
    
    // Table counts
    const tableCounts = await executeQuery(`
      SELECT 
        schemaname,
        tablename,
        n_tup_ins as inserts,
        n_tup_upd as updates,
        n_tup_del as deletes
      FROM pg_stat_user_tables
      ORDER BY n_tup_ins + n_tup_upd + n_tup_del DESC
    `);
    stats.tableStats = tableCounts.rows;
    
    // Active connections
    const connectionsResult = await executeQuery(
      'SELECT count(*) as active_connections FROM pg_stat_activity WHERE state = $1',
      ['active']
    );
    stats.activeConnections = parseInt(connectionsResult.rows[0].active_connections);
    
    return stats;
  } catch (error) {
    console.error('Failed to get database stats:', error);
    throw error;
  }
};

export { pool };
