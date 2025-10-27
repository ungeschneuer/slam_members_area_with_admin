#!/usr/bin/env node

/**
 * Create Production Admin User Script
 * Creates an admin user for production Uberspace server
 */

import bcryptjs from 'bcryptjs';
import { executeQuery } from '../server/config/database.js';
import logger from '../server/config/logger.js';
import readline from 'readline';

// Create readline interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Function to ask question and return promise
function askQuestion(question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer.trim());
    });
  });
}

// Function to ask for password (hidden input)
function askPassword(question) {
  return new Promise((resolve) => {
    process.stdout.write(question);
    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.setEncoding('utf8');
    
    let password = '';
    process.stdin.on('data', function(char) {
      char = char + '';
      switch (char) {
        case '\n':
        case '\r':
        case '\u0004':
          process.stdin.setRawMode(false);
          process.stdin.pause();
          process.stdout.write('\n');
          resolve(password);
          break;
        case '\u0003':
          process.exit();
          break;
        case '\u007f': // backspace
          if (password.length > 0) {
            password = password.slice(0, -1);
            process.stdout.write('\b \b');
          }
          break;
        default:
          password += char;
          process.stdout.write('*');
          break;
      }
    });
  });
}

async function createProductionAdminUser() {
  try {
    console.log('\n==========================================');
    console.log('Production Admin User Creation');
    console.log('==========================================');
    
    // Ask for user details
    const username = await askQuestion('Enter admin username: ');
    if (!username) {
      console.log('❌ Username is required');
      process.exit(1);
    }
    
    const email = await askQuestion('Enter admin email: ');
    if (!email) {
      console.log('❌ Email is required');
      process.exit(1);
    }
    
    const firstName = await askQuestion('Enter first name: ');
    const lastName = await askQuestion('Enter last name: ');
    
    const password = await askPassword('Enter admin password: ');
    if (!password) {
      console.log('❌ Password is required');
      process.exit(1);
    }
    
    const confirmPassword = await askPassword('Confirm password: ');
    if (password !== confirmPassword) {
      console.log('❌ Passwords do not match');
      process.exit(1);
    }
    
    console.log('\nCreating admin user...');
    logger.info(`Creating production admin user: ${username}...`);
    
    // Check if admin user already exists
    const existingUser = await executeQuery(
      'SELECT id FROM users WHERE email = $1 OR username = $2',
      [email, username]
    );
    
    if (existingUser.rows.length > 0) {
      logger.info(`Admin user ${username} already exists, updating password...`);
      
      // Update password for existing user
      const saltRounds = 10;
      const passwordHash = await bcryptjs.hash(password, saltRounds);
      
      await executeQuery(
        'UPDATE users SET password_hash = $1, role = $2, is_active = $3, email_verified = $4, first_name = $5, last_name = $6 WHERE username = $7',
        [passwordHash, 'admin', true, true, firstName || 'Admin', lastName || 'User', username]
      );
      
      console.log(`✅ Admin user ${username} password updated successfully`);
    } else {
      // Hash password
      const saltRounds = 10;
      const passwordHash = await bcryptjs.hash(password, saltRounds);
      
      // Create admin user
      const result = await executeQuery(`
        INSERT INTO users (username, email, password_hash, role, first_name, last_name, is_active, email_verified)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING id, username, email, role
      `, [
        username,
        email,
        passwordHash,
        'admin',
        firstName || 'Admin',
        lastName || 'User',
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
      [username]
    );
    
    if (verifyResult.rows.length > 0) {
      const user = verifyResult.rows[0];
      
      console.log('\n==========================================');
      console.log('Production Admin User Ready');
      console.log('==========================================');
      console.log('Username:', username);
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
  } finally {
    rl.close();
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
