// Redis Configuration for SLAM25 Application
import Redis from 'ioredis';

const redisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379,
  password: process.env.REDIS_PASSWORD || undefined,
  db: process.env.REDIS_DB || 0,
  retryDelayOnFailover: 100,
  maxRetriesPerRequest: 3,
  lazyConnect: true,
  keepAlive: 30000,
  connectTimeout: 10000,
  commandTimeout: 5000,
  retryDelayOnClusterDown: 300,
  enableOfflineQueue: false,
  maxMemoryPolicy: 'allkeys-lru'
};

// Create Redis client
const redis = new Redis(redisConfig);

// Redis event handlers
redis.on('connect', () => {
  console.log('✅ Connected to Redis');
});

redis.on('error', (err) => {
  console.error('❌ Redis connection error:', err);
});

redis.on('close', () => {
  console.log('🔌 Redis connection closed');
});

// Session management with Redis
export class SessionManager {
  constructor() {
    this.redis = redis;
    this.sessionPrefix = 'session:';
    this.userPrefix = 'user:';
    this.ttl = 24 * 60 * 60; // 24 hours
  }

  // Store session in Redis
  async storeSession(sessionId, sessionData, ttl = this.ttl) {
    try {
      const key = `${this.sessionPrefix}${sessionId}`;
      await this.redis.setex(key, ttl, JSON.stringify(sessionData));
      return true;
    } catch (error) {
      console.error('Failed to store session:', error);
      return false;
    }
  }

  // Get session from Redis
  async getSession(sessionId) {
    try {
      const key = `${this.sessionPrefix}${sessionId}`;
      const data = await this.redis.get(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('Failed to get session:', error);
      return null;
    }
  }

  // Delete session from Redis
  async deleteSession(sessionId) {
    try {
      const key = `${this.sessionPrefix}${sessionId}`;
      await this.redis.del(key);
      return true;
    } catch (error) {
      console.error('Failed to delete session:', error);
      return false;
    }
  }

  // Store user data in Redis
  async storeUser(userId, userData, ttl = this.ttl) {
    try {
      const key = `${this.userPrefix}${userId}`;
      await this.redis.setex(key, ttl, JSON.stringify(userData));
      return true;
    } catch (error) {
      console.error('Failed to store user:', error);
      return false;
    }
  }

  // Get user data from Redis
  async getUser(userId) {
    try {
      const key = `${this.userPrefix}${userId}`;
      const data = await this.redis.get(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('Failed to get user:', error);
      return null;
    }
  }

  // Delete user data from Redis
  async deleteUser(userId) {
    try {
      const key = `${this.userPrefix}${userId}`;
      await this.redis.del(key);
      return true;
    } catch (error) {
      console.error('Failed to delete user:', error);
      return false;
    }
  }

  // Get session statistics
  async getSessionStats() {
    try {
      const sessionKeys = await this.redis.keys(`${this.sessionPrefix}*`);
      const userKeys = await this.redis.keys(`${this.userPrefix}*`);
      
      return {
        activeSessions: sessionKeys.length,
        cachedUsers: userKeys.length,
        memoryUsage: await this.redis.memory('usage')
      };
    } catch (error) {
      console.error('Failed to get session stats:', error);
      return null;
    }
  }
}

// Create session manager instance
const sessionManager = new SessionManager();

export { redis, sessionManager };
export default sessionManager;





