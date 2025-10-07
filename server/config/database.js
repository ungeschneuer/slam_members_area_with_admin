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

// Database utilities with enhanced data integrity
export const executeQuery = async (query, params = [], options = {}) => {
  const client = await pool.connect();
  try {
    // Pre-execution validation if enabled
    if (options.validateConstraints) {
      await validateQueryConstraints(query, params, client);
    }
    
    const startTime = Date.now();
    const result = await client.query(query, params);
    const duration = Date.now() - startTime;
    
    // Log slow queries
    if (duration > 5000) {
      console.warn(`⚠️ Slow query detected (${duration}ms):`, query.substring(0, 100));
    }
    
    // Post-execution validation if enabled
    if (options.validateResult) {
      await validateQueryResult(result, options.validateResult);
    }
    
    return result;
  } finally {
    client.release();
  }
};

export const executeTransaction = async (queries, options = {}) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const results = [];
    
    // Pre-transaction integrity check
    if (options.validateIntegrity) {
      await performIntegrityCheck(client);
    }
    
    for (const { query, params, validate } of queries) {
      // Individual query validation
      if (validate) {
        await validateQueryConstraints(query, params, client);
      }
      
      const result = await client.query(query, params);
      results.push(result);
      
      // Check referential integrity after each query if requested
      if (options.checkReferences) {
        await validateReferentialIntegrity(client);
      }
    }
    
    // Final integrity check before commit
    if (options.validateIntegrity) {
      await performIntegrityCheck(client);
    }
    
    await client.query('COMMIT');
    
    // Log successful transaction
    if (options.auditLog) {
      await logTransactionAudit(queries, results, 'SUCCESS');
    }
    
    return results;
  } catch (error) {
    await client.query('ROLLBACK');
    
    // Log failed transaction
    if (options.auditLog) {
      await logTransactionAudit(queries, [], 'FAILED', error.message);
    }
    
    throw error;
  } finally {
    client.release();
  }
};

// Data integrity validation functions
export const validateQueryConstraints = async (query, params, client) => {
  try {
    // Check for potentially dangerous operations
    const upperQuery = query.toUpperCase();
    
    // Prevent cascading deletes without explicit confirmation
    if (upperQuery.includes('DELETE') && upperQuery.includes('CASCADE')) {
      throw new Error('CASCADE DELETE requires explicit confirmation');
    }
    
    // Validate data types and ranges for INSERT/UPDATE operations
    if (upperQuery.includes('INSERT') || upperQuery.includes('UPDATE')) {
      await validateDataTypes(query, params, client);
    }
    
    return true;
  } catch (error) {
    console.error('Constraint validation failed:', error);
    throw error;
  }
};

export const validateDataTypes = async (query, params, client) => {
  // Extract table name from query
  const tableMatch = query.match(/(?:INSERT INTO|UPDATE)\s+(\w+)/i);
  if (!tableMatch) return;
  
  const tableName = tableMatch[1];
  
  // Get table schema information
  const schemaInfo = await client.query(`
    SELECT column_name, data_type, is_nullable, character_maximum_length 
    FROM information_schema.columns 
    WHERE table_name = $1 AND table_schema = 'public'
  `, [tableName]);
  
  // Validate parameter types and lengths
  for (let i = 0; i < params.length; i++) {
    const param = params[i];
    const column = schemaInfo.rows[i];
    
    if (column) {
      // Check for null values in non-nullable columns
      if (param === null && column.is_nullable === 'NO') {
        throw new Error(`NULL value not allowed for column ${column.column_name}`);
      }
      
      // Check string length limits
      if (column.data_type === 'character varying' && 
          column.character_maximum_length && 
          typeof param === 'string' && 
          param.length > column.character_maximum_length) {
        throw new Error(`Value too long for column ${column.column_name} (max: ${column.character_maximum_length})`);
      }
    }
  }
};

export const validateQueryResult = async (result, validationRules) => {
  if (validationRules.minRows && result.rowCount < validationRules.minRows) {
    throw new Error(`Query returned ${result.rowCount} rows, expected at least ${validationRules.minRows}`);
  }
  
  if (validationRules.maxRows && result.rowCount > validationRules.maxRows) {
    throw new Error(`Query returned ${result.rowCount} rows, expected at most ${validationRules.maxRows}`);
  }
  
  if (validationRules.requiredFields) {
    const firstRow = result.rows[0];
    if (firstRow) {
      for (const field of validationRules.requiredFields) {
        if (!(field in firstRow)) {
          throw new Error(`Required field '${field}' missing from query result`);
        }
      }
    }
  }
};

