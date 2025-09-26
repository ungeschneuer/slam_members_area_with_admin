// Comprehensive Monitoring Service for SLAM25 Application
import { executeQuery, getDatabaseStats } from '../config/database.js';
import { sessionManager } from '../config/redis.js';
import logger from '../config/logger.js';

class MonitoringService {
  constructor() {
    this.metrics = {
      requests: 0,
      errors: 0,
      responseTime: [],
      databaseQueries: 0,
      databaseErrors: 0,
      activeSessions: 0,
      memoryUsage: 0,
      cpuUsage: 0
    };
    
    this.alerts = [];
    this.thresholds = {
      responseTime: 5000, // 5 seconds
      errorRate: 0.05, // 5%
      memoryUsage: 0.8, // 80%
      cpuUsage: 0.8, // 80%
      databaseConnections: 0.9 // 90%
    };
    
    this.startMonitoring();
  }

  // Start monitoring intervals
  startMonitoring() {
    // Collect metrics every 30 seconds
    setInterval(() => {
      this.collectMetrics();
    }, 30000);

    // Check alerts every minute
    setInterval(() => {
      this.checkAlerts();
    }, 60000);

    // Clean up old metrics every hour
    setInterval(() => {
      this.cleanupMetrics();
    }, 3600000);
  }

  // Collect system metrics
  async collectMetrics() {
    try {
      // System metrics
      const memoryUsage = process.memoryUsage();
      const cpuUsage = process.cpuUsage();
      
      this.metrics.memoryUsage = memoryUsage.heapUsed / memoryUsage.heapTotal;
      this.metrics.cpuUsage = cpuUsage.user / 1000000; // Convert to seconds
      
      // Database metrics
      const dbStats = await getDatabaseStats();
      this.metrics.databaseConnections = dbStats.activeConnections / 100; // Normalize
      
      // Session metrics
      const sessionStats = await sessionManager.getSessionStats();
      this.metrics.activeSessions = sessionStats?.activeSessions || 0;
      
      // Store metrics in database
      await this.storeMetrics();
      
    } catch (error) {
      logger.error('Failed to collect metrics:', error);
    }
  }

  // Store metrics in database
  async storeMetrics() {
    try {
      await executeQuery(`
        INSERT INTO system_metrics 
        (requests, errors, avg_response_time, database_queries, database_errors, 
         active_sessions, memory_usage, cpu_usage, created_at) 
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
      `, [
        this.metrics.requests,
        this.metrics.errors,
        this.getAverageResponseTime(),
        this.metrics.databaseQueries,
        this.metrics.databaseErrors,
        this.metrics.activeSessions,
        this.metrics.memoryUsage,
        this.metrics.cpuUsage
      ]);
    } catch (error) {
      logger.error('Failed to store metrics:', error);
    }
  }

  // Check for alert conditions
  async checkAlerts() {
    const alerts = [];
    
    // Response time alert
    if (this.getAverageResponseTime() > this.thresholds.responseTime) {
      alerts.push({
        type: 'HIGH_RESPONSE_TIME',
        severity: 'HIGH',
        message: `Average response time ${this.getAverageResponseTime()}ms exceeds threshold ${this.thresholds.responseTime}ms`,
        timestamp: new Date().toISOString()
      });
    }
    
    // Error rate alert
    const errorRate = this.getErrorRate();
    if (errorRate > this.thresholds.errorRate) {
      alerts.push({
        type: 'HIGH_ERROR_RATE',
        severity: 'CRITICAL',
        message: `Error rate ${(errorRate * 100).toFixed(2)}% exceeds threshold ${(this.thresholds.errorRate * 100).toFixed(2)}%`,
        timestamp: new Date().toISOString()
      });
    }
    
    // Memory usage alert
    if (this.metrics.memoryUsage > this.thresholds.memoryUsage) {
      alerts.push({
        type: 'HIGH_MEMORY_USAGE',
        severity: 'HIGH',
        message: `Memory usage ${(this.metrics.memoryUsage * 100).toFixed(2)}% exceeds threshold ${(this.thresholds.memoryUsage * 100).toFixed(2)}%`,
        timestamp: new Date().toISOString()
      });
    }
    
    // CPU usage alert
    if (this.metrics.cpuUsage > this.thresholds.cpuUsage) {
      alerts.push({
        type: 'HIGH_CPU_USAGE',
        severity: 'HIGH',
        message: `CPU usage ${(this.metrics.cpuUsage * 100).toFixed(2)}% exceeds threshold ${(this.thresholds.cpuUsage * 100).toFixed(2)}%`,
        timestamp: new Date().toISOString()
      });
    }
    
    // Database connections alert
    if (this.metrics.databaseConnections > this.thresholds.databaseConnections) {
      alerts.push({
        type: 'HIGH_DATABASE_CONNECTIONS',
        severity: 'HIGH',
        message: `Database connections ${(this.metrics.databaseConnections * 100).toFixed(2)}% exceeds threshold ${(this.thresholds.databaseConnections * 100).toFixed(2)}%`,
        timestamp: new Date().toISOString()
      });
    }
    
    // Process alerts
    for (const alert of alerts) {
      await this.processAlert(alert);
    }
  }

