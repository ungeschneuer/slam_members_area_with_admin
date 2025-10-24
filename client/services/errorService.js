/**
 * Centralized Error Handling Service
 * 
 * Provides consistent error classification, messaging, and handling across the application.
 * Replaces scattered alert() calls and inconsistent error handling patterns.
 */

export class ErrorService {
  static ERROR_TYPES = {
    VALIDATION: 'validation',
    NETWORK: 'network',
    SERVER: 'server',
    NOT_FOUND: 'not_found',
    UNAUTHORIZED: 'unauthorized',
    FORBIDDEN: 'forbidden',
    TIMEOUT: 'timeout',
    UNKNOWN: 'unknown'
  };

  static ERROR_MESSAGES = {
    [this.ERROR_TYPES.VALIDATION]: 'Bitte überprüfen Sie Ihre Eingaben',
    [this.ERROR_TYPES.NETWORK]: 'Netzwerkfehler. Bitte überprüfen Sie Ihre Internetverbindung',
    [this.ERROR_TYPES.SERVER]: 'Serverfehler. Bitte versuchen Sie es später erneut',
    [this.ERROR_TYPES.NOT_FOUND]: 'Die angeforderte Ressource wurde nicht gefunden',
    [this.ERROR_TYPES.UNAUTHORIZED]: 'Sie sind nicht berechtigt, diese Aktion auszuführen',
    [this.ERROR_TYPES.FORBIDDEN]: 'Zugriff verweigert',
    [this.ERROR_TYPES.TIMEOUT]: 'Die Anfrage dauerte zu lange. Bitte versuchen Sie es erneut',
    [this.ERROR_TYPES.UNKNOWN]: 'Ein unbekannter Fehler ist aufgetreten'
  };

  /**
   * Handle and classify an error
   * @param {Error} error - The error to handle
   * @param {Object} context - Additional context about where the error occurred
   * @returns {Object} Processed error information
   */
  static handleError(error, context = {}) {
    const errorType = this.classifyError(error);
    const message = this.getErrorMessage(error, errorType);
    const canRetry = this.canRetry(errorType);
    
    return {
      type: errorType,
      message,
      canRetry,
      details: error.message,
      context,
      timestamp: new Date().toISOString(),
      originalError: error
    };
  }

  /**
   * Classify an error based on its properties
   * @param {Error} error - The error to classify
   * @returns {string} Error type
   */
  static classifyError(error) {
    // Network errors
    if (error.name === 'NetworkError' || error.message.includes('fetch')) {
      return this.ERROR_TYPES.NETWORK;
    }

    // Timeout errors
    if (error.name === 'TimeoutError' || error.message.includes('timeout')) {
      return this.ERROR_TYPES.TIMEOUT;
    }

    // HTTP status code based classification
    if (error.response) {
      const status = error.response.status;
      
      switch (status) {
        case 400:
          return this.ERROR_TYPES.VALIDATION;
        case 401:
          return this.ERROR_TYPES.UNAUTHORIZED;
        case 403:
          return this.ERROR_TYPES.FORBIDDEN;
        case 404:
          return this.ERROR_TYPES.NOT_FOUND;
        case 500:
        case 502:
        case 503:
        case 504:
          return this.ERROR_TYPES.SERVER;
        default:
          return this.ERROR_TYPES.UNKNOWN;
      }
    }

    // Validation errors (Zod, form validation)
    if (error.name === 'ZodError' || error.message.includes('validation')) {
      return this.ERROR_TYPES.VALIDATION;
    }

    // Default to unknown
    return this.ERROR_TYPES.UNKNOWN;
  }

  /**
   * Get user-friendly error message
   * @param {Error} error - The original error
   * @param {string} errorType - The classified error type
   * @returns {string} User-friendly error message
   */
  static getErrorMessage(error, errorType) {
    // For validation errors, try to extract specific field errors
    if (errorType === this.ERROR_TYPES.VALIDATION) {
      if (error.issues && Array.isArray(error.issues)) {
        const fieldErrors = error.issues.map(issue => issue.message).join(', ');
        return fieldErrors;
      }
      
      if (error.message && error.message.includes('required')) {
        return 'Bitte füllen Sie alle Pflichtfelder aus';
      }
    }

    // For server errors, check if we have a specific message
    if (errorType === this.ERROR_TYPES.SERVER && error.response?.data?.message) {
      return error.response.data.message;
    }

    // Return the standard message for this error type
    return this.ERROR_MESSAGES[errorType] || this.ERROR_MESSAGES[this.ERROR_TYPES.UNKNOWN];
  }

  /**
   * Determine if an error can be retried
   * @param {string} errorType - The error type
   * @returns {boolean} Whether the error can be retried
   */
  static canRetry(errorType) {
    const retryableTypes = [
      this.ERROR_TYPES.NETWORK,
      this.ERROR_TYPES.SERVER,
      this.ERROR_TYPES.TIMEOUT
    ];
    
    return retryableTypes.includes(errorType);
  }

  /**
   * Create a standardized error object
   * @param {string} message - Error message
   * @param {string} type - Error type
   * @param {Object} details - Additional details
   * @returns {Object} Standardized error
   */
  static createError(message, type = this.ERROR_TYPES.UNKNOWN, details = {}) {
    const error = new Error(message);
    error.type = type;
    error.details = details;
    return error;
  }

  /**
   * Log error for debugging (in development)
   * @param {Error} error - The error to log
   * @param {Object} context - Additional context
   */
  static logError(error, context = {}) {
    if (process.env.NODE_ENV === 'development') {
      console.group('🚨 ErrorService Log');
      console.error('Error:', error);
      console.log('Context:', context);
      console.log('Timestamp:', new Date().toISOString());
      console.groupEnd();
    }
  }

  /**
   * Handle form validation errors specifically
   * @param {Object} formErrors - Form validation errors
   * @returns {Object} Processed validation error
   */
  static handleFormValidationError(formErrors) {
    return {
      type: this.ERROR_TYPES.VALIDATION,
      message: 'Formular-Validierung fehlgeschlagen',
      details: { formErrors },
      canRetry: false
    };
  }

  /**
   * Handle API response errors
   * @param {Object} response - API response object
   * @returns {Object} Processed API error
   */
  static handleApiError(response) {
    const error = new Error(response.data?.message || 'API-Fehler');
    error.response = response;
    
    return this.handleError(error, { 
      context: 'api_call',
      url: response.config?.url,
      method: response.config?.method
    });
  }
}

export default ErrorService;
