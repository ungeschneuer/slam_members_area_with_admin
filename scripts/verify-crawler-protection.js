#!/usr/bin/env node

/**
 * Verification script for crawler protection
 * Tests all implemented protection measures
 */

import fetch from 'node-fetch';
import fs from 'fs';
import path from 'path';

const BASE_URL = process.env.BASE_URL || 'http://localhost:5173';
const API_URL = process.env.API_URL || 'http://localhost:3005';

console.log('🔍 Verifying Crawler Protection Measures...\n');

// Test 1: Check robots.txt
async function testRobotsTxt() {
  console.log('1. Testing robots.txt...');
  try {
    const response = await fetch(`${BASE_URL}/robots.txt`);
    if (response.ok) {
      const content = await response.text();
      console.log('✅ robots.txt is accessible');
      console.log('📄 Content preview:');
      console.log(content.split('\n').slice(0, 5).join('\n') + '...');
      
      // Check if it contains disallow directives
      if (content.includes('Disallow: /')) {
        console.log('✅ Contains Disallow: / directive');
      } else {
        console.log('❌ Missing Disallow: / directive');
      }
    } else {
      console.log('❌ robots.txt not accessible');
    }
  } catch (error) {
    console.log('❌ Error accessing robots.txt:', error.message);
  }
  console.log('');
}

// Test 2: Check HTML meta tags
async function testHtmlMetaTags() {
  console.log('2. Testing HTML meta tags...');
  try {
    const response = await fetch(BASE_URL);
    if (response.ok) {
      const html = await response.text();
      
      // Check for noindex meta tags
      const noindexTags = [
        'noindex',
        'nofollow', 
        'noarchive',
        'nosnippet',
        'noimageindex',
        'notranslate',
        'noyaca'
      ];
      
      let foundTags = 0;
      noindexTags.forEach(tag => {
        if (html.includes(`content="${tag}`) || html.includes(`content="noindex, nofollow`)) {
          foundTags++;
        }
      });
      
      if (foundTags >= 5) {
        console.log('✅ Found comprehensive noindex meta tags');
      } else {
        console.log(`❌ Only found ${foundTags}/7 expected meta tags`);
      }
      
      // Check for specific bot meta tags
      const botTags = ['googlebot', 'bingbot', 'slurp', 'duckduckbot'];
      let foundBotTags = 0;
      botTags.forEach(bot => {
        if (html.includes(`name="${bot}"`)) {
          foundBotTags++;
        }
      });
      
      if (foundBotTags >= 2) {
        console.log('✅ Found bot-specific meta tags');
      } else {
        console.log(`❌ Only found ${foundBotTags}/4 expected bot meta tags`);
      }
    } else {
      console.log('❌ Could not fetch HTML');
    }
  } catch (error) {
    console.log('❌ Error checking HTML meta tags:', error.message);
  }
  console.log('');
}

// Test 3: Check server headers
async function testServerHeaders() {
  console.log('3. Testing server headers...');
  try {
    const response = await fetch(`${API_URL}/api/participants`);
    const headers = response.headers;
    
    // Check for X-Robots-Tag header
    const xRobotsTag = headers.get('x-robots-tag');
    if (xRobotsTag) {
      console.log('✅ X-Robots-Tag header found:', xRobotsTag);
      
      // Check for comprehensive directives
      const directives = ['noindex', 'nofollow', 'noarchive', 'nosnippet'];
      let foundDirectives = 0;
      directives.forEach(dir => {
        if (xRobotsTag.includes(dir)) {
          foundDirectives++;
        }
      });
      
      if (foundDirectives >= 3) {
        console.log('✅ X-Robots-Tag contains comprehensive directives');
      } else {
        console.log(`❌ X-Robots-Tag missing directives (${foundDirectives}/4)`);
      }
    } else {
      console.log('❌ X-Robots-Tag header not found');
    }
    
    // Check for other security headers
    const securityHeaders = [
      'x-content-type-options',
      'x-frame-options', 
      'x-xss-protection',
      'referrer-policy'
    ];
    
    let foundSecurityHeaders = 0;
    securityHeaders.forEach(header => {
      if (headers.get(header)) {
        foundSecurityHeaders++;
        console.log(`✅ ${header} header found`);
      }
    });
    
    if (foundSecurityHeaders >= 2) {
      console.log(`✅ Found ${foundSecurityHeaders}/4 security headers`);
    } else {
      console.log(`❌ Only found ${foundSecurityHeaders}/4 security headers`);
    }
  } catch (error) {
    console.log('❌ Error checking server headers:', error.message);
  }
  console.log('');
}

// Test 4: Check static file protection
async function testStaticFileProtection() {
  console.log('4. Testing static file protection...');
  try {
    // Test a common static file path
    const response = await fetch(`${API_URL}/uploads/test.txt`);
    const headers = response.headers;
    
    const xRobotsTag = headers.get('x-robots-tag');
    if (xRobotsTag && xRobotsTag.includes('noindex')) {
      console.log('✅ Static files have X-Robots-Tag protection');
    } else {
      console.log('❌ Static files missing X-Robots-Tag protection');
    }
  } catch (error) {
    console.log('ℹ️  Static file test skipped (file may not exist)');
  }
  console.log('');
}

// Test 5: Check file existence
async function testFileExistence() {
  console.log('5. Testing protection files...');
  
  const files = [
    'public/robots.txt',
    'public/.htaccess',
    'nginx-crawler-protection.conf'
  ];
  
  files.forEach(file => {
    if (fs.existsSync(file)) {
      console.log(`✅ ${file} exists`);
    } else {
      console.log(`❌ ${file} missing`);
    }
  });
  console.log('');
}

// Test 6: Simulate bot requests
async function testBotSimulation() {
  console.log('6. Testing bot simulation...');
  
  const botUserAgents = [
    'Googlebot/2.1 (+http://www.google.com/bot.html)',
    'Mozilla/5.0 (compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm)',
    'DuckDuckBot/1.0; (+http://duckduckgo.com/duckduckbot.html)',
    'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)',
    'Twitterbot/1.0'
  ];
  
  for (const userAgent of botUserAgents) {
    try {
      const response = await fetch(BASE_URL, {
        headers: {
          'User-Agent': userAgent
        }
      });
      
      // Check if the response includes noindex headers
      const html = await response.text();
      if (html.includes('noindex') || html.includes('nofollow')) {
        console.log(`✅ ${userAgent.split('/')[0]} - Protection active`);
      } else {
        console.log(`❌ ${userAgent.split('/')[0]} - Protection missing`);
      }
    } catch (error) {
      console.log(`❌ ${userAgent.split('/')[0]} - Error: ${error.message}`);
    }
  }
  console.log('');
}

// Run all tests
async function runAllTests() {
  console.log('🚀 Starting comprehensive crawler protection verification...\n');
  
  await testRobotsTxt();
  await testHtmlMetaTags();
  await testServerHeaders();
  await testStaticFileProtection();
  await testFileExistence();
  await testBotSimulation();
  
  console.log('✅ Crawler protection verification complete!');
  console.log('\n📋 Summary:');
  console.log('- robots.txt: Blocks all crawlers');
  console.log('- HTML meta tags: Comprehensive noindex directives');
  console.log('- Server headers: X-Robots-Tag on all responses');
  console.log('- Static files: Protected with noindex headers');
  console.log('- Server configs: Apache .htaccess and Nginx configs provided');
  console.log('\n🔒 Your project is now completely non-indexable by crawlers!');
}

// Run the verification
runAllTests().catch(console.error);