export const performIntegrityCheck = async (client) => {
  // Check foreign key constraints
  const fkViolations = await client.query(`
    SELECT conname, conrelid::regclass, confrelid::regclass
    FROM pg_constraint 
    WHERE contype = 'f' 
    AND NOT EXISTS (
      SELECT 1 FROM pg_trigger WHERE tgconstraint = pg_constraint.oid
    )
  `);
  
  if (fkViolations.rows.length > 0) {
    throw new Error(`Foreign key violations detected: ${fkViolations.rows.map(r => r.conname).join(', ')}`);
  }
  
  // Check for orphaned records (customize based on your schema)
  const orphanedParticipants = await client.query(`
    SELECT COUNT(*) as count FROM participants 
    WHERE id NOT IN (SELECT DISTINCT participant_id FROM round_participants WHERE participant_id IS NOT NULL)
    AND id NOT IN (SELECT DISTINCT user_id FROM users WHERE user_id IS NOT NULL)
  `);
  
  if (orphanedParticipants.rows[0].count > 0) {
    console.warn(`Found ${orphanedParticipants.rows[0].count} potentially orphaned participants`);
  }
};

export const validateReferentialIntegrity = async (client) => {
  // Check that all referenced IDs exist
  const referenceChecks = [
    {
      table: 'round_participants',
      column: 'round_id',
      refTable: 'rounds',
      refColumn: 'id'
    },
    {
      table: 'round_participants', 
      column: 'participant_id',
      refTable: 'participants',
      refColumn: 'id'
    },
    {
      table: 'news',
      column: 'author_id',
      refTable: 'users',
      refColumn: 'id'
    }
  ];
  
  for (const check of referenceChecks) {
    const violations = await client.query(`
      SELECT COUNT(*) as count 
      FROM ${check.table} t1 
      LEFT JOIN ${check.refTable} t2 ON t1.${check.column} = t2.${check.refColumn}
      WHERE t1.${check.column} IS NOT NULL AND t2.${check.refColumn} IS NULL
    `);
    
    if (violations.rows[0].count > 0) {
      throw new Error(`Referential integrity violation: ${check.table}.${check.column} -> ${check.refTable}.${check.refColumn} (${violations.rows[0].count} violations)`);
    }
  }
};

