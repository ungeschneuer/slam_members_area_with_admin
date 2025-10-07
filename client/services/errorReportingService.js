/**
 * Centralized Error Reporting Service
 * 
 * This service unifies all error reporting across the application,
 * consolidating logic from the old errorHandler.js and providing
 * structured error logging with context, categorization, and deduplication.
 */

class ErrorReportingService {
  constructor() {
    this.errorCounts = new Map();
    this.errorHistory = [];
    this.maxRetries = 3;
    this.retryDelays = [1000, 2000, 5000]; // Exponential backoff
    this.maxHistorySize = 50;
    this.deduplicationWindow = 30000; // 30 seconds
  }

  /**
   * Log error with context and automatic categorization
   * @param {Error} error - The error object
   * @param {Object} errorInfo - Additional error information (component stack, etc.)
   * @param {string} context - Context where error occurred (e.g., 'App', 'Query', 'Mutation')
   * @param {Object} options - Additional options
   */
  logError(error, errorInfo = null, context = 'unknown', options = {}) {
    const errorData = this.createErrorData(error, errorInfo, context, options);
    
    // Check for duplicate errors
    if (this.shouldSuppressDuplicate(errorData)) {
      if (import.meta.env.DEV) {
        console.warn(`[${context}] Duplicate error suppressed:`, errorData.message);
      }
      return { shouldRetry: false, attempt: 0, suppressed: true };
    }

    // Log to console in development
    if (import.meta.env.DEV) {
      console.error(`[${context}] Error:`, error, errorInfo);
    }

    // Store error in history
    this.addToHistory(errorData);

    // Log to localStorage for debugging
    this.logToLocalStorage(errorData);

    // Report to external service in production
    if (import.meta.env.PROD) {
      this.reportToExternalService(errorData);
    }

    // Handle retry logic if provided
    if (options.retryFn && this.shouldRetry(errorData, context)) {
      return this.handleRetry(errorData, context, options.retryFn);
    }

    return { shouldRetry: false, attempt: this.getErrorCount(errorData.key) };
  }

  /**
   * Create structured error data
   */
  createErrorData(error, errorInfo, context, options) {
    const timestamp = new Date().toISOString();
    const errorKey = this.generateErrorKey(error, context);
    
    return {
      key: errorKey,
      timestamp,
      context,
      name: error.name || 'UnknownError',
      message: error.message || 'Unknown error occurred',
      stack: error.stack,
      componentStack: errorInfo?.componentStack,
      url: window.location.href,
      userAgent: navigator.userAgent,
      category: this.categorizeError(error),
      severity: this.determineSeverity(error, context),
      retryCount: this.getErrorCount(errorKey),
      ...options
    };
  }

  /**
   * Categorize error type for better handling
   */
  categorizeError(error) {
    const message = error.message?.toLowerCase() || '';
    const name = error.name?.toLowerCase() || '';

    if (message.includes('fetch') || message.includes('network') || name.includes('network')) {
      return 'network';
    }
    if (message.includes('database') || message.includes('connection') || name.includes('database')) {
      return 'database';
    }
    if (message.includes('validation') || message.includes('invalid') || name.includes('validation')) {
      return 'validation';
    }
    if (message.includes('auth') || message.includes('unauthorized') || name.includes('auth')) {
      return 'authentication';
    }
    if (message.includes('permission') || message.includes('forbidden') || name.includes('permission')) {
      return 'authorization';
    }
    if (name.includes('syntax') || name.includes('reference')) {
      return 'javascript';
    }
    
    return 'general';
  }

  /**
   * Determine error severity
   */
  determineSeverity(error, context) {
    const category = this.categorizeError(error);
    
    // Critical errors
    if (category === 'database' || category === 'authentication') {
      return 'critical';
    }
    
    // High severity
    if (category === 'network' || context === 'App') {
      return 'high';
    }
    
    // Medium severity
    if (category === 'validation' || category === 'authorization') {
      return 'medium';
    }
    
    return 'low';
  }

  /**
   * Generate unique key for error deduplication
   */
  generateErrorKey(error, context) {
    const message = error.message || '';
    const name = error.name || '';
    return `${context}_${name}_${message.substring(0, 50)}`;
  }

