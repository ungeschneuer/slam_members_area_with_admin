// Data Integrity Management API Routes
import express from 'express';
import { 
  executeQuery,
  performFullDataIntegrityCheck,
  verifyBackupIntegrity,
  enforceDataConstraints,
  createDataIntegrityTriggers
} from '../config/database.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { handleValidationErrors } from '../middleware/validation.js';
import logger from '../config/logger.js';

const router = express.Router();

/**
 * @route GET /api/integrity/dashboard
 * @desc Get data integrity dashboard information
 * @access Admin
 */
router.get('/dashboard', requireAuth, requireRole(['admin']), async (req, res) => {
  try {
    // Get dashboard overview
    const dashboardData = await executeQuery(`
      SELECT * FROM data_integrity_dashboard 
      ORDER BY category, metric
    `);
    
    // Get recent integrity check results
    const recentChecks = await executeQuery(`
      SELECT 
        id,
        created_at,
        error_count,
        warning_count,
        check_duration_ms,
        check_type
      FROM integrity_check_reports 
      WHERE created_at >= NOW() - INTERVAL '7 days'
      ORDER BY created_at DESC
      LIMIT 10
    `);
    
    // Get data quality health check
    const healthCheck = await executeQuery('SELECT * FROM data_integrity_health_check()');
    
    res.json({
      success: true,
      data: {
        dashboard: dashboardData.rows,
        recentChecks: recentChecks.rows,
        healthCheck: healthCheck.rows,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    logger.error('Failed to fetch integrity dashboard:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch integrity dashboard',
      code: 'DASHBOARD_ERROR'
    });
  }
});

/**
 * @route POST /api/integrity/check
 * @desc Run comprehensive data integrity check
 * @access Admin
 */
router.post('/check', requireAuth, requireRole(['admin']), async (req, res) => {
  try {
    logger.info('Starting data integrity check', { userId: req.user.id });
    const startTime = Date.now();
    
    const report = await performFullDataIntegrityCheck();
    const duration = Date.now() - startTime;
    
    // Update the report with duration
    await executeQuery(
      'UPDATE integrity_check_reports SET check_duration_ms = $1 WHERE id = (SELECT MAX(id) FROM integrity_check_reports)',
      [duration]
    );
    
    logger.info('Data integrity check completed', {
      userId: req.user.id,
      duration,
      errors: report.errors.length,
      warnings: report.warnings.length
    });
    
    res.json({
      success: true,
      data: {
        ...report,
        duration,
        summary: {
          totalChecks: report.checks.length,
          errors: report.errors.length,
          warnings: report.warnings.length,
          status: report.errors.length > 0 ? 'FAILED' : report.warnings.length > 0 ? 'WARNING' : 'PASSED'
        }
      }
    });

  } catch (error) {
    logger.error('Data integrity check failed:', error);
    res.status(500).json({
      success: false,
      error: 'Data integrity check failed',
      code: 'INTEGRITY_CHECK_ERROR',
      details: error.message
    });
  }
});

/**
 * @route GET /api/integrity/reports
 * @desc Get integrity check reports history
 * @access Admin
 */
router.get('/reports', requireAuth, requireRole(['admin']), async (req, res) => {
  try {
    const { page = 1, limit = 10, status } = req.query;
    const offset = (page - 1) * limit;
    
    let query = `
      SELECT 
        id,
        created_at,
        error_count,
        warning_count,
        check_duration_ms,
        check_type,
        report_data
      FROM integrity_check_reports
    `;
    
    const params = [];
    
    if (status) {
      query += ` WHERE 
        CASE 
          WHEN error_count > 0 THEN 'FAILED'
          WHEN warning_count > 0 THEN 'WARNING'
          ELSE 'PASSED'
        END = $${params.length + 1}
      `;
      params.push(status);
    }
    
    query += ` ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);
    
    const reports = await executeQuery(query, params);
    
    // Get total count for pagination
    const countQuery = status 
      ? 'SELECT COUNT(*) FROM integrity_check_reports WHERE CASE WHEN error_count > 0 THEN \'FAILED\' WHEN warning_count > 0 THEN \'WARNING\' ELSE \'PASSED\' END = $1'
      : 'SELECT COUNT(*) FROM integrity_check_reports';
    
    const countParams = status ? [status] : [];
    const totalCount = await executeQuery(countQuery, countParams);
    
    res.json({
      success: true,
      data: {
        reports: reports.rows,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: parseInt(totalCount.rows[0].count),
          totalPages: Math.ceil(totalCount.rows[0].count / limit)
        }
      }
    });

  } catch (error) {
    logger.error('Failed to fetch integrity reports:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch integrity reports',
      code: 'REPORTS_ERROR'
    });
  }
});

/**
 * @route GET /api/integrity/reports/:id
 * @desc Get detailed integrity check report
 * @access Admin
 */
router.get('/reports/:id', requireAuth, requireRole(['admin']), async (req, res) => {
  try {
    const { id } = req.params;
    
    const report = await executeQuery(
      'SELECT * FROM integrity_check_reports WHERE id = $1',
      [id]
    );
    
    if (report.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Integrity report not found',
        code: 'REPORT_NOT_FOUND'
      });
    }
    
    res.json({
      success: true,
      data: report.rows[0]
    });

  } catch (error) {
    logger.error('Failed to fetch integrity report:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch integrity report',
      code: 'REPORT_ERROR'
    });
  }
});

/**
 * @route POST /api/integrity/verify-backup
 * @desc Verify backup file integrity
 * @access Admin
 */
router.post('/verify-backup', requireAuth, requireRole(['admin']), async (req, res) => {
  try {
    const { backupFile } = req.body;
    
    if (!backupFile) {
      return res.status(400).json({
        success: false,
        error: 'Backup file path is required',
        code: 'MISSING_BACKUP_FILE'
      });
    }
    
    logger.info('Starting backup verification', { 
      userId: req.user.id, 
      backupFile 
    });
    
    const startTime = Date.now();
    const verification = await verifyBackupIntegrity(backupFile);
    const duration = Date.now() - startTime;
    
    // Log verification result
    await executeQuery(
      `INSERT INTO backup_verification_log 
       (backup_file, verification_status, verification_details, verification_duration_ms, verified_by) 
       VALUES ($1, $2, $3, $4, $5)`,
      [
        backupFile,
        verification.valid ? 'PASSED' : 'FAILED',
        JSON.stringify(verification),
        duration,
        req.user.id
      ]
    );
    
    logger.info('Backup verification completed', {
      userId: req.user.id,
      backupFile,
      duration,
      valid: verification.valid
    });
    
    res.json({
      success: true,
      data: {
        ...verification,
        duration,
        verifiedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    logger.error('Backup verification failed:', error);
    res.status(500).json({
      success: false,
      error: 'Backup verification failed',
      code: 'BACKUP_VERIFICATION_ERROR',
      details: error.message
    });
  }
});

/**
 * @route POST /api/integrity/setup-constraints
 * @desc Setup database constraints for a table
 * @access Admin
 */
router.post('/setup-constraints', requireAuth, requireRole(['admin']), async (req, res) => {
  try {
    const { tableName, constraints } = req.body;
    
    if (!tableName || !constraints || !Array.isArray(constraints)) {
      return res.status(400).json({
        success: false,
        error: 'Table name and constraints array are required',
        code: 'INVALID_CONSTRAINT_DATA'
      });
    }
    
    logger.info('Setting up database constraints', {
      userId: req.user.id,
      tableName,
      constraintCount: constraints.length
    });
    
    const results = await enforceDataConstraints(tableName, constraints);
    
    logger.info('Database constraints setup completed', {
      userId: req.user.id,
      tableName,
      results
    });
    
    res.json({
      success: true,
      data: {
        tableName,
        constraints: results,
        message: `Successfully added ${results.length} constraints to ${tableName}`
      }
    });

  } catch (error) {
    logger.error('Failed to setup constraints:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to setup database constraints',
      code: 'CONSTRAINT_SETUP_ERROR',
      details: error.message
    });
  }
});

/**
 * @route POST /api/integrity/setup-triggers
 * @desc Setup data integrity triggers
 * @access Admin
 */
router.post('/setup-triggers', requireAuth, requireRole(['admin']), async (req, res) => {
  try {
    logger.info('Setting up data integrity triggers', { userId: req.user.id });
    
    const result = await createDataIntegrityTriggers();
    
    logger.info('Data integrity triggers setup completed', {
      userId: req.user.id,
      result
    });
    
    res.json({
      success: true,
      data: result
    });

  } catch (error) {
    logger.error('Failed to setup triggers:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to setup data integrity triggers',
      code: 'TRIGGER_SETUP_ERROR',
      details: error.message
    });
  }
});

/**
 * @route GET /api/integrity/violations
 * @desc Get constraint violations
 * @access Admin
 */
router.get('/violations', requireAuth, requireRole(['admin']), async (req, res) => {
  try {
    const { resolved = 'false', page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;
    
    let query = 'SELECT * FROM constraint_violations';
    const params = [];
    
    if (resolved === 'false') {
      query += ' WHERE resolved_at IS NULL';
    } else if (resolved === 'true') {
      query += ' WHERE resolved_at IS NOT NULL';
    }
    
    query += ` ORDER BY detected_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);
    
    const violations = await executeQuery(query, params);
    
    res.json({
      success: true,
      data: violations.rows
    });

  } catch (error) {
    logger.error('Failed to fetch constraint violations:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch constraint violations',
      code: 'VIOLATIONS_ERROR'
    });
  }
});

