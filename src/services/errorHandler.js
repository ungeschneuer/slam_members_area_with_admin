// Centralized Error Handling Service
class ErrorHandler {
  constructor() {
    this.errorCounts = new Map();
    this.maxRetries = 3;
    this.retryDelays = [1000, 2000, 5000]; // Exponential backoff
  }

  // Handle different types of errors
  handleError(error, context = 'unknown', retryFn = null) {
    const errorKey = `${context}_${error.name || 'Unknown'}`;
    const count = this.errorCounts.get(errorKey) || 0;
    
    console.error(`[${context}] Error:`, error);
    
    // Log error details for debugging
    this.logError(error, context);
    
    // Increment error count
    this.errorCounts.set(errorKey, count + 1);
    
    // Attempt retry if function provided and under max retries
    if (retryFn && count < this.maxRetries) {
      const delay = this.retryDelays[count] || this.retryDelays[this.retryDelays.length - 1];
      console.log(`[${context}] Retrying in ${delay}ms (attempt ${count + 1}/${this.maxRetries})`);
      
      setTimeout(() => {
        retryFn();
      }, delay);
      
      return { shouldRetry: true, attempt: count + 1 };
    }
    
    // Reset error count after max retries
    if (count >= this.maxRetries) {
      this.errorCounts.delete(errorKey);
    }
    
    return { shouldRetry: false, attempt: count };
  }

  // Log errors with context
  logError(error, context) {
    const errorInfo = {
      timestamp: new Date().toISOString(),
      context,
      name: error.name,
      message: error.message,
      stack: error.stack,
      url: window.location.href,
      userAgent: navigator.userAgent
    };
    
    // In production, send to error tracking service
    if (import.meta.env.PROD) {
      // this.sendToErrorService(errorInfo);
    }
    
    // Store in localStorage for debugging
    try {
      const errors = JSON.parse(localStorage.getItem('app_errors') || '[]');
      errors.push(errorInfo);
      if (errors.length > 50) errors.shift(); // Keep only last 50 errors
      localStorage.setItem('app_errors', JSON.stringify(errors));
    } catch (e) {
      console.warn('Failed to store error in localStorage:', e);
    }
  }

  // Network error specific handling
  handleNetworkError(error, context) {
    if (error.name === 'TypeError' && error.message.includes('NetworkError')) {
      console.warn(`[${context}] Network error detected, checking connectivity...`);
      return this.checkConnectivity();
    }
    return Promise.resolve(false);
  }

  // Check if we're online
  async checkConnectivity() {
    try {
      // Create a timeout promise
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Connectivity check timeout')), 3000);
      });
      
      // Create the fetch promise
      const fetchPromise = fetch('/api/health', {
        credentials: 'omit', 
        method: 'HEAD'
      });
      
      // Race between fetch and timeout
      const response = await Promise.race([fetchPromise, timeoutPromise]);
      return response.ok;
    } catch {
      return false;
    }
  }

  // Clear error counts
  clearErrors() {
    this.errorCounts.clear();
  }

  // Get error statistics
  getErrorStats() {
    const stats = {};
    for (const [key, count] of this.errorCounts) {
      stats[key] = count;
    }
    return stats;
  }
}

const errorHandler = new ErrorHandler();
export default errorHandler;
