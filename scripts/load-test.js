#!/usr/bin/env node

/**
 * Load Testing Script for SLAM25 Members Area
 * Tests API endpoints under load to verify scalability for 300 concurrent users
 */

import autocannon from 'autocannon';
import { writeFileSync } from 'fs';
import { join } from 'path';
import fetch from 'node-fetch';

// Configuration
const BASE_URL = process.env.API_URL || 'http://localhost:3005/api';
const CONCURRENT_CONNECTIONS = parseInt(process.env.CONNECTIONS) || 300;
const DURATION = parseInt(process.env.DURATION) || 30; // seconds
const RATE = parseInt(process.env.RATE) || 10; // requests per second per connection

// Test configuration - simplified approach
const testConfig = {
  url: BASE_URL,
  connections: CONCURRENT_CONNECTIONS,
  duration: DURATION,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  },
  timeout: 30,
  rate: RATE
};

// Performance thresholds
const THRESHOLDS = {
  latency: {
    p50: 200,  // 50th percentile should be under 200ms
    p95: 1000, // 95th percentile should be under 1s
    p99: 2000  // 99th percentile should be under 2s
  },
  throughput: {
    min: 100   // Minimum requests per second
  },
  errors: {
    max: 0.01  // Maximum 1% error rate
  }
};

// Check if API server is running
async function checkApiServer() {
  try {
    const response = await fetch(`${BASE_URL}/participants`);
    if (!response.ok) {
      throw new Error(`API server returned ${response.status}`);
    }
    return true;
  } catch (error) {
    console.error('❌ API server not accessible:', error.message);
    console.error(`   Make sure the server is running on ${BASE_URL}`);
    return false;
  }
}

// Run load test
async function runLoadTest() {
  console.log('🚀 Starting load test for SLAM25 Members Area');
  console.log(`📊 Configuration:`);
  console.log(`   - Base URL: ${BASE_URL}`);
  console.log(`   - Connections: ${CONCURRENT_CONNECTIONS}`);
  console.log(`   - Duration: ${DURATION}s`);
  console.log(`   - Rate: ${RATE} req/s per connection`);
  console.log('');

  // Check if API server is running
  const serverRunning = await checkApiServer();
  if (!serverRunning) {
    process.exit(1);
  }

  try {
    const result = await autocannon(testConfig);
    
    // Analyze results
    const analysis = analyzeResults(result);
    
    // Display results
    displayResults(result, analysis);
    
    // Save detailed report
    if (process.argv.includes('--report')) {
      saveReport(result, analysis);
    }
    
    // Check if results meet thresholds
    const passed = checkThresholds(analysis);
    
    if (passed) {
      console.log('✅ Load test PASSED - System ready for 300 concurrent users');
      process.exit(0);
    } else {
      console.log('❌ Load test FAILED - System needs optimization');
      process.exit(1);
    }
    
  } catch (error) {
    console.error('❌ Load test failed:', error.message);
    process.exit(1);
  }
}

// Analyze test results
function analyzeResults(result) {
  const latency = result.latency;
  const throughput = result.throughput;
  const errors = result.errors;
  
  return {
    latency: {
      p50: latency.p50,
      p95: latency.p95,
      p99: latency.p99,
      average: latency.average
    },
    throughput: {
      average: throughput.average,
      total: throughput.total
    },
    errors: {
      count: errors,
      rate: errors / result.requests.total
    },
    requests: {
      total: result.requests.total,
      successful: result.requests.total - errors,
      failed: errors
    }
  };
}

// Display results in console
function displayResults(result, analysis) {
  console.log('📈 Load Test Results:');
  console.log('==================');
  
  // Latency metrics
  console.log('⏱️  Latency:');
  console.log(`   Average: ${analysis.latency.average.toFixed(2)}ms`);
  console.log(`   P50: ${analysis.latency.p50}ms`);
  console.log(`   P95: ${analysis.latency.p95}ms`);
  console.log(`   P99: ${analysis.latency.p99}ms`);
  console.log('');
  
  // Throughput metrics
  console.log('🚀 Throughput:');
  console.log(`   Average: ${analysis.throughput.average.toFixed(2)} req/s`);
  console.log(`   Total: ${analysis.throughput.total} requests`);
  console.log('');
  
  // Error metrics
  console.log('❌ Errors:');
  console.log(`   Count: ${analysis.errors.count}`);
  console.log(`   Rate: ${(analysis.errors.rate * 100).toFixed(2)}%`);
  console.log('');
  
  // Request summary
  console.log('📊 Requests:');
  console.log(`   Total: ${analysis.requests.total}`);
  console.log(`   Successful: ${analysis.requests.successful}`);
  console.log(`   Failed: ${analysis.requests.failed}`);
  console.log('');
}

// Check if results meet performance thresholds
function checkThresholds(analysis) {
  const checks = [];
  
  // Latency checks
  if (analysis.latency.p50 > THRESHOLDS.latency.p50) {
    checks.push(`❌ P50 latency too high: ${analysis.latency.p50}ms > ${THRESHOLDS.latency.p50}ms`);
  }
  
  if (analysis.latency.p95 > THRESHOLDS.latency.p95) {
    checks.push(`❌ P95 latency too high: ${analysis.latency.p95}ms > ${THRESHOLDS.latency.p95}ms`);
  }
  
  if (analysis.latency.p99 > THRESHOLDS.latency.p99) {
    checks.push(`❌ P99 latency too high: ${analysis.latency.p99}ms > ${THRESHOLDS.latency.p99}ms`);
  }
  
  // Throughput checks
  if (analysis.throughput.average < THRESHOLDS.throughput.min) {
    checks.push(`❌ Throughput too low: ${analysis.throughput.average.toFixed(2)} req/s < ${THRESHOLDS.throughput.min} req/s`);
  }
  
  // Error rate checks
  if (analysis.errors.rate > THRESHOLDS.errors.max) {
    checks.push(`❌ Error rate too high: ${(analysis.errors.rate * 100).toFixed(2)}% > ${(THRESHOLDS.errors.max * 100)}%`);
  }
  
  if (checks.length > 0) {
    console.log('⚠️  Performance Issues:');
    checks.forEach(check => console.log(`   ${check}`));
    console.log('');
    return false;
  }
  
  return true;
}

// Save detailed report to file
function saveReport(result, analysis) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const reportPath = join(process.cwd(), `load-test-report-${timestamp}.json`);
  
  const report = {
    timestamp: new Date().toISOString(),
    configuration: {
      baseUrl: BASE_URL,
      connections: CONCURRENT_CONNECTIONS,
      duration: DURATION,
      rate: RATE
    },
    results: result,
    analysis: analysis,
    thresholds: THRESHOLDS,
    summary: {
      passed: checkThresholds(analysis),
      recommendations: generateRecommendations(analysis)
    }
  };
  
  writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`📄 Detailed report saved to: ${reportPath}`);
}

// Generate recommendations based on results
function generateRecommendations(analysis) {
  const recommendations = [];
  
  if (analysis.latency.p95 > 1000) {
    recommendations.push('Consider increasing database connection pool size');
    recommendations.push('Review database query performance and add indexes');
  }
  
  if (analysis.errors.rate > 0.01) {
    recommendations.push('Investigate error causes and improve error handling');
    recommendations.push('Consider implementing request queuing');
  }
  
  if (analysis.throughput.average < 100) {
    recommendations.push('Optimize API response times');
    recommendations.push('Consider implementing caching');
  }
  
  return recommendations;
}

// Handle command line arguments
if (process.argv.includes('--help')) {
  console.log('SLAM25 Load Testing Script');
  console.log('');
  console.log('Usage: node scripts/load-test.js [options]');
  console.log('');
  console.log('Options:');
  console.log('  --report     Save detailed report to file');
  console.log('  --help       Show this help message');
  console.log('');
  console.log('Environment Variables:');
  console.log('  API_URL      Base API URL (default: http://localhost:3005/api)');
  console.log('  CONNECTIONS  Number of concurrent connections (default: 300)');
  console.log('  DURATION     Test duration in seconds (default: 30)');
  console.log('  RATE         Requests per second per connection (default: 10)');
  console.log('');
  process.exit(0);
}

// Run the load test
runLoadTest();
