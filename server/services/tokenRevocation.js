// Token Revocation Service for SLAM25 Application
import { executeQuery } from '../config/database.js';
import { logSecurityEvent } from '../middleware/securityLogger.js';

class TokenRevocationService {
  constructor() {
    this.revokedTokens = new Set();
    this.revocationReasons = {
      USER_LOGOUT: 'User initiated logout',
      SECURITY_BREACH: 'Security breach detected',
      ACCOUNT_COMPROMISED: 'Account compromised',
      ADMIN_REVOKE: 'Administrator revoked',
      TOKEN_EXPIRED: 'Token expired',
      SUSPICIOUS_ACTIVITY: 'Suspicious activity detected'
    };
  }

  // Revoke a specific token
  async revokeToken(token, reason = 'USER_LOGOUT', userId = null) {
    try {
      // Add to in-memory revoked set for immediate effect
      this.revokedTokens.add(token);
      
      // Log revocation in database
      await executeQuery(
        `INSERT INTO token_revocations (token, reason, user_id, revoked_at) 
         VALUES ($1, $2, $3, NOW())`,
        [token, reason, userId]
      );
      
      // Remove from active sessions
      await executeQuery(
        'DELETE FROM user_sessions WHERE session_token = $1',
        [token]
      );
      
      logSecurityEvent('TOKEN_REVOKED', {
        token: token.substring(0, 10) + '...', // Partial token for logging
        reason,
        userId,
        timestamp: new Date().toISOString()
      });
      
      return true;
    } catch (error) {
      console.error('Failed to revoke token:', error);
      return false;
    }
  }

  // Revoke all tokens for a user
  async revokeUserTokens(userId, reason = 'ACCOUNT_COMPROMISED') {
    try {
      // Get all active sessions for user
      const sessions = await executeQuery(
        'SELECT session_token FROM user_sessions WHERE user_id = $1',
        [userId]
      );
      
      const revokedTokens = [];
      
      for (const session of sessions.rows) {
        const token = session.session_token;
        this.revokedTokens.add(token);
        revokedTokens.push(token);
        
        // Log revocation
        await executeQuery(
          `INSERT INTO token_revocations (token, reason, user_id, revoked_at) 
           VALUES ($1, $2, $3, NOW())`,
          [token, reason, userId]
        );
      }
      
      // Delete all user sessions
      await executeQuery(
        'DELETE FROM user_sessions WHERE user_id = $1',
        [userId]
      );
      
      logSecurityEvent('USER_TOKENS_REVOKED', {
        userId,
        reason,
        tokenCount: revokedTokens.length,
        timestamp: new Date().toISOString()
      });
      
      return revokedTokens.length;
    } catch (error) {
      console.error('Failed to revoke user tokens:', error);
      return 0;
    }
  }

  // Revoke tokens by IP address
  async revokeTokensByIP(ip, reason = 'SUSPICIOUS_ACTIVITY') {
    try {
      // Get all sessions for IP
      const sessions = await executeQuery(
        'SELECT session_token, user_id FROM user_sessions WHERE ip_address = $1',
        [ip]
      );
      
      const revokedTokens = [];
      
      for (const session of sessions.rows) {
        const token = session.session_token;
        this.revokedTokens.add(token);
        revokedTokens.push(token);
        
        // Log revocation
        await executeQuery(
          `INSERT INTO token_revocations (token, reason, user_id, revoked_at) 
           VALUES ($1, $2, $3, NOW())`,
          [token, reason, session.user_id]
        );
      }
      
      // Delete all sessions for IP
      await executeQuery(
        'DELETE FROM user_sessions WHERE ip_address = $1',
        [ip]
      );
      
      logSecurityEvent('IP_TOKENS_REVOKED', {
        ip,
        reason,
        tokenCount: revokedTokens.length,
        timestamp: new Date().toISOString()
      });
      
      return revokedTokens.length;
    } catch (error) {
      console.error('Failed to revoke tokens by IP:', error);
      return 0;
    }
  }

  // Check if token is revoked
  isTokenRevoked(token) {
    return this.revokedTokens.has(token);
  }

