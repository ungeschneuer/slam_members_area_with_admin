// Security Configuration for SLAM25 Application
import rateLimit from 'express-rate-limit';

// Rate limiting configurations
export const rateLimitConfig = {
  // General API rate limiting
  general: rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: process.env.NODE_ENV === 'development' ? 1000 : 100, // More permissive in development
    message: {
      error: 'Too many requests from this IP, please try again later.',
      code: 'RATE_LIMIT_EXCEEDED',
      retryAfter: 900 // 15 minutes in seconds
    },
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => {
      // Skip rate limiting for health checks and development
      return req.path === '/health' || 
             req.path === '/api/health' ||
             (process.env.NODE_ENV === 'development' && req.path.startsWith('/api/'));
    }
  }),

  // Strict rate limiting for authentication
  auth: rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // limit each IP to 5 requests per windowMs
    message: {
      error: 'Too many authentication attempts, please try again later.',
      code: 'AUTH_RATE_LIMIT_EXCEEDED',
      retryAfter: 900
    },
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: true
  }),

  // Rate limiting for admin operations
  admin: rateLimit({
    windowMs: 5 * 60 * 1000, // 5 minutes
    max: 20, // limit each IP to 20 requests per windowMs
    message: {
      error: 'Too many admin requests, please slow down.',
      code: 'ADMIN_RATE_LIMIT_EXCEEDED',
      retryAfter: 300
    },
    standardHeaders: true,
    legacyHeaders: false
  }),

  // Rate limiting for file uploads
  upload: rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 5, // limit each IP to 5 uploads per minute
    message: {
      error: 'Too many file uploads, please wait before trying again.',
      code: 'UPLOAD_RATE_LIMIT_EXCEEDED',
      retryAfter: 60
    },
    standardHeaders: true,
    legacyHeaders: false
  }),

  // Rate limiting for search operations
  search: rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: process.env.NODE_ENV === 'development' ? 1000 : 30, // More permissive in development
    message: {
      error: 'Too many search requests, please slow down.',
      code: 'SEARCH_RATE_LIMIT_EXCEEDED',
      retryAfter: 60
    },
    standardHeaders: true,
    legacyHeaders: false
  }),

  // Development-specific rate limiting (very permissive)
  development: rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 10000, // Very high limit for development
    message: {
      error: 'Development rate limit exceeded.',
      code: 'DEV_RATE_LIMIT_EXCEEDED',
      retryAfter: 60
    },
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => {
      return process.env.NODE_ENV !== 'development';
    }
  })
};

// Security headers configuration
export const securityHeaders = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'geolocation=(), microphone=(), camera=(), payment=(), usb=()',
  'Cross-Origin-Embedder-Policy': 'require-corp',
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Cross-Origin-Resource-Policy': 'same-origin'
};

// CORS configuration
export const corsConfig = {
  origin: (origin, callback) => {
    const allowedOrigins = [
      'https://szene.slam25.de'
    ];

    // Add environment-specific origins
    if (process.env.FRONTEND_URL) {
      allowedOrigins.push(process.env.FRONTEND_URL);
    }
    
    if (process.env.VITE_DEV_URL) {
      allowedOrigins.push(process.env.VITE_DEV_URL);
    }
    
    if (process.env.VITE_ALT_URL) {
      allowedOrigins.push(process.env.VITE_ALT_URL);
    }

    // Add development origins if in development mode
    if (process.env.NODE_ENV === 'development') {
      const devPorts = process.env.DEV_PORTS ? process.env.DEV_PORTS.split(',') : ['5173', '5174', '3005'];
      devPorts.forEach(port => {
        allowedOrigins.push(`http://localhost:${port}`);
        allowedOrigins.push(`http://127.0.0.1:${port}`);
      });
    }

    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);

    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: [
    'Origin',
    'X-Requested-With',
    'Content-Type',
    'Accept',
    'Authorization',
    'Cache-Control',
    'Pragma'
  ],
  exposedHeaders: ['X-Total-Count', 'X-Page-Count'],
  maxAge: 86400 // 24 hours
};

