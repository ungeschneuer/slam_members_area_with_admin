// Incident Response Service for SLAM25 Application
import { executeQuery } from '../config/database.js';
import { logSecurityEvent } from '../middleware/securityLogger.js';

class IncidentResponseService {
  constructor() {
    this.activeIncidents = new Map();
    this.incidentThresholds = {
      AUTHENTICATION_FAILURE: 10, // 10 failures in 5 minutes
      RATE_LIMIT_EXCEEDED: 20,     // 20 rate limit hits in 5 minutes
      SUSPICIOUS_ACTIVITY: 5,      // 5 suspicious activities in 5 minutes
      BRUTE_FORCE_ATTEMPT: 3       // 3 brute force attempts in 5 minutes
    };
    this.incidentWindow = 5 * 60 * 1000; // 5 minutes
  }

  // Detect and respond to security incidents
  async handleSecurityEvent(event, details) {
    const incidentKey = `${event}:${details.ip}`;
    const now = Date.now();
    
    // Check if this is a new incident or escalation
    if (this.activeIncidents.has(incidentKey)) {
      const incident = this.activeIncidents.get(incidentKey);
      incident.count++;
      incident.lastSeen = now;
      
      // Check if threshold exceeded
      if (incident.count >= this.incidentThresholds[event]) {
        await this.escalateIncident(incident, event, details);
      }
    } else {
      // Create new incident
      const incident = {
        id: this.generateIncidentId(),
        type: event,
        ip: details.ip,
        count: 1,
        firstSeen: now,
        lastSeen: now,
        status: 'ACTIVE',
        actions: []
      };
      
      this.activeIncidents.set(incidentKey, incident);
      
      // Log incident creation
      await this.logIncident(incident, 'INCIDENT_CREATED');
    }
  }

  // Escalate incident based on severity
  async escalateIncident(incident, event, details) {
    const severity = this.getIncidentSeverity(event, incident.count);
    
    // Take immediate action based on severity
    switch (severity) {
      case 'CRITICAL':
        await this.handleCriticalIncident(incident, details);
        break;
      case 'HIGH':
        await this.handleHighSeverityIncident(incident, details);
        break;
      case 'MEDIUM':
        await this.handleMediumSeverityIncident(incident, details);
        break;
    }
    
    // Update incident status
    incident.status = 'ESCALATED';
    incident.severity = severity;
    incident.escalatedAt = Date.now();
    
    await this.logIncident(incident, 'INCIDENT_ESCALATED');
  }

  // Handle critical incidents (immediate action required)
  async handleCriticalIncident(incident, details) {
    const actions = [];
    
    // Block IP address
    await this.blockIPAddress(incident.ip, '24h', 'Critical security incident');
    actions.push('IP_BLOCKED');
    
    // Revoke all sessions for this IP
    await this.revokeSessionsByIP(incident.ip);
    actions.push('SESSIONS_REVOKED');
    
    // Send immediate alert
    await this.sendCriticalAlert(incident, details);
    actions.push('CRITICAL_ALERT_SENT');
    
    incident.actions.push(...actions);
    
    logSecurityEvent('CRITICAL_INCIDENT_HANDLED', {
      incidentId: incident.id,
      ip: incident.ip,
      actions,
      timestamp: new Date().toISOString()
    });
  }

  // Handle high severity incidents
  async handleHighSeverityIncident(incident, details) {
    const actions = [];
    
    // Temporary IP block (1 hour)
    await this.blockIPAddress(incident.ip, '1h', 'High severity security incident');
    actions.push('IP_TEMPORARILY_BLOCKED');
    
    // Rate limit the IP more strictly
    await this.applyStrictRateLimit(incident.ip);
    actions.push('STRICT_RATE_LIMIT_APPLIED');
    
    // Send alert
    await this.sendHighSeverityAlert(incident, details);
    actions.push('HIGH_SEVERITY_ALERT_SENT');
    
    incident.actions.push(...actions);
  }

  // Handle medium severity incidents
  async handleMediumSeverityIncident(incident, details) {
    const actions = [];
    
    // Apply stricter rate limiting
    await this.applyStrictRateLimit(incident.ip);
    actions.push('STRICT_RATE_LIMIT_APPLIED');
    
    // Log for monitoring
    await this.logIncident(incident, 'MEDIUM_SEVERITY_MONITORING');
    actions.push('MONITORING_ENHANCED');
    
    incident.actions.push(...actions);
  }

