/**
 * Client-side logging service
 * Provides structured logging for the frontend application
 */

class Logger {
  constructor() {
    this.logLevel = process.env.NODE_ENV === 'development' ? 'debug' : 'info';
    this.logLevels = {
      error: 0,
      warn: 1,
      info: 2,
      debug: 3
    };
  }

  shouldLog(level) {
    return this.logLevels[level] <= this.logLevels[this.logLevel];
  }

  formatMessage(level, message, data = null) {
    const timestamp = new Date().toISOString();
    const formattedMessage = `[${timestamp}] [${level.toUpperCase()}] ${message}`;
    
    if (data) {
      return { message: formattedMessage, data };
    }
    
    return formattedMessage;
  }

  error(message, data = null) {
    if (this.shouldLog('error')) {
      const formatted = this.formatMessage('error', message, data);
      console.error(formatted);
      
      // In production, you might want to send errors to a logging service
      if (process.env.NODE_ENV === 'production') {
        this.sendToLoggingService('error', message, data);
      }
    }
  }

  warn(message, data = null) {
    if (this.shouldLog('warn')) {
      const formatted = this.formatMessage('warn', message, data);
      console.warn(formatted);
    }
  }

  info(message, data = null) {
    if (this.shouldLog('info')) {
      const formatted = this.formatMessage('info', message, data);
      console.info(formatted);
    }
  }

  debug(message, data = null) {
    if (this.shouldLog('debug')) {
      const formatted = this.formatMessage('debug', message, data);
      console.debug(formatted);
    }
  }

  sendToLoggingService(level, message, data) {
    // This would integrate with your logging service (e.g., Sentry, LogRocket, etc.)
    // For now, we'll just store in localStorage for debugging
    try {
      const logs = JSON.parse(localStorage.getItem('client_logs') || '[]');
      logs.push({
        timestamp: new Date().toISOString(),
        level,
        message,
        data,
        url: window.location.href,
        userAgent: navigator.userAgent
      });
      
      // Keep only last 100 logs
      if (logs.length > 100) {
        logs.splice(0, logs.length - 100);
      }
      
      localStorage.setItem('client_logs', JSON.stringify(logs));
    } catch (error) {
      console.error('Failed to store log:', error);
    }
  }

  getLogs() {
    try {
      return JSON.parse(localStorage.getItem('client_logs') || '[]');
    } catch (error) {
      console.error('Failed to retrieve logs:', error);
      return [];
    }
  }

  clearLogs() {
    localStorage.removeItem('client_logs');
  }
}

const logger = new Logger();
export default logger;
