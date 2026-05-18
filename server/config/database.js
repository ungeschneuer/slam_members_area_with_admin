import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import logger from './logger.js';
// Keep pool simple and lean - avoid custom leak trackers and recovery

// Load environment file based on NODE_ENV (same logic as server.js)
const envFile = process.env.NODE_ENV === 'production' ? '.env.production' : '.env.development';
dotenv.config({ path: path.join(process.cwd(), envFile) });

// Comprehensive environment variable validation - fail fast if not configured
const requiredEnvVars = {
  DB_PASSWORD: 'Database password is required',
  JWT_SECRET: 'JWT secret is required for authentication',
  DB_HOST: 'Database host is required',
  DB_NAME: 'Database name is required',
  DB_USER: 'Database user is required'
};

// Check for missing or empty required environment variables
const missingVars = [];
for (const [varName, message] of Object.entries(requiredEnvVars)) {
  const value = process.env[varName];
  if (!value || value.trim() === '') {
    missingVars.push(`${varName}: ${message}`);
  }
}

if (missingVars.length > 0) {
  throw new Error(`Missing required environment variables:\n${missingVars.join('\n')}\n\nPlease configure these in your .env file.`);
}

// Validate JWT_SECRET strength - must be at least 64 characters and not use template values
const jwtSecret = process.env.JWT_SECRET;
const weakSecrets = [
  'your_jwt_secret_key_here_change_this_in_production',
  'your_development_jwt_secret_key_here_change_this_in_production',
  'CHANGE_THIS_PRODUCTION_JWT_SECRET_MINIMUM_64_CHARACTERS',
  'CHANGE_THIS_TO_VERY_SECURE_JWT_SECRET_KEY_AT_LEAST_64_CHARACTERS_LONG',
  'REPLACE_WITH_STRONG_SECRET',
  'default_secret',
  'secret',
  'jwt_secret'
];

if (jwtSecret.length < 64) {
  throw new Error(`JWT_SECRET must be at least 64 characters long. Current length: ${jwtSecret.length}. Please generate a secure secret.`);
}

if (weakSecrets.includes(jwtSecret)) {
  throw new Error('JWT_SECRET is using a template/default value. Please generate a secure, unique secret for production.');
}

// Additional validation for production
if (process.env.NODE_ENV === 'production') {
  if (jwtSecret.length < 128) {
    logger.warn('JWT_SECRET is shorter than recommended for production (128+ characters). Consider generating a longer secret.');
  }
  
  // Check for common weak patterns
  if (jwtSecret.toLowerCase().includes('password') || 
      jwtSecret.toLowerCase().includes('secret') ||
      jwtSecret.toLowerCase().includes('key')) {
    logger.warn('JWT_SECRET contains common weak words. Consider using a cryptographically secure random string.');
  }
  
  // Production-specific validations
  if (process.env.DB_PASSWORD === 'slam25_secure_password_2025') {
    throw new Error('DB_PASSWORD is using the default template value. Please set a secure production password.');
  }
  
  if (process.env.FRONTEND_URL && !process.env.FRONTEND_URL.startsWith('https://')) {
    logger.warn('FRONTEND_URL should use HTTPS in production for security.');
  }
}

// Validate database connection parameters
const dbPort = parseInt(process.env.DB_PORT || '5432');
if (isNaN(dbPort) || dbPort < 1 || dbPort > 65535) {
  throw new Error(`Invalid DB_PORT: ${process.env.DB_PORT}. Must be a valid port number (1-65535).`);
}

// Validate URL formats if provided
if (process.env.FRONTEND_URL) {
  try {
    new URL(process.env.FRONTEND_URL);
  } catch (error) {
    throw new Error(`Invalid FRONTEND_URL: ${process.env.FRONTEND_URL}. Must be a valid URL.`);
  }
}

