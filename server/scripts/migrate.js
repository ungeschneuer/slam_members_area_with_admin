#!/usr/bin/env node
// Database Migration Script for SLAM25 Application
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const execAsync = promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const MIGRATIONS_DIR = path.join(__dirname, '../../database/migrations');

async function runMigration() {
  try {
    console.log('🔄 Starting database migration...');
    
    // Get list of migration files
    const migrationFiles = await fs.readdir(MIGRATIONS_DIR);
    const sqlFiles = migrationFiles
      .filter(file => file.endsWith('.sql'))
      .sort();
    
    console.log(`Found ${sqlFiles.length} migration files`);
    
    // Run each migration
    for (const file of sqlFiles) {
      const filePath = path.join(MIGRATIONS_DIR, file);
      console.log(`Running migration: ${file}`);
      
      const command = `psql -U ${process.env.DB_USER || 'slam_user'} -d ${process.env.DB_NAME || 'slam25_db'} -f "${filePath}"`;
      
      try {
        const { stdout, stderr } = await execAsync(command);
        if (stderr && !stderr.includes('WARNING')) {
          console.error(`Migration ${file} failed:`, stderr);
          process.exit(1);
        }
        console.log(`✅ Migration ${file} completed successfully`);
      } catch (error) {
        console.error(`❌ Migration ${file} failed:`, error.message);
        process.exit(1);
      }
    }
    
    console.log('🎉 All migrations completed successfully!');
    
  } catch (error) {
    console.error('❌ Migration process failed:', error);
    process.exit(1);
  }
}

// Run migration if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runMigration();
}

export default runMigration;





