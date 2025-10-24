import express from 'express';
import * as Sentry from '@sentry/node';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import path from 'path';
import caseMonitor from './middleware/caseMonitor.js';
// Rate limiting configuration
import { rateLimitConfig } from './config/security.js';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import { createServer } from 'http';
// Socket.io removed - using simple polling instead

// Import database connection with optimizations
import { pool, checkDatabaseHealth } from './config/database.js';
import logger from './config/logger.js';

// Import new modular routes
import apiRoutes from './routes/index.js';
// Authentication routes moved to middleware pattern
import correlationIdMiddleware from './middleware/correlationId.js';

// Load environment variables from root directory
dotenv.config();

// Warn if using development secrets in production
if (process.env.NODE_ENV === 'production') {
  const devSecrets = ['development', 'dev_', 'test_'];
  const secrets = [process.env.JWT_SECRET, process.env.SESSION_SECRET, process.env.DB_PASSWORD];
  secrets.forEach((secret, idx) => {
    if (secret && devSecrets.some(dev => secret.toLowerCase().includes(dev))) {
      logger.warn(`⚠️  Production environment detected with development secret!`);
    }
  });
}

const app = express();
const server = createServer(app);
// Harden HTTP timeouts for graceful deploys/shutdowns
server.keepAliveTimeout = 65000; // allow keep-alive sockets to finish
server.headersTimeout = 66000;   // must be greater than keepAliveTimeout

// Initialize Sentry (no-op if DSN is missing)
if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    tracesSampleRate: parseFloat(process.env.SENTRY_TRACES_SAMPLE_RATE || '0.05'),
    environment: process.env.NODE_ENV || 'development'
  });
  // Support both Sentry v8 (expressRequestMiddleware) and older versions (Handlers.requestHandler)
  if (typeof Sentry.expressRequestMiddleware === 'function') {
    app.use(Sentry.expressRequestMiddleware());
  } else if (Sentry.Handlers && typeof Sentry.Handlers.requestHandler === 'function') {
    app.use(Sentry.Handlers.requestHandler());
  }
}
// Centralized CORS configuration
const getCorsConfig = () => {
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
    const devPorts = process.env.DEV_PORTS ? process.env.DEV_PORTS.split(',') : ['5173', '5174', '5178'];
    devPorts.forEach(port => {
      allowedOrigins.push(`http://localhost:${port}`);
      allowedOrigins.push(`http://127.0.0.1:${port}`);
    });
  }
  
  return {
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, curl, etc.)
      if (!origin) return callback(null, true);
      
      // Check if origin is in allowed list
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      
      // Additional development checks
      if (process.env.NODE_ENV === 'development' && 
          (origin.startsWith('http://localhost:') || origin.startsWith('http://127.0.0.1:'))) {
        return callback(null, true);
      }
      
      // For disallowed origins, don't set CORS headers but don't throw error
      return callback(null, false);
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
  };
};

// Socket.io origins function removed - using simple polling instead

// Socket.io server removed - using simple polling instead

const PORT = process.env.PORT || 3005;

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
  
  // Comprehensive crawler protection
  res.setHeader('X-Robots-Tag', 'noindex, nofollow, noarchive, nosnippet, noimageindex, notranslate, noyaca');
  
  next();
});

