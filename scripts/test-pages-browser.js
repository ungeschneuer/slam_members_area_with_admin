#!/usr/bin/env node

/**
 * Test frontend pages for proper loading
 * Run with: node scripts/test-pages-browser.js
 */

import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:5173';
const results = [];
const issues = [];

// Main routes to test
const mainRoutes = [
  '/',
  '/participants',
  '/rounds',
  '/news',
  '/timetable',
  '/city-tips',
  '/links',
  '/info'
];

async function testPage(route) {
  const url = `${BASE_URL}${route}`;
  console.log(`Testing: ${url}`);
  
  try {
    const response = await fetch(url);
    const html = await response.text();
    
    const result = {
      route,
      status: response.status,
      hasReactError: html.includes('ErrorBoundary') || html.includes('Something went wrong'),
      hasLoadingSpinner: html.includes('Loading') || html.includes('animate-spin'),
      hasContent: html.includes('<main') || html.includes('<div'),
      hasNavigation: html.includes('SLAM25') || html.includes('navigation'),
      issues: []
    };
    
    // Check HTTP status
    if (response.status !== 200) {
      result.issues.push(`HTTP ${response.status} instead of 200`);
    }
    
    // Check for React error boundaries
    if (result.hasReactError) {
      result.issues.push('Page shows React error boundary');
    }
    
    // Check if page has content
    if (!result.hasContent) {
      result.issues.push('Page appears to have no main content');
    }
    
    // Check if navigation is present
    if (!result.hasNavigation) {
      result.issues.push('Page missing navigation');
    }
    
    results.push(result);
    
    if (result.issues.length > 0) {
      console.log(`❌ ${route}: ${result.issues.length} issues`);
      result.issues.forEach(issue => console.log(`   - ${issue}`));
      issues.push(...result.issues.map(issue => ({ route, issue })));
    } else {
      console.log(`✅ ${route}: OK`);
    }
    
  } catch (error) {
    console.log(`❌ ${route}: Error - ${error.message}`);
    issues.push({ route, issue: `Network error: ${error.message}` });
    results.push({
      route,
      status: 'ERROR',
      hasReactError: false,
      hasLoadingSpinner: false,
      hasContent: false,
      hasNavigation: false,
      issues: [`Network error: ${error.message}`]
    });
  }
  
  console.log(''); // Empty line for readability
}

async function testDetailPages() {
  console.log('\n🔗 Testing detail pages with real slugs...\n');
  
  try {
    // Load check results to get available slugs
    const fs = await import('fs');
    const checkData = fs.readFileSync('check-results.json', 'utf8');
    const checkResults = JSON.parse(checkData);
    const slugs = checkResults.slugs;
    
    const detailRoutes = [
      { base: '/participants', slugs: slugs.participants?.slice(0, 3) || [] },
      { base: '/teams', slugs: slugs.teams?.slice(0, 2) || [] },
      { base: '/rounds', slugs: slugs.rounds?.slice(0, 3) || [] },
      { base: '/news', slugs: slugs.news?.slice(0, 3) || [] },
      { base: '/timetable/event', slugs: slugs.timetable_entries?.slice(0, 3) || [] },
      { base: '/city-tips', slugs: slugs.city_tips?.slice(0, 3) || [] },
      { base: '/info', slugs: slugs.info_pages?.slice(0, 3) || [] }
    ];
    
    for (const { base, slugs: routeSlugs } of detailRoutes) {
      if (routeSlugs.length === 0) {
        console.log(`⚠️  ${base}: No slugs available for testing`);
        continue;
      }
      
      for (const slug of routeSlugs) {
        const route = `${base}/${slug}`;
        await testPage(route);
      }
    }
    
  } catch (error) {
    console.log('⚠️  Could not load check results for detail page testing');
    console.log('   Run check-test-data.js first to get available slugs');
  }
}

async function main() {
  console.log('🌐 Testing frontend pages...\n');
  console.log('Make sure the development server is running on http://localhost:5173\n');
  
  // Test main routes
  for (const route of mainRoutes) {
    await testPage(route);
  }
  
  // Test detail pages
  await testDetailPages();
  
  // Summary
  console.log('📊 PAGE TESTING SUMMARY');
  console.log('========================');
  console.log(`Total pages tested: ${results.length}`);
  console.log(`Successful pages: ${results.filter(r => r.issues.length === 0).length}`);
  console.log(`Failed pages: ${results.filter(r => r.issues.length > 0).length}`);
  console.log(`Total issues found: ${issues.length}`);
  
  if (issues.length > 0) {
    console.log('\n🚨 ISSUES FOUND:');
    console.log('================');
    issues.forEach(({ route, issue }, index) => {
      console.log(`${index + 1}. ${route}: ${issue}`);
    });
  } else {
    console.log('\n✅ All pages loaded successfully!');
  }
  
  // Detailed results
  console.log('\n📋 DETAILED RESULTS:');
  console.log('====================');
  results.forEach(result => {
    console.log(`\n${result.route}:`);
    console.log(`  Status: ${result.status}`);
    console.log(`  Has React Error: ${result.hasReactError}`);
    console.log(`  Has Loading Spinner: ${result.hasLoadingSpinner}`);
    console.log(`  Has Content: ${result.hasContent}`);
    console.log(`  Has Navigation: ${result.hasNavigation}`);
    if (result.issues.length > 0) {
      console.log(`  Issues: ${result.issues.join(', ')}`);
    }
  });
  
  process.exit(issues.length > 0 ? 1 : 0);
}

main().catch(console.error);