// Validate database host format
if (process.env.DB_HOST && process.env.DB_HOST.includes('://')) {
  throw new Error(`Invalid DB_HOST: ${process.env.DB_HOST}. Should be hostname/IP only, not a full URL.`);
}

// Log environment configuration (without sensitive data)
logger.info('Environment validation completed', {
  nodeEnv: process.env.NODE_ENV,
  dbHost: process.env.DB_HOST,
  dbPort: process.env.DB_PORT,
  dbName: process.env.DB_NAME,
  dbUser: process.env.DB_USER,
  jwtSecretLength: jwtSecret.length,
  frontendUrl: process.env.FRONTEND_URL ? 'configured' : 'not set'
});

const { Pool } = pg;

// Environment-specific pool configuration
const getPoolConfig = () => {
  const env = process.env.NODE_ENV || 'development';
  const isTest = env === 'test' || process.env.VITEST === 'true';
  
  const baseConfig = {
    user: process.env.DB_USER || 'slam_user',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'slam25_db',
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT || 5432,
    ssl: false, // Uberspace PostgreSQL doesn't support SSL connections
    idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT) || (isTest ? 10000 : 30000),
    connectionTimeoutMillis: parseInt(process.env.DB_CONNECTION_TIMEOUT) || (isTest ? 5000 : 5000),
    acquireTimeoutMillis: parseInt(process.env.DB_ACQUIRE_TIMEOUT) || (isTest ? 10000 : 10000),
    allowExitOnIdle: isTest, // Allow pool to close when idle in tests
    statement_timeout: parseInt(process.env.DB_STATEMENT_TIMEOUT) || 30000,
    query_timeout: parseInt(process.env.DB_QUERY_TIMEOUT) || 30000,
    application_name: isTest ? 'slam25-test' : 'slam25-api-server',
    keepAlive: !isTest, // Disable keep-alive for tests
    keepAliveInitialDelayMillis: 10000,
    validationQuery: 'SELECT 1'
  };

  // Environment-specific pool sizing with enhanced configuration
  switch (env) {
    case 'test':
      return {
        ...baseConfig,
        max: parseInt(process.env.DB_MAX_CONNECTIONS) || 10, // Increased for tests
        min: parseInt(process.env.DB_MIN_CONNECTIONS) || 2,
        acquireTimeoutMillis: 10000, // 10 seconds
        idleTimeoutMillis: 10000, // 10 seconds
        connectionTimeoutMillis: 5000 // 5 seconds
      };
    case 'development':
      return {
        ...baseConfig,
        max: parseInt(process.env.DB_MAX_CONNECTIONS) || 10, // Reduced for development
        min: parseInt(process.env.DB_MIN_CONNECTIONS) || 2,
        acquireTimeoutMillis: 30000, // 30 seconds
        idleTimeoutMillis: 30000, // 30 seconds - reduced
        connectionTimeoutMillis: 10000 // 10 seconds
      };
    case 'staging':
      return {
        ...baseConfig,
        max: parseInt(process.env.DB_MAX_CONNECTIONS) || 20, // Increased for staging
        min: parseInt(process.env.DB_MIN_CONNECTIONS) || 5,
        acquireTimeoutMillis: 30000,
        idleTimeoutMillis: 120000, // 2 minutes
        connectionTimeoutMillis: 15000
      };
    case 'production':
      return {
        ...baseConfig,
        // Connection pool sizing for production
        // Default increased from 2 to 15 for better concurrent request handling
        // Can be overridden via DB_MAX_CONNECTIONS environment variable
        // Note: Monitor pool utilization and adjust if needed on Uberspace
        max: parseInt(process.env.DB_MAX_CONNECTIONS) || 15,
        min: parseInt(process.env.DB_MIN_CONNECTIONS) || 3,
        acquireTimeoutMillis: 60000, // 1 minute
        idleTimeoutMillis: 300000, // 5 minutes
        connectionTimeoutMillis: 20000, // 20 seconds
        // Enhanced production settings
        keepAlive: true,
        keepAliveInitialDelayMillis: 10000,
        maxUses: 7500, // Prevent connection reuse issues
        maxLifetime: 30 * 60 * 1000 // 30 minutes max connection lifetime
      };
    default:
      return {
        ...baseConfig,
        max: parseInt(process.env.DB_MAX_CONNECTIONS) || 10,
        min: parseInt(process.env.DB_MIN_CONNECTIONS) || 2,
        acquireTimeoutMillis: 30000,
        idleTimeoutMillis: 60000,
        connectionTimeoutMillis: 10000
      };
  }
};

