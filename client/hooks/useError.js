import { useState, useCallback } from 'react';
import { ErrorService } from '../services/errorService.js';

/**
 * useError Hook
 * 
 * Provides centralized error state management for components.
 * Replaces scattered error handling patterns with consistent state management.
 */

export function useError(initialError = null) {
  const [error, setError] = useState(initialError);
  const [isLoading, setIsLoading] = useState(false);

  /**
   * Handle an error with automatic classification and processing
   * @param {Error} err - The error to handle
   * @param {Object} context - Additional context about where the error occurred
   */
  const handleError = useCallback((err, context = {}) => {
    const processedError = ErrorService.handleError(err, context);
    setError(processedError);
    
    // Log error in development
    ErrorService.logError(err, context);
  }, []);

  /**
   * Clear the current error
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  /**
   * Handle form validation errors specifically
   * @param {Object} formErrors - Form validation errors
   */
  const handleFormError = useCallback((formErrors) => {
    const processedError = ErrorService.handleFormValidationError(formErrors);
    setError(processedError);
  }, []);

  /**
   * Handle API errors specifically
   * @param {Object} response - API response object
   */
  const handleApiError = useCallback((response) => {
    const processedError = ErrorService.handleApiError(response);
    setError(processedError);
  }, []);

  /**
   * Set a custom error message
   * @param {string} message - Error message
   * @param {string} type - Error type (optional)
   * @param {Object} details - Additional details (optional)
   */
  const setCustomError = useCallback((message, type = ErrorService.ERROR_TYPES.UNKNOWN, details = {}) => {
    const customError = ErrorService.createError(message, type, details);
    const processedError = ErrorService.handleError(customError);
    setError(processedError);
  }, []);

  /**
   * Execute an async operation with error handling
   * @param {Function} operation - The async operation to execute
   * @param {Object} context - Additional context for error handling
   * @returns {Promise} The result of the operation
   */
  const executeWithErrorHandling = useCallback(async (operation, context = {}) => {
    setIsLoading(true);
    clearError();

    try {
      const result = await operation();
      return result;
    } catch (err) {
      handleError(err, context);
      throw err; // Re-throw so caller can handle if needed
    } finally {
      setIsLoading(false);
    }
  }, [handleError, clearError]);

  /**
   * Retry the last operation (if available)
   * @param {Function} retryOperation - The operation to retry
   */
  const retry = useCallback(async (retryOperation) => {
    if (!error?.canRetry || !retryOperation) return;

    setIsLoading(true);
    clearError();

    try {
      await retryOperation();
    } catch (err) {
      handleError(err, { context: 'retry_operation' });
    } finally {
      setIsLoading(false);
    }
  }, [error, handleError, clearError]);

  return {
    // State
    error,
    isLoading,
    
    // Actions
    handleError,
    clearError,
    handleFormError,
    handleApiError,
    setCustomError,
    executeWithErrorHandling,
    retry,
    
    // Computed properties
    hasError: !!error,
    canRetry: error?.canRetry || false,
    errorType: error?.type,
    errorMessage: error?.message
  };
}

/**
 * useAsyncError Hook
 * 
 * Specialized hook for handling async operations with automatic error handling
 */
export function useAsyncError() {
  const { error, isLoading, handleError, clearError, executeWithErrorHandling } = useError();

  /**
   * Execute an async operation with automatic error handling
   * @param {Function} operation - The async operation to execute
   * @param {Object} options - Options for the operation
   * @returns {Promise} The result of the operation
   */
  const execute = useCallback(async (operation, options = {}) => {
    const { context = {}, onSuccess, onError } = options;

    try {
      const result = await executeWithErrorHandling(operation, context);
      if (onSuccess) onSuccess(result);
      return result;
    } catch (err) {
      if (onError) onError(err);
      throw err;
    }
  }, [executeWithErrorHandling]);

  return {
    error,
    isLoading,
    execute,
    clearError,
    hasError: !!error,
    canRetry: error?.canRetry || false
  };
}

export default useError;
