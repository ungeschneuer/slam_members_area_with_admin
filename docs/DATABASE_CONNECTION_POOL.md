# Database Connection Pool Configuration

## Overview

The SLAM25 application uses PostgreSQL connection pooling to manage database connections efficiently. This document explains the configuration, monitoring, and optimization of the connection pool.

---

## Current Configuration

### Development
- **Max Connections:** 10
- **Min Connections:** 2
- **Idle Timeout:** 30 seconds
- **Acquire Timeout:** 10 seconds

### Production (Uberspace)
- **Max Connections:** 15 (increased from 2)
- **Min Connections:** 3 (increased from 1)
- **Idle Timeout:** 5 minutes
- **Acquire Timeout:** 1 minute
- **Connection Timeout:** 20 seconds

---

## Why We Increased the Pool Size

### Previous Configuration Problems

**OLD Settings:**
```javascript
production: {
  max: 2,  // Only 2 concurrent DB connections!
  min: 1
}
```

**Issues:**
- ❌ Only 2 simultaneous database operations possible
- ❌ Third request waits up to 60 seconds (acquire timeout)
- ❌ High latency during concurrent requests
- ❌ Connection pool exhaustion errors
- ❌ Poor user experience during peak usage

### New Configuration Benefits

**NEW Settings:**
```javascript
production: {
  max: 15,  // Up to 15 concurrent DB connections
  min: 3    // Always 3 connections ready
}
```

**Benefits:**
- ✅ Handles 15+ concurrent requests smoothly
- ✅ Reduced latency for database operations
- ✅ Better resource utilization
- ✅ Improved user experience during events
- ✅ Room for growth without code changes

---

## Environment Variables

You can override the pool settings in your `.env.deployment` file:

```bash
# Database Connection Pool Settings
DB_MAX_CONNECTIONS=15        # Maximum number of connections
DB_MIN_CONNECTIONS=3         # Minimum idle connections
DB_IDLE_TIMEOUT=300000       # 5 minutes (in milliseconds)
DB_CONNECTION_TIMEOUT=20000  # 20 seconds
DB_ACQUIRE_TIMEOUT=60000     # 1 minute
```

---

## Monitoring Connection Pool Health

### Check Pool Statistics

The application exposes pool statistics via the logger. You can monitor:

```javascript
{
  totalCount: 8,          // Current total connections
  idleCount: 5,           // Currently idle connections
  waitingCount: 0,        // Requests waiting for a connection
  maxConnections: 15,     // Maximum allowed connections
  minConnections: 3,      // Minimum idle connections
  utilization: 0.53,      // 53% pool utilization
  health: 'healthy'       // healthy | warning | critical
}
```

### Health Status Indicators

| Status | Condition | Action |
|--------|-----------|--------|
| **Healthy** | Utilization < 70% <br> Waiting < 5 | No action needed |
| **Warning** | Utilization 70-90% <br> OR Waiting 5-10 | Monitor closely, consider increasing pool |
| **Critical** | Utilization > 90% <br> OR Waiting > 10 | Increase pool size immediately |

### Log Messages to Watch For

```bash
# Good - Normal operation
[INFO] Database connection established

# Warning - Pool under pressure
[WARN] ⚠️  Database pool under pressure: 8 waiting clients

# Warning - High utilization
[WARN] ⚠️  Database pool utilization high: 87%

# Error - Connection issues
[ERROR] Database pool error: connection timeout
```

---

## Tuning Guidelines

### When to Increase Pool Size

Increase `DB_MAX_CONNECTIONS` if you observe:
- ✅ Frequent "waiting clients" warnings (> 5)
- ✅ High pool utilization (> 80%)
- ✅ Slow API response times during concurrent requests
- ✅ Connection timeout errors in logs

### When to Decrease Pool Size

Decrease `DB_MAX_CONNECTIONS` if you observe:
- ✅ Very low pool utilization (< 20%)
- ✅ Database memory pressure
- ✅ Uberspace resource warnings

### Recommended Settings by Traffic

| Traffic Level | Max Connections | Min Connections |
|---------------|----------------|-----------------|
| **Low** (<10 concurrent users) | 10 | 2 |
| **Medium** (10-50 concurrent users) | 15 | 3 |
| **High** (50-100 concurrent users) | 20 | 5 |
| **Very High** (100+ concurrent users) | 25-30 | 10 |

---

## Uberspace Considerations

### PostgreSQL Limits on Uberspace

Uberspace shared hosting has the following PostgreSQL limits:
- **Max Connections (Server):** 100 (shared across all users)
- **Recommended per App:** 10-20 connections
- **File Descriptors:** No strict limit on modern Uberspace

### Best Practices for Uberspace

