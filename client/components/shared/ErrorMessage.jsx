import React from 'react';
import { ErrorService } from '../../services/errorService.js';

/**
 * ErrorMessage Component
 * 
 * Replaces all alert() calls with accessible, user-friendly error display.
 * Provides consistent error styling and interaction patterns.
 */

export function ErrorMessage({ 
  error, 
  onRetry, 
  onDismiss, 
  className = '',
  showDetails = false 
}) {
  if (!error) return null;

  const { type, message, canRetry, details, context } = error;

  // Get appropriate icon for error type
  const getErrorIcon = () => {
    switch (type) {
      case ErrorService.ERROR_TYPES.VALIDATION:
        return '⚠️';
      case ErrorService.ERROR_TYPES.NETWORK:
        return '🌐';
      case ErrorService.ERROR_TYPES.SERVER:
        return '🔧';
      case ErrorService.ERROR_TYPES.NOT_FOUND:
        return '🔍';
      case ErrorService.ERROR_TYPES.UNAUTHORIZED:
        return '🔒';
      case ErrorService.ERROR_TYPES.FORBIDDEN:
        return '🚫';
      case ErrorService.ERROR_TYPES.TIMEOUT:
        return '⏱️';
      default:
        return '❌';
    }
  };

  // Get appropriate background color for error type
  const getErrorStyles = () => {
    const baseStyles = 'rounded-lg border p-4 mb-4';
    
    switch (type) {
      case ErrorService.ERROR_TYPES.VALIDATION:
        return `${baseStyles} bg-yellow-50 border-yellow-200 text-yellow-800 dark:bg-yellow-900/20 dark:border-yellow-700 dark:text-yellow-200`;
      case ErrorService.ERROR_TYPES.NETWORK:
        return `${baseStyles} bg-blue-50 border-blue-200 text-blue-800 dark:bg-blue-900/20 dark:border-blue-700 dark:text-blue-200`;
      case ErrorService.ERROR_TYPES.SERVER:
        return `${baseStyles} bg-red-50 border-red-200 text-red-800 dark:bg-red-900/20 dark:border-red-700 dark:text-red-200`;
      case ErrorService.ERROR_TYPES.NOT_FOUND:
        return `${baseStyles} bg-gray-50 border-gray-200 text-gray-800 dark:bg-gray-900/20 dark:border-gray-700 dark:text-gray-200`;
      case ErrorService.ERROR_TYPES.UNAUTHORIZED:
      case ErrorService.ERROR_TYPES.FORBIDDEN:
        return `${baseStyles} bg-orange-50 border-orange-200 text-orange-800 dark:bg-orange-900/20 dark:border-orange-700 dark:text-orange-200`;
      case ErrorService.ERROR_TYPES.TIMEOUT:
        return `${baseStyles} bg-purple-50 border-purple-200 text-purple-800 dark:bg-purple-900/20 dark:border-purple-700 dark:text-purple-200`;
      default:
        return `${baseStyles} bg-red-50 border-red-200 text-red-800 dark:bg-red-900/20 dark:border-red-700 dark:text-red-200`;
    }
  };

  return (
    <div 
      className={`${getErrorStyles()} ${className}`}
      role="alert"
      aria-live="polite"
    >
      <div className="flex items-start">
        <div className="flex-shrink-0 mr-3">
          <span className="text-lg" aria-hidden="true">
            {getErrorIcon()}
          </span>
        </div>
        
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-medium mb-1">
            {getErrorTitle(type)}
          </h3>
          
          <p className="text-sm mb-2">
            {message}
          </p>
          
          {showDetails && details && (
            <details className="text-xs opacity-75 mb-2">
              <summary className="cursor-pointer hover:opacity-100">
                Technische Details
              </summary>
              <pre className="mt-2 whitespace-pre-wrap break-words">
                {typeof details === 'string' ? details : JSON.stringify(details, null, 2)}
              </pre>
            </details>
          )}
          
          {context && process.env.NODE_ENV === 'development' && (
            <div className="text-xs opacity-60 mb-2">
              <strong>Kontext:</strong> {JSON.stringify(context)}
            </div>
          )}
          
          <div className="flex items-center space-x-3">
            {canRetry && onRetry && (
              <button
                onClick={onRetry}
                className="text-sm font-medium hover:underline focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-current"
                aria-label="Fehler wiederholen"
              >
                Erneut versuchen
              </button>
            )}
            
            {onDismiss && (
              <button
                onClick={onDismiss}
                className="text-sm font-medium hover:underline focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-current"
                aria-label="Fehler schließen"
              >
                Schließen
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Get appropriate title for error type
 * @param {string} errorType - The error type
 * @returns {string} Error title
 */
function getErrorTitle(errorType) {
  switch (errorType) {
    case ErrorService.ERROR_TYPES.VALIDATION:
      return 'Validierungsfehler';
    case ErrorService.ERROR_TYPES.NETWORK:
      return 'Netzwerkfehler';
    case ErrorService.ERROR_TYPES.SERVER:
      return 'Serverfehler';
    case ErrorService.ERROR_TYPES.NOT_FOUND:
      return 'Nicht gefunden';
    case ErrorService.ERROR_TYPES.UNAUTHORIZED:
      return 'Nicht autorisiert';
    case ErrorService.ERROR_TYPES.FORBIDDEN:
      return 'Zugriff verweigert';
    case ErrorService.ERROR_TYPES.TIMEOUT:
      return 'Zeitüberschreitung';
    default:
      return 'Fehler';
  }
}

/**
 * SuccessMessage Component
 * 
 * For displaying success messages with consistent styling
 */
export function SuccessMessage({ 
  message, 
  onDismiss, 
  className = '',
  duration = 5000 
}) {
  const [isVisible, setIsVisible] = React.useState(true);

  React.useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        setIsVisible(false);
        if (onDismiss) onDismiss();
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [duration, onDismiss]);

  if (!isVisible) return null;

  return (
    <div 
      className={`rounded-lg border border-green-200 bg-green-50 text-green-800 dark:bg-green-900/20 dark:border-green-700 dark:text-green-200 p-4 mb-4 ${className}`}
      role="alert"
      aria-live="polite"
    >
      <div className="flex items-start">
        <div className="flex-shrink-0 mr-3">
          <span className="text-lg" aria-hidden="true">✅</span>
        </div>
        
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium">
            {message}
          </p>
          
          {onDismiss && (
            <button
              onClick={onDismiss}
              className="text-sm font-medium hover:underline focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-current mt-2"
              aria-label="Nachricht schließen"
            >
              Schließen
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default ErrorMessage;