// Create pool with environment-specific configuration
const pool = new Pool(getPoolConfig());

// Optional: basic connect log (no per-connection SET overhead)
pool.on('connect', (client) => {
  logger.info('Database connection established', {
    processId: client.processID,
    environment: process.env.NODE_ENV
  });
});

pool.on('error', (err, client) => {
  logger.error('Database pool error', {
    error: err.message,
    code: err.code,
    processId: client?.processID,
    stack: err.stack
  });
  
  // Check pool pressure
  const stats = getPoolStats();
  if (stats.waitingCount > 5) {
    logger.warn(`⚠️  Database pool under pressure: ${stats.waitingCount} waiting clients`);
  }
  if (stats.utilization > 0.8) {
    logger.warn(`⚠️  Database pool utilization high: ${Math.round(stats.utilization * 100)}%`);
  }
  
  // Implement retry logic instead of just logging
  logger.info('Connection pool will attempt to reconnect automatically');
});

// Enhanced pool statistics with health monitoring
const getPoolStats = () => {
  const stats = {
    totalCount: pool.totalCount,
    idleCount: pool.idleCount,
    waitingCount: pool.waitingCount,
    maxConnections: pool.options.max,
    minConnections: pool.options.min,
    utilization: pool.totalCount / pool.options.max,
    health: 'healthy'
  };

  // Determine health status based on utilization and waiting connections
  if (stats.utilization > 0.9) {
    stats.health = 'critical';
  } else if (stats.utilization > 0.7 || stats.waitingCount > 5) {
    stats.health = 'warning';
  }

  return stats;
};

// Simple database health check
const getDatabaseHealth = async () => {
  const startTime = Date.now();
  let client;
  
  try {
    // Test basic connectivity
    client = await pool.connect();
    const result = await client.query('SELECT 1 as test');
    
    const responseTime = Date.now() - startTime;
    const poolStats = getPoolStats();
    
    return {
      status: 'healthy',
      responseTime: `${responseTime}ms`,
      pool: poolStats,
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      error: error.message,
      responseTime: `${Date.now() - startTime}ms`,
      pool: getPoolStats(),
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV
    };
  } finally {
    if (client) {
      client.release();
    }
  }
};

// Advanced database stats removed to keep pool simple

// Connection health validation removed - rely on pool.query errors

// Optional: health monitoring can be added by ops; disabled by default

// Custom connection acquisition removed - rely on pool.connect directly when needed

// Periodic pool stats logging removed to reduce overhead

// Health check function with pool statistics
const checkDatabaseHealth = async () => {
  let client;
  try {
    client = await pool.connect();
    const result = await client.query('SELECT NOW()');
    
    const poolStats = getPoolStats();
    return {
      status: 'healthy',
      timestamp: result.rows[0].now,
      connection: 'active',
      pool: {
        totalConnections: poolStats.totalCount,
        idleConnections: poolStats.idleCount,
        waitingClients: poolStats.waitingCount,
        utilization: Math.round((poolStats.totalCount / poolStats.maxConnections) * 100),
        maxConnections: poolStats.maxConnections,
        minConnections: poolStats.minConnections
      }
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      error: error.message,
      connection: 'failed',
      pool: getPoolStats()
    };
  } finally {
    if (client) {
      client.release();
    }
  }
};

