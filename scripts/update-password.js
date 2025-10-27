#!/usr/bin/env node

/**
 * Update Password Script for Production
 * Updates the password for slamok user on Uberspace
 */

import bcryptjs from 'bcryptjs';
import { executeQuery } from '../server/config/database.js';
import logger from '../server/config/logger.js';

async function updatePassword() {
  try {
    logger.info('Updating password for slamok user...');
    
    const username = 'slamok';
    const newPassword = 'felixlobrechtfan3';
    
    // Hash the new password
    const saltRounds = 10;
    const passwordHash = await bcryptjs.hash(newPassword, saltRounds);
    
    // Update the password
    const result = await executeQuery(
      'UPDATE users SET password_hash = $1, updated_at = NOW() WHERE username = $2 RETURNING id, username, email, role',
      [passwordHash, username]
    );
    
    if (result.rows.length > 0) {
      const user = result.rows[0];
      
      console.log('\n==========================================');
      console.log('Password Updated Successfully');
      console.log('==========================================');
      console.log('Username:', user.username);
      console.log('New Password:', newPassword);
      console.log('Email:', user.email);
      console.log('Role:', user.role);
      console.log('Updated:', new Date().toISOString());
      console.log('\nYou can now login with the new password.');
      console.log('==========================================\n');
      
      logger.info('Password updated successfully for user:', { username: user.username, email: user.email });
    } else {
      console.log('❌ User slamok not found');
      logger.error('User slamok not found');
    }
    
  } catch (error) {
    logger.error('Failed to update password:', error);
    console.error('❌ Error updating password:', error.message);
    process.exit(1);
  }
}

// Run the script
updatePassword()
  .then(() => {
    logger.info('Password update completed');
    process.exit(0);
  })
  .catch((error) => {
    logger.error('Script failed:', error);
    process.exit(1);
  });
