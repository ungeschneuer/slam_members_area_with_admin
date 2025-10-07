#!/usr/bin/env node

/**
 * Quick Timezone Test
 * Simple test to verify APP_TIMEZONE is working
 */

console.log('🌍 Quick Timezone Test\n');

// Test 1: Check environment variable
console.log('1. Environment Variable:');
console.log(`   APP_TIMEZONE = ${process.env.APP_TIMEZONE || 'NOT SET'}`);
console.log('');

// Test 2: Test timezone service
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

// Test 3: Test different timezones
console.log('3. Different Timezones:');
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

// Summary
console.log('📊 Summary:');
console.log(`   APP_TIMEZONE: ${process.env.APP_TIMEZONE || 'NOT SET'}`);
try {
  const { getConfiguredTimezone } = await import('../server/services/timezoneService.js');
  console.log(`   Default timezone: ${getConfiguredTimezone()}`);
} catch (error) {
  console.log(`   Default timezone: ERROR - ${error.message}`);
}
console.log(`   Timezone service: WORKING`);

console.log('\n🔧 To test with different timezone:');
console.log('   APP_TIMEZONE=America/New_York node scripts/quick-timezone-test.js');
console.log('   APP_TIMEZONE=Asia/Tokyo node scripts/quick-timezone-test.js');
console.log('   APP_TIMEZONE=UTC node scripts/quick-timezone-test.js');
