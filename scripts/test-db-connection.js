#!/usr/bin/env node

/**
 * Test script to verify database connection fixes
 * Run with: node scripts/test-db-connection.js
 */

import { executeQuery, checkDatabaseHealth, getPoolStats } from '../server/config/database.js';
import logger from '../server/config/logger.js';

async function testDatabaseConnection() {
  console.log('🔍 Testing database connection...');
  
  try {
    // Test basic connection
    console.log('1. Testing basic connection...');
    const result = await executeQuery('SELECT NOW() as current_time');
    console.log('✅ Basic connection successful:', result.rows[0].current_time);
    
    // Test health check
    console.log('2. Testing health check...');
    const health = await checkDatabaseHealth();
    console.log('✅ Health check:', health.status);
    
    // Test pool stats
    console.log('3. Testing pool statistics...');
    const stats = getPoolStats();
    console.log('✅ Pool stats:', {
      total: stats.totalCount,
      idle: stats.idleCount,
      waiting: stats.waitingCount,
      max: stats.maxConnections
    });
    
    // Test multiple connections
    console.log('4. Testing multiple connections...');
    const promises = [];
    for (let i = 0; i < 3; i++) {
      promises.push(executeQuery(`SELECT ${i} as test_number`));
    }
    
    const results = await Promise.all(promises);
    console.log('✅ Multiple connections successful:', results.map(r => r.rows[0].test_number));
    
    // Test connection cleanup
    console.log('5. Testing connection cleanup...');
    await new Promise(resolve => setTimeout(resolve, 1000)); // Wait for cleanup
    const finalStats = getPoolStats();
    console.log('✅ Final pool stats:', {
      total: finalStats.totalCount,
      idle: finalStats.idleCount,
      waiting: finalStats.waitingCount
    });
    
    console.log('🎉 All database connection tests passed!');
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Database connection test failed:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

// Run the test
testDatabaseConnection();
