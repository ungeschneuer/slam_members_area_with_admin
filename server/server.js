import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
// Rate limiting configuration
import { rateLimitConfig } from './config/security.js';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { Server } from 'socket.io';

// Import database connection with optimizations
import { pool, checkDatabaseHealth } from './config/database.js';
import logger from './config/logger.js';

// Import new modular routes
import apiRoutes from './routes/index.js';
import cookieAuthRoutes from './routes/cookieAuth.js';

// Load environment variables from root directory
dotenv.config();

const app = express();
const server = createServer(app);
// Get allowed origins from environment variables
const getAllowedOrigins = () => {
  const origins = [
    'https://szene.slam25.de'
  ];
  
  // Add environment-specific origins
  if (process.env.FRONTEND_URL) {
    origins.push(process.env.FRONTEND_URL);
  }
  
  if (process.env.VITE_DEV_URL) {
    origins.push(process.env.VITE_DEV_URL);
  }
  
  if (process.env.VITE_ALT_URL) {
    origins.push(process.env.VITE_ALT_URL);
  }
  
  // Add development origins if in development mode
  if (process.env.NODE_ENV === 'development') {
    const devPorts = process.env.DEV_PORTS ? process.env.DEV_PORTS.split(',') : ['5173', '5174', '5178'];
    devPorts.forEach(port => {
      origins.push(`http://localhost:${port}`);
      origins.push(`http://127.0.0.1:${port}`);
    });
  }
  
  return origins;
};

const io = new Server(server, {
  cors: {
    origin: getAllowedOrigins(),
    methods: ['GET', 'POST'],
    credentials: true
  },
  transports: ['websocket', 'polling']
});

const PORT = process.env.PORT || 3001;

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "ws:", "wss:"],
      fontSrc: ["'self'", "https:"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  frameguard: { action: 'deny' },
  crossOriginEmbedderPolicy: false,
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));

// Trust proxy for accurate IP addresses
app.set('trust proxy', 1);

// Security headers
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  next();
});

// Handle OPTIONS requests for CORS preflight
app.options('/api/*', (req, res) => {
  const origin = req.headers.origin;
  if (origin) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  } else {
    res.setHeader('Access-Control-Allow-Origin', '*');
  }
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin, Access-Control-Request-Method, Access-Control-Request-Headers');
  res.setHeader('Access-Control-Expose-Headers', 'X-Total-Count, X-Rate-Limit-Remaining');
  res.status(200).end();
});

// Centralized rate limiting with CORS headers
app.use('/api/', (req, res, next) => {
  // Set CORS headers before rate limiting
  const origin = req.headers.origin;
  if (origin) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  } else {
    res.setHeader('Access-Control-Allow-Origin', '*');
  }
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin, Access-Control-Request-Method, Access-Control-Request-Headers');
  res.setHeader('Access-Control-Expose-Headers', 'X-Total-Count, X-Rate-Limit-Remaining');
  
  // Use development rate limiting in development mode
  const rateLimiter = process.env.NODE_ENV === 'development' 
    ? rateLimitConfig.development 
    : rateLimitConfig.general;
  
  rateLimiter(req, res, next);
});

// Body parsing middleware with security limits
app.use(express.json({ 
  limit: '10mb',
  verify: (req, res, buf) => {
    // Check for potential JSON injection
    if (buf && buf.length > 0) {
      const body = buf.toString();
      if (body.includes('__proto__') || body.includes('constructor')) {
        throw new Error('Potentially malicious JSON detected');
      }
    }
  }
}));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Cookie parsing middleware
app.use(cookieParser());

// Compression middleware
app.use(compression());

// CORS configuration - More permissive for development
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, etc.)
    if (!origin) return callback(null, true);
    
    const allowedOrigins = getAllowedOrigins();
    
    // Add additional development origins
    if (process.env.NODE_ENV === 'development') {
      const devPorts = process.env.DEV_PORTS ? process.env.DEV_PORTS.split(',') : ['3000', '3001', '5173', '5174', '5178', '8080'];
      devPorts.forEach(port => {
        allowedOrigins.push(`http://localhost:${port}`);
        allowedOrigins.push(`http://127.0.0.1:${port}`);
      });
    }
    
    if (allowedOrigins.includes(origin) || 
        (process.env.NODE_ENV === 'development' && origin.startsWith('http://localhost:')) ||
        (process.env.NODE_ENV === 'development' && origin.startsWith('http://127.0.0.1:'))) {
      return callback(null, true);
    }
    
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: [
    'Content-Type', 
    'Authorization', 
    'X-Requested-With', 
    'Accept', 
    'Origin',
    'Access-Control-Request-Method',
    'Access-Control-Request-Headers'
  ],
  exposedHeaders: ['X-Total-Count', 'X-Rate-Limit-Remaining'],
  optionsSuccessStatus: 200,
  preflightContinue: false
}));

// Global CORS middleware for all responses
app.use((req, res, next) => {
  // Set CORS headers for all responses
  const origin = req.headers.origin;
  if (origin) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  } else {
    res.setHeader('Access-Control-Allow-Origin', '*');
  }
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin, Access-Control-Request-Method, Access-Control-Request-Headers');
  res.setHeader('Access-Control-Expose-Headers', 'X-Total-Count, X-Rate-Limit-Remaining');
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  
  next();
});

// Logging middleware with safe stream to avoid EPIPE on aborted pipes
if (process.env.NODE_ENV !== 'test') {
  const safeStream = {
    write: (message) => {
      try {
        process.stdout.write(message);
      } catch (e) {
        if (e && e.code === 'EPIPE') {
          // Ignore broken pipe during logging
          return;
        }
        throw e;
      }
    }
  };
  app.use(morgan('combined', {
    stream: safeStream,
    skip: (req, res) => req.aborted === true
  }));
}

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
  });
});

// All API endpoints are now handled by optimized routes

// Mount cookie-based auth routes
app.use('/api/auth', cookieAuthRoutes);

// Use new modular routes as the primary API endpoints
app.use('/api', apiRoutes);

// Initialize enhanced Socket.io service
import { setSocketIO } from './services/websocketService.js';
setSocketIO(io);

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  pool.end();
  io.close();
  if (process.env.NODE_ENV !== 'test') {
    process.exit(0);
  }
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  pool.end();
  io.close();
  if (process.env.NODE_ENV !== 'test') {
    process.exit(0);
  }
});

// Start server with error handling (skip listening in test)
if (process.env.NODE_ENV !== 'test') {
  server.listen(PORT, () => {
    logger.info(`✅ SLAM25 API Server running on port ${PORT}`);
    logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
    logger.info(`Health check: http://localhost:${PORT}/health`);
    logger.info(`WebSocket server ready`);
    logger.info(`Database connection pooling optimized`);
  });

  // Add error handling for server startup
  server.on('error', (error) => {
    logger.error('Server error:', error);
    if (error.code === 'EADDRINUSE') {
      logger.error(`Port ${PORT} is already in use`);
      process.exit(1);
    }
  });
}

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  // Gracefully ignore EPIPE errors typically caused by logging to a closed pipe
  if (error && error.code === 'EPIPE') {
    logger.warn('Uncaught EPIPE during logging; ignoring');
    return;
  }
  logger.error('Uncaught Exception:', error);
  if (process.env.NODE_ENV !== 'test') {
    process.exit(1);
  }
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  if (process.env.NODE_ENV !== 'test') {
    process.exit(1);
  }
});

export default app;
