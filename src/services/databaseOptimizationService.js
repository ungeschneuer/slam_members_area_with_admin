// Database Optimization Service for SLAM25 Application
// Handles query optimization, indexing, and connection pooling

class DatabaseOptimizationService {
  constructor() {
    this.queryCache = new Map();
    this.connectionPool = new Map();
    this.queryStats = new Map();
    this.indexes = new Map();
    this.maxConnections = 10;
    this.connectionTimeout = 30000; // 30 seconds
    this.queryTimeout = 10000; // 10 seconds
    
    this.initializeIndexes();
    this.startMonitoring();
  }

  // Initialize database indexes
  initializeIndexes() {
    // Define optimal indexes for common queries
    this.indexes.set('participants', [
      { field: 'name', type: 'text' },
      { field: 'role', type: 'enum' },
      { field: 'region', type: 'text' },
      { field: 'created_at', type: 'timestamp' }
    ]);

    this.indexes.set('rounds', [
      { field: 'title', type: 'text' },
      { field: 'startDateTime', type: 'timestamp' },
      { field: 'status', type: 'enum' },
      { field: 'competitionType', type: 'enum' },
      { field: 'location', type: 'text' }
    ]);

    this.indexes.set('news', [
      { field: 'title', type: 'text' },
      { field: 'category', type: 'enum' },
      { field: 'publishedAt', type: 'timestamp' },
      { field: 'status', type: 'enum' }
    ]);

    this.indexes.set('timetable', [
      { field: 'title', type: 'text' },
      { field: 'date', type: 'date' },
      { field: 'type', type: 'enum' },
      { field: 'status', type: 'enum' }
    ]);

    this.indexes.set('city_tips', [
      { field: 'name', type: 'text' },
      { field: 'category', type: 'enum' },
      { field: 'rating', type: 'numeric' },
      { field: 'location', type: 'geospatial' }
    ]);
  }

  // Optimize query with caching and indexing
  async optimizeQuery(query, params = {}, options = {}) {
    const queryKey = this.generateQueryKey(query, params);
    const cacheEnabled = options.cache !== false;
    const timeout = options.timeout || this.queryTimeout;

    // Check query cache first
    if (cacheEnabled) {
      const cachedResult = this.queryCache.get(queryKey);
      if (cachedResult && !this.isCacheExpired(cachedResult)) {
        this.recordQueryStats(queryKey, 'cache_hit');
        return cachedResult.data;
      }
    }

    // Analyze query for optimization
    const optimizedQuery = this.analyzeAndOptimizeQuery(query, params);
    
    // Get connection from pool
    const connection = await this.getConnection();
    
    try {
      // Execute query with timeout
      const result = await this.executeQueryWithTimeout(connection, optimizedQuery, timeout);
      
      // Cache result if enabled
      if (cacheEnabled && result) {
        this.queryCache.set(queryKey, {
          data: result,
          timestamp: Date.now(),
          ttl: options.ttl || 5 * 60 * 1000 // 5 minutes default
        });
      }
      
      this.recordQueryStats(queryKey, 'success');
      return result;
      
    } catch (error) {
      this.recordQueryStats(queryKey, 'error', error);
      throw error;
    } finally {
      this.releaseConnection(connection);
    }
  }

  // Analyze and optimize query
  analyzeAndOptimizeQuery(query, params) {
    let optimizedQuery = query;
    
    // Add query hints based on table analysis
    if (query.includes('participants')) {
      optimizedQuery = this.addParticipantOptimizations(query);
    } else if (query.includes('rounds')) {
      optimizedQuery = this.addRoundOptimizations(query);
    } else if (query.includes('news')) {
      optimizedQuery = this.addNewsOptimizations(query);
    }
    
    // Add LIMIT if not present for large result sets
    if (!optimizedQuery.toLowerCase().includes('limit') && !optimizedQuery.toLowerCase().includes('count')) {
      optimizedQuery += ' LIMIT 1000';
    }
    
    return optimizedQuery;
  }

  // Add participant-specific optimizations
  addParticipantOptimizations(query) {
    // Add index hints for common participant queries
    if (query.toLowerCase().includes('where name')) {
      return query.replace('WHERE name', 'USE INDEX (idx_participants_name) WHERE name');
    }
    
    if (query.toLowerCase().includes('where role')) {
      return query.replace('WHERE role', 'USE INDEX (idx_participants_role) WHERE role');
    }
    
    return query;
  }

