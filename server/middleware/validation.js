// Enhanced validation middleware for SLAM25 Application
import { body, param, query, validationResult } from 'express-validator';
import { executeQuery } from '../config/database.js';
import xss from 'xss';
import logger from '../config/logger.js';
import { validateRound, validateRoundPartial, roundSchema } from '../../shared/schemas/roundSchema.js';

// Generic validation error handler
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    logger.warn('Validation failed', {
      errors: errors.array(),
      body: req.body,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });
    
    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      code: 'VALIDATION_ERROR',
      details: errors.array().map(err => ({
        field: err.path,
        message: err.msg,
        value: err.value,
        location: err.location
      }))
    });
  }
  next();
};

// Enhanced validation for schnellzugriff links
export const validateSchnellzugriff = [
  body('title')
    .notEmpty()
    .withMessage('Title is required')
    .isLength({ min: 1, max: 255 })
    .withMessage('Title must be between 1 and 255 characters')
    .trim()
    .escape(),
  
  body('description')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Description must be less than 500 characters')
    .trim()
    .escape(),
  
  body('url')
    .isURL({ protocols: ['http', 'https'] })
    .withMessage('Valid URL is required')
    .trim(),
  
  body('icon')
    .optional()
    .isLength({ max: 10 })
    .withMessage('Icon must be less than 10 characters')
    .trim(),
  
  body('color')
    .optional()
    .isIn(['blue', 'purple', 'green', 'red', 'yellow', 'indigo', 'pink', 'orange', 'teal', 'cyan'])
    .withMessage('Color must be a valid color name')
    .trim(),
  
  body('sortOrder')
    .optional()
    .isInt({ min: 0, max: 9999 })
    .withMessage('Sort order must be between 0 and 9999'),
  
  body('isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive must be a boolean'),
  
  body('isExternal')
    .optional()
    .isBoolean()
    .withMessage('isExternal must be a boolean'),
  
  handleValidationErrors
];

// Enhanced validation for info pages
export const validateInfoPage = [
  body('title')
    .notEmpty()
    .withMessage('Title is required')
    .isLength({ min: 1, max: 255 })
    .withMessage('Title must be between 1 and 255 characters')
    .trim()
    .escape(),
  
  body('slug')
    .notEmpty()
    .withMessage('Slug is required')
    .matches(/^[a-z0-9-]+$/)
    .withMessage('Slug must contain only lowercase letters, numbers, and hyphens')
    .trim(),
  
  body('description')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Description must be less than 500 characters')
    .trim()
    .escape(),
  
  body('content')
    .notEmpty()
    .withMessage('Content is required')
    .isLength({ min: 10 })
    .withMessage('Content must be at least 10 characters')
    .trim(),
  
  body('excerpt')
    .optional()
    .isLength({ max: 300 })
    .withMessage('Excerpt must be less than 300 characters')
    .trim()
    .escape(),
  
  body('category')
    .optional()
    .isLength({ max: 100 })
    .withMessage('Category must be less than 100 characters')
    .trim()
    .escape(),
  
  body('order')
    .optional()
    .isInt({ min: 0, max: 9999 })
    .withMessage('Order must be between 0 and 9999'),
  
  body('status')
    .optional()
    .isIn(['draft', 'published', 'archived'])
    .withMessage('Status must be draft, published, or archived'),
  
  body('featured_image_url')
    .optional()
    .isURL({ protocols: ['http', 'https'] })
    .withMessage('Featured image URL must be a valid URL')
    .trim(),
  
  
  body('tags')
    .optional()
    .isArray()
    .withMessage('Tags must be an array'),
  
  
  body('published_at')
    .optional()
    .isISO8601()
    .withMessage('Published date must be a valid ISO 8601 date')
    .trim(),
  
  handleValidationErrors
];

// Enhanced validation for timetable entries
export const validateTimetableEntry = [
  body('title')
    .notEmpty()
    .withMessage('Title is required')
    .isLength({ min: 1, max: 255 })
    .withMessage('Title must be between 1 and 255 characters')
    .trim()
    .escape(),
  
  body('slug')
    .notEmpty()
    .withMessage('Slug is required')
    .matches(/^[a-z0-9-]+$/)
    .withMessage('Slug must contain only lowercase letters, numbers, and hyphens')
    .trim(),
  
  body('description')
    .optional()
    .isLength({ max: 1000 })
    .withMessage('Description must be less than 1000 characters')
    .trim()
    .escape(),
  
  body('location')
    .notEmpty()
    .withMessage('Location is required')
    .isLength({ min: 1, max: 255 })
    .withMessage('Location must be between 1 and 255 characters')
    .trim()
    .escape(),
  
  body('date')
    .isISO8601()
    .withMessage('Date must be a valid ISO 8601 date')
    .trim(),
  
  body('time')
    .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage('Time must be in HH:MM format')
    .trim(),
  
  body('end_time')
    .optional()
    .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage('End time must be in HH:MM format')
    .trim(),
  
  body('type')
    .notEmpty()
    .withMessage('Type is required')
    .isIn(['team-round', 'individual-round', 'workshop', 'fun', 'aftershow', 'panel', 'networking', 'general', 'technical', 'registration', 'party', 'celebration'])
    .withMessage('Type must be one of: team-round, individual-round, workshop, fun, aftershow, panel, networking, general, technical, registration, party, celebration'),
  
  body('status')
    .optional()
    .isIn(['confirmed', 'tentative', 'upcoming', 'active', 'completed', 'cancelled'])
    .withMessage('Status must be one of: confirmed, tentative, upcoming, active, completed, cancelled'),
  
  handleValidationErrors
];

import { getCategoryValues } from '../../shared/constants/cityTipsCategories.js';