// Simple database utility using pool.query
const executeQuery = async (query, params = []) => {
  try {
    return await pool.query(query, params);
  } catch (error) {
    logger.error('Database query error:', error);
    throw error;
  }
};

// Enhanced transaction execution with retry logic
// Enhanced transaction error handling with deadlock detection and retry strategies
const executeTransaction = async (queries, retries = 3) => {
  let client;
  let attempt = 0;
  const startTime = Date.now();
  
  // Error categorization for better handling
  const isDeadlockError = (error) => {
    return error.code === '40P01' || // deadlock_detected
           error.message.includes('deadlock') ||
           error.message.includes('lock timeout');
  };
  
  const isConnectionError = (error) => {
    return error.code === 'ECONNRESET' ||
           error.code === 'ECONNREFUSED' ||
           error.code === 'ENOTFOUND' ||
           error.message.includes('connection');
  };
  
  const isConstraintError = (error) => {
    return error.code === '23505' || // unique_violation
           error.code === '23503' || // foreign_key_violation
           error.code === '23514' || // check_violation
           error.code === '23502';   // not_null_violation
  };
  
  const shouldRetry = (error, attempt) => {
    // Don't retry constraint violations (data integrity issues)
    if (isConstraintError(error)) {
      return false;
    }
    
    // Don't retry if we've exceeded max attempts
    if (attempt >= retries) {
      return false;
    }
    
    // Always retry deadlocks and connection errors
    return isDeadlockError(error) || isConnectionError(error);
  };
  
  const getRetryDelay = (error, attempt) => {
    if (isDeadlockError(error)) {
      // Random delay for deadlocks to avoid thundering herd
      return Math.random() * Math.pow(2, attempt) * 1000;
    }
    
    if (isConnectionError(error)) {
      // Longer delay for connection errors
      return Math.pow(2, attempt) * 2000;
    }
    
    // Default exponential backoff
    return Math.pow(2, attempt) * 1000;
  };
  
  while (attempt < retries) {
    try {
      client = await pool.connect();
      await client.query('BEGIN');
      const results = [];
      // Support either array of queries or a callback for custom logic
      if (typeof queries === 'function') {
        const callbackResult = await queries(client);
        await client.query('COMMIT');
        const duration = Date.now() - startTime;
        logger.info('Transaction completed successfully', {
          duration: `${Math.round(duration)}ms`,
          queries: 'callback',
          attempts: attempt + 1
        });
        return callbackResult;
      }
      for (const { query, params } of queries) {
        const result = await client.query(query, params);
        results.push(result);
      }
      
      await client.query('COMMIT');
      
      const duration = Date.now() - startTime;
      logger.info('Transaction completed successfully', {
        duration: `${Math.round(duration)}ms`,
        queries: queries.length,
        attempts: attempt + 1
      });
      
      return results;
    } catch (error) {
      const duration = Date.now() - startTime;
      
      // Enhanced error logging with categorization
      const errorContext = {
        error: error.message,
        code: error.code,
        duration: `${Math.round(duration)}ms`,
        attempt: attempt + 1,
        queries: queries.length,
        isDeadlock: isDeadlockError(error),
        isConnectionError: isConnectionError(error),
        isConstraintError: isConstraintError(error)
      };
      
      if (client) {
        try {
          await client.query('ROLLBACK');
          logger.debug('Transaction rolled back successfully', errorContext);
        } catch (rollbackError) {
          logger.error('Failed to rollback transaction', {
            ...errorContext,
            rollbackError: rollbackError.message,
            rollbackCode: rollbackError.code
          });
        }
      }
      
      attempt++;
      
      // Check if we should retry
      if (!shouldRetry(error, attempt)) {
        logger.error('Transaction failed - not retrying', {
          ...errorContext,
          reason: isConstraintError(error) ? 'constraint_violation' : 'max_attempts_exceeded'
        });
        throw error;
      }
      
      const retryDelay = getRetryDelay(error, attempt);
      
      logger.warn('Transaction failed - retrying', {
        ...errorContext,
        retryDelay: `${Math.round(retryDelay)}ms`,
        nextAttempt: attempt + 1
      });
      
      // Wait before retry
      await new Promise(resolve => setTimeout(resolve, retryDelay));
    } finally {
      if (client) {
        client.release();
        client = undefined; // prevent double-release if pool.connect() throws on retry
      }
    }
  }

  // Reached only when retries === 0; every other path returns or throws.
  throw new Error('Transaction failed after maximum retries');
};



