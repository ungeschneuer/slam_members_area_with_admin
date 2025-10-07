import { useErrorHandler as useReactErrorHandler } from 'react-error-boundary';
import { useCallback } from 'react';
import errorReportingService from '../services/errorReportingService.js';

/**
 * Custom useErrorHandler hook that wraps react-error-boundary's useErrorHandler
 * and adds automatic error reporting through the centralized error service.
 * 
 * @param {string} context - Context where the error occurred (e.g., 'Component', 'AsyncOperation')
 * @param {Object} options - Additional options for error handling
 * @returns {Function} - Error handler function
 */
export function useErrorHandler(context = 'Component', options = {}) {
  const reactErrorHandler = useReactErrorHandler();

  const handleError = useCallback((error, errorInfo = null, additionalOptions = {}) => {
    // Log error through centralized service
    const result = errorReportingService.logError(
      error, 
      errorInfo, 
      context, 
      { ...options, ...additionalOptions }
    );

    // If it's a retryable error and we should retry, don't call react error handler yet
    if (result.shouldRetry) {
      return;
    }

    // Call react-error-boundary's error handler
    reactErrorHandler(error);
  }, [reactErrorHandler, context, options]);

  return handleError;
}

/**
 * Hook for handling async errors (API calls, promises, etc.)
 * 
 * @param {string} context - Context where the error occurred
 * @param {Object} options - Additional options
 * @returns {Function} - Async error handler function
 */
export function useAsyncErrorHandler(context = 'AsyncOperation', options = {}) {
  const handleError = useErrorHandler(context, options);

  const handleAsyncError = useCallback((error, errorInfo = null) => {
    // For async errors, we typically don't want to trigger the error boundary
    // unless it's a critical error
    const errorData = errorReportingService.createErrorData(error, errorInfo, context, options);
    
    if (errorData.severity === 'critical') {
      handleError(error, errorInfo);
    } else {
      // Just log the error without triggering boundary
      errorReportingService.logError(error, errorInfo, context, options);
    }
  }, [handleError, context, options]);

  return handleAsyncError;
}

/**
 * Hook for handling TanStack Query errors
 * 
 * @param {string} context - Context where the error occurred
 * @returns {Function} - Query error handler function
 */
export function useQueryErrorHandler(context = 'Query') {
  const handleError = useErrorHandler(context, { 
    category: 'query',
    retryable: true 
  });

  return useCallback((error) => {
    // Query errors are usually not critical enough to trigger error boundary
    // unless they're authentication or database errors
    const errorData = errorReportingService.createErrorData(error, null, context, {});
    
    if (errorData.category === 'authentication' || errorData.category === 'database') {
      handleError(error);
    } else {
      errorReportingService.logError(error, null, context, { category: 'query' });
    }
  }, [handleError, context]);
}

/**
 * Hook for handling mutation errors
 * 
 * @param {string} context - Context where the error occurred
 * @returns {Function} - Mutation error handler function
 */
export function useMutationErrorHandler(context = 'Mutation') {
  const handleError = useErrorHandler(context, { 
    category: 'mutation',
    retryable: false 
  });

  return useCallback((error) => {
    // Mutation errors are more likely to be critical
    handleError(error);
  }, [handleError, context]);
}

export default useErrorHandler;
