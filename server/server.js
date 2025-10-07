import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { createServer } from 'http';
import { Server } from 'socket.io';

// Import routes
import authRoutes from './routes/auth.js';
import userRoutes from './routes/users.js';
import sessionRoutes from './routes/sessions.js';
import competitionRoutes from './routes/competitions.js';
import participantRoutes from './routes/participants.js';
import roundRoutes from './routes/rounds.js';
import newsRoutes from './routes/news.js';
import timetableRoutes from './routes/timetable.js';
import contentRoutes from './routes/content.js';
import eventRoutes from './routes/events.js';
import cityTipRoutes from './routes/cityTips.js';
import infoPageRoutes from './routes/infoPages.js';
import pushNotificationRoutes from './routes/pushNotifications.js';
import analyticsRoutes from './routes/analytics.js';
import auditRoutes from './routes/audit.js';
import healthRoutes from './routes/health.js';
import maintenanceRoutes from './routes/maintenance.js';
import backupRoutes from './routes/backup.js';
import statsRoutes from './routes/stats.js';
import searchRoutes from './routes/search.js';
import exportRoutes from './routes/export.js';
import integrityRoutes from './routes/integrity.js';

// Import database connection
import { pool } from './config/database.js';
import { setSocketIO } from './services/websocketService.js';

// Import new services
import { sessionManager } from './config/redis.js';
import monitoringService from './services/monitoring.js';
import incidentResponseService from './services/incidentResponse.js';
import tokenRevocationService from './services/tokenRevocation.js';
import gdprService from './services/gdprService.js';
import backupService from './services/backupService.js';
import logger from './config/logger.js';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || ['http://localhost:5173', 'http://localhost:5174'],
    methods: ['GET', 'POST'],
    credentials: true
  }
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
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  next();
});

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', limiter);

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

// Input sanitization middleware
import { sanitizeInput, validateJSON } from './middleware/validation.js';
app.use(sanitizeInput);
app.use(validateJSON);

// Compression middleware
app.use(compression());

// CORS configuration
app.use(cors({
  origin: process.env.FRONTEND_URL || ['http://localhost:5173', 'http://localhost:5174'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Logging middleware
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('combined'));
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

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/sessions', sessionRoutes);
app.use('/api/competitions', competitionRoutes);
app.use('/api/participants', participantRoutes);
app.use('/api/rounds', roundRoutes);
app.use('/api/news', newsRoutes);
app.use('/api/timetable', timetableRoutes);
app.use('/api/content', contentRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/city-tips', cityTipRoutes);
app.use('/api/info-pages', infoPageRoutes);
app.use('/api/push-notifications', pushNotificationRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/audit-log', auditRoutes);
app.use('/api/health', healthRoutes);
app.use('/api/maintenance', maintenanceRoutes);
app.use('/api/backup', backupRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/export', exportRoutes);
app.use('/api/integrity', integrityRoutes);

// Round participants route (special case)
app.use('/api/round-participants', (req, res, next) => {
  // This will be handled by the rounds route
  next();
});

// Error handling middleware
app.use((err, req, res, next) => {
  logger.error('Error:', err);

  // Database connection errors
  if (err.code === 'ECONNREFUSED') {
    return res.status(503).json({
      error: 'Database connection failed',
      message: 'The database is currently unavailable',
      code: 'DATABASE_UNAVAILABLE',
    });
  }

  // Validation errors
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      error: 'Validation Error',
      message: err.message,
      code: 'VALIDATION_ERROR',
    });
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      error: 'Invalid Token',
      message: 'The provided token is invalid',
      code: 'INVALID_TOKEN',
    });
  }

  // Default error response
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error',
    code: err.code || 'INTERNAL_ERROR',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.originalUrl} not found`,
    code: 'ROUTE_NOT_FOUND',
  });
});

// Set Socket.IO instance for WebSocket service
setSocketIO(io);

// Socket.IO event handlers
io.on('connection', (socket) => {
  logger.info('Client connected:', socket.id);

  // Join admin room for admin-specific updates
  socket.on('join-admin', () => {
    socket.join('admin');
    logger.info('Client joined admin room:', socket.id);
  });

  // Join member room for member-specific updates
  socket.on('join-member', () => {
    socket.join('member');
    logger.info('Client joined member room:', socket.id);
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    logger.info('Client disconnected:', socket.id);
  });
});

// WebSocket event emitter function


// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  pool.end();
  io.close();
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  pool.end();
  io.close();
  process.exit(0);
});

// Initialize services
const initializeServices = async () => {
  try {
    // Initialize Redis connection
    await sessionManager.redis.ping();
    logger.info('Redis connection established');
    
    // Start monitoring service
    logger.info('Monitoring service started');
    
    // Initialize GDPR service
    logger.info('GDPR service initialized');
    
    // Initialize backup service
    await backupService.ensureBackupDirectory();
    logger.info('Backup service initialized');
    
    // Load revoked tokens
    await tokenRevocationService.loadRevokedTokens();
    logger.info('Token revocation service initialized');
    
    logger.info('All services initialized successfully');
  } catch (error) {
    logger.error('Failed to initialize services:', error);
    process.exit(1);
  }
};

// Start server
server.listen(PORT, async () => {
  logger.info(`SLAM25 API Server running on port ${PORT}`);
  logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
  logger.info(`Health check: http://localhost:${PORT}/health`);
  logger.info(`API Documentation: http://localhost:${PORT}/api/docs`);
  logger.info(`WebSocket server ready`);
  
  // Initialize all services
  await initializeServices();
});

export default app;