// Backup utilities
const createBackup = async (backupType = 'full') => {
  const { exec } = await import('child_process');
  const { promisify } = await import('util');
  const execAsync = promisify(exec);
  
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupPath = process.env.BACKUP_DIR || path.join(process.env.HOME || '/home/uberspace', 'backups/slam25');
  const backupFile = `${backupPath}/slam25_${backupType}_backup_${timestamp}.sql`;
  
  try {
    let command = `pg_dump -h ${process.env.DB_HOST || 'localhost'} -U ${process.env.DB_USER || 'slam_user'} -d ${process.env.DB_NAME || 'slam25_db'} -f ${backupFile}`;
    
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
    logger.error('Backup failed:', error);
    
    // Log failed backup
    await executeQuery(
      'INSERT INTO backup_history (backup_type, backup_file, status, error_message) VALUES ($1, $2, $3, $4)',
      [backupType, backupFile, 'failed', error.message]
    );
    
    throw error;
  }
};

// Maintenance utilities
const runMaintenance = async () => {
  try {
    // Vacuum and analyze
    await executeQuery('VACUUM ANALYZE');
    
    // Clean up expired sessions
    const sessionResult = await executeQuery('SELECT cleanup_expired_sessions()');
    
    // Clean up expired breaking news
    const breakingNewsResult = await executeQuery(
      'UPDATE news SET is_breaking_news = false, breaking_news_until = NULL WHERE is_breaking_news = true AND breaking_news_until < NOW()'
    );
    
    // Log maintenance
    await executeQuery(
      'INSERT INTO audit_log (action, table_name, new_values) VALUES ($1, $2, $3)',
      ['MAINTENANCE', 'DATABASE', JSON.stringify({ 
        maintenance_type: 'vacuum_analyze', 
        expiredBreakingNewsCleaned: breakingNewsResult.rowCount || 0,
        timestamp: new Date().toISOString() 
      })]
    );
    
    return {
      success: true,
      expiredSessionsCleaned: sessionResult.rows[0]?.cleanup_expired_sessions || 0,
      expiredBreakingNewsCleaned: breakingNewsResult.rowCount || 0,
    };
  } catch (error) {
    logger.error('Maintenance failed:', error);
    throw error;
  }
};

// Cleanup expired breaking news
const cleanupExpiredBreakingNews = async () => {
  try {
    const result = await executeQuery(
      'UPDATE news SET is_breaking_news = false, breaking_news_until = NULL WHERE is_breaking_news = true AND breaking_news_until < NOW()'
    );
    
    logger.info('Expired breaking news cleanup completed', {
      cleanedCount: result.rowCount || 0
    });
    
    return {
      success: true,
      cleanedCount: result.rowCount || 0
    };
  } catch (error) {
    logger.error('Breaking news cleanup failed:', error);
    throw error;
  }
};

// Statistics utilities
const getDatabaseStats = async () => {
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
        relname as tablename,
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
    logger.error('Failed to get database stats:', error);
    throw error;
  }
};

// Emergency recovery removed - not needed with simple pooling

// executeQueryWithRecovery removed - use executeQuery instead

export {
  pool,
  checkDatabaseHealth,
  executeQuery,
  executeTransaction,
  createBackup,
  runMaintenance,
  cleanupExpiredBreakingNews,
  getDatabaseStats,
  getPoolStats,
  getDatabaseHealth
};
