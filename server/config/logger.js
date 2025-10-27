// Simple Logging Configuration for SLAM25 Application
// Replaces Winston with a simple, reliable logging solution

// Simple logger class
class SimpleLogger {
  constructor() {
    this.level = process.env.LOG_LEVEL || 'info';
    this.service = 'slam25-api';
    this.isProduction = process.env.NODE_ENV === 'production';
  }

  formatMessage(level, message, meta = {}) {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level: level.toUpperCase(),
      service: this.service,
      message,
      ...meta
    };
    
    if (this.isProduction) {
      return JSON.stringify(logEntry);
    } else {
      return `${timestamp} [${level.toUpperCase()}]: ${message}${Object.keys(meta).length > 0 ? ` ${JSON.stringify(meta)}` : ''}`;
    }
  }

  log(level, message, meta = {}) {
    if (this.shouldLog(level)) {
      const formatted = this.formatMessage(level, message, meta);
      console.log(formatted);
    }
  }

  shouldLog(level) {
    const levels = { error: 0, warn: 1, info: 2, debug: 3 };
    return levels[level] <= levels[this.level];
  }

  error(message, meta = {}) {
    this.log('error', message, meta);
  }

  warn(message, meta = {}) {
    this.log('warn', message, meta);
  }

  info(message, meta = {}) {
    this.log('info', message, meta);
  }

  debug(message, meta = {}) {
    this.log('debug', message, meta);
  }
}

// Create logger instances
const logger = new SimpleLogger();
const securityLogger = new SimpleLogger();
const performanceLogger = new SimpleLogger();
const auditLogger = new SimpleLogger();

// Handle process termination gracefully
process.on('SIGINT', () => {
  logger.info('Received SIGINT, shutting down gracefully');
});

process.on('SIGTERM', () => {
  logger.info('Received SIGTERM, shutting down gracefully');
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection', { reason: reason?.message || reason, stack: reason?.stack });
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception', { message: error.message, stack: error.stack });
});

export default logger;
export { securityLogger, performanceLogger, auditLogger };