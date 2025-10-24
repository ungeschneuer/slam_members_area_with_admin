#!/usr/bin/env node

/**
 * API Endpoint Validation Script
 * Tests all GET endpoints for proper data structure and no undefined values
 */

import fetch from 'node-fetch';

const API_BASE = 'http://localhost:3005/api';
const endpoints = [
  '/participants',
  '/rounds', 
  '/news',
  '/timetable',
  '/city-tips',
  '/info-pages',
  '/links',
  '/schnellzugriff'
];

const issues = [];
const results = [];

console.log('🔍 Starting API Endpoint Validation...\n');

async function validateEndpoint(endpoint) {
  const url = `${API_BASE}${endpoint}`;
  console.log(`Testing: ${url}`);
  
  try {
    const response = await fetch(url);
    const data = await response.json();
    
    const result = {
      endpoint,
      status: response.status,
      success: data.success,
      dataType: Array.isArray(data.data) ? 'array' : typeof data.data,
      dataLength: Array.isArray(data.data) ? data.data.length : 'N/A',
      hasUndefined: JSON.stringify(data).includes('undefined'),
      hasNull: JSON.stringify(data).includes('null'),
      issues: []
    };
    
    // Check HTTP status
    if (response.status !== 200) {
      result.issues.push(`HTTP ${response.status} instead of 200`);
    }
    
    // Check success flag
    if (data.success !== true) {
      result.issues.push(`success: ${data.success} instead of true`);
    }
    
    // Check data structure
    if (!Array.isArray(data.data)) {
      result.issues.push(`data is ${typeof data.data} instead of array`);
    }
    
    // Check for undefined values
    if (result.hasUndefined) {
      result.issues.push('Response contains "undefined" values');
    }
    
    // Check JSONB fields if data exists
    if (Array.isArray(data.data) && data.data.length > 0) {
      const sample = data.data[0];
      
      // Check specific JSONB fields based on endpoint
      if (endpoint === '/rounds' && sample.groups) {
        if (typeof sample.groups === 'string') {
          result.issues.push('groups field is string instead of parsed JSONB');
        }
      }
      
      if (endpoint === '/city-tips' && sample.opening_hours) {
        if (typeof sample.opening_hours === 'string') {
          result.issues.push('opening_hours field is string instead of parsed JSONB');
        }
      }
      
      if (endpoint === '/timetable' && sample.additional_links) {
        if (typeof sample.additional_links === 'string') {
          result.issues.push('additional_links field is string instead of parsed JSONB');
        }
      }
      
      // Check for required fields
      if (endpoint === '/participants' && !sample.name) {
        result.issues.push('Missing required field: name');
      }
      
      if (endpoint === '/rounds' && !sample.title) {
        result.issues.push('Missing required field: title');
      }
      
      if (endpoint === '/news' && !sample.title) {
        result.issues.push('Missing required field: title');
      }
    }
    
    results.push(result);
    
    if (result.issues.length > 0) {
      console.log(`❌ ${endpoint}: ${result.issues.length} issues`);
      result.issues.forEach(issue => console.log(`   - ${issue}`));
      issues.push(...result.issues.map(issue => ({ endpoint, issue })));
    } else {
      console.log(`✅ ${endpoint}: OK (${result.dataLength} items)`);
    }
    
  } catch (error) {
    console.log(`❌ ${endpoint}: Error - ${error.message}`);
    issues.push({ endpoint, issue: `Network error: ${error.message}` });
    results.push({
      endpoint,
      status: 'ERROR',
      success: false,
      dataType: 'error',
      dataLength: 0,
      hasUndefined: false,
      hasNull: false,
      issues: [`Network error: ${error.message}`]
    });
  }
  
  console.log(''); // Empty line for readability
}

async function main() {
  console.log('Testing all API endpoints...\n');
  
  for (const endpoint of endpoints) {
    await validateEndpoint(endpoint);
  }
  
  // Summary
  console.log('📊 VALIDATION SUMMARY');
  console.log('====================');
  console.log(`Total endpoints tested: ${endpoints.length}`);
  console.log(`Successful endpoints: ${results.filter(r => r.issues.length === 0).length}`);
  console.log(`Failed endpoints: ${results.filter(r => r.issues.length > 0).length}`);
  console.log(`Total issues found: ${issues.length}`);
  
  if (issues.length > 0) {
    console.log('\n🚨 ISSUES FOUND:');
    console.log('================');
    issues.forEach(({ endpoint, issue }, index) => {
      console.log(`${index + 1}. ${endpoint}: ${issue}`);
    });
  } else {
    console.log('\n✅ All endpoints passed validation!');
  }
  
  // Detailed results
  console.log('\n📋 DETAILED RESULTS:');
  console.log('====================');
  results.forEach(result => {
    console.log(`\n${result.endpoint}:`);
    console.log(`  Status: ${result.status}`);
    console.log(`  Success: ${result.success}`);
    console.log(`  Data Type: ${result.dataType}`);
    console.log(`  Data Length: ${result.dataLength}`);
    console.log(`  Has Undefined: ${result.hasUndefined}`);
    console.log(`  Has Null: ${result.hasNull}`);
    if (result.issues.length > 0) {
      console.log(`  Issues: ${result.issues.join(', ')}`);
    }
  });
  
  process.exit(issues.length > 0 ? 1 : 0);
}

main().catch(console.error);
