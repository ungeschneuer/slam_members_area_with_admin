import fs from 'fs';
import path from 'path';
import { promisify } from 'util';

const unlink = promisify(fs.unlink);
const exists = promisify(fs.exists);

/**
 * Safely delete a file without blocking the server
 * @param {string} filePath - Path to the file to delete
 * @returns {Promise<boolean>} - True if file was deleted, false if it didn't exist
 */
export async function safeDeleteFile(filePath) {
  try {
    if (!filePath) return false;
    
    const fullPath = path.join(process.cwd(), 'public', filePath);
    
    if (await exists(fullPath)) {
      await unlink(fullPath);
      return true;
    }
    
    return false;
  } catch (error) {
    // Log error but don't throw - file cleanup is not critical
    console.error('Error deleting file:', filePath, error.message);
    return false;
  }
}

/**
 * Clean up old files when uploading new ones
 * @param {string} oldFilePath - Path to the old file
 * @param {string} newFilePath - Path to the new file
 */
export async function cleanupOldFile(oldFilePath, newFilePath) {
  // Only delete if it's a different file
  if (oldFilePath && oldFilePath !== newFilePath) {
    await safeDeleteFile(oldFilePath);
  }
}

/**
 * Validate file type and size
 * @param {Object} file - Multer file object
 * @param {Object} options - Validation options
 * @returns {Object} - Validation result
 */
export function validateFile(file, options = {}) {
  const {
    maxSize = 15 * 1024 * 1024, // 15MB default
    allowedTypes = ['application/pdf'],
    allowedExtensions = ['.pdf']
  } = options;

  const errors = [];

  // Check file size
  if (file.size > maxSize) {
    errors.push(`File size exceeds ${Math.round(maxSize / (1024 * 1024))}MB limit`);
  }

  // Check MIME type
  if (!allowedTypes.includes(file.mimetype)) {
    errors.push(`Invalid file type. Expected: ${allowedTypes.join(', ')}`);
  }

  // Check file extension
  const ext = path.extname(file.originalname).toLowerCase();
  if (!allowedExtensions.includes(ext)) {
    errors.push(`Invalid file extension. Expected: ${allowedExtensions.join(', ')}`);
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}
