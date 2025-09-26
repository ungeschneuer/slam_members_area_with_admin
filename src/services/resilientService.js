// Resilient Service Wrapper
// Implements circuit breaker, retry logic, and fallback patterns

import errorHandler from './errorHandler.js';

class ResilientService {
  constructor(options = {}) {
    this.options = {
      maxRetries: 3,
      retryDelay: 1000,
      timeout: 10000,
      circuitBreakerThreshold: 5,
      circuitBreakerTimeout: 30000,
      ...options
    };
    
    this.failureCount = 0;
    this.lastFailureTime = null;
    this.state = 'CLOSED'; // CLOSED, OPEN, HALF_OPEN
  }

  // Circuit breaker logic
  async execute(operation, fallback = null) {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailureTime > this.options.circuitBreakerTimeout) {
        this.state = 'HALF_OPEN';
      } else {
        return this.handleFallback(fallback, 'Circuit breaker open');
      }
    }

    try {
      const result = await this.withRetry(operation);
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      return this.handleFallback(fallback, error);
    }
  }

  // Retry logic with exponential backoff
  async withRetry(operation) {
    let lastError;
    
    for (let attempt = 0; attempt <= this.options.maxRetries; attempt++) {
      try {
        const result = await Promise.race([
          operation(),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Timeout')), this.options.timeout)
          )
        ]);
        
        return result;
      } catch (error) {
        lastError = error;
        
        if (attempt === this.options.maxRetries) {
          throw error;
        }
        
        // Exponential backoff
        const delay = this.options.retryDelay * Math.pow(2, attempt);
        await this.sleep(delay);
      }
    }
    
    throw lastError;
  }

  // Circuit breaker success handler
  onSuccess() {
    this.failureCount = 0;
    this.state = 'CLOSED';
  }

  // Circuit breaker failure handler
  onFailure() {
    this.failureCount++;
    this.lastFailureTime = Date.now();
    
    if (this.failureCount >= this.options.circuitBreakerThreshold) {
      this.state = 'OPEN';
    }
  }

  // Handle fallback
  handleFallback(fallback, error) {
    if (fallback) {
      try {
        return fallback(error);
      } catch (fallbackError) {
        errorHandler.handleError(fallbackError, 'ResilientService.fallback');
        throw fallbackError;
      }
    }
    
    throw error;
  }

  // Utility: sleep function
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Get current state
  getState() {
    return {
      state: this.state,
      failureCount: this.failureCount,
      lastFailureTime: this.lastFailureTime
    };
  }

  // Reset circuit breaker
  reset() {
    this.state = 'CLOSED';
    this.failureCount = 0;
    this.lastFailureTime = null;
  }
}

// Higher-order function to wrap services with resilience
export function withResilience(service, options = {}) {
  const resilient = new ResilientService(options);
  
  return new Proxy(service, {
    get(target, prop) {
      const originalMethod = target[prop];
      
      // Skip resilience for certain methods that should not be retried
      const skipResilience = ['checkHealth', 'init', 'destroy', 'startHealthChecks'];
      
      if (typeof originalMethod === 'function' && !skipResilience.includes(prop)) {
        return async function(...args) {
          return resilient.execute(
            () => originalMethod.apply(target, args),
            // Fallback: return cached data or default values
            (error) => {
              console.warn(`Service method ${prop} failed, using fallback:`, error);
              return null; // or cached data
            }
          );
        };
      }
      
      return originalMethod;
    }
  });
}

export default ResilientService;
