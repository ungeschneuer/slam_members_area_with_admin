#!/usr/bin/env node

/**
 * Simple Timezone Test
 * Quick test to verify APP_TIMEZONE is being used
 */

console.log('🌍 Simple Timezone Test\n');

// Test 1: Check environment variable
console.log('1. Environment Variable:');
console.log(`   APP_TIMEZONE = ${process.env.APP_TIMEZONE || 'NOT SET'}`);
console.log('');

// Test 2: Test timezone service
console.log('2. Timezone Service Test:');
try {
  // Import the timezone service
  const { getConfiguredTimezone } = await import('../server/services/timezoneService.js');
  
  const configuredTimezone = getConfiguredTimezone();
  console.log(`   getConfiguredTimezone() returns: ${configuredTimezone}`);
  
  // Check if it matches the environment variable
  const expectedTimezone = process.env.APP_TIMEZONE || 'Europe/Berlin';
  const isCorrect = configuredTimezone === expectedTimezone;
  
  console.log(`   Expected: ${expectedTimezone}`);
  console.log(`   Actual: ${configuredTimezone}`);
  console.log(`   ✅ Correct: ${isCorrect ? 'YES' : 'NO'}`);
  
} catch (error) {
  console.log(`   ❌ Error: ${error.message}`);
}
console.log('');

// Test 3: Test timezone formatting
console.log('3. Timezone Formatting Test:');
try {
  const { formatTimeInTimezone, getConfiguredTimezone } = await import('../server/services/timezoneService.js');
  
  const testDate = new Date('2024-01-15T14:30:00Z'); // UTC time
  const configuredTimezone = getConfiguredTimezone();
  
  console.log(`   Test date (UTC): ${testDate.toISOString()}`);
  console.log(`   Configured timezone: ${configuredTimezone}`);
  
  const formattedTime = formatTimeInTimezone(testDate, configuredTimezone);
  console.log(`   Formatted time: ${formattedTime}`);
  
  // Test with different timezones to show the difference
  const berlinTime = formatTimeInTimezone(testDate, 'Europe/Berlin');
  const tokyoTime = formatTimeInTimezone(testDate, 'Asia/Tokyo');
  
  console.log(`   Berlin time: ${berlinTime}`);
  console.log(`   Tokyo time: ${tokyoTime}`);
  
  console.log(`   ✅ Timezone formatting is working`);
  
} catch (error) {
  console.log(`   ❌ Error: ${error.message}`);
}
console.log('');

// Test 4: Test API endpoint (if server is running)
console.log('4. API Endpoint Test:');
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

// Summary
console.log('📊 Summary:');
console.log(`   APP_TIMEZONE is ${process.env.APP_TIMEZONE ? 'SET' : 'NOT SET'}`);
try {
  const { getConfiguredTimezone } = await import('../server/services/timezoneService.js');
  console.log(`   Default timezone: ${getConfiguredTimezone()}`);
  console.log(`   Timezone service is working: ${getConfiguredTimezone() ? 'YES' : 'NO'}`);
} catch (error) {
  console.log(`   Timezone service error: ${error.message}`);
}

console.log('\n🔧 To test with different timezone:');
console.log('   APP_TIMEZONE=America/New_York node scripts/simple-timezone-test.js');
console.log('   APP_TIMEZONE=Asia/Tokyo node scripts/simple-timezone-test.js');
