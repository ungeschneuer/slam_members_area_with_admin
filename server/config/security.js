// Security Configuration for SLAM25 Application
import rateLimit from 'express-rate-limit';
import crypto from 'crypto';

// Rate limiting configurations
export const rateLimitConfig = {
  // Single global API rate limiting
  general: rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: process.env.NODE_ENV === 'development' ? 10000 : 1000,
    message: {
      error: 'Too many requests from this IP, please try again later.',
      code: 'RATE_LIMIT_EXCEEDED',
      retryAfter: 900 // 15 minutes in seconds
    },
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => {
      // Only skip health checks
      return req.path === '/health' || req.path === '/api/health';
    }
  }),

  // Login-specific rate limiting (stricter)
  login: rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: process.env.NODE_ENV === 'development' ? 50 : 5, // 5 attempts per 15 minutes in production
    message: {
      error: 'Too many login attempts from this IP, please try again later.',
      code: 'LOGIN_RATE_LIMIT_EXCEEDED',
      retryAfter: 900 // 15 minutes in seconds
    },
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: true // Don't count successful logins
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

// CSP disabled - No content security policy limitations

// File upload security
export const fileUploadConfig = {
  limits: {
    fileSize: 15 * 1024 * 1024, // 15MB
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
  secret: process.env.SESSION_SECRET || (() => { console.warn('WARNING: SESSION_SECRET not set, using generated fallback. Set SESSION_SECRET in environment for production.'); return crypto.randomBytes(32).toString('hex'); })(),
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










