// GDPR Compliance Service for SLAM25 Application
import { executeQuery, executeTransaction } from '../config/database.js';
import { logSecurityEvent } from '../middleware/securityLogger.js';
import crypto from 'crypto';

class GDPRService {
  constructor() {
    this.dataRetentionPeriod = parseInt(process.env.DATA_RETENTION_DAYS) || 2555; // 7 years default
    this.anonymizationEnabled = process.env.GDPR_ANONYMIZATION === 'true';
    this.auditLoggingEnabled = process.env.GDPR_AUDIT_LOGGING === 'true';
  }

  // Export user data (Right to Data Portability)
  async exportUserData(userId) {
    try {
      const userData = await this.collectUserData(userId);
      
      // Log data export
      if (this.auditLoggingEnabled) {
        await this.logGDPRAction('DATA_EXPORT', userId, {
          dataTypes: Object.keys(userData),
          timestamp: new Date().toISOString()
        });
      }
      
      return {
        success: true,
        userId,
        exportedAt: new Date().toISOString(),
        data: userData
      };
    } catch (error) {
      console.error('Failed to export user data:', error);
      throw error;
    }
  }

  // Delete user data (Right to Erasure)
  async deleteUserData(userId, reason = 'USER_REQUEST') {
    try {
      // Collect data before deletion for audit
      const userData = await this.collectUserData(userId);
      
      // Start transaction for data deletion
      const queries = [
        // Delete user sessions
        { query: 'DELETE FROM user_sessions WHERE user_id = $1', params: [userId] },
        // Delete user activity logs
        { query: 'DELETE FROM user_activity_logs WHERE user_id = $1', params: [userId] },
        // Delete page views
        { query: 'DELETE FROM page_views WHERE user_id = $1', params: [userId] },
        // Delete user data
        { query: 'DELETE FROM users WHERE id = $1', params: [userId] }
      ];
      
      await executeTransaction(queries);
      
      // Log data deletion
      if (this.auditLoggingEnabled) {
        await this.logGDPRAction('DATA_DELETION', userId, {
          reason,
          deletedDataTypes: Object.keys(userData),
          timestamp: new Date().toISOString()
        });
      }
      
      logSecurityEvent('USER_DATA_DELETED', {
        userId,
        reason,
        timestamp: new Date().toISOString()
      });
      
      return {
        success: true,
        userId,
        deletedAt: new Date().toISOString(),
        reason
      };
    } catch (error) {
      console.error('Failed to delete user data:', error);
      throw error;
    }
  }

  // Anonymize user data (Right to Erasure with anonymization)
  async anonymizeUserData(userId, reason = 'USER_REQUEST') {
    try {
      if (!this.anonymizationEnabled) {
        throw new Error('Data anonymization is not enabled');
      }
      
      // Anonymize user data
      const anonymizedData = await this.anonymizeUser(userId);
      
      // Log anonymization
      if (this.auditLoggingEnabled) {
        await this.logGDPRAction('DATA_ANONYMIZATION', userId, {
          reason,
          anonymizedFields: Object.keys(anonymizedData),
          timestamp: new Date().toISOString()
        });
      }
      
      logSecurityEvent('USER_DATA_ANONYMIZED', {
        userId,
        reason,
        timestamp: new Date().toISOString()
      });
      
      return {
        success: true,
        userId,
        anonymizedAt: new Date().toISOString(),
        reason,
        anonymizedData
      };
    } catch (error) {
      console.error('Failed to anonymize user data:', error);
      throw error;
    }
  }

  // Get user data summary
  async getUserDataSummary(userId) {
    try {
      const summary = await this.collectUserDataSummary(userId);
      
      return {
        success: true,
        userId,
        summary,
        generatedAt: new Date().toISOString()
      };
    } catch (error) {
      console.error('Failed to get user data summary:', error);
      throw error;
    }
  }