  /**
   * Check if error should be suppressed due to duplication
   */
  shouldSuppressDuplicate(errorData) {
    const now = Date.now();
    const recentError = this.errorHistory.find(
      e => e.key === errorData.key && 
           (now - new Date(e.timestamp).getTime()) < this.deduplicationWindow
    );
    
    return !!recentError;
  }

  /**
   * Add error to history for deduplication
   */
  addToHistory(errorData) {
    this.errorHistory.push(errorData);
    
    // Keep only recent errors
    const cutoff = Date.now() - this.deduplicationWindow;
    this.errorHistory = this.errorHistory.filter(
      e => new Date(e.timestamp).getTime() > cutoff
    );
  }

  /**
   * Log error to localStorage for debugging
   */
  logToLocalStorage(errorData) {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const errors = JSON.parse(window.localStorage.getItem('app_errors') || '[]');
        errors.push(errorData);
        
        // Keep only last N errors
        if (errors.length > this.maxHistorySize) {
          errors.splice(0, errors.length - this.maxHistorySize);
        }
        
        window.localStorage.setItem('app_errors', JSON.stringify(errors));
      }
    } catch (e) {
      console.warn('Failed to store error in localStorage:', e);
    }
  }

  /**
   * Report error to external service (production)
   */
  reportToExternalService(errorData) {
    // TODO: Implement external error reporting service
    // This could be Sentry, Bugsnag, LogRocket, etc.
    console.error('Production error (would be reported):', {
      message: errorData.message,
      stack: errorData.stack,
      context: errorData.context,
      category: errorData.category,
      severity: errorData.severity,
      timestamp: errorData.timestamp
    });
  }

  /**
   * Handle retry logic
   */
  handleRetry(errorData, context, retryFn) {
    const count = this.getErrorCount(errorData.key);
    
    if (count >= this.maxRetries) {
      this.errorCounts.delete(errorData.key);
      return { shouldRetry: false, attempt: count };
    }

    const delay = this.retryDelays[count] || this.retryDelays[this.retryDelays.length - 1];
    
    if (import.meta.env.DEV) {
      console.log(`[${context}] Retrying in ${delay}ms (attempt ${count + 1}/${this.maxRetries})`);
    }
    
    setTimeout(() => {
      retryFn();
    }, delay);
    
    return { shouldRetry: true, attempt: count + 1 };
  }

  /**
   * Check if error should be retried
   */
  shouldRetry(errorData, context) {
    const count = this.getErrorCount(errorData.key);
    return count < this.maxRetries;
  }

  /**
   * Get error count for deduplication
   */
  getErrorCount(errorKey) {
    return this.errorCounts.get(errorKey) || 0;
  }

  /**
   * Increment error count
   */
  incrementErrorCount(errorKey) {
    const count = this.getErrorCount(errorKey);
    this.errorCounts.set(errorKey, count + 1);
  }

  /**
   * Handle network errors specifically
   */
  handleNetworkError(error, context) {
    if (error.name === 'TypeError' && error.message.includes('NetworkError')) {
      if (import.meta.env.DEV) {
        console.warn(`[${context}] Network error detected, checking connectivity...`);
      }
      return this.checkConnectivity();
    }
    return Promise.resolve(false);
  }

  /**
   * Check network connectivity
   */
  async checkConnectivity() {
    try {
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Connectivity check timeout')), 3000);
      });
      
      const apiUrl = import.meta.env.VITE_API_URL;
      const fetchPromise = fetch(`${apiUrl}/health`, {
        credentials: 'omit',
        method: 'HEAD'
      });
      
      const response = await Promise.race([fetchPromise, timeoutPromise]);
      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * Clear error history and counts
   */
  clearErrors() {
    this.errorCounts.clear();
    this.errorHistory = [];
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.removeItem('app_errors');
    }
  }

  /**
   * Get error statistics
   */
  getErrorStats() {
    const stats = {};
    for (const [key, count] of this.errorCounts) {
      stats[key] = count;
    }
    return {
      counts: stats,
      history: this.errorHistory,
      totalErrors: this.errorHistory.length
    };
  }

  /**
   * Get errors from localStorage
   */
  getStoredErrors() {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        return JSON.parse(window.localStorage.getItem('app_errors') || '[]');
      }
      return [];
    } catch {
      return [];
    }
  }
}

// Export singleton instance
export default new ErrorReportingService();