export const logTransactionAudit = async (queries, results, status, errorMessage = null) => {
  try {
    const auditEntry = {
      timestamp: new Date().toISOString(),
      queryCount: queries.length,
      status,
      queries: queries.map(q => ({ query: q.query.substring(0, 200), paramCount: q.params?.length || 0 })),
      errorMessage
    };
    
    // Log to audit table (create this table if it doesn't exist)
    await executeQuery(
      'INSERT INTO transaction_audit_log (audit_data, status, created_at) VALUES ($1, $2, NOW())',
      [JSON.stringify(auditEntry), status]
    );
  } catch (error) {
    console.error('Failed to log transaction audit:', error);
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

// Data integrity verification utilities
export const verifyBackupIntegrity = async (backupFile) => {
  try {
    const { exec } = await import('child_process');
    const { promisify } = await import('util');
    const execAsync = promisify(exec);
    
    // Test backup file by attempting to restore to a temporary database
    const testDbName = `slam25_test_${Date.now()}`;
    
    try {
      // Create test database
      await execAsync(`createdb -h ${process.env.DB_HOST || 'localhost'} -U ${process.env.DB_USER || 'slam_user'} ${testDbName}`);
      
      // Restore backup to test database
      await execAsync(`psql -h ${process.env.DB_HOST || 'localhost'} -U ${process.env.DB_USER || 'slam_user'} -d ${testDbName} -f ${backupFile}`);
      
      // Run basic integrity checks on test database
      const testPool = new Pool({
        ...pool.options,
        database: testDbName
      });
      
      const testClient = await testPool.connect();
      
      // Check if all expected tables exist
      const tablesResult = await testClient.query(`
        SELECT tablename FROM pg_tables WHERE schemaname = 'public'
      `);
      
      const expectedTables = ['participants', 'rounds', 'news', 'timetable_entries', 'city_tips', 'users'];
      const actualTables = tablesResult.rows.map(row => row.tablename);
      
      for (const table of expectedTables) {
        if (!actualTables.includes(table)) {
          throw new Error(`Missing table: ${table}`);
        }
      }
      
      // Check data integrity
      await performIntegrityCheck(testClient);
      
      testClient.release();
      await testPool.end();
      
      return { valid: true, message: 'Backup integrity verified successfully' };
      
    } finally {
      // Clean up test database
      try {
        await execAsync(`dropdb -h ${process.env.DB_HOST || 'localhost'} -U ${process.env.DB_USER || 'slam_user'} ${testDbName}`);
      } catch (cleanupError) {
        console.warn('Failed to cleanup test database:', cleanupError.message);
      }
    }
    
  } catch (error) {
    return { valid: false, message: `Backup integrity check failed: ${error.message}` };
  }
};

export const performFullDataIntegrityCheck = async () => {
  const client = await pool.connect();
  try {
    const report = {
      timestamp: new Date().toISOString(),
      checks: [],
      errors: [],
      warnings: []
    };
    
    // 1. Check foreign key constraints
    try {
      await performIntegrityCheck(client);
      report.checks.push({ name: 'Foreign Key Constraints', status: 'PASSED' });
    } catch (error) {
      report.errors.push({ check: 'Foreign Key Constraints', error: error.message });
    }
    
    // 2. Check for duplicate entries where uniqueness is expected
    const duplicateChecks = [
      { table: 'participants', columns: ['name', 'region'], description: 'Duplicate participants' },
      { table: 'rounds', columns: ['title', 'startDateTime'], description: 'Duplicate rounds' },
      { table: 'users', columns: ['username'], description: 'Duplicate usernames' }
    ];
    
    for (const check of duplicateChecks) {
      try {
        const result = await client.query(`
          SELECT ${check.columns.join(', ')}, COUNT(*) as count
          FROM ${check.table}
          GROUP BY ${check.columns.join(', ')}
          HAVING COUNT(*) > 1
        `);
        
        if (result.rows.length > 0) {
          report.warnings.push({
            check: check.description,
            count: result.rows.length,
            details: result.rows
          });
        } else {
          report.checks.push({ name: check.description, status: 'PASSED' });
        }
      } catch (error) {
        report.errors.push({ check: check.description, error: error.message });
      }
    }
    
    // 3. Check for data consistency issues
    const consistencyChecks = [
      {
        name: 'Round dates consistency',
        query: `SELECT id, title FROM rounds WHERE "endDateTime" <= "startDateTime"`,
        description: 'Rounds with end date before start date'
      },
      {
        name: 'Future timetable entries',
        query: `SELECT id, title FROM timetable_entries WHERE date < CURRENT_DATE - INTERVAL '1 year'`,
        description: 'Very old timetable entries (might be incorrect)'
      }
    ];
    
    for (const check of consistencyChecks) {
      try {
        const result = await client.query(check.query);
        if (result.rows.length > 0) {
          report.warnings.push({
            check: check.name,
            description: check.description,
            count: result.rows.length,
            details: result.rows.slice(0, 5) // First 5 examples
          });
        } else {
          report.checks.push({ name: check.name, status: 'PASSED' });
        }
      } catch (error) {
        report.errors.push({ check: check.name, error: error.message });
      }
    }
    
    // 4. Check database statistics for anomalies
    try {
      const stats = await getDatabaseStats();
      report.checks.push({ name: 'Database Statistics', status: 'COLLECTED', data: stats });
    } catch (error) {
      report.errors.push({ check: 'Database Statistics', error: error.message });
    }
    
    // Store integrity check report
    await executeQuery(
      'INSERT INTO integrity_check_reports (report_data, error_count, warning_count, created_at) VALUES ($1, $2, $3, NOW())',
      [JSON.stringify(report), report.errors.length, report.warnings.length]
    );
    
    return report;
    
  } finally {
    client.release();
  }
};

export const enforceDataConstraints = async (tableName, constraintRules) => {
  const client = await pool.connect();
  try {
    const results = [];
    
    for (const rule of constraintRules) {
      switch (rule.type) {
        case 'check':
          // Add check constraint
          const checkConstraintName = `chk_${tableName}_${rule.name}`;
          await client.query(`
            ALTER TABLE ${tableName} 
            ADD CONSTRAINT ${checkConstraintName} 
            CHECK (${rule.condition})
          `);
          results.push({ constraint: checkConstraintName, status: 'ADDED' });
          break;
          
        case 'unique':
          // Add unique constraint
          const uniqueConstraintName = `unq_${tableName}_${rule.name}`;
          await client.query(`
            ALTER TABLE ${tableName} 
            ADD CONSTRAINT ${uniqueConstraintName} 
            UNIQUE (${rule.columns.join(', ')})
          `);
          results.push({ constraint: uniqueConstraintName, status: 'ADDED' });
          break;
          
        case 'foreign_key':
          // Add foreign key constraint
          const fkConstraintName = `fk_${tableName}_${rule.name}`;
          await client.query(`
            ALTER TABLE ${tableName} 
            ADD CONSTRAINT ${fkConstraintName} 
            FOREIGN KEY (${rule.column}) 
            REFERENCES ${rule.refTable}(${rule.refColumn})
            ${rule.onDelete ? `ON DELETE ${rule.onDelete}` : ''}
            ${rule.onUpdate ? `ON UPDATE ${rule.onUpdate}` : ''}
          `);
          results.push({ constraint: fkConstraintName, status: 'ADDED' });
          break;
      }
    }
    
    return results;
    
  } catch (error) {
    console.error('Failed to enforce constraints:', error);
    throw error;
  } finally {
    client.release();
  }
};

export const createDataIntegrityTriggers = async () => {
  const client = await pool.connect();
  try {
    // Create audit trigger function
    await client.query(`
      CREATE OR REPLACE FUNCTION audit_trigger_function()
      RETURNS TRIGGER AS $function$
      BEGIN
        IF TG_OP = 'INSERT' THEN
          INSERT INTO audit_log (table_name, operation, new_values, user_id, created_at)
          VALUES (TG_TABLE_NAME, TG_OP, row_to_json(NEW), COALESCE(current_setting('app.current_user_id', true)::INTEGER, 0), NOW());
          RETURN NEW;
        ELSIF TG_OP = 'UPDATE' THEN
          INSERT INTO audit_log (table_name, operation, old_values, new_values, user_id, created_at)
          VALUES (TG_TABLE_NAME, TG_OP, row_to_json(OLD), row_to_json(NEW), COALESCE(current_setting('app.current_user_id', true)::INTEGER, 0), NOW());
          RETURN NEW;
        ELSIF TG_OP = 'DELETE' THEN
          INSERT INTO audit_log (table_name, operation, old_values, user_id, created_at)
          VALUES (TG_TABLE_NAME, TG_OP, row_to_json(OLD), COALESCE(current_setting('app.current_user_id', true)::INTEGER, 0), NOW());
          RETURN OLD;
        END IF;
        RETURN NULL;
      END;
      $function$ LANGUAGE plpgsql;
    `);
    
    // Create triggers for critical tables
    const tables = ['participants', 'rounds', 'news', 'users', 'timetable_entries'];
    
    for (const table of tables) {
      await client.query(`
        DROP TRIGGER IF EXISTS audit_${table}_trigger ON ${table};
        CREATE TRIGGER audit_${table}_trigger
        AFTER INSERT OR UPDATE OR DELETE ON ${table}
        FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();
      `);
    }
    
    // Create data validation trigger function
    await client.query(`
      CREATE OR REPLACE FUNCTION validate_data_trigger_function()
      RETURNS TRIGGER AS $function$
      BEGIN
        -- Validate email format for users table
        IF TG_TABLE_NAME = 'users' AND NEW.email IS NOT NULL THEN
          IF NEW.email !~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}$' THEN
            RAISE EXCEPTION 'Invalid email format: %', NEW.email;
          END IF;
        END IF;
        
        -- Validate date ranges for rounds
        IF TG_TABLE_NAME = 'rounds' THEN
          IF NEW."endDateTime" <= NEW."startDateTime" THEN
            RAISE EXCEPTION 'End date must be after start date';
          END IF;
        END IF;
        
        RETURN NEW;
      END;
      $function$ LANGUAGE plpgsql;
    `);
    
    // Create validation triggers
    await client.query(`
      DROP TRIGGER IF EXISTS validate_users_trigger ON users;
      CREATE TRIGGER validate_users_trigger
      BEFORE INSERT OR UPDATE ON users
      FOR EACH ROW EXECUTE FUNCTION validate_data_trigger_function();
      
      DROP TRIGGER IF EXISTS validate_rounds_trigger ON rounds;
      CREATE TRIGGER validate_rounds_trigger
      BEFORE INSERT OR UPDATE ON rounds
      FOR EACH ROW EXECUTE FUNCTION validate_data_trigger_function();
    `);
    
    return { success: true, message: 'Data integrity triggers created successfully' };
    
  } catch (error) {
    console.error('Failed to create integrity triggers:', error);
    throw error;
  } finally {
    client.release();
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
    
    // Data integrity statistics
    const integrityStats = await executeQuery(`
      SELECT 
        COUNT(*) as total_integrity_checks,
        COUNT(*) FILTER (WHERE error_count = 0) as passed_checks,
        COUNT(*) FILTER (WHERE error_count > 0) as failed_checks,
        AVG(warning_count::numeric) as avg_warnings
      FROM integrity_check_reports 
      WHERE created_at >= NOW() - INTERVAL '30 days'
    `);
    stats.integrityStats = integrityStats.rows[0];
    
    return stats;
  } catch (error) {
    console.error('Failed to get database stats:', error);
    throw error;
  }
};

export { pool };
