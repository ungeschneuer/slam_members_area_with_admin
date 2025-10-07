// Validation Middleware for SLAM25 Application
import { body, param, query, validationResult } from 'express-validator';
import { executeQuery } from '../config/database.js';
import xss from 'xss';
import logger from '../config/logger.js';

// Generic validation error handler
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Validation failed',
      code: 'VALIDATION_ERROR',
      details: errors.array().map(err => ({
        field: err.path,
        message: err.msg,
        value: err.value
      }))
    });
  }
  next();
};

// Sanitize input to prevent XSS using proven library
const sanitizeInput = (req, res, next) => {
  try {
    const sanitize = (obj) => {
      if (typeof obj === 'string') {
        return xss(obj, {
          whiteList: {}, // Remove all HTML tags
          stripIgnoreTag: true,
          stripIgnoreTagBody: ['script', 'style'],
          css: false, // Disable CSS
          allowList: {}, // No allowed tags
          onTag: function(tag, html, options) {
            // Log suspicious tags for security monitoring
            if (['script', 'iframe', 'object', 'embed', 'form'].includes(tag)) {
              logger.warn('Suspicious HTML tag detected', {
                tag,
                ip: req.ip,
                userAgent: req.get('User-Agent'),
                url: req.url
              });
            }
            return ''; // Remove all tags
          }
        });
      }
      if (typeof obj === 'object' && obj !== null) {
        const sanitized = {};
        for (const key in obj) {
          sanitized[key] = sanitize(obj[key]);
        }
        return sanitized;
      }
      return obj;
    };

    req.body = sanitize(req.body);
    req.query = sanitize(req.query);
    req.params = sanitize(req.params);
    
    next();
  } catch (error) {
    logger.error('Input sanitization failed', {
      error: error.message,
      ip: req.ip,
      url: req.url
    });
    res.status(400).json({
      error: 'Invalid input detected',
      code: 'SANITIZATION_ERROR'
    });
  }
};

// Removed custom Map-based rate limiter; use centralized express-rate-limit in security config

