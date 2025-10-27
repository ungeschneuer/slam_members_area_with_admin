#!/usr/bin/env node

/**
 * Create Production Admin User Script (Non-Interactive)
 * Creates the slamok admin user for production Uberspace server
 */

import bcryptjs from 'bcryptjs';
import { executeQuery } from '../server/config/database.js';
import logger from '../server/config/logger.js';

const PRODUCTION_ADMIN = {
  username: 'slamok',
  email: 'slamok@szene.slam25.de',
  password: 'kanukokst',
  firstName: 'Slam',
  lastName: 'Admin',
  role: 'admin'
};

async function createProductionAdminUser() {
  try {
    console.log('\n==========================================');
    console.log('Production Admin User Creation');
    console.log('==========================================');
    console.log('Creating admin user:', PRODUCTION_ADMIN.username);
    
    logger.info(`Creating production admin user: ${PRODUCTION_ADMIN.username}...`);
    
    // Check if admin user already exists
    const existingUser = await executeQuery(
      'SELECT id FROM users WHERE email = $1 OR username = $2',
      [PRODUCTION_ADMIN.email, PRODUCTION_ADMIN.username]
    );
    
    if (existingUser.rows.length > 0) {
      logger.info(`Admin user ${PRODUCTION_ADMIN.username} already exists, updating password...`);
      
      // Update password for existing user
      const saltRounds = 10;
      const passwordHash = await bcryptjs.hash(PRODUCTION_ADMIN.password, saltRounds);
      
      await executeQuery(
        'UPDATE users SET password_hash = $1, role = $2, is_active = $3, email_verified = $4, first_name = $5, last_name = $6 WHERE username = $7',
        [passwordHash, PRODUCTION_ADMIN.role, true, true, PRODUCTION_ADMIN.firstName, PRODUCTION_ADMIN.lastName, PRODUCTION_ADMIN.username]
      );
      
      console.log(`✅ Admin user ${PRODUCTION_ADMIN.username} password updated successfully`);
    } else {
      // Hash password
      const saltRounds = 10;
      const passwordHash = await bcryptjs.hash(PRODUCTION_ADMIN.password, saltRounds);
      
      // Create admin user
      const result = await executeQuery(`
        INSERT INTO users (username, email, password_hash, role, first_name, last_name, is_active, email_verified)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING id, username, email, role
      `, [
        PRODUCTION_ADMIN.username,
        PRODUCTION_ADMIN.email,
        passwordHash,
        PRODUCTION_ADMIN.role,
        PRODUCTION_ADMIN.firstName,
        PRODUCTION_ADMIN.lastName,
        true,
        true
      ]);
      
      const user = result.rows[0];
      
      logger.info('Production admin user created successfully', {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role
      });
      
      console.log('✅ Production admin user created successfully');
    }
    
    // Verify the user was created/updated correctly
    const verifyResult = await executeQuery(
      'SELECT id, username, email, role, is_active, email_verified FROM users WHERE username = $1',
      [PRODUCTION_ADMIN.username]
    );
    
    if (verifyResult.rows.length > 0) {
      const user = verifyResult.rows[0];
      
      console.log('\n==========================================');
      console.log('Production Admin User Ready');
      console.log('==========================================');
      console.log('Username:', PRODUCTION_ADMIN.username);
      console.log('Password:', PRODUCTION_ADMIN.password);
      console.log('Email:', user.email);
      console.log('Role:', user.role);
      console.log('Active:', user.is_active);
      console.log('Email Verified:', user.email_verified);
      console.log('\nYou can now login to the production admin panel.');
      console.log('==========================================\n');
    }
    
  } catch (error) {
    logger.error('Failed to create production admin user:', error);
    console.error('❌ Error creating production admin user:', error.message);
    process.exit(1);
  }
}

// Run the script
createProductionAdminUser()
  .then(() => {
    logger.info('Production admin user creation completed');
    process.exit(0);
  })
  .catch((error) => {
    logger.error('Script failed:', error);
    process.exit(1);
  });
