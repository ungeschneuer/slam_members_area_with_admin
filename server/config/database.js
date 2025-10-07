import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import logger from './logger.js';

dotenv.config();

const { Pool } = pg;

// Environment-specific pool configuration
const getPoolConfig = () => {
  const env = process.env.NODE_ENV || 'development';
  const baseConfig = {
    user: process.env.DB_USER || 'slam_user',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'slam25_db',
    password: process.env.DB_PASSWORD || 'slam25_secure_password_2025',
    port: process.env.DB_PORT || 5432,
    ssl: env === 'production' ? { rejectUnauthorized: false } : false,
    idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT) || 30000,
    connectionTimeoutMillis: parseInt(process.env.DB_CONNECTION_TIMEOUT) || 5000,
    acquireTimeoutMillis: parseInt(process.env.DB_ACQUIRE_TIMEOUT) || 10000,
    allowExitOnIdle: false,
    statement_timeout: parseInt(process.env.DB_STATEMENT_TIMEOUT) || 30000,
    query_timeout: parseInt(process.env.DB_QUERY_TIMEOUT) || 30000,
    application_name: 'slam25-api-server',
    keepAlive: true,
    keepAliveInitialDelayMillis: 10000,
    validationQuery: 'SELECT 1'
  };

  // Environment-specific pool sizing
  switch (env) {
    case 'development':
      return {
        ...baseConfig,
        max: parseInt(process.env.DB_MAX_CONNECTIONS) || 5,
        min: parseInt(process.env.DB_MIN_CONNECTIONS) || 1
      };
    case 'staging':
      return {
        ...baseConfig,
        max: parseInt(process.env.DB_MAX_CONNECTIONS) || 10,
        min: parseInt(process.env.DB_MIN_CONNECTIONS) || 2
      };
    case 'production':
      return {
        ...baseConfig,
        max: parseInt(process.env.DB_MAX_CONNECTIONS) || 50, // Increased for actual usage
        min: parseInt(process.env.DB_MIN_CONNECTIONS) || 5
      };
    default:
      return {
        ...baseConfig,
        max: parseInt(process.env.DB_MAX_CONNECTIONS) || 5,
        min: parseInt(process.env.DB_MIN_CONNECTIONS) || 1
      };
  }
};

// Create pool with environment-specific configuration
const pool = new Pool(getPoolConfig());

// Enhanced connection pool monitoring with structured logging
pool.on('connect', (client) => {
  logger.info('Database connection established', {
    processId: client.processID,
    environment: process.env.NODE_ENV
  });
  
  // Set connection-specific optimizations after connection is established
  client.query('SET statement_timeout = 30000').catch(err => {
    logger.warn('Failed to set statement_timeout', { error: err.message });
  });
  client.query('SET idle_in_transaction_session_timeout = 300000').catch(err => {
    logger.warn('Failed to set idle_in_transaction_session_timeout', { error: err.message });
  });
});

pool.on('error', (err, client) => {
  logger.error('Database pool error', {
    error: err.message,
    code: err.code,
    processId: client?.processID,
    stack: err.stack
  });
  
  // Implement retry logic instead of just logging
  logger.info('Connection pool will attempt to reconnect automatically');
});

// Monitor pool statistics
const getPoolStats = () => {
  return {
    totalCount: pool.totalCount,
    idleCount: pool.idleCount,
    waitingCount: pool.waitingCount,
    maxConnections: pool.options.max,
    minConnections: pool.options.min
  };
};

// Connection health validation
const validateConnection = async (client) => {
  try {
    await client.query('SELECT 1');
    return true;
  } catch (error) {
    logger.warn('Connection health check failed', {
      error: error.message,
      processId: client?.processID
    });
    return false;
  }
};

// Enhanced connection acquisition with health check
const getHealthyConnection = async (maxRetries = 3) => {
  let attempts = 0;
  
  while (attempts < maxRetries) {
    try {
      const client = await pool.connect();
      const isHealthy = await validateConnection(client);
      
      if (isHealthy) {
        return client;
      } else {
        client.release();
        attempts++;
        logger.warn('Unhealthy connection detected, retrying', {
          attempt: attempts,
          maxRetries: maxRetries
        });
      }
    } catch (error) {
      attempts++;
      logger.error('Failed to acquire healthy connection', {
        error: error.message,
        attempt: attempts,
        maxRetries: maxRetries
      });
      
      if (attempts >= maxRetries) {
        throw new Error(`Failed to acquire healthy connection after ${maxRetries} attempts: ${error.message}`);
      }
      
      // Exponential backoff
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempts) * 1000));
    }
  }
};