1. **Start Conservative:** Begin with 15 max connections
2. **Monitor:** Watch logs during events for pool pressure
3. **Scale Up Gradually:** Increase by 5 if needed
4. **Respect Neighbors:** Don't use more than 25 connections
5. **Use Connection Pooling:** Always use pooling, never direct connections

---

## Troubleshooting

### Connection Timeout Errors

**Symptom:**
```
Error: Connection timeout
Error: Timed out acquiring connection from pool
```

**Solution:**
1. Increase `DB_MAX_CONNECTIONS` by 5
2. Check for long-running queries (optimize them)
3. Verify network connectivity to database
4. Check PostgreSQL server max_connections setting

### Pool Exhaustion

**Symptom:**
```
WARN: Database pool under pressure: 15 waiting clients
```

**Solution:**
1. Immediately increase `DB_MAX_CONNECTIONS` to 20
2. Check for connection leaks in code
3. Ensure all database queries use proper error handling
4. Review query performance (slow queries hold connections longer)

### Memory Pressure

**Symptom:**
```
Uberspace memory warning
PostgreSQL out of memory
```

**Solution:**
1. Decrease `DB_MAX_CONNECTIONS` by 5
2. Optimize queries to use less memory
3. Check for connection leaks
4. Consider upgrading Uberspace plan

---

## Connection Lifecycle

### Connection States

```
┌─────────────┐
│   Created   │ ← Pool creates new connection
└─────┬───────┘
      │
      ▼
┌─────────────┐
│    Idle     │ ← Connection waiting in pool
└─────┬───────┘
      │
      ▼
┌─────────────┐
│   In Use    │ ← Client using connection for query
└─────┬───────┘
      │
      ▼
┌─────────────┐
│  Released   │ ← Connection returned to pool
└─────┬───────┘
      │
      ▼
┌─────────────┐
│   Closed    │ ← Connection closed (idle timeout or max lifetime)
└─────────────┘
```

### Connection Parameters

| Parameter | Purpose | Default |
|-----------|---------|---------|
| **maxUses** | Max queries per connection before refresh | 7500 |
| **maxLifetime** | Max connection age before refresh | 30 minutes |
| **keepAlive** | Keep connections alive with heartbeat | true |
| **keepAliveInitialDelayMillis** | Delay before first heartbeat | 10 seconds |

---

## Code Examples

### Checking Pool Health Programmatically

```javascript
import { getPoolStats } from './config/database.js';

// Get current pool statistics
const stats = getPoolStats();
console.log('Pool Stats:', stats);

// Check if pool is under pressure
if (stats.health === 'critical') {
  console.error('⚠️ Connection pool critical! Increase max connections.');
}
```

### Graceful Database Operations

```javascript
// ✅ GOOD - Uses pool connection, automatically released
async function getParticipants() {
  try {
    const result = await pool.query('SELECT * FROM participants');
    return result.rows;
  } catch (error) {
    logger.error('Database query failed', { error: error.message });
    throw error;
  }
}

// ❌ BAD - Manual client management (can leak connections)
async function getParticipants() {
  const client = await pool.connect();
  const result = await client.query('SELECT * FROM participants');
  // If error occurs before release, connection is leaked!
  client.release();
  return result.rows;
}
```

---

## Performance Testing

### Load Testing the Connection Pool

Use the included load test script:

```bash
node scripts/load-test.js --concurrent=20 --duration=60
```

This will:
- Simulate 20 concurrent users
- Run for 60 seconds
- Report pool statistics and performance metrics

### Metrics to Track

- **Response Time:** < 200ms for simple queries
- **Pool Utilization:** < 80% during normal operation
- **Waiting Count:** 0 during normal operation
- **Error Rate:** < 0.1% connection timeouts

---

## Migration from Old Configuration

### Before (Problematic)

```javascript
production: {
  max: 2,   // Too low!
  min: 1
}
```

**Result:** 3rd concurrent request waits up to 60 seconds

### After (Optimized)

```javascript
production: {
  max: 15,  // Handles 15+ concurrent requests
  min: 3    // Always ready
}
```

**Result:** All concurrent requests served within milliseconds

---

## References

- [node-postgres Connection Pooling](https://node-postgres.com/features/pooling)
- [PostgreSQL Connection Limits](https://www.postgresql.org/docs/current/runtime-config-connection.html)
- [Uberspace PostgreSQL Documentation](https://manual.uberspace.de/database-postgresql/)

---

## Summary

**Key Takeaways:**
1. ✅ Production pool increased from 2 to 15 connections
2. ✅ Supports 15+ concurrent requests without waiting
3. ✅ Configurable via environment variables
4. ✅ Monitor pool health via logs and statistics
5. ✅ Adjust based on actual traffic patterns

**Next Steps:**
1. Deploy with new configuration
2. Monitor logs during first event
3. Adjust `DB_MAX_CONNECTIONS` if needed based on observed utilization
4. Set up automated alerts for pool pressure warnings