  // Collect all user data
  async collectUserData(userId) {
    try {
      const userData = {};
      
      // User profile data
      const userResult = await executeQuery(
        'SELECT * FROM users WHERE id = $1',
        [userId]
      );
      userData.profile = userResult.rows[0] || null;
      
      // User sessions
      const sessionsResult = await executeQuery(
        'SELECT * FROM user_sessions WHERE user_id = $1',
        [userId]
      );
      userData.sessions = sessionsResult.rows;
      
      // User activity logs
      const activityResult = await executeQuery(
        'SELECT * FROM user_activity_logs WHERE user_id = $1',
        [userId]
      );
      userData.activity = activityResult.rows;
      
      // Page views
      const pageViewsResult = await executeQuery(
        'SELECT * FROM page_views WHERE user_id = $1',
        [userId]
      );
      userData.pageViews = pageViewsResult.rows;
      
      // Community posts
      const postsResult = await executeQuery(
        'SELECT * FROM community_posts WHERE user_id = $1',
        [userId]
      );
      userData.posts = postsResult.rows;
      
      // Location reviews
      const reviewsResult = await executeQuery(
        'SELECT * FROM location_reviews WHERE user_id = $1',
        [userId]
      );
      userData.reviews = reviewsResult.rows;
      
      return userData;
    } catch (error) {
      console.error('Failed to collect user data:', error);
      throw error;
    }
  }

  // Collect user data summary
  async collectUserDataSummary(userId) {
    try {
      const summary = {};
      
      // Count user data
      const counts = await executeQuery(`
        SELECT 
          (SELECT COUNT(*) FROM users WHERE id = $1) as profile_count,
          (SELECT COUNT(*) FROM user_sessions WHERE user_id = $1) as sessions_count,
          (SELECT COUNT(*) FROM user_activity_logs WHERE user_id = $1) as activity_count,
          (SELECT COUNT(*) FROM page_views WHERE user_id = $1) as page_views_count,
          (SELECT COUNT(*) FROM community_posts WHERE user_id = $1) as posts_count,
          (SELECT COUNT(*) FROM location_reviews WHERE user_id = $1) as reviews_count
      `, [userId]);
      
      summary.counts = counts.rows[0];
      
      // Get data retention info
      const retentionInfo = await executeQuery(`
        SELECT 
          MIN(created_at) as oldest_data,
          MAX(created_at) as newest_data,
          COUNT(*) as total_records
        FROM (
          SELECT created_at FROM users WHERE id = $1
          UNION ALL
          SELECT created_at FROM user_sessions WHERE user_id = $1
          UNION ALL
          SELECT created_at FROM user_activity_logs WHERE user_id = $1
          UNION ALL
          SELECT created_at FROM page_views WHERE user_id = $1
          UNION ALL
          SELECT created_at FROM community_posts WHERE user_id = $1
          UNION ALL
          SELECT created_at FROM location_reviews WHERE user_id = $1
        ) as all_data
      `, [userId]);
      
      summary.retention = retentionInfo.rows[0];
      
      return summary;
    } catch (error) {
      console.error('Failed to collect user data summary:', error);
      throw error;
    }
  }

  // Anonymize user data
  async anonymizeUser(userId) {
    try {
      const anonymizedData = {};
      
      // Anonymize user profile
      const userResult = await executeQuery(
        'UPDATE users SET username = $1, email = $2, first_name = $3, last_name = $4 WHERE id = $5 RETURNING *',
        [
          `user_${userId}_${crypto.randomBytes(4).toString('hex')}`,
          `user_${userId}@anonymized.local`,
          'Anonymized',
          'User',
          userId
        ]
      );
      anonymizedData.profile = userResult.rows[0];
      
      // Anonymize user sessions
      const sessionsResult = await executeQuery(
        'UPDATE user_sessions SET ip_address = $1, user_agent = $2 WHERE user_id = $3 RETURNING *',
        ['0.0.0.0', 'Anonymized', userId]
      );
      anonymizedData.sessions = sessionsResult.rows;
      
      // Anonymize activity logs
      const activityResult = await executeQuery(
        'UPDATE user_activity_logs SET ip_address = $1, user_agent = $2 WHERE user_id = $3 RETURNING *',
        ['0.0.0.0', 'Anonymized', userId]
      );
      anonymizedData.activity = activityResult.rows;
      
      return anonymizedData;
    } catch (error) {
      console.error('Failed to anonymize user data:', error);
      throw error;
    }
  }