// Centralized rate limiting (CORS handled by cors middleware)
app.use('/api/', (req, res, next) => {
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

// Monitor for camelCase keys in request bodies
app.use(caseMonitor);

// Cookie parsing middleware
app.use(cookieParser());

// Correlation ID middleware for request tracing
app.use(correlationIdMiddleware);

// Compression middleware
app.use(compression());

// CORS configuration - Centralized and secure
app.use(cors(getCorsConfig()));

// CORS is now handled entirely by the cors middleware above

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
app.get('/health', async (req, res) => {
  const dbHealth = await checkDatabaseHealth();
  res.status(dbHealth.status === 'healthy' ? 200 : 503).json({
    status: dbHealth.status === 'healthy' ? 'OK' : 'DEGRADED',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    database: {
      status: dbHealth.status,
      pool: dbHealth.pool
    }
  });
});

// Liveness probe: process is running
app.get('/live', (req, res) => {
  res.status(200).json({ status: 'alive', timestamp: new Date().toISOString() });
});

// Readiness probe: dependencies healthy (DB)
app.get('/ready', async (req, res) => {
  const dbHealth = await checkDatabaseHealth();
  const ok = dbHealth.status === 'healthy';
  res.status(ok ? 200 : 503).json({
    status: ok ? 'ready' : 'not_ready',
    database: dbHealth,
    timestamp: new Date().toISOString()
  });
});

// All API endpoints are now handled by optimized routes

// Authentication handled through middleware in individual routes

// Static file serving for uploads with crawler protection
app.use('/uploads', (req, res, next) => {
  res.setHeader('X-Robots-Tag', 'noindex, nofollow, noarchive, nosnippet, noimageindex, notranslate, noyaca');
  next();
}, express.static(path.join(process.cwd(), 'public/uploads')));

// Use new modular routes as the primary API endpoints
app.use('/api', apiRoutes);

// WebSocket service removed - using simple polling instead

// Graceful shutdown
const gracefulShutdown = async (signal) => {
  logger.info(`${signal} received, shutting down gracefully`);
  try {
    // Flush Sentry if enabled
    if (process.env.SENTRY_DSN) {
      try { await Sentry.flush(2000); } catch (e) { /* ignore */ }
    }
    server.close(() => {
      logger.info('HTTP server closed');
      pool.end(() => {
        logger.info('Database pool drained');
        if (process.env.NODE_ENV !== 'test') {
          process.exit(0);
        }
      });
    });
    // Fallback timeout
    setTimeout(() => {
      logger.warn('Forcing shutdown after timeout');
      if (process.env.NODE_ENV !== 'test') {
        process.exit(1);
      }
    }, 10000);
  } catch (err) {
    logger.error('Error during graceful shutdown', { error: err.message });
    if (process.env.NODE_ENV !== 'test') {
      process.exit(1);
    }
  }
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Start server with error handling (skip listening in test)
if (process.env.NODE_ENV !== 'test') {
  server.listen(PORT, () => {
    logger.info(`✅ SLAM25 API Server running on port ${PORT}`);
    logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
    logger.info(`Database: ${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`);
    logger.info(`Max DB Connections: ${process.env.DB_MAX_CONNECTIONS || 'default'}`);
    logger.info(`Health check: http://localhost:${PORT}/health`);
    logger.info(`Simple polling enabled`);
    logger.info(`Database connection pooling optimized`);
  });

  // Add error handling for server startup
  server.on('error', (error) => {
    logger.error('Server error:', error);
    if (error.code === 'EADDRINUSE') {
      logger.error(`❌ Port ${PORT} is already in use`);
      logger.error(`💡 To fix this, run: npm run restart`);
      logger.error(`💡 Or manually kill the process: lsof -ti:${PORT} | xargs kill -9`);
      process.exit(1);
    }
  });
}

// Handle uncaught exceptions
process.on('uncaughtException', async (error) => {
  // Gracefully ignore EPIPE errors typically caused by logging to a closed pipe
  if (error && error.code === 'EPIPE') {
    logger.warn('Uncaught EPIPE during logging; ignoring');
    return;
  }
  logger.error('Uncaught Exception:', error);
  if (process.env.SENTRY_DSN) {
    try { Sentry.captureException(error); await Sentry.flush(2000); } catch (_) {}
  }
  if (process.env.NODE_ENV !== 'test') {
    gracefulShutdown('uncaughtException');
  }
});

process.on('unhandledRejection', async (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  if (process.env.SENTRY_DSN) {
    try { Sentry.captureException(reason instanceof Error ? reason : new Error(String(reason))); await Sentry.flush(2000); } catch (_) {}
  }
  if (process.env.NODE_ENV !== 'test') {
    gracefulShutdown('unhandledRejection');
  }
});

export default app;

// Malformed JSON handler: return consistent 400 with success:false
app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && 'body' in err) {
    return res.status(400).json({ success: false, error: 'Validation failed' });
  }
  return next(err);
});

// Sentry error handler should be last
if (process.env.SENTRY_DSN) {
  // Support both Sentry v8 (expressErrorHandler) and older versions (Handlers.errorHandler)
  if (typeof Sentry.expressErrorHandler === 'function') {
    app.use(Sentry.expressErrorHandler());
  } else if (Sentry.Handlers && typeof Sentry.Handlers.errorHandler === 'function') {
    app.use(Sentry.Handlers.errorHandler());
  }
}