// Validation rules for participants
const validateParticipant = [
  body('name')
    .isLength({ min: 2, max: 255 })
    .withMessage('Name must be between 2 and 255 characters')
    .matches(/^[a-zA-ZäöüßÄÖÜ\s\-'\.]+$/)
    .withMessage('Name contains invalid characters'),
  
  body('role')
    .isLength({ min: 2, max: 100 })
    .withMessage('Role must be between 2 and 100 characters')
    .isIn(['Teilnehmer*in', 'Jury', 'Organisator', 'Moderator', 'Technik'])
    .withMessage('Invalid role'),
  
  body('region')
    .isLength({ min: 2, max: 100 })
    .withMessage('Region must be between 2 and 100 characters')
    .matches(/^[a-zA-ZäöüßÄÖÜ\s\-]+$/)
    .withMessage('Region contains invalid characters'),
  
  body('pronouns')
    .optional()
    .isLength({ max: 50 })
    .withMessage('Pronouns must be less than 50 characters')
    .matches(/^[a-zA-ZäöüßÄÖÜ\/\s]+$/)
    .withMessage('Pronouns contains invalid characters'),
  
  body('instagram')
    .optional()
    .isLength({ max: 255 })
    .withMessage('Instagram handle must be less than 255 characters')
    .matches(/^@?[a-zA-Z0-9._]+$/)
    .withMessage('Invalid Instagram handle format')
];

// Validation rules for rounds
const validateRound = [
  body('title')
    .isLength({ min: 3, max: 255 })
    .withMessage('Title must be between 3 and 255 characters')
    .matches(/^[a-zA-ZäöüßÄÖÜ0-9\s\-'\.]+$/)
    .withMessage('Title contains invalid characters'),
  
  body('date')
    .isISO8601()
    .withMessage('Date must be a valid ISO 8601 date')
    .custom((value) => {
      const date = new Date(value);
      const now = new Date();
      if (date < now.setHours(0, 0, 0, 0)) {
        throw new Error('Date must be today or in the future');
      }
      return true;
    }),
  
  body('startTime')
    .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage('Start time must be in HH:MM format'),
  
  body('endTime')
    .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage('End time must be in HH:MM format')
    .custom((value, { req }) => {
      if (req.body.startTime && value <= req.body.startTime) {
        throw new Error('End time must be after start time');
      }
      return true;
    }),
  
  body('location')
    .isLength({ min: 3, max: 255 })
    .withMessage('Location must be between 3 and 255 characters'),
  
  body('address')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Address must be less than 500 characters'),
  
  body('description')
    .optional()
    .isLength({ max: 2000 })
    .withMessage('Description must be less than 2000 characters'),
  
  body('competitionType')
    .optional()
    .isIn(['Einzelwettbewerb', 'Teamwettbewerb', 'Show', 'Workshop'])
    .withMessage('Invalid competition type'),
  
  // Status is now calculated automatically based on date and time
  // No validation needed for status field
];

// Validation rules for news
const validateNews = [
  body('title')
    .isLength({ min: 3, max: 255 })
    .withMessage('Title must be between 3 and 255 characters')
    .matches(/^[a-zA-ZäöüßÄÖÜ0-9\s\-'\.!?]+$/)
    .withMessage('Title contains invalid characters'),
  
  body('content')
    .isLength({ min: 10, max: 10000 })
    .withMessage('Content must be between 10 and 10000 characters'),
  
  body('excerpt')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Excerpt must be less than 500 characters'),
  
  body('category')
    .optional()
    .isIn(['announcement', 'news', 'update', 'event', 'rule'])
    .withMessage('Invalid category'),
  
  body('priority')
    .optional()
    .isIn(['LOW', 'NORMAL', 'HIGH', 'URGENT'])
    .withMessage('Invalid priority'),
  
  body('status')
    .optional()
    .isIn(['DRAFT', 'PUBLISHED', 'ARCHIVED'])
    .withMessage('Invalid status'),
  
  body('tags')
    .optional()
    .isArray()
    .withMessage('Tags must be an array')
    .custom((tags) => {
      if (tags && tags.length > 10) {
        throw new Error('Maximum 10 tags allowed');
      }
      if (tags) {
        for (const tag of tags) {
          if (typeof tag !== 'string' || tag.length > 50) {
            throw new Error('Each tag must be a string with max 50 characters');
          }
        }
      }
      return true;
    })
];

// Validation rules for timetable entries
const validateTimetableEntry = [
  body('title')
    .isLength({ min: 3, max: 255 })
    .withMessage('Title must be between 3 and 255 characters'),
  
  body('description')
    .optional()
    .isLength({ max: 1000 })
    .withMessage('Description must be less than 1000 characters'),
  
  body('location')
    .optional()
    .isLength({ max: 255 })
    .withMessage('Location must be less than 255 characters'),
  
  body('date')
    .isISO8601()
    .withMessage('Date must be a valid ISO 8601 date'),
  
  body('time')
    .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage('Time must be in HH:MM format'),
  
  body('type')
    .optional()
    .isIn(['general', 'team-round', 'individual-round', 'workshop', 'fun', 'aftershow'])
    .withMessage('Invalid event type'),
  
  body('status')
    .optional()
    .isIn(['confirmed', 'tentative', 'cancelled'])
    .withMessage('Invalid status')
];

// Validation rules for city tips
const validateCityTip = [
  body('name')
    .isLength({ min: 3, max: 255 })
    .withMessage('Name must be between 3 and 255 characters'),
  
  body('category')
    .isIn(['restaurant', 'cafe', 'bar', 'culture', 'shopping', 'hotel', 'transport'])
    .withMessage('Invalid category'),
  
  body('description')
    .optional()
    .isLength({ max: 1000 })
    .withMessage('Description must be less than 1000 characters'),
  
  body('address')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Address must be less than 500 characters'),
  
  body('latitude')
    .optional()
    .isFloat({ min: -90, max: 90 })
    .withMessage('Latitude must be between -90 and 90'),
  
  body('longitude')
    .optional()
    .isFloat({ min: -180, max: 180 })
    .withMessage('Longitude must be between -180 and 180'),
  
  
  
  body('priceRange')
    .optional()
    .isIn(['€', '€€', '€€€', '€€€€'])
    .withMessage('Invalid price range')
];

// Validation rules for search queries
const validateSearch = [
  query('q')
    .isLength({ min: 2, max: 100 })
    .withMessage('Search query must be between 2 and 100 characters')
    .matches(/^[a-zA-ZäöüßÄÖÜ0-9\s\-'\.]+$/)
    .withMessage('Search query contains invalid characters'),
  
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  
  query('offset')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Offset must be a positive integer')
];

// Validation rules for ID parameters
const validateId = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('ID must be a positive integer')
];

// Check if resource exists
const checkResourceExists = (tableName, idParam = 'id') => {
  return async (req, res, next) => {
    try {
      const id = req.params[idParam];
      const result = await executeQuery(
        `SELECT id FROM ${tableName} WHERE id = $1`,
        [id]
      );
      
      if (result.rows.length === 0) {
        return res.status(404).json({
          error: `${tableName.slice(0, -1)} not found`,
          code: 'RESOURCE_NOT_FOUND'
        });
      }
      
      next();
    } catch (error) {
      console.error('Resource existence check failed:', error);
      res.status(500).json({
        error: 'Internal server error',
        code: 'RESOURCE_CHECK_ERROR'
      });
    }
  };
};

// Validate file uploads
const validateFileUpload = (allowedTypes, maxSize) => {
  return (req, res, next) => {
    if (!req.file) {
      return res.status(400).json({
        error: 'No file uploaded',
        code: 'NO_FILE'
      });
    }
    
    if (!allowedTypes.includes(req.file.mimetype)) {
      return res.status(400).json({
        error: 'Invalid file type',
        code: 'INVALID_FILE_TYPE',
        allowedTypes
      });
    }
    
    if (req.file.size > maxSize) {
      return res.status(400).json({
        error: 'File too large',
        code: 'FILE_TOO_LARGE',
        maxSize: maxSize
      });
    }
    
    next();
  };
};

// Validate JSON data
const validateJSON = (req, res, next) => {
  if (req.body && typeof req.body === 'object') {
    try {
      // Check for circular references
      JSON.stringify(req.body);
      next();
    } catch (error) {
      return res.status(400).json({
        error: 'Invalid JSON data',
        code: 'INVALID_JSON'
      });
    }
  } else {
    next();
  }
};

// Validate pagination
const validatePagination = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100')
];

// Validate sort parameters
const validateSort = (allowedFields) => [
  query('sort')
    .optional()
    .isIn(allowedFields)
    .withMessage(`Sort field must be one of: ${allowedFields.join(', ')}`),
  
  query('order')
    .optional()
    .isIn(['asc', 'desc'])
    .withMessage('Order must be either asc or desc')
];

export {
  handleValidationErrors,
  sanitizeInput,
  validateParticipant,
  validateRound,
  validateNews,
  validateTimetableEntry,
  validateCityTip,
  validateSearch,
  validateId,
  checkResourceExists,
  validateFileUpload,
  validateJSON,
  validatePagination,
  validateSort
};
