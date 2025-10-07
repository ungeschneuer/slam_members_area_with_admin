#!/usr/bin/env node

/**
 * Timezone API Test
 * Tests if APP_TIMEZONE is used in API endpoints
 */

console.log('🌍 Timezone API Test\n');

// Test 1: Check environment variable
console.log('1. Environment Variable:');
console.log(`   APP_TIMEZONE = ${process.env.APP_TIMEZONE || 'NOT SET'}`);
console.log('');

// Test 2: Test timezone service directly
console.log('2. Timezone Service Test:');
try {
  const { getConfiguredTimezone, formatTimeInTimezone } = await import('../server/services/timezoneService.js');
  
  const configuredTimezone = getConfiguredTimezone();
  console.log(`   getConfiguredTimezone() returns: ${configuredTimezone}`);
  
  // Test formatting
  const testDate = new Date('2024-01-15T14:30:00Z');
  const formattedTime = formatTimeInTimezone(testDate, configuredTimezone);
  console.log(`   Formatted time: ${formattedTime}`);
  
  console.log(`   ✅ Timezone service is working`);
} catch (error) {
  console.log(`   ❌ Error: ${error.message}`);
}
console.log('');

// Test 3: Test API endpoint
console.log('3. API Endpoint Test:');
try {
  const response = await fetch('http://localhost:3000/api/admin/settings', {
    headers: {
      'Cookie': 'authToken=test' // This might not work without proper auth
    }
  });
  
  if (response.ok) {
    const data = await response.json();
    console.log(`   ✅ API response received`);
    console.log(`   Response data:`, JSON.stringify(data, null, 2));
    
    if (data.data && data.data.timezone) {
      console.log(`   Timezone from API: ${data.data.timezone}`);
      const matchesEnv = data.data.timezone === (process.env.APP_TIMEZONE || 'Europe/Berlin');
      console.log(`   ✅ Matches APP_TIMEZONE: ${matchesEnv ? 'YES' : 'NO'}`);
    } else {
      console.log(`   ⚠️  No timezone found in API response`);
    }
  } else {
    console.log(`   ⚠️  API request failed (status: ${response.status})`);
    console.log(`   This might be due to authentication requirements`);
  }
} catch (error) {
  console.log(`   ⚠️  API test failed: ${error.message}`);
  console.log(`   Make sure the server is running on localhost:3000`);
}
console.log('');

// Test 4: Test system routes directly
console.log('4. System Routes Test:');
try {
  const { default: systemRoutes } = await import('../server/routes/system.routes.js');
  console.log(`   ✅ System routes imported successfully`);
  console.log(`   Routes available: ${systemRoutes.stack ? systemRoutes.stack.length : 'unknown'} routes`);
} catch (error) {
  console.log(`   ❌ Error importing system routes: ${error.message}`);
}
console.log('');

// Test 5: Test database connection
console.log('5. Database Connection Test:');
try {
  const { executeQuery } = await import('../server/config/database.js');
  const result = await executeQuery('SELECT NOW() as current_time, $1 as timezone', [process.env.APP_TIMEZONE || 'Europe/Berlin']);
  
  console.log(`   ✅ Database connection successful`);
  console.log(`   Current time: ${result.rows[0].current_time}`);
  console.log(`   Timezone: ${result.rows[0].timezone}`);
} catch (error) {
  console.log(`   ❌ Database test failed: ${error.message}`);
  console.log(`   Make sure database is running and accessible`);
}
console.log('');

// Summary
console.log('📊 Summary:');
console.log(`   APP_TIMEZONE: ${process.env.APP_TIMEZONE || 'NOT SET'}`);
try {
  const { getConfiguredTimezone } = await import('../server/services/timezoneService.js');
  console.log(`   Timezone service: ${getConfiguredTimezone() ? 'WORKING' : 'NOT WORKING'}`);
} catch (error) {
  console.log(`   Timezone service: NOT WORKING`);
}
console.log(`   API endpoint: ${response?.ok ? 'ACCESSIBLE' : 'NOT ACCESSIBLE'}`);
console.log(`   Database: ${result ? 'CONNECTED' : 'NOT CONNECTED'}`);

console.log('\n🔧 To test with different timezone:');
console.log('   APP_TIMEZONE=America/New_York node scripts/test-timezone-api.js');
console.log('   APP_TIMEZONE=Asia/Tokyo node scripts/test-timezone-api.js');
console.log('   APP_TIMEZONE=UTC node scripts/test-timezone-api.js');