/**
 * @route PUT /api/integrity/violations/:id/resolve
 * @desc Mark constraint violation as resolved
 * @access Admin
 */
router.put('/violations/:id/resolve', requireAuth, requireRole(['admin']), async (req, res) => {
  try {
    const { id } = req.params;
    const { resolutionNotes } = req.body;
    
    const result = await executeQuery(
      'UPDATE constraint_violations SET resolved_at = NOW(), resolution_notes = $1 WHERE id = $2 RETURNING *',
      [resolutionNotes || 'Resolved by admin', id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Constraint violation not found',
        code: 'VIOLATION_NOT_FOUND'
      });
    }
    
    logger.info('Constraint violation resolved', {
      userId: req.user.id,
      violationId: id,
      resolutionNotes
    });
    
    res.json({
      success: true,
      data: result.rows[0]
    });

  } catch (error) {
    logger.error('Failed to resolve constraint violation:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to resolve constraint violation',
      code: 'RESOLVE_VIOLATION_ERROR'
    });
  }
});

/**
 * @route GET /api/integrity/metrics
 * @desc Get data quality metrics
 * @access Admin
 */
router.get('/metrics', requireAuth, requireRole(['admin']), async (req, res) => {
  try {
    const { days = 7 } = req.query;
    
    const metrics = await executeQuery(`
      SELECT 
        table_name,
        metric_name,
        metric_value,
        threshold_min,
        threshold_max,
        is_within_threshold,
        measurement_date
      FROM data_quality_metrics 
      WHERE measurement_date >= NOW() - INTERVAL '${parseInt(days)} days'
      ORDER BY measurement_date DESC, table_name, metric_name
    `);
    
    // Group metrics by table
    const groupedMetrics = {};
    metrics.rows.forEach(metric => {
      if (!groupedMetrics[metric.table_name]) {
        groupedMetrics[metric.table_name] = [];
      }
      groupedMetrics[metric.table_name].push(metric);
    });
    
    res.json({
      success: true,
      data: {
        metrics: groupedMetrics,
        summary: {
          totalMetrics: metrics.rows.length,
          thresholdViolations: metrics.rows.filter(m => !m.is_within_threshold).length,
          tablesMonitored: Object.keys(groupedMetrics).length
        }
      }
    });

  } catch (error) {
    logger.error('Failed to fetch data quality metrics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch data quality metrics',
      code: 'METRICS_ERROR'
    });
  }
});

/**
 * @route POST /api/integrity/collect-metrics
 * @desc Manually trigger data quality metrics collection
 * @access Admin
 */
router.post('/collect-metrics', requireAuth, requireRole(['admin']), async (req, res) => {
  try {
    logger.info('Collecting data quality metrics', { userId: req.user.id });
    
    const result = await executeQuery('SELECT collect_data_quality_metrics()');
    const metricsCount = result.rows[0].collect_data_quality_metrics;
    
    logger.info('Data quality metrics collected', {
      userId: req.user.id,
      metricsCount
    });
    
    res.json({
      success: true,
      data: {
        metricsCollected: metricsCount,
        collectedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    logger.error('Failed to collect metrics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to collect data quality metrics',
      code: 'COLLECT_METRICS_ERROR'
    });
  }
});

export default router;