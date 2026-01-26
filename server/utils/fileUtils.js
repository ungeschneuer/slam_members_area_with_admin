import fs from 'fs';
import path from 'path';
import { promisify } from 'util';
import logger from '../config/logger.js';

const unlink = promisify(fs.unlink);
const exists = promisify(fs.exists);

/**
 * Safely delete a file without blocking the server
 * @param {string} filePath - Path to the file to delete
 * @returns {Promise<Object>} - { success: boolean, deleted: boolean, error?: { code: string, message: string, serious: boolean } }
 */
export async function safeDeleteFile(filePath) {
  try {
    if (!filePath) {
      return { success: false, deleted: false, error: { code: 'INVALID_PATH', message: 'No file path provided', serious: false } };
    }

    const fullPath = path.join(process.cwd(), 'public', filePath);

    const fileExists = await exists(fullPath);
    if (!fileExists) {
      // File doesn't exist - this is OK, not an error
      return { success: true, deleted: false };
    }

    await unlink(fullPath);
    return { success: true, deleted: true };

  } catch (error) {
    // Distinguish between different error types
    const errorCode = error.code;
    let serious = false;
    let errorType = 'UNKNOWN_ERROR';

    switch (errorCode) {
      case 'ENOENT':
        // File not found - benign (race condition, already deleted)
        errorType = 'FILE_NOT_FOUND';
        serious = false;
        break;
      case 'EACCES':
      case 'EPERM':
        // Permission denied - serious, indicates configuration issue
        errorType = 'PERMISSION_DENIED';
        serious = true;
        break;
      case 'EBUSY':
      case 'EMFILE':
      case 'ENFILE':
        // Resource busy or too many open files - serious
        errorType = 'RESOURCE_BUSY';
        serious = true;
        break;
      case 'ENOSPC':
        // No space left - serious
        errorType = 'NO_SPACE';
        serious = true;
        break;
      case 'EROFS':
        // Read-only file system - serious
        errorType = 'READ_ONLY_FS';
        serious = true;
        break;
      default:
        errorType = 'UNKNOWN_ERROR';
        serious = true;
    }

    // Log with appropriate level based on severity
    const logMessage = 'Error deleting file';
    const logContext = {
      filePath,
      errorCode,
      errorType,
      message: error.message,
      serious
    };

    if (serious) {
      logger.error(logMessage, logContext);
    } else {
      logger.warn(logMessage, logContext);
    }

    return {
      success: false,
      deleted: false,
      error: {
        code: errorType,
        message: error.message,
        serious
      }
    };
  }
}

/**
 * Clean up old files when uploading new ones
 * @param {string} oldFilePath - Path to the old file
 * @param {string} newFilePath - Path to the new file
 * @returns {Promise<Object>} - Result from safeDeleteFile
 */
export async function cleanupOldFile(oldFilePath, newFilePath) {
  // Only delete if it's a different file
  if (oldFilePath && oldFilePath !== newFilePath) {
    const result = await safeDeleteFile(oldFilePath);

    if (!result.success && result.error?.serious) {
      logger.warn('Serious error during old file cleanup', {
        oldFilePath,
        newFilePath,
        error: result.error
      });
    }

    return result;
  }

  return { success: true, deleted: false, skipped: true };
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