  // Block IP address
  async blockIPAddress(ip, duration, reason) {
    try {
      const expiresAt = new Date(Date.now() + this.parseDuration(duration));
      
      await executeQuery(
        `INSERT INTO blocked_ips (ip_address, reason, expires_at, created_at) 
         VALUES ($1, $2, $3, NOW()) 
         ON CONFLICT (ip_address) DO UPDATE SET 
         expires_at = EXCLUDED.expires_at, 
         reason = EXCLUDED.reason`,
        [ip, reason, expiresAt]
      );
      
      logSecurityEvent('IP_BLOCKED', {
        ip,
        duration,
        reason,
        expiresAt,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Failed to block IP:', error);
    }
  }

  // Revoke sessions by IP
  async revokeSessionsByIP(ip) {
    try {
      await executeQuery(
        '-- No longer tracking sessions with JWT authentication',
        [ip]
      );
      
      logSecurityEvent('SESSIONS_REVOKED_BY_IP', {
        ip,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Failed to revoke sessions:', error);
    }
  }

  // Apply strict rate limiting
  async applyStrictRateLimit(ip) {
    // This would integrate with your rate limiting system
    // For now, we'll log the action
    logSecurityEvent('STRICT_RATE_LIMIT_APPLIED', {
      ip,
      timestamp: new Date().toISOString()
    });
  }

  // Send critical alert
  async sendCriticalAlert(incident, details) {
    const alert = {
      type: 'CRITICAL_SECURITY_INCIDENT',
      incidentId: incident.id,
      ip: incident.ip,
      event: incident.type,
      count: incident.count,
      timestamp: new Date().toISOString(),
      actions: incident.actions
    };
    
    // In production, this would send to monitoring system
    console.error('🚨 CRITICAL SECURITY ALERT:', alert);
    
    // Log to database
    await this.logIncident(incident, 'CRITICAL_ALERT_SENT', alert);
  }

  // Send high severity alert
  async sendHighSeverityAlert(incident, details) {
    const alert = {
      type: 'HIGH_SEVERITY_SECURITY_INCIDENT',
      incidentId: incident.id,
      ip: incident.ip,
      event: incident.type,
      count: incident.count,
      timestamp: new Date().toISOString(),
      actions: incident.actions
    };
    
    console.warn('⚠️ HIGH SEVERITY SECURITY ALERT:', alert);
    
    await this.logIncident(incident, 'HIGH_SEVERITY_ALERT_SENT', alert);
  }

  // Log incident to database
  async logIncident(incident, action, details = {}) {
    try {
      await executeQuery(
        `INSERT INTO security_incidents 
         (incident_id, type, ip_address, count, status, severity, action, details, created_at) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())`,
        [
          incident.id,
          incident.type,
          incident.ip,
          incident.count,
          incident.status,
          incident.severity || 'UNKNOWN',
          action,
          JSON.stringify(details)
        ]
      );
    } catch (error) {
      console.error('Failed to log incident:', error);
    }
  }

  // Get incident severity
  getIncidentSeverity(event, count) {
    if (event === 'BRUTE_FORCE_ATTEMPT' || event === 'SUSPICIOUS_ACTIVITY') {
      return 'CRITICAL';
    }
    if (event === 'AUTHENTICATION_FAILURE' && count >= 20) {
      return 'CRITICAL';
    }
    if (event === 'RATE_LIMIT_EXCEEDED' && count >= 50) {
      return 'HIGH';
    }
    return 'MEDIUM';
  }

  // Generate incident ID
  generateIncidentId() {
    return `INC-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  // Parse duration string (e.g., "24h", "1h", "30m")
  parseDuration(duration) {
    const units = {
      's': 1000,
      'm': 60 * 1000,
      'h': 60 * 60 * 1000,
      'd': 24 * 60 * 60 * 1000
    };
    
    const match = duration.match(/^(\d+)([smhd])$/);
    if (!match) return 60 * 60 * 1000; // Default 1 hour
    
    const [, value, unit] = match;
    return parseInt(value) * units[unit];
  }

  // Clean up old incidents
  cleanupOldIncidents() {
    const now = Date.now();
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours
    
    for (const [key, incident] of this.activeIncidents.entries()) {
      if (now - incident.lastSeen > maxAge) {
        this.activeIncidents.delete(key);
      }
    }
  }

  // Get incident statistics
  getIncidentStats() {
    const stats = {
      activeIncidents: this.activeIncidents.size,
      totalIncidents: 0,
      criticalIncidents: 0,
      highSeverityIncidents: 0,
      mediumSeverityIncidents: 0
    };
    
    for (const incident of this.activeIncidents.values()) {
      stats.totalIncidents++;
      if (incident.severity === 'CRITICAL') stats.criticalIncidents++;
      else if (incident.severity === 'HIGH') stats.highSeverityIncidents++;
      else if (incident.severity === 'MEDIUM') stats.mediumSeverityIncidents++;
    }
    
    return stats;
  }
}

// Create singleton instance
const incidentResponseService = new IncidentResponseService();

// Clean up old incidents every hour
setInterval(() => {
  incidentResponseService.cleanupOldIncidents();
}, 60 * 60 * 1000);

export default incidentResponseService;






