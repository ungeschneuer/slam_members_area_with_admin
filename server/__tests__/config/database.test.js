import pg from 'pg';
import dotenv from 'dotenv';
import logger from './logger.js';

dotenv.config();

const { Pool } = pg;

// Test-specific database configuration
const getTestPoolConfig = () => {
  return {
    user: process.env.DB_USER || 'slam_user',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'slam25_db',
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT || 5432,
    ssl: false, // No SSL for local testing
    max: 5, // Small pool for tests
    min: 1,
    idleTimeoutMillis: 10000, // 10 seconds
    connectionTimeoutMillis: 5000, // 5 seconds
    acquireTimeoutMillis: 10000, // 10 seconds
    allowExitOnIdle: true, // Allow pool to close when idle
    statement_timeout: 30000,
    query_timeout: 30000,
    application_name: 'slam25-test',
    keepAlive: false, // Disable keep-alive for tests
    validationQuery: 'SELECT 1'
  };
};

// Create test pool
const testPool = new Pool(getTestPoolConfig());

// Enhanced error handling for tests
testPool.on('error', (err, client) => {
  logger.error('Test database pool error', {
    error: err.message,
    code: err.code,
    processId: client?.processID
  });
});

// Test-specific executeQuery with better error handling
const executeQuery = async (query, params = []) => {
  const startTime = process.hrtime.bigint();
  let client;
  
  try {
    client = await testPool.connect();
    const result = await client.query(query, params);
    const duration = Number(process.hrtime.bigint() - startTime) / 1000000;
    
    // Log slow queries in tests
    if (duration > 1000) {
      logger.warn('Slow test query detected', {
        duration: `${Math.round(duration)}ms`,
        query: query.substring(0, 100)
      });
    }
    
    return result;
  } catch (error) {
    const duration = Number(process.hrtime.bigint() - startTime) / 1000000;
    
    logger.error('Test database query failed', {
      query: query.substring(0, 100),
      error: error.message,
      code: error.code,
      duration: `${Math.round(duration)}ms`,
      params: params.length > 0 ? params.length : 0
    });
    
    throw error;
  } finally {
    if (client) {
      try {
        client.release();
      } catch (releaseError) {
        // Log but don't throw on release errors
        logger.warn('Error releasing test connection', {
          error: releaseError.message
        });
      }
    }
  }
};

// Test-specific transaction execution
const executeTransaction = async (queries, retries = 2) => {
  let client;
  let attempt = 0;
  
  while (attempt < retries) {
    try {
      client = await testPool.connect();
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
          logger.warn('Failed to rollback test transaction', {
            error: rollbackError.message,
            originalError: error.message
          });
        }
      }
      
      attempt++;
      
      if (attempt >= retries) {
        logger.error('Test transaction failed after all retries', {
          error: error.message,
          attempts: attempt,
          queries: queries.length
        });
        throw error;
      }
      
      // Short backoff for tests
      await new Promise(resolve => setTimeout(resolve, 100 * attempt));
    } finally {
      if (client) {
        try {
          client.release();
        } catch (releaseError) {
          logger.warn('Error releasing test transaction connection', {
            error: releaseError.message
          });
        }
      }
    }
  }
};

// Test pool cleanup
const cleanupTestPool = async () => {
  try {
    await testPool.end();
    logger.info('Test database pool closed successfully');
  } catch (error) {
    logger.warn('Error closing test database pool', { error: error.message });
  }
};

// Test connection health check
const checkTestDatabaseHealth = async () => {
  try {
    const result = await executeQuery('SELECT NOW()');
    return {
      status: 'healthy',
      timestamp: result.rows[0].now,
      connection: 'active'
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      error: error.message,
      connection: 'failed'
    };
  }
};

export {
  testPool,
  executeQuery,
  executeTransaction,
  cleanupTestPool,
  checkTestDatabaseHealth
};