  // Process individual alert
  async processAlert(alert) {
    try {
      // Store alert in database
      await executeQuery(`
        INSERT INTO system_alerts (type, severity, message, created_at) 
        VALUES ($1, $2, $3, NOW())
      `, [alert.type, alert.severity, alert.message]);
      
      // Log alert
      console.error(`🚨 SYSTEM ALERT [${alert.severity}]: ${alert.message}`);
      
      // Send notification (implement based on your notification system)
      await this.sendNotification(alert);
      
    } catch (error) {
      logger.error('Failed to process alert:', error);
    }
  }

  // Send notification
  async sendNotification(alert) {
    // Implement notification logic (email, Slack, etc.)
    console.log(`📧 Notification sent: ${alert.message}`);
  }

  // Record request metrics
  recordRequest(responseTime) {
    this.metrics.requests++;
    this.metrics.responseTime.push(responseTime);
    
    // Keep only last 1000 response times
    if (this.metrics.responseTime.length > 1000) {
      this.metrics.responseTime = this.metrics.responseTime.slice(-1000);
    }
  }

  // Record error metrics
  recordError() {
    this.metrics.errors++;
  }

  // Record database query
  recordDatabaseQuery() {
    this.metrics.databaseQueries++;
  }

  // Record database error
  recordDatabaseError() {
    this.metrics.databaseErrors++;
  }

  // Get average response time
  getAverageResponseTime() {
    if (this.metrics.responseTime.length === 0) return 0;
    return this.metrics.responseTime.reduce((a, b) => a + b, 0) / this.metrics.responseTime.length;
  }

  // Get error rate
  getErrorRate() {
    if (this.metrics.requests === 0) return 0;
    return this.metrics.errors / this.metrics.requests;
  }

  // Get current metrics
  getMetrics() {
    return {
      ...this.metrics,
      averageResponseTime: this.getAverageResponseTime(),
      errorRate: this.getErrorRate(),
      timestamp: new Date().toISOString()
    };
  }

  // Get metrics history
  async getMetricsHistory(hours = 24) {
    try {
      const result = await executeQuery(`
        SELECT * FROM system_metrics 
        WHERE created_at >= NOW() - INTERVAL '${hours} hours'
        ORDER BY created_at DESC
      `);
      
      return result.rows;
    } catch (error) {
      logger.error('Failed to get metrics history:', error);
      return [];
    }
  }

  // Get active alerts
  async getActiveAlerts() {
    try {
      const result = await executeQuery(`
        SELECT * FROM system_alerts 
        WHERE created_at >= NOW() - INTERVAL '1 hour'
        ORDER BY created_at DESC
      `);
      
      return result.rows;
    } catch (error) {
      logger.error('Failed to get active alerts:', error);
      return [];
    }
  }

  // Clean up old metrics
  async cleanupMetrics() {
    try {
      // Keep only last 7 days of metrics
      await executeQuery(`
        DELETE FROM system_metrics 
        WHERE created_at < NOW() - INTERVAL '7 days'
      `);
      
      // Keep only last 30 days of alerts
      await executeQuery(`
        DELETE FROM system_alerts 
        WHERE created_at < NOW() - INTERVAL '30 days'
      `);
      
      logger.info('Old metrics cleaned up');
    } catch (error) {
      logger.error('Failed to cleanup metrics:', error);
    }
  }

  // Health check
  async healthCheck() {
    try {
      const metrics = this.getMetrics();
      const dbHealth = await executeQuery('SELECT NOW()');
      
      return {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        metrics: {
          requests: metrics.requests,
          errors: metrics.errors,
          averageResponseTime: metrics.averageResponseTime,
          errorRate: metrics.errorRate,
          memoryUsage: metrics.memoryUsage,
          cpuUsage: metrics.cpuUsage,
          activeSessions: metrics.activeSessions
        },
        database: {
          status: 'connected',
          responseTime: Date.now() - Date.now()
        }
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: error.message
      };
    }
  }
}

// Create singleton instance
const monitoringService = new MonitoringService();

export default monitoringService;