// Enhanced validation for city tips
export const validateCityTip = [
  body('name')
    .notEmpty()
    .withMessage('Name is required')
    .isLength({ min: 1, max: 255 })
    .withMessage('Name must be between 1 and 255 characters')
    .trim(),
  
  body('description')
    .notEmpty()
    .withMessage('Description is required')
    .isLength({ min: 1, max: 1000 })
    .withMessage('Description must be between 1 and 1000 characters')
    .trim(),
  
  body('address')
    .optional()
    .isLength({ min: 0, max: 255 })
    .withMessage('Address must be between 0 and 255 characters')
    .trim(),
  
  body('category')
    .notEmpty()
    .withMessage('Category is required')
    .isIn(getCategoryValues())
    .withMessage(`Category must be one of: ${getCategoryValues().join(', ')}`),
  
  body('slug')
    .optional()
    .matches(/^[a-z0-9-]+$/)
    .withMessage('Slug must contain only lowercase letters, numbers, and hyphens')
    .trim(),
  
  body('latitude')
    .optional()
    .custom((value) => {
      if (value === '' || value === null || value === undefined) {
        return true; // Allow empty values
      }
      const num = parseFloat(value);
      return !isNaN(num) && num >= -90 && num <= 90;
    })
    .withMessage('Latitude must be between -90 and 90'),
  
  body('longitude')
    .optional()
    .custom((value) => {
      if (value === '' || value === null || value === undefined) {
        return true; // Allow empty values
      }
      const num = parseFloat(value);
      return !isNaN(num) && num >= -180 && num <= 180;
    })
    .withMessage('Longitude must be between -180 and 180'),
  
  // Add validation for all the fields the form actually sends
  body('phone')
    .optional()
    .isLength({ min: 0, max: 50 })
    .withMessage('Phone must be between 0 and 50 characters')
    .trim(),
  
  body('website')
    .optional({ checkFalsy: true })  // CRITICAL: Allow empty strings
    .custom((value) => {
      if (!value || value === '') return true;
      try {
        new URL(value);
        return true;
      } catch {
        return false;
      }
    })
    .withMessage('Website must be a valid URL')
    .trim(),
  
  body('price_range')
    .optional()
    .isLength({ min: 0, max: 10 })
    .withMessage('Price range must be between 0 and 10 characters')
    .trim(),
  
  // REMOVED: contact_info_email validation - client transforms this to contact_info object
  
  body('opening_hours')
    .optional()
    .isLength({ min: 0, max: 1000 })
    .withMessage('Opening hours must be between 0 and 1000 characters')
    .trim(),
  
  body('tips')
    .optional()
    .isLength({ min: 0, max: 2000 })
    .withMessage('Tips must be between 0 and 2000 characters')
    .trim(),
  
  handleValidationErrors
];

// Enhanced validation for countdown configuration
export const validateCountdownConfig = [
  body('title')
    .notEmpty()
    .withMessage('Title is required')
    .isLength({ min: 1, max: 255 })
    .withMessage('Title must be between 1 and 255 characters')
    .trim()
    .escape(),
  
  body('subtitle')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Subtitle must be less than 500 characters')
    .trim()
    .escape(),
  
  body('targetDate')
    .isISO8601()
    .withMessage('Target date must be a valid ISO 8601 date')
    .trim(),
  
  body('buttonText')
    .optional()
    .isLength({ max: 100 })
    .withMessage('Button text must be less than 100 characters')
    .trim()
    .escape(),
  
  body('buttonEmoji')
    .optional()
    .isLength({ max: 10 })
    .withMessage('Button emoji must be less than 10 characters')
    .trim(),
  
  body('buttonLink')
    .optional()
    .matches(/^\/[a-zA-Z0-9\/-]*$/)
    .withMessage('Button link must be a valid internal path')
    .trim(),
  
  body('isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive must be a boolean'),
  
  handleValidationErrors
];

// Sanitization middleware
export const sanitizeInput = (req, res, next) => {
  if (req.body) {
    // Recursively sanitize all string values
    const sanitizeObject = (obj) => {
      for (const key in obj) {
        if (typeof obj[key] === 'string') {
          obj[key] = xss(obj[key]);
        } else if (typeof obj[key] === 'object' && obj[key] !== null) {
          sanitizeObject(obj[key]);
        }
      }
    };
    
    sanitizeObject(req.body);
  }
  next();
};

// Rate limiting for admin operations
export const adminRateLimit = (req, res, next) => {
  // Simple rate limiting - in production, use redis-based rate limiting
  const now = Date.now();
  const windowMs = 15 * 60 * 1000; // 15 minutes
  const maxRequests = 100; // 100 requests per window
  
  if (!req.rateLimit) {
    req.rateLimit = {
      requests: [],
      windowStart: now
    };
  }
  
  // Clean old requests
  req.rateLimit.requests = req.rateLimit.requests.filter(
    timestamp => now - timestamp < windowMs
  );
  
  if (req.rateLimit.requests.length >= maxRequests) {
    return res.status(429).json({
      success: false,
      error: 'Too many requests',
      code: 'RATE_LIMIT_EXCEEDED',
      retryAfter: Math.ceil(windowMs / 1000)
    });
  }
  
  req.rateLimit.requests.push(now);
  next();
};

// ID validation middleware
export const validateSchnellzugriffId = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('ID must be a positive integer'),
  handleValidationErrors
];

export const validateTimetableEventId = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('ID must be a positive integer'),
  handleValidationErrors
];

export const validateCityTipId = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('ID must be a positive integer'),
  handleValidationErrors
];

export const validateTimetableEvent = validateTimetableEntry;

export { handleValidationErrors };