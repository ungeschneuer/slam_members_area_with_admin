/**
 * Upload Error Constants
 * 
 * Standardized error messages for file upload operations
 * to ensure consistency across all upload endpoints.
 */

export const UPLOAD_ERRORS = {
  // General upload errors
  NO_FILE: 'No file uploaded',
  UPLOAD_FAILED: 'File upload failed',
  
  // File type errors
  INVALID_IMAGE_TYPE: 'Invalid file type. Only images are allowed.',
  INVALID_PDF_TYPE: 'Invalid file type. Only PDF files are allowed.',
  INVALID_FILE_TYPE: 'Invalid file type. Only images, PDFs, and text files are allowed.',
  
  // File size errors
  FILE_TOO_LARGE: 'File too large. Maximum size is 15MB.',
  FILE_TOO_SMALL: 'File too small. Minimum size is 1KB.',
  
  // Server errors
  SERVER_ERROR: 'Internal server error during file upload.',
  STORAGE_ERROR: 'Error storing file on server.',
  DATABASE_ERROR: 'Error updating database with file information.',
  
  // Validation errors
  INVALID_PAGE_ID: 'Invalid page ID provided.',
  PAGE_NOT_FOUND: 'Page not found.',
  UNAUTHORIZED: 'Unauthorized access to upload endpoint.',
  
  // File processing errors
  FILE_PROCESSING_ERROR: 'Error processing uploaded file.',
  FILE_CLEANUP_ERROR: 'Error cleaning up old files.',
  FILE_VALIDATION_ERROR: 'File validation failed.'
};

export const UPLOAD_SUCCESS_MESSAGES = {
  IMAGE_UPLOADED: 'Image uploaded successfully',
  PDF_UPLOADED: 'PDF uploaded successfully',
  FILE_UPLOADED: 'File uploaded successfully'
};

export const UPLOAD_FILE_TYPES = {
  IMAGE: 'image',
  PDF: 'pdf',
  DOCUMENT: 'document'
};

export const UPLOAD_LIMITS = {
  MAX_FILE_SIZE: 15 * 1024 * 1024, // 15MB
  MIN_FILE_SIZE: 1024, // 1KB
  ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  ALLOWED_PDF_TYPES: ['application/pdf'],
  ALLOWED_DOCUMENT_TYPES: ['text/plain', 'application/json']
};
