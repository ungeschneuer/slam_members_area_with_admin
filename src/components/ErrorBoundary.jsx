import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { 
      hasError: false, 
      error: null, 
      errorInfo: null,
      retryCount: 0 
    };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.setState({
      error: error,
      errorInfo: errorInfo
    });

    // Log error to external service in production
    if (import.meta.env.PROD) {
      // Here you would typically send to error reporting service
      console.error('Production error:', {
        message: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        url: window.location.href
      });
    }
  }

  handleRetry = () => {
    this.setState(prevState => ({
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: prevState.retryCount + 1
    }));
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  handleGoBack = () => {
    window.history.back();
  };

  render() {
    if (this.state.hasError) {
      const isNetworkError = this.state.error?.message?.includes('fetch') || 
                           this.state.error?.message?.includes('network') ||
                           this.state.error?.message?.includes('Failed to fetch');
      
      const isDatabaseError = this.state.error?.message?.includes('database') ||
                            this.state.error?.message?.includes('Database') ||
                            this.state.error?.message?.includes('connection');

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
            {import.meta.env.DEV && this.state.error && (
              <details className="mb-6 text-left">
                <summary className="cursor-pointer text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300">
                  Technische Details (nur für Entwickler)
                </summary>
                <div className="mt-2 p-3 bg-gray-100 dark:bg-gray-700 rounded text-xs font-mono text-gray-700 dark:text-gray-300 overflow-auto">
                  <div className="mb-2">
                    <strong>Error:</strong> {this.state.error.message}
                  </div>
                  {this.state.error.stack && (
                    <div className="mb-2">
                      <strong>Stack:</strong>
                      <pre className="whitespace-pre-wrap">{this.state.error.stack}</pre>
                    </div>
                  )}
                  {this.state.errorInfo?.componentStack && (
                    <div>
                      <strong>Component Stack:</strong>
                      <pre className="whitespace-pre-wrap">{this.state.errorInfo.componentStack}</pre>
                    </div>
                  )}
                </div>
              </details>
            )}

            {/* Action Buttons */}
            <div className="space-y-3">
              <button
                onClick={this.handleRetry}
                className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
                disabled={this.state.retryCount >= 3}
              >
                {this.state.retryCount >= 3 ? 'Zu viele Versuche' : 'Erneut versuchen'}
              </button>
              
              <div className="flex space-x-3">
                <button
                  onClick={this.handleGoBack}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors"
                >
                  Zurück
                </button>
                <button
                  onClick={this.handleGoHome}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors"
                >
                  Startseite
                </button>
              </div>
            </div>

            {/* Retry Count */}
            {this.state.retryCount > 0 && (
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-4">
                Versuche: {this.state.retryCount}/3
              </p>
            )}

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

    return this.props.children;
  }
}

// Higher-order component for wrapping components with error boundary
export function withErrorBoundary(WrappedComponent, fallback = null) {
  return function WithErrorBoundary(props) {
    return (
      <ErrorBoundary fallback={fallback}>
        <WrappedComponent {...props} />
      </ErrorBoundary>
    );
  };
}

// Error message component for displaying user-friendly error messages
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

// Success message component
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

export default ErrorBoundary;
