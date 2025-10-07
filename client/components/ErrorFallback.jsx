import React from 'react';

/**
 * Error Fallback Component for react-error-boundary
 * 
 * This component displays when an error boundary catches an error.
 * It provides user-friendly error messages in German and includes
 * retry functionality and navigation options.
 */
export default function ErrorFallback({ error, resetErrorBoundary }) {
  const isNetworkError = error?.message?.includes('fetch') || 
                         error?.message?.includes('network') ||
                         error?.message?.includes('Failed to fetch');
  
  const isDatabaseError = error?.message?.includes('database') ||
                        error?.message?.includes('Database') ||
                        error?.message?.includes('connection');

  const handleRetry = () => {
    resetErrorBoundary();
  };

  const handleGoHome = () => {
    window.location.href = '/';
  };

  const handleGoBack = () => {
    window.history.back();
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8 text-center">
        {/* Error Icon */}
        <div className="w-20 h-20 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-6">
          <span className="text-3xl">
            {isNetworkError ? '🌐' : isDatabaseError ? '🗄️' : '⚠️'}
          </span>
        </div>

        {/* Error Title */}
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
          {isNetworkError ? 'Verbindungsfehler' : 
           isDatabaseError ? 'Datenbankfehler' : 
           'Ein Fehler ist aufgetreten'}
        </h1>

        {/* Error Message */}
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          {isNetworkError ? 
            'Es gab ein Problem mit der Internetverbindung. Bitte überprüfen Sie Ihre Verbindung und versuchen Sie es erneut.' :
           isDatabaseError ? 
            'Es gab ein Problem mit der Datenbankverbindung. Bitte versuchen Sie es später erneut.' :
            'Entschuldigung, etwas ist schiefgelaufen. Unser Team wurde benachrichtigt.'}
        </p>

        {/* Technical Details (Development only) */}
        {import.meta.env.DEV && error && (
          <details className="mb-6 text-left">
            <summary className="cursor-pointer text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300">
              Technische Details (nur für Entwickler)
            </summary>
            <div className="mt-2 p-3 bg-gray-100 dark:bg-gray-700 rounded text-xs font-mono text-gray-700 dark:text-gray-300 overflow-auto">
              <div className="mb-2">
                <strong>Error:</strong> {error.message}
              </div>
              {error.stack && (
                <div>
                  <strong>Stack:</strong>
                  <pre className="whitespace-pre-wrap">{error.stack}</pre>
                </div>
              )}
            </div>
          </details>
        )}

        {/* Action Buttons */}
        <div className="space-y-3">
          <button
            onClick={handleRetry}
            className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
          >
            Erneut versuchen
          </button>
          
          <div className="flex space-x-3">
            <button
              onClick={handleGoBack}
              className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors"
            >
              Zurück
            </button>
            <button
              onClick={handleGoHome}
              className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors"
            >
              Startseite
            </button>
          </div>
        </div>

        {/* Contact Information */}
        <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Bei anhaltenden Problemen kontaktieren Sie uns unter{' '}
            <a 
              href="mailto:support@slam25.de" 
              className="text-blue-600 dark:text-blue-400 hover:underline"
            >
              support@slam25.de
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