  // Revoke expired tokens
  async revokeExpiredTokens() {
    try {
      const result = await executeQuery(
        'DELETE FROM user_sessions WHERE expires_at < NOW() RETURNING session_token',
        []
      );
      
      const expiredTokens = result.rows.map(row => row.session_token);
      
      // Add to revoked set
      expiredTokens.forEach(token => {
        this.revokedTokens.add(token);
      });
      
      // Log expired token cleanup
      if (expiredTokens.length > 0) {
        await executeQuery(
          `INSERT INTO token_revocations (token, reason, user_id, revoked_at) 
           VALUES ($1, $2, $3, NOW())`,
          [expiredTokens.join(','), 'TOKEN_EXPIRED', null]
        );
      }
      
      logSecurityEvent('EXPIRED_TOKENS_CLEANED', {
        count: expiredTokens.length,
        timestamp: new Date().toISOString()
      });
      
      return expiredTokens.length;
    } catch (error) {
      console.error('Failed to revoke expired tokens:', error);
      return 0;
    }
  }

  // Bulk revoke tokens
  async bulkRevokeTokens(tokens, reason = 'ADMIN_REVOKE', adminUserId = null) {
    try {
      const revokedTokens = [];
      
      for (const token of tokens) {
        this.revokedTokens.add(token);
        revokedTokens.push(token);
        
        // Log revocation
        await executeQuery(
          `INSERT INTO token_revocations (token, reason, user_id, revoked_at) 
           VALUES ($1, $2, $3, NOW())`,
          [token, reason, adminUserId]
        );
      }
      
      // Delete sessions
      await executeQuery(
        'DELETE FROM user_sessions WHERE session_token = ANY($1)',
        [tokens]
      );
      
      logSecurityEvent('BULK_TOKEN_REVOCATION', {
        reason,
        adminUserId,
        tokenCount: revokedTokens.length,
        timestamp: new Date().toISOString()
      });
      
      return revokedTokens.length;
    } catch (error) {
      console.error('Failed to bulk revoke tokens:', error);
      return 0;
    }
  }

  // Get revocation statistics
  async getRevocationStats() {
    try {
      const stats = await executeQuery(`
        SELECT 
          reason,
          COUNT(*) as count,
          DATE(revoked_at) as date
        FROM token_revocations 
        WHERE revoked_at >= NOW() - INTERVAL '7 days'
        GROUP BY reason, DATE(revoked_at)
        ORDER BY date DESC, count DESC
      `);
      
      return {
        totalRevocations: this.revokedTokens.size,
        recentRevocations: stats.rows,
        lastCleanup: new Date().toISOString()
      };
    } catch (error) {
      console.error('Failed to get revocation stats:', error);
      return null;
    }
  }

  // Clean up old revocation records
  async cleanupOldRevocations() {
    try {
      const result = await executeQuery(
        "DELETE FROM token_revocations WHERE revoked_at < NOW() - INTERVAL '30 days'",
        []
      );
      
      logSecurityEvent('OLD_REVOCATIONS_CLEANED', {
        count: result.rowCount,
        timestamp: new Date().toISOString()
      });
      
      return result.rowCount;
    } catch (error) {
      console.error('Failed to cleanup old revocations:', error);
      return 0;
    }
  }

  // Emergency revoke all tokens
  async emergencyRevokeAll(reason = 'SECURITY_BREACH', adminUserId = null) {
    try {
      // Get all active sessions
      const sessions = await executeQuery(
        'SELECT session_token, user_id FROM user_sessions',
        []
      );
      
      const allTokens = sessions.rows.map(row => row.session_token);
      
      // Revoke all tokens
      await this.bulkRevokeTokens(allTokens, reason, adminUserId);
      
      logSecurityEvent('EMERGENCY_REVOKE_ALL', {
        reason,
        adminUserId,
        tokenCount: allTokens.length,
        timestamp: new Date().toISOString()
      });
      
      return allTokens.length;
    } catch (error) {
      console.error('Failed to emergency revoke all tokens:', error);
      return 0;
    }
  }

  // Load revoked tokens from database on startup
  async loadRevokedTokens() {
    try {
      const result = await executeQuery(
        "SELECT token FROM token_revocations WHERE revoked_at > NOW() - INTERVAL '24 hours'",
        []
      );
      
      result.rows.forEach(row => {
        this.revokedTokens.add(row.token);
      });
      
      console.log(`Loaded ${this.revokedTokens.size} revoked tokens from database`);
    } catch (error) {
      console.error('Failed to load revoked tokens:', error);
    }
  }
}

// Create singleton instance
const tokenRevocationService = new TokenRevocationService();

// Load revoked tokens on startup
tokenRevocationService.loadRevokedTokens();

// Clean up expired tokens every hour
setInterval(() => {
  tokenRevocationService.revokeExpiredTokens();
}, 60 * 60 * 1000);

// Clean up old revocation records daily
setInterval(() => {
  tokenRevocationService.cleanupOldRevocations();
}, 24 * 60 * 60 * 1000);

export default tokenRevocationService;