  // Log GDPR action
  async logGDPRAction(action, userId, details) {
    try {
      await executeQuery(`
        INSERT INTO gdpr_audit_log (action, user_id, details, created_at) 
        VALUES ($1, $2, $3, NOW())
      `, [action, userId, JSON.stringify(details)]);
    } catch (error) {
      console.error('Failed to log GDPR action:', error);
    }
  }

  // Get GDPR audit log
  async getGDPRAuditLog(userId = null, limit = 100) {
    try {
      let query = 'SELECT * FROM gdpr_audit_log';
      const params = [];
      
      if (userId) {
        query += ' WHERE user_id = $1';
        params.push(userId);
      }
      
      query += ' ORDER BY created_at DESC LIMIT $' + (params.length + 1);
      params.push(limit);
      
      const result = await executeQuery(query, params);
      return result.rows;
    } catch (error) {
      console.error('Failed to get GDPR audit log:', error);
      return [];
    }
  }

  // Clean up old data (Data Retention)
  async cleanupOldData() {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - this.dataRetentionPeriod);
      
      const queries = [
        // Clean up old user activity logs
        { query: 'DELETE FROM user_activity_logs WHERE created_at < $1', params: [cutoffDate] },
        // Clean up old page views
        { query: 'DELETE FROM page_views WHERE created_at < $1', params: [cutoffDate] },
        // Clean up old sessions
        { query: 'DELETE FROM user_sessions WHERE created_at < $1', params: [cutoffDate] }
      ];
      
      const results = await executeTransaction(queries);
      
      const totalDeleted = results.reduce((sum, result) => sum + result.rowCount, 0);
      
      logSecurityEvent('OLD_DATA_CLEANUP', {
        cutoffDate: cutoffDate.toISOString(),
        totalDeleted,
        timestamp: new Date().toISOString()
      });
      
      console.log(`🧹 Cleaned up ${totalDeleted} old data records`);
      
      return {
        success: true,
        totalDeleted,
        cutoffDate: cutoffDate.toISOString()
      };
    } catch (error) {
      console.error('Failed to cleanup old data:', error);
      throw error;
    }
  }

  // Get GDPR compliance status
  async getComplianceStatus() {
    try {
      const status = {
        dataRetentionPeriod: this.dataRetentionPeriod,
        anonymizationEnabled: this.anonymizationEnabled,
        auditLoggingEnabled: this.auditLoggingEnabled,
        lastCleanup: null,
        totalUsers: 0,
        totalDataRecords: 0
      };
      
      // Get last cleanup date
      const cleanupResult = await executeQuery(
        'SELECT MAX(created_at) as last_cleanup FROM gdpr_audit_log WHERE action = $1',
        ['OLD_DATA_CLEANUP']
      );
      status.lastCleanup = cleanupResult.rows[0]?.last_cleanup;
      
      // Get user count
      const userCountResult = await executeQuery('SELECT COUNT(*) as user_count FROM users');
      status.totalUsers = parseInt(userCountResult.rows[0].user_count);
      
      // Get total data records
      const dataCountResult = await executeQuery(`
        SELECT 
          (SELECT COUNT(*) FROM users) +
          (SELECT COUNT(*) FROM user_sessions) +
          (SELECT COUNT(*) FROM user_activity_logs) +
          (SELECT COUNT(*) FROM page_views) +
          (SELECT COUNT(*) FROM community_posts) +
          (SELECT COUNT(*) FROM location_reviews) as total_records
      `);
      status.totalDataRecords = parseInt(dataCountResult.rows[0].total_records);
      
      return status;
    } catch (error) {
      console.error('Failed to get compliance status:', error);
      return null;
    }
  }
}

// Create singleton instance
const gdprService = new GDPRService();

// Clean up old data daily
setInterval(() => {
  gdprService.cleanupOldData().catch(console.error);
}, 24 * 60 * 60 * 1000);

export default gdprService;