  // Add round-specific optimizations
  addRoundOptimizations(query) {
    // Add index hints for common round queries
    if (query.toLowerCase().includes('where "startDateTime"')) {
      return query.replace('WHERE "startDateTime"', 'USE INDEX (idx_rounds_startdatetime) WHERE "startDateTime"');
    }
    
    if (query.toLowerCase().includes('where status')) {
      return query.replace('WHERE status', 'USE INDEX (idx_rounds_status) WHERE status');
    }
    
    return query;
  }

  // Add news-specific optimizations
  addNewsOptimizations(query) {
    // Add index hints for common news queries
    if (query.toLowerCase().includes('where "publishedat"')) {
      return query.replace('WHERE "publishedAt"', 'USE INDEX (idx_news_publishedat) WHERE "publishedAt"');
    }
    
    if (query.toLowerCase().includes('where status')) {
      return query.replace('WHERE status', 'USE INDEX (idx_news_status) WHERE status');
    }
    
    return query;
  }

  // Execute query with timeout
  async executeQueryWithTimeout(connection, query, timeout) {
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error(`Query timeout after ${timeout}ms`));
      }, timeout);

      connection.query(query)
        .then(result => {
          clearTimeout(timeoutId);
          resolve(result);
        })
        .catch(error => {
          clearTimeout(timeoutId);
          reject(error);
        });
    });
  }

  // Get connection from pool
  async getConnection() {
    // Check for available connections
    for (const [id, connection] of this.connectionPool.entries()) {
      if (!connection.inUse) {
        connection.inUse = true;
        connection.lastUsed = Date.now();
        return connection;
      }
    }

    // Create new connection if pool not full
    if (this.connectionPool.size < this.maxConnections) {
      const connection = await this.createConnection();
      this.connectionPool.set(connection.id, connection);
      return connection;
    }

    // Wait for available connection
    return this.waitForConnection();
  }

  // Create new database connection
  async createConnection() {
    // This would integrate with your actual database service
    const connection = {
      id: Date.now() + Math.random(),
      inUse: true,
      lastUsed: Date.now(),
      query: async (sql) => {
        // Implement actual query execution
        console.log('Executing query:', sql);
        return { rows: [], rowCount: 0 };
      }
    };

    return connection;
  }

  // Wait for available connection
  async waitForConnection() {
    return new Promise((resolve) => {
      const checkConnection = () => {
        for (const [id, connection] of this.connectionPool.entries()) {
          if (!connection.inUse) {
            connection.inUse = true;
            connection.lastUsed = Date.now();
            resolve(connection);
            return;
          }
        }
        setTimeout(checkConnection, 100);
      };
      checkConnection();
    });
  }

  // Release connection back to pool
  releaseConnection(connection) {
    if (connection && this.connectionPool.has(connection.id)) {
      connection.inUse = false;
      connection.lastUsed = Date.now();
    }
  }

  // Generate unique query key for caching
  generateQueryKey(query, params) {
    const paramString = JSON.stringify(params);
    return `${query}_${this.hashString(paramString)}`;
  }

  // Simple string hash function
  hashString(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(36);
  }

  // Check if cache entry is expired
  isCacheExpired(cacheEntry) {
    return Date.now() - cacheEntry.timestamp > cacheEntry.ttl;
  }

  // Record query statistics
  recordQueryStats(queryKey, status, error = null) {
    if (!this.queryStats.has(queryKey)) {
      this.queryStats.set(queryKey, {
        total: 0,
        success: 0,
        error: 0,
        cache_hit: 0,
        avgExecutionTime: 0,
        lastExecuted: null
      });
    }

    const stats = this.queryStats.get(queryKey);
    stats.total++;
    stats[status]++;
    stats.lastExecuted = Date.now();

    if (error) {
      console.warn('Query error:', error);
    }
  }

  // Get query performance statistics
  getQueryStats() {
    const stats = {
      totalQueries: 0,
      cacheHits: 0,
      cacheMisses: 0,
      errors: 0,
      slowQueries: 0,
      topQueries: []
    };

    for (const [queryKey, queryStats] of this.queryStats.entries()) {
      stats.totalQueries += queryStats.total;
      stats.cacheHits += queryStats.cache_hit;
      stats.errors += queryStats.error;
      
      if (queryStats.avgExecutionTime > 1000) {
        stats.slowQueries++;
      }
    }

    stats.cacheMisses = stats.totalQueries - stats.cacheHits;

    // Get top 10 most executed queries
    const sortedQueries = Array.from(this.queryStats.entries())
      .sort((a, b) => b[1].total - a[1].total)
      .slice(0, 10);

    stats.topQueries = sortedQueries.map(([queryKey, queryStats]) => ({
      query: queryKey,
      total: queryStats.total,
      success: queryStats.success,
      error: queryStats.error,
      cacheHitRate: (queryStats.cache_hit / queryStats.total * 100).toFixed(2) + '%'
    }));

    return stats;
  }

  // Clear query cache
  clearQueryCache() {
    this.queryCache.clear();
    console.log('Query cache cleared');
  }

  // Clear expired cache entries
  clearExpiredCache() {
    const now = Date.now();
    for (const [key, entry] of this.queryCache.entries()) {
      if (this.isCacheExpired(entry)) {
        this.queryCache.delete(key);
      }
    }
  }

  // Get connection pool status
  getConnectionPoolStatus() {
    const status = {
      total: this.connectionPool.size,
      inUse: 0,
      available: 0,
      maxConnections: this.maxConnections
    };

    for (const connection of this.connectionPool.values()) {
      if (connection.inUse) {
        status.inUse++;
      } else {
        status.available++;
      }
    }

    return status;
  }

  // Start monitoring and cleanup
  startMonitoring() {
    // Cleanup expired cache entries every 5 minutes
    setInterval(() => {
      this.clearExpiredCache();
    }, 5 * 60 * 1000);

    // Cleanup idle connections every minute
    setInterval(() => {
      this.cleanupIdleConnections();
    }, 60 * 1000);

    // Log performance statistics every 10 minutes
    setInterval(() => {
      const stats = this.getQueryStats();
      if (stats.totalQueries > 0) {
        console.log('Database Performance Stats:', stats);
      }
    }, 10 * 60 * 1000);
  }

  // Cleanup idle connections
  cleanupIdleConnections() {
    const now = Date.now();
    for (const [id, connection] of this.connectionPool.entries()) {
      if (!connection.inUse && (now - connection.lastUsed) > this.connectionTimeout) {
        this.connectionPool.delete(id);
      }
    }
  }

  // Create database indexes (for initial setup)
  async createIndexes() {
    const indexQueries = [
      // Participants indexes
      'CREATE INDEX IF NOT EXISTS idx_participants_name ON participants(name)',
      'CREATE INDEX IF NOT EXISTS idx_participants_role ON participants(role)',
      'CREATE INDEX IF NOT EXISTS idx_participants_region ON participants(region)',
      'CREATE INDEX IF NOT EXISTS idx_participants_created_at ON participants(created_at)',
      
      // Rounds indexes
      'CREATE INDEX IF NOT EXISTS idx_rounds_title ON rounds(title)',
      'CREATE INDEX IF NOT EXISTS idx_rounds_startdatetime ON rounds("startDateTime")',
      'CREATE INDEX IF NOT EXISTS idx_rounds_status ON rounds(status)',
      'CREATE INDEX IF NOT EXISTS idx_rounds_competitiontype ON rounds(competitionType)',
      'CREATE INDEX IF NOT EXISTS idx_rounds_location ON rounds(location)',
      
      // News indexes
      'CREATE INDEX IF NOT EXISTS idx_news_title ON news(title)',
      'CREATE INDEX IF NOT EXISTS idx_news_category ON news(category)',
      'CREATE INDEX IF NOT EXISTS idx_news_publishedat ON news("publishedAt")',
      'CREATE INDEX IF NOT EXISTS idx_news_status ON news(status)',
      
      // Timetable indexes
      'CREATE INDEX IF NOT EXISTS idx_timetable_title ON timetable(title)',
      'CREATE INDEX IF NOT EXISTS idx_timetable_date ON timetable(date)',
      'CREATE INDEX IF NOT EXISTS idx_timetable_type ON timetable(type)',
      'CREATE INDEX IF NOT EXISTS idx_timetable_status ON timetable(status)'
    ];

    for (const query of indexQueries) {
      try {
        await this.optimizeQuery(query, {}, { cache: false });
        console.log('Created index:', query);
      } catch (error) {
        console.warn('Failed to create index:', query, error);
      }
    }
  }

  // Analyze table performance
  async analyzeTablePerformance(tableName) {
    const analysisQueries = [
      `SELECT COUNT(*) as total_rows FROM ${tableName}`,
      `SELECT COUNT(*) as null_columns FROM ${tableName} WHERE id IS NULL`,
      `SELECT COUNT(DISTINCT id) as unique_ids FROM ${tableName}`
    ];

    const results = {};
    
    for (const query of analysisQueries) {
      try {
        const result = await this.optimizeQuery(query, {}, { cache: false });
        results[query] = result;
      } catch (error) {
        console.warn('Failed to analyze table:', tableName, error);
      }
    }

    return results;
  }
}

// Create singleton instance
const databaseOptimizationService = new DatabaseOptimizationService();

export default databaseOptimizationService;
