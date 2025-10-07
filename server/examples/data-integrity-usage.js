// Examples of how to use the enhanced data integrity features
// This file demonstrates practical usage patterns for the SLAM25 application

import { 
  executeQuery, 
  executeTransaction,
  performFullDataIntegrityCheck,
  verifyBackupIntegrity,
  enforceDataConstraints,
  createDataIntegrityTriggers
} from '../config/database.js';

/**
 * Example 1: Using enhanced executeQuery with validation
 */
export const createParticipantWithValidation = async (participantData) => {
  try {
    // Create participant with constraint validation
    const result = await executeQuery(
      `INSERT INTO participants (name, role, region, pronouns, instagram) 
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [
        participantData.name,
        participantData.role,
        participantData.region,
        participantData.pronouns,
        participantData.instagram
      ],
      {
        validateConstraints: true, // Validates data types and constraints
        validateResult: {
          minRows: 1, // Ensures at least one row was inserted
          requiredFields: ['id', 'name', 'role'] // Ensures required fields are returned
        }
      }
    );

    console.log('✅ Participant created with validation:', result.rows[0]);
    return result.rows[0];

  } catch (error) {
    console.error('❌ Failed to create participant:', error.message);
    throw error;
  }
};

/**
 * Example 2: Using enhanced executeTransaction with integrity checks
 */
export const createRoundWithParticipants = async (roundData, participantIds) => {
  try {
    const queries = [
      {
        query: `INSERT INTO rounds (title, "startDateTime", "endDateTime", location, description) 
                VALUES ($1, $2, $3, $4, $5) RETURNING id`,
        params: [
          roundData.title,
          roundData.startDateTime,
          roundData.endDateTime,
          roundData.location,
          roundData.description
        ],
        validate: true // Enable individual query validation
      }
    ];

    // Add participant assignments
    participantIds.forEach((participantId, index) => {
      queries.push({
        query: `INSERT INTO round_participants (round_id, participant_id, "order") 
                VALUES ($1, $2, $3)`,
        params: ['ROUND_ID_PLACEHOLDER', participantId, index + 1],
        validate: true
      });
    });

    const results = await executeTransaction(queries, {
      validateIntegrity: true, // Check integrity before and after
      checkReferences: true,   // Validate referential integrity after each query
      auditLog: true          // Log the transaction for auditing
    });

    // Update participant queries with actual round ID
    const roundId = results[0].rows[0].id;
    for (let i = 1; i < queries.length; i++) {
      queries[i].params[0] = roundId;
    }

    console.log('✅ Round created with participants:', { roundId, participantCount: participantIds.length });
    return { roundId, results };

  } catch (error) {
    console.error('❌ Failed to create round with participants:', error.message);
    throw error;
  }
};

/**
 * Example 3: Running comprehensive data integrity check
 */
export const runDataIntegrityCheck = async () => {
  try {
    console.log('🔍 Starting comprehensive data integrity check...');
    const startTime = Date.now();
    
    const report = await performFullDataIntegrityCheck();
    const duration = Date.now() - startTime;
    
    console.log(`✅ Data integrity check completed in ${duration}ms`);
    console.log(`📊 Summary: ${report.checks.length} checks passed, ${report.errors.length} errors, ${report.warnings.length} warnings`);
    
    // Log critical issues
    if (report.errors.length > 0) {
      console.error('🚨 Critical data integrity issues found:');
      report.errors.forEach(error => {
        console.error(`  - ${error.check}: ${error.error}`);
      });
    }
    
    // Log warnings
    if (report.warnings.length > 0) {
      console.warn('⚠️  Data integrity warnings:');
      report.warnings.forEach(warning => {
        console.warn(`  - ${warning.check}: ${warning.count} issues found`);
      });
    }
    
    return report;

  } catch (error) {
    console.error('❌ Data integrity check failed:', error.message);
    throw error;
  }
};

/**
 * Example 4: Verifying backup integrity
 */
export const verifyLatestBackup = async (backupFile) => {
  try {
    console.log('🔍 Verifying backup integrity for:', backupFile);
    const startTime = Date.now();
    
    const verification = await verifyBackupIntegrity(backupFile);
    const duration = Date.now() - startTime;
    
    if (verification.valid) {
      console.log(`✅ Backup verification passed in ${duration}ms`);
      console.log(`📝 ${verification.message}`);
    } else {
      console.error(`❌ Backup verification failed in ${duration}ms`);
      console.error(`📝 ${verification.message}`);
    }
    
    return verification;

  } catch (error) {
    console.error('❌ Backup verification error:', error.message);
    throw error;
  }
};

/**
 * Example 5: Adding database constraints programmatically
 */
export const setupDataConstraints = async () => {
  try {
    console.log('🔧 Setting up data constraints...');
    
    // Define constraints for participants table
    const participantConstraints = [
      {
        type: 'check',
        name: 'name_length',
        condition: 'LENGTH(name) >= 2 AND LENGTH(name) <= 255'
      },
      {
        type: 'check',
        name: 'valid_role',
        condition: "role IN ('Teilnehmer', 'Jury', 'Organisator', 'Moderator', 'Technik')"
      },
      {
        type: 'unique',
        name: 'participant_name_region',
        columns: ['name', 'region']
      }
    ];
    
    const participantResults = await enforceDataConstraints('participants', participantConstraints);
    console.log('✅ Participant constraints added:', participantResults);
    
    // Define constraints for rounds table
    const roundConstraints = [
      {
        type: 'check',
        name: 'valid_dates',
        condition: '"endDateTime" > "startDateTime"'
      },
      {
        type: 'check',
        name: 'title_length',
        condition: 'LENGTH(title) >= 3 AND LENGTH(title) <= 255'
      }
    ];
    
    const roundResults = await enforceDataConstraints('rounds', roundConstraints);
    console.log('✅ Round constraints added:', roundResults);
    
    return { participants: participantResults, rounds: roundResults };

  } catch (error) {
    console.error('❌ Failed to setup constraints:', error.message);
    throw error;
  }
};

/**
 * Example 6: Setting up audit triggers
 */
export const setupAuditTriggers = async () => {
  try {
    console.log('🔧 Setting up data integrity triggers...');
    
    const result = await createDataIntegrityTriggers();
    
    if (result.success) {
      console.log('✅ Data integrity triggers created successfully');
      console.log('📝 Audit triggers are now active for all critical tables');
      console.log('📝 Data validation triggers are now enforcing business rules');
    }
    
    return result;

  } catch (error) {
    console.error('❌ Failed to setup audit triggers:', error.message);
    throw error;
  }
};

/**
 * Example 7: Safe bulk operation with integrity checking
 */
export const safeBulkParticipantUpdate = async (updates) => {
  try {
    console.log(`🔄 Starting safe bulk update of ${updates.length} participants...`);
    
    // Prepare all update queries
    const queries = updates.map(update => ({
      query: `UPDATE participants SET name = $1, role = $2, region = $3 WHERE id = $4 RETURNING id, name`,
      params: [update.name, update.role, update.region, update.id],
      validate: true
    }));
    
    // Execute with full integrity checking
    const results = await executeTransaction(queries, {
      validateIntegrity: true,
      checkReferences: true,
      auditLog: true
    });
    
    const updatedCount = results.filter(r => r.rowCount > 0).length;
    console.log(`✅ Successfully updated ${updatedCount}/${updates.length} participants`);
    
    return {
      success: true,
      updatedCount,
      totalCount: updates.length,
      results
    };

  } catch (error) {
    console.error('❌ Bulk update failed:', error.message);
    throw error;
  }
};

/**
 * Example 8: Data integrity monitoring dashboard data
 */
export const getIntegrityDashboardData = async () => {
  try {
    // Get dashboard overview
    const dashboardData = await executeQuery('SELECT * FROM data_integrity_dashboard ORDER BY category, metric');
    
    // Get recent integrity check results
    const recentChecks = await executeQuery(`
      SELECT 
        created_at,
        error_count,
        warning_count,
        check_duration_ms,
        (report_data->>'checks')::json as checks_summary
      FROM integrity_check_reports 
      WHERE created_at >= NOW() - INTERVAL '7 days'
      ORDER BY created_at DESC
      LIMIT 10
    `);
    
    // Get data quality health check
    const healthCheck = await executeQuery('SELECT * FROM data_integrity_health_check()');
    
    return {
      dashboard: dashboardData.rows,
      recentChecks: recentChecks.rows,
      healthCheck: healthCheck.rows,
      timestamp: new Date().toISOString()
    };

  } catch (error) {
    console.error('❌ Failed to fetch integrity dashboard data:', error.message);
    throw error;
  }
};

// Export all examples for easy testing
export const integrityExamples = {
  createParticipantWithValidation,
  createRoundWithParticipants,
  runDataIntegrityCheck,
  verifyLatestBackup,
  setupDataConstraints,
  setupAuditTriggers,
  safeBulkParticipantUpdate,
  getIntegrityDashboardData
};

/**
 * Complete setup function to initialize all data integrity features
 */
export const initializeDataIntegrity = async () => {
  try {
    console.log('🚀 Initializing data integrity system...');
    
    // 1. Setup database constraints
    await setupDataConstraints();
    
    // 2. Setup audit triggers
    await setupAuditTriggers();
    
    // 3. Run initial integrity check
    const report = await runDataIntegrityCheck();
    
    console.log('✅ Data integrity system initialized successfully!');
    console.log('📊 Initial integrity check:', {
      errors: report.errors.length,
      warnings: report.warnings.length,
      checks: report.checks.length
    });
    
    return {
      success: true,
      initialReport: report,
      timestamp: new Date().toISOString()
    };

  } catch (error) {
    console.error('❌ Failed to initialize data integrity system:', error.message);
    throw error;
  }
};

export default integrityExamples;