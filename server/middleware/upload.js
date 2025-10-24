import multer from 'multer';
import path from 'path';
import { fileUploadConfig } from '../config/security.js';

// Create storage configuration for uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Determine subdirectory based on route
    const subdir = req.baseUrl.includes('info-pages') ? 'info-pages' : 'news';
    const uploadPath = path.join(process.cwd(), 'public', 'uploads', subdir);
    cb(null, uploadPath);
  },
  filename: fileUploadConfig.filename
});

// Create multer instances for different routes
export const uploadInfoPageFile = multer({
  storage,
  limits: fileUploadConfig.limits,
  fileFilter: fileUploadConfig.fileFilter
});

export const uploadNewsFile = multer({
  storage,
  limits: fileUploadConfig.limits,
  fileFilter: fileUploadConfig.fileFilter
});

// Error handler middleware for multer errors
export const handleUploadError = (error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    switch (error.code) {
      case 'LIMIT_FILE_SIZE':
        return res.status(400).json({
          success: false,
          error: 'File too large. Maximum size is 5MB.'
        });
      case 'LIMIT_FILE_COUNT':
        return res.status(400).json({
          success: false,
          error: 'Too many files. Only one file allowed.'
        });
      default:
        return res.status(400).json({
          success: false,
          error: 'File upload error: ' + error.message
        });
    }
  }
  
  if (error.message === 'Invalid file type. Only images, PDFs, and text files are allowed.') {
    return res.status(400).json({
      success: false,
      error: 'Invalid file type. Only images and PDFs are allowed.'
    });
  }
  
  next(error);
};
