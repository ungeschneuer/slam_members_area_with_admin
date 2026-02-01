import React from 'react';
import SupervisorLoadingState from './SupervisorLoadingState.jsx';

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
    if (message.includes('slam25_szene: ERROR (not running)') || 
        message.includes('supervisor') || 
        message.includes('not running') ||
        message.includes('ECONNREFUSED') ||
        message.includes('Connection refused')) return 'supervisor_bootup';
    if (message.includes('fetch') || message.includes('network')) return 'network';
    if (message.includes('database') || message.includes('Database')) return 'database';
    if (message.includes('validation') || message.includes('Validation')) return 'validation';
    return 'general';
  };

  const errorType = getErrorType(error);
  const errorMessage = getErrorMessage(error);

  // Show supervisor loading state for boot-up errors
  if (errorType === 'supervisor_bootup') {
    return (
      <SupervisorLoadingState 
        onRetry={onRetry}
        retryCount={0}
        className={className}
      />
    );
  }

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
          <h4 className="font-medium text-red-800 dark:text-red-200 mb-2">
            {errorTitles[errorType]}
          </h4>
          <p className="text-sm text-red-700 dark:text-red-300 mb-3">
            {errorMessage}
          </p>
          {onRetry && (
            <button
              onClick={onRetry}
              className="text-sm bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200 px-3 py-1 rounded hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors"
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
        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
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
            className="text-primary dark:text-accent hover:text-primary-hover dark:hover:text-accent-hover focus-contained p-1 rounded min-w-[24px] min-h-[24px] flex items-center justify-center"
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
            className="text-yellow-600 dark:text-yellow-400 hover:text-yellow-700 dark:hover:text-yellow-300 focus-contained p-1 rounded min-w-[24px] min-h-[24px] flex items-center justify-center"
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
 * Success message component for displaying success messages
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
            className="text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300 focus-contained p-1 rounded min-w-[24px] min-h-[24px] flex items-center justify-center"
            aria-label="Nachricht schließen"
          >
            ✕
          </button>
        )}
      </div>
    </div>
  );
}