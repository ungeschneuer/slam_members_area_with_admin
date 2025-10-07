/**
 * Test Setup and Database Management for Admin CRUD Tests
 * Provides authentication, database cleanup, and test data management
 */

import dotenv from 'dotenv';
import { executeQuery } from '../../config/database.js';
import bcrypt from 'bcrypt';
import { generateToken } from '../../middleware/cookieAuth.js';

// Load environment variables for tests
dotenv.config();

/**
 * Create a test admin user in the database
 * @returns {Promise<Object>} Created admin user
 */
export async function createTestAdmin() {
  const timestamp = Date.now();
  const username = `testadmin_${timestamp}`;
  const email = `test_${timestamp}@slam25.de`;
  
  const password = await bcrypt.hash('testpass123', 10);
  const result = await executeQuery(
    `INSERT INTO users (username, email, password_hash, role, first_name, last_name, is_active)
     VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
    [username, email, password, 'admin', 'Test', 'Admin', true]
  );
  return result.rows[0];
}

/**
 * Generate authentication token for test user
 * @param {number} userId - User ID
 * @param {string} role - User role
 * @returns {Promise<string>} JWT token
 */
export async function getAuthToken(userId, role = 'admin') {
  return generateToken({ userId, role });
}

/**
 * Create authentication cookie string for requests
 * @param {string} token - JWT token
 * @returns {string} Cookie string
 */
export function getAuthCookie(token) {
  return `slam25_auth=${token}`;
}

/**
 * Clean up all test data from database
 * Removes data in reverse dependency order to avoid foreign key constraints
 */
export async function cleanupTestData() {
  try {
    // Clean up junction tables first
    await executeQuery('DELETE FROM round_participants WHERE 1=1');
    await executeQuery('DELETE FROM round_crew WHERE 1=1');
    await executeQuery('DELETE FROM round_feature_artists WHERE 1=1');
    await executeQuery('DELETE FROM timetable_participants WHERE 1=1');
    
    // Clean up main entities
    await executeQuery('DELETE FROM rounds WHERE title LIKE \'%TEST%\'');
    await executeQuery('DELETE FROM participants WHERE name LIKE \'%TEST%\'');
    await executeQuery('DELETE FROM news WHERE title LIKE \'%TEST%\'');
    await executeQuery('DELETE FROM timetable_entries WHERE title LIKE \'%TEST%\'');
    await executeQuery('DELETE FROM city_tips WHERE name LIKE \'%TEST%\'');
    await executeQuery('DELETE FROM info_pages WHERE title LIKE \'%TEST%\'');
    
    // Clean up test users (more specific pattern)
    await executeQuery('DELETE FROM users WHERE username LIKE \'testadmin_%\' OR username LIKE \'%test%\'');
  } catch (error) {
    console.error('Error during test cleanup:', error);
    // Don't throw - cleanup should be best effort
  }
}

/**
 * Reset database state between tests
 * More targeted cleanup for individual test runs
 */
export async function resetTestData() {
  try {
    // Clean up only test data with specific patterns
    await executeQuery('DELETE FROM round_participants WHERE participant_id IN (SELECT id FROM participants WHERE name LIKE \'%TEST%\')');
    await executeQuery('DELETE FROM round_crew WHERE participant_id IN (SELECT id FROM participants WHERE name LIKE \'%TEST%\')');
    await executeQuery('DELETE FROM round_feature_artists WHERE participant_id IN (SELECT id FROM participants WHERE name LIKE \'%TEST%\')');
    await executeQuery('DELETE FROM timetable_participants WHERE participant_id IN (SELECT id FROM participants WHERE name LIKE \'%TEST%\')');
    
    await executeQuery('DELETE FROM rounds WHERE title LIKE \'%TEST%\'');
    await executeQuery('DELETE FROM participants WHERE name LIKE \'%TEST%\'');
    await executeQuery('DELETE FROM news WHERE title LIKE \'%TEST%\'');
    await executeQuery('DELETE FROM timetable_entries WHERE title LIKE \'%TEST%\'');
    await executeQuery('DELETE FROM city_tips WHERE name LIKE \'%TEST%\'');
    await executeQuery('DELETE FROM info_pages WHERE title LIKE \'%TEST%\'');
    
    // Clean up test users created in this session
    await executeQuery('DELETE FROM users WHERE username LIKE \'testadmin_%\'');
  } catch (error) {
    console.error('Error during test reset:', error);
  }
}

/**
 * Verify database connection is working
 * @returns {Promise<boolean>} True if connection is healthy
 */
export async function verifyDatabaseConnection() {
  try {
    await executeQuery('SELECT 1');
    return true;
  } catch (error) {
    console.error('Database connection failed:', error);
    return false;
  }
}

/**
 * Get current timestamp for unique test data
 * @returns {string} Current timestamp
 */
export function getTestTimestamp() {
  return Date.now().toString();
}

/**
 * Generate unique test identifier
 * @param {string} prefix - Prefix for the identifier
 * @returns {string} Unique test identifier
 */
export function generateTestId(prefix = 'TEST') {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}