// Content Security Policy
export const cspConfig = {
  directives: {
    defaultSrc: ["'self'"],
    styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
    scriptSrc: ["'self'", "https://szene.slam25.de"],
    imgSrc: ["'self'", "data:", "https:", "blob:"],
    connectSrc: ["'self'", "ws:", "wss:", "https://szene.slam25.de"],
    fontSrc: ["'self'", "https://fonts.gstatic.com"],
    objectSrc: ["'none'"],
    mediaSrc: ["'self'"],
    frameSrc: ["'none'"],
    workerSrc: ["'self'", "blob:"],
    manifestSrc: ["'self'"],
    baseUri: ["'self'"],
    formAction: ["'self'"],
    frameAncestors: ["'none'"],
    upgradeInsecureRequests: []
  },
  reportOnly: false
};

// File upload security
export const fileUploadConfig = {
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
    files: 5, // Maximum 5 files per request
    fields: 10, // Maximum 10 fields per request
    fieldSize: 1024 * 1024, // 1MB per field
    headerPairs: 2000 // Maximum 2000 header pairs
  },
  fileFilter: (req, file, cb) => {
    // Allowed file types
    const allowedTypes = [
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'application/pdf',
      'text/plain',
      'application/json'
    ];

    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only images, PDFs, and text files are allowed.'));
    }
  },
  filename: (req, file, cb) => {
    // Generate secure filename
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 15);
    const extension = file.originalname.split('.').pop();
    cb(null, `${timestamp}_${randomString}.${extension}`);
  }
};

// Session security
export const sessionConfig = {
  name: 'slam25.sid',
  secret: process.env.SESSION_SECRET || 'slam25_session_secret_key_2025',
  resave: false,
  saveUninitialized: false,
  rolling: true,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    sameSite: 'strict',
    domain: process.env.NODE_ENV === 'production' ? '.slam25.de' : undefined
  }
};

// Password requirements
export const passwordRequirements = {
  minLength: 8,
  maxLength: 128,
  requireUppercase: true,
  requireLowercase: true,
  requireNumbers: true,
  requireSpecialChars: false,
  forbiddenPatterns: [
    /password/i,
    /123456/,
    /qwerty/i,
    /admin/i,
    /user/i
  ]
};

// Input sanitization rules
export const sanitizationRules = {
  maxStringLength: 10000,
  maxArrayLength: 1000,
  maxObjectDepth: 10,
  allowedHtmlTags: [],
  stripHtml: true,
  normalizeWhitespace: true,
  trimStrings: true
};

// Database security
export const databaseSecurity = {
  maxQueryTime: 30000, // 30 seconds
  maxConnections: 20,
  connectionTimeout: 10000, // 10 seconds
  queryTimeout: 30000, // 30 seconds
  enableSSL: process.env.NODE_ENV === 'production',
  sslMode: 'require'
};

// Logging security
export const loggingConfig = {
  logLevel: process.env.LOG_LEVEL || 'info',
  logSensitiveData: false,
  redactFields: [
    'password',
    'passwordHash',
    'token',
    'secret',
    'key',
    'authorization',
    'cookie'
  ],
  maxLogSize: 10 * 1024 * 1024, // 10MB
  maxLogFiles: 5
};

// API security
export const apiSecurity = {
  maxRequestSize: 10 * 1024 * 1024, // 10MB
  maxUrlLength: 2048,
  maxHeaderSize: 8192,
  timeout: 30000, // 30 seconds
  enableCompression: true,
  enableCaching: true,
  cacheMaxAge: 300 // 5 minutes
};

// Environment-specific security settings
export const getSecurityConfig = () => {
  const isProduction = process.env.NODE_ENV === 'production';
  
  return {
    isProduction,
    enableHSTS: isProduction,
    enableCSP: true,
    enableCORS: true,
    enableRateLimiting: true,
    enableInputValidation: true,
    enableXSSProtection: true,
    enableCSRFProtection: isProduction,
    enableSecurityHeaders: true,
    enableRequestLogging: isProduction,
    enableErrorLogging: true
  };
};









