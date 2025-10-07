#!/usr/bin/env node

/**
 * Create Default Admin User Script
 * Creates a default admin user for development and testing
 */

import bcrypt from 'bcrypt';
import { executeQuery } from '../server/config/database.js';
import logger from '../server/config/logger.js';

const DEFAULT_ADMIN = {
  username: 'admin',
  email: 'admin@slam25.de',
  password: 'admin123',
  firstName: 'Admin',
  lastName: 'User',
  role: 'admin'
};

async function createAdminUser() {
  try {
    logger.info('Creating default admin user...');
    
    // Check if admin user already exists
    const existingUser = await executeQuery(
      'SELECT id FROM users WHERE email = $1 OR username = $2',
      [DEFAULT_ADMIN.email, DEFAULT_ADMIN.username]
    );
    
    if (existingUser.rows.length > 0) {
      logger.info('Admin user already exists, skipping creation');
      return;
    }
    
    // Hash password
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(DEFAULT_ADMIN.password, saltRounds);
    
    // Create admin user
    const result = await executeQuery(`
      INSERT INTO users (username, email, password_hash, role, first_name, last_name, is_active, email_verified)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING id, username, email, role
    `, [
      DEFAULT_ADMIN.username,
      DEFAULT_ADMIN.email,
      passwordHash,
      DEFAULT_ADMIN.role,
      DEFAULT_ADMIN.firstName,
      DEFAULT_ADMIN.lastName,
      true,
      true
    ]);
    
    const user = result.rows[0];
    
    logger.info('Default admin user created successfully', {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role
    });
    
    console.log('\n==========================================');
    console.log('Default Admin User Created');
    console.log('==========================================');
    console.log('Username:', DEFAULT_ADMIN.username);
    console.log('Email:', DEFAULT_ADMIN.email);
    console.log('Password:', DEFAULT_ADMIN.password);
    console.log('Role:', DEFAULT_ADMIN.role);
    console.log('\nYou can now login to the admin panel with these credentials.');
    console.log('==========================================\n');
    
  } catch (error) {
    logger.error('Failed to create admin user:', error);
    console.error('Error creating admin user:', error.message);
    process.exit(1);
  }
}

// Run the script
createAdminUser()
  .then(() => {
    logger.info('Admin user creation completed');
    process.exit(0);
  })
  .catch((error) => {
    logger.error('Script failed:', error);
    process.exit(1);
  });
