#!/usr/bin/env node

/**
 * Script to remove all Instagram handles from participants in production database
 * This script is designed to run directly on the production server
 */

import { Pool } from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from .env file on production server
function loadEnvFile() {
  const envPath = path.join(__dirname, '..', '.env');
  
  if (!fs.existsSync(envPath)) {
    console.error('❌ .env file not found!');
    console.error('Expected location:', envPath);
    process.exit(1);
  }
  
  const envContent = fs.readFileSync(envPath, 'utf8');
  const envVars = {};
  
  envContent.split('\n').forEach(line => {
    const trimmedLine = line.trim();
    if (trimmedLine && !trimmedLine.startsWith('#')) {
      const [key, ...valueParts] = trimmedLine.split('=');
      if (key && valueParts.length > 0) {
        envVars[key.trim()] = valueParts.join('=').trim();
      }
    }
  });
  
  return envVars;
}

async function removeInstagramHandles() {
  console.log('🚀 Starting Instagram handles removal from production database...\n');
  
  // Load environment variables
  const env = loadEnvFile();
  
  // Database connection configuration for production server
  const dbConfig = {
    host: env.DB_HOST || 'localhost',
    port: env.DB_PORT || 5432,
    database: env.DB_NAME || 'slam25_szene',
    user: env.DB_USER || 'szenesql',
    password: env.DB_PASSWORD,
    ssl: false // Local connection on production server
  };
  
  // Validate required environment variables
  if (!dbConfig.password) {
    console.error('❌ DB_PASSWORD is required in .env');
    process.exit(1);
  }
  
  console.log('📊 Database Configuration:');
  console.log(`   Host: ${dbConfig.host}`);
  console.log(`   Port: ${dbConfig.port}`);
  console.log(`   Database: ${dbConfig.database}`);
  console.log(`   User: ${dbConfig.user}`);
  console.log(`   SSL: ${dbConfig.ssl ? 'Enabled' : 'Disabled'}\n`);
  
  const pool = new Pool(dbConfig);
  let client;
  
  try {
    // Test database connection
    console.log('🔌 Testing database connection...');
    client = await pool.connect();
    console.log('✅ Database connection successful!\n');
    
    // First, let's see how many participants have Instagram handles
    console.log('📈 Checking current Instagram handles...');
    const countResult = await client.query(`
      SELECT 
        COUNT(*) as total_participants,
        COUNT(instagram) as participants_with_instagram,
        COUNT(CASE WHEN instagram IS NOT NULL AND instagram != '' THEN 1 END) as non_empty_instagram
      FROM participants
    `);
    
    const stats = countResult.rows[0];
    console.log(`   Total participants: ${stats.total_participants}`);
    console.log(`   Participants with Instagram field: ${stats.participants_with_instagram}`);
    console.log(`   Participants with non-empty Instagram: ${stats.non_empty_instagram}\n`);
    
    if (parseInt(stats.non_empty_instagram) === 0) {
      console.log('✅ No Instagram handles found. Nothing to remove.\n');
      client.release();
      await pool.end();
      return;
    }
    
    // Show some examples of what will be removed
    console.log('📋 Sample Instagram handles that will be removed:');
    const sampleResult = await client.query(`
      SELECT id, name, instagram 
      FROM participants 
      WHERE instagram IS NOT NULL AND instagram != ''
      ORDER BY id
      LIMIT 5
    `);
    
    sampleResult.rows.forEach(row => {
      console.log(`   ID ${row.id}: ${row.name} -> @${row.instagram}`);
    });
    
    if (parseInt(stats.non_empty_instagram) > 5) {
      console.log(`   ... and ${parseInt(stats.non_empty_instagram) - 5} more\n`);
    } else {
      console.log('');
    }
    
    // Confirm before proceeding
    console.log('⚠️  WARNING: This will permanently remove ALL Instagram handles from participants!');
    console.log('   This action cannot be undone.\n');
    
    // Start transaction
    console.log('🔄 Starting database transaction...');
    await client.query('BEGIN');
    
    // Remove Instagram handles
    console.log('🗑️  Removing Instagram handles...');
    const updateResult = await client.query(`
      UPDATE participants 
      SET instagram = NULL, updated_at = CURRENT_TIMESTAMP
      WHERE instagram IS NOT NULL AND instagram != ''
    `);
    
    console.log(`✅ Updated ${updateResult.rowCount} participants\n`);
    
    // Verify the changes
    console.log('🔍 Verifying changes...');
    const verifyResult = await client.query(`
      SELECT COUNT(CASE WHEN instagram IS NOT NULL AND instagram != '' THEN 1 END) as remaining_instagram
      FROM participants
    `);
    
    const remaining = verifyResult.rows[0].remaining_instagram;
    
    if (parseInt(remaining) === 0) {
      console.log('✅ All Instagram handles successfully removed!\n');
    } else {
      console.log(`⚠️  Warning: ${remaining} Instagram handles still remain\n`);
    }
    
    // Commit transaction
    await client.query('COMMIT');
    console.log('✅ Transaction committed successfully\n');
    
    // Show final statistics
    console.log('📊 Final Statistics:');
    const finalStats = await client.query(`
      SELECT 
        COUNT(*) as total_participants,
        COUNT(instagram) as participants_with_instagram,
        COUNT(CASE WHEN instagram IS NOT NULL AND instagram != '' THEN 1 END) as non_empty_instagram
      FROM participants
    `);
    
    const final = finalStats.rows[0];
    console.log(`   Total participants: ${final.total_participants}`);
    console.log(`   Participants with Instagram field: ${final.participants_with_instagram}`);
    console.log(`   Participants with non-empty Instagram: ${final.non_empty_instagram}\n`);
    
    console.log('🎉 Instagram handles removal completed successfully!');
    
  } catch (error) {
    console.error('❌ Error occurred:', error.message);
    
    // Try to rollback if we're in a transaction
    if (client) {
      try {
        await client.query('ROLLBACK');
        console.log('🔄 Transaction rolled back');
      } catch (rollbackError) {
        console.error('❌ Failed to rollback transaction:', rollbackError.message);
      }
    }
    
    throw error;
  } finally {
    if (client) {
      client.release();
    }
    await pool.end();
  }
}

// Run the script
removeInstagramHandles()
  .then(() => {
    console.log('\n✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error.message);
    process.exit(1);
  });

export { removeInstagramHandles };