// Log pool statistics periodically with structured logging
const logInterval = process.env.NODE_ENV === 'production' ? 300000 : 60000; // 5 min in prod, 1 min in dev
setInterval(() => {
  const stats = getPoolStats();
  const utilization = Math.round((stats.totalCount / stats.maxConnections) * 100);
  
  logger.info('Database pool statistics', {
    totalConnections: stats.totalCount,
    idleConnections: stats.idleCount,
    waitingClients: stats.waitingCount,
    maxConnections: stats.maxConnections,
    minConnections: stats.minConnections,
    utilization: `${utilization}%`,
    environment: process.env.NODE_ENV
  });
  
  // Log warnings for high utilization
  if (utilization > 90) {
    logger.warn('High database pool utilization detected', {
      utilization: `${utilization}%`,
      recommendation: 'Consider increasing max connections or optimizing queries'
    });
  }
  
  if (stats.waitingCount > 0) {
    logger.warn('Clients waiting for database connections', {
      waitingClients: stats.waitingCount,
      recommendation: 'Consider increasing pool size or optimizing query performance'
    });
  }
}, logInterval);

// Enhanced health check function with pool statistics
const checkDatabaseHealth = async () => {
  try {
    const client = await pool.connect();
    const result = await client.query('SELECT NOW()');
    client.release();
    
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
  }
};

// Optimized database utilities with connection pooling and performance monitoring
const executeQuery = async (query, params = []) => {
  const startTime = process.hrtime.bigint(); // More precise timing
  const client = await getHealthyConnection(); // Use healthy connection acquisition
  
  try {
    const result = await client.query(query, params);
    const duration = Number(process.hrtime.bigint() - startTime) / 1000000; // Convert to milliseconds
    
    // Log slow queries with structured logging
    if (duration > 1000) {
      logger.warn('Slow query detected', {
        duration: `${Math.round(duration)}ms`,
        query: query.substring(0, 100),
        params: params.length > 0 ? params.length : 0,
        environment: process.env.NODE_ENV
      });
    }
    
    return result;
  } catch (error) {
    const duration = Number(process.hrtime.bigint() - startTime) / 1000000;
    
    logger.error('Database query failed', {
      query: query.substring(0, 100),
      error: error.message,
      code: error.code,
      duration: `${Math.round(duration)}ms`,
      params: params.length > 0 ? params.length : 0,
      stack: error.stack
    });
    
    throw error;
  } finally {
    client.release();
  }
};

// Enhanced transaction execution with retry logic
const executeTransaction = async (queries, retries = 3) => {
  let client;
  let attempt = 0;
  
  while (attempt < retries) {
    try {
      client = await pool.connect();
      await client.query('BEGIN');
      const results = [];
      
      for (const { query, params } of queries) {
        const result = await client.query(query, params);
        results.push(result);
      }
      
      await client.query('COMMIT');
      return results;
    } catch (error) {
      if (client) {
        try {
          await client.query('ROLLBACK');
        } catch (rollbackError) {
          logger.error('Failed to rollback transaction', {
            error: rollbackError.message,
            originalError: error.message
          });
        }
      }
      
      attempt++;
      
      if (attempt >= retries) {
        logger.error('Transaction failed after all retries', {
          error: error.message,
          attempts: attempt,
          queries: queries.length
        });
        throw error;
      }
      
      logger.warn('Transaction failed, retrying', {
        error: error.message,
        attempt: attempt,
        retries: retries
      });
      
      // Exponential backoff
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
    } finally {
      if (client) {
        client.release();
      }
    }
  }
};



// Backup utilities
const createBackup = async (backupType = 'full') => {
  const { exec } = require('child_process');
  const { promisify } = require('util');
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
const runMaintenance = async () => {
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
    console.error('Failed to get database stats:', error);
    throw error;
  }
};

export {
  pool,
  checkDatabaseHealth,
  executeQuery,
  executeTransaction,
  createBackup,
  runMaintenance,
  getDatabaseStats,
  getPoolStats,
  validateConnection,
  getHealthyConnection
};
