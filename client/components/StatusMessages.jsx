import React from 'react';

/**
 * Error message component for displaying user-friendly error messages
 * 
 * @param {Object} props - Component props
 * @param {Error|string} props.error - Error object or error message
 * @param {Function} props.onRetry - Optional retry function
 * @param {string} props.className - Additional CSS classes
 */
export function ErrorMessage({ error, onRetry, className = '' }) {
  if (!error) return null;

  const getErrorMessage = (error) => {
    if (typeof error === 'string') return error;
    if (error.message) return error.message;
    return 'Ein unbekannter Fehler ist aufgetreten.';
  };

  const getErrorType = (error) => {
    const message = error.message || error;
    if (message.includes('fetch') || message.includes('network')) return 'network';
    if (message.includes('database') || message.includes('Database')) return 'database';
    if (message.includes('validation') || message.includes('Validation')) return 'validation';
    return 'general';
  };

  const errorType = getErrorType(error);
  const errorMessage = getErrorMessage(error);

  const errorIcons = {
    network: '🌐',
    database: '🗄️',
    validation: '📝',
    general: '⚠️'
  };

  const errorTitles = {
    network: 'Verbindungsfehler',
    database: 'Datenbankfehler',
    validation: 'Validierungsfehler',
    general: 'Fehler'
  };

  return (
    <div className={`error-state rounded-lg p-4 ${className}`}>
      <div className="flex items-start space-x-3">
        <span className="text-xl">{errorIcons[errorType]}</span>
        <div className="flex-1">
          <h3 className="font-medium mb-1">{errorTitles[errorType]}</h3>
          <p className="error-message">{errorMessage}</p>
          {onRetry && (
            <button
              onClick={onRetry}
              className="mt-3 px-4 py-2 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-colors"
            >
              Erneut versuchen
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Success message component for displaying success notifications
 * 
 * @param {Object} props - Component props
 * @param {string} props.message - Success message to display
 * @param {Function} props.onDismiss - Optional dismiss function
 * @param {string} props.className - Additional CSS classes
 */
export function SuccessMessage({ message, onDismiss, className = '' }) {
  if (!message) return null;

  return (
    <div className={`success-state rounded-lg p-4 ${className}`}>
      <div className="flex items-start space-x-3">
        <span className="text-xl">✅</span>
        <div className="flex-1">
          <p className="success-message">{message}</p>
        </div>
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="text-green-600 dark:text-green-400 hover:text-green-800 dark:hover:text-green-200"
            aria-label="Nachricht schließen"
          >
            ✕
          </button>
        )}
      </div>
    </div>
  );
}

/**
 * Loading message component for displaying loading states
 * 
 * @param {Object} props - Component props
 * @param {string} props.message - Loading message to display
 * @param {string} props.className - Additional CSS classes
 */
export function LoadingMessage({ message = 'Lädt...', className = '' }) {
  return (
    <div className={`loading-state rounded-lg p-4 ${className}`}>
      <div className="flex items-center space-x-3">
        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
        <p className="loading-message">{message}</p>
      </div>
    </div>
  );
}

/**
 * Info message component for displaying informational messages
 * 
 * @param {Object} props - Component props
 * @param {string} props.message - Info message to display
 * @param {Function} props.onDismiss - Optional dismiss function
 * @param {string} props.className - Additional CSS classes
 */
export function InfoMessage({ message, onDismiss, className = '' }) {
  if (!message) return null;

  return (
    <div className={`info-state rounded-lg p-4 ${className}`}>
      <div className="flex items-start space-x-3">
        <span className="text-xl">ℹ️</span>
        <div className="flex-1">
          <p className="info-message">{message}</p>
        </div>
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200"
            aria-label="Nachricht schließen"
          >
            ✕
          </button>
        )}
      </div>
    </div>
  );
}

/**
 * Warning message component for displaying warning messages
 * 
 * @param {Object} props - Component props
 * @param {string} props.message - Warning message to display
 * @param {Function} props.onDismiss - Optional dismiss function
 * @param {string} props.className - Additional CSS classes
 */
export function WarningMessage({ message, onDismiss, className = '' }) {
  if (!message) return null;

  return (
    <div className={`warning-state rounded-lg p-4 ${className}`}>
      <div className="flex items-start space-x-3">
        <span className="text-xl">⚠️</span>
        <div className="flex-1">
          <p className="warning-message">{message}</p>
        </div>
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="text-yellow-600 dark:text-yellow-400 hover:text-yellow-800 dark:hover:text-yellow-200"
            aria-label="Nachricht schließen"
          >
            ✕
          </button>
        )}
      </div>
    </div>
  );
}
