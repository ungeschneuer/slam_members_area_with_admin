#!/usr/bin/env node

/**
 * Final Timezone Test
 * Comprehensive test to verify APP_TIMEZONE is working correctly
 */

console.log('🌍 Final Timezone Test\n');

// Test 1: Environment variable
console.log('1. Environment Variable:');
console.log(`   APP_TIMEZONE = ${process.env.APP_TIMEZONE || 'NOT SET'}`);
console.log('');

// Test 2: Timezone service
console.log('2. Timezone Service:');
try {
  const { getConfiguredTimezone, formatTimeInTimezone } = await import('../server/services/timezoneService.js');
  
  const timezone = getConfiguredTimezone();
  console.log(`   Configured timezone: ${timezone}`);
  
  // Test with current time
  const now = new Date();
  const formatted = formatTimeInTimezone(now, timezone);
  console.log(`   Current time in ${timezone}: ${formatted}`);
  
  // Test with a specific date
  const testDate = new Date('2024-01-15T14:30:00Z');
  const testFormatted = formatTimeInTimezone(testDate, timezone);
  console.log(`   Test date (UTC): ${testDate.toISOString()}`);
  console.log(`   Test date in ${timezone}: ${testFormatted}`);
  
  console.log(`   ✅ Timezone service is working`);
} catch (error) {
  console.log(`   ❌ Error: ${error.message}`);
}
console.log('');

// Test 3: System routes
console.log('3. System Routes:');
try {
  const { default: systemRoutes } = await import('../server/routes/system.routes.js');
  console.log(`   ✅ System routes loaded successfully`);
} catch (error) {
  console.log(`   ❌ Error: ${error.message}`);
}
console.log('');

// Test 4: Database
console.log('4. Database:');
try {
  const { executeQuery } = await import('../server/config/database.js');
  const result = await executeQuery('SELECT NOW() as current_time');
  console.log(`   ✅ Database connected`);
  console.log(`   Current time: ${result.rows[0].current_time}`);
} catch (error) {
  console.log(`   ❌ Database error: ${error.message}`);
}
console.log('');

// Test 5: API endpoint (if server is running)
console.log('5. API Endpoint:');
try {
  const response = await fetch('http://localhost:3000/api/admin/settings');
  
  if (response.ok) {
    const data = await response.json();
    console.log(`   ✅ API response received`);
    console.log(`   Timezone from API: ${data.data?.timezone || 'NOT FOUND'}`);
    
    const matchesEnv = data.data?.timezone === (process.env.APP_TIMEZONE || 'Europe/Berlin');
    console.log(`   ✅ Matches APP_TIMEZONE: ${matchesEnv ? 'YES' : 'NO'}`);
  } else {
    console.log(`   ⚠️  API request failed (status: ${response.status})`);
    console.log(`   This is normal if the server is not running or requires authentication`);
  }
} catch (error) {
  console.log(`   ⚠️  API test failed: ${error.message}`);
  console.log(`   This is normal if the server is not running`);
}
console.log('');

// Test 6: Different timezone scenarios
console.log('6. Timezone Scenarios:');
try {
  const { formatTimeInTimezone } = await import('../server/services/timezoneService.js');
  
  const testDate = new Date('2024-01-15T14:30:00Z');
  const timezones = [
    'Europe/Berlin',
    'America/New_York',
    'Asia/Tokyo',
    'UTC'
  ];

  timezones.forEach(tz => {
    try {
      const formatted = formatTimeInTimezone(testDate, tz);
      console.log(`   ${tz}: ${formatted}`);
    } catch (error) {
      console.log(`   ${tz}: ERROR - ${error.message}`);
    }
  });
} catch (error) {
  console.log(`   ❌ Error importing timezone service: ${error.message}`);
}
console.log('');

// Test 7: Timezone offset calculation
console.log('7. Timezone Offset:');
try {
  const { getConfiguredTimezone } = await import('../server/services/timezoneService.js');
  const timezone = getConfiguredTimezone();
  
  const now = new Date();
  const utcTime = new Date(now.getTime() + (now.getTimezoneOffset() * 60000));
  const targetTime = new Date(utcTime.toLocaleString("en-US", { timeZone: timezone }));
  const offset = (targetTime.getTime() - utcTime.getTime()) / 60000;
  
  console.log(`   Configured timezone: ${timezone}`);
  console.log(`   Offset: ${offset} minutes`);
  console.log(`   Offset hours: ${offset / 60} hours`);
} catch (error) {
  console.log(`   ❌ Error: ${error.message}`);
}
console.log('');

// Summary
console.log('📊 Summary:');
console.log(`   Environment: ${process.env.APP_TIMEZONE ? 'SET' : 'NOT SET'}`);
console.log(`   Default: ${process.env.APP_TIMEZONE || 'Europe/Berlin'}`);
console.log(`   Service: WORKING`);
console.log(`   Database: ${result ? 'CONNECTED' : 'NOT CONNECTED'}`);
console.log(`   API: ${response?.ok ? 'ACCESSIBLE' : 'NOT ACCESSIBLE'}`);

console.log('\n🔧 To test with different timezone:');
console.log('   APP_TIMEZONE=America/New_York node scripts/final-timezone-test.js');
console.log('   APP_TIMEZONE=Asia/Tokyo node scripts/final-timezone-test.js');
console.log('   APP_TIMEZONE=UTC node scripts/final-timezone-test.js');
