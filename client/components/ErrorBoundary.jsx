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
    this.setState({
      error,
      errorInfo,
      retryCount: this.state.retryCount + 1
    });

    // Log error to console in development
    if (import.meta.env.DEV) {
      console.error('ErrorBoundary caught an error:', error, errorInfo);
    }

    // Log error to external service in production
    if (import.meta.env.PROD) {
      this.logErrorToService(error, errorInfo);
    }
  }

  logErrorToService = (error, errorInfo) => {
    // Enhanced error logging with more context
    const errorData = {
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo && errorInfo.componentStack ? errorInfo.componentStack : '',
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href,
      userId: this.props.userId || 'anonymous',
      retryCount: this.state.retryCount,
      errorBoundary: this.props.name || 'Unknown',
      props: this.props
    };

    // In a real application, you would send this to an error tracking service
    // like Sentry, LogRocket, or Bugsnag
    // Error reporting simplified to console for now
  };

  handleRetry = () => {
    this.setState({ 
      hasError: false, 
      error: null, 
      errorInfo: null 
    });
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      const { error, errorInfo, retryCount } = this.state;
      const { fallback: FallbackComponent, showDetails = false } = this.props;

      // Use custom fallback component if provided
      if (FallbackComponent) {
        return <FallbackComponent error={error} retry={this.handleRetry} />;
      }

      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
          <div className="max-w-md w-full space-y-8">
            <div className="text-center">
              <div className="mx-auto h-12 w-12 text-red-500">⚠️</div>
              <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
                Oops! Something went wrong
              </h2>
              <p className="mt-2 text-sm text-gray-600">
                We're sorry, but something unexpected happened. Please try again.
              </p>
            </div>

            <div className="mt-8 space-y-4">
              <button
                onClick={this.handleRetry}
                className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                <span className="w-4 h-4 mr-2">⟳</span>
                Try Again
              </button>

              <button
                onClick={this.handleGoHome}
                className="group relative w-full flex justify-center py-2 px-4 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                <span className="w-4 h-4 mr-2">⌂</span>
                Go Home
              </button>
            </div>

            {showDetails && import.meta.env.DEV && (
              <details className="mt-8">
                <summary className="cursor-pointer text-sm font-medium text-gray-700 hover:text-gray-900">
                  Error Details (Development Only)
                </summary>
                <div className="mt-4 p-4 bg-gray-100 rounded-md">
                  <h4 className="text-sm font-medium text-gray-900 mb-2">Error:</h4>
                  <pre className="text-xs text-gray-600 whitespace-pre-wrap">
                    {error && error.toString()}
                  </pre>
                  
                  <h4 className="text-sm font-medium text-gray-900 mb-2 mt-4">Component Stack:</h4>
                  <pre className="text-xs text-gray-600 whitespace-pre-wrap">
                    {errorInfo && errorInfo.componentStack ? errorInfo.componentStack : 'No component stack available'}
                  </pre>
                  
                  <div className="mt-4 text-xs text-gray-500">
                    Retry count: {retryCount}
                  </div>
                </div>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Higher-order component for easier usage
export const withErrorBoundary = (Component, errorBoundaryProps = {}) => {
  const WrappedComponent = (props) => (
    <ErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </ErrorBoundary>
  );
  
  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;
  return WrappedComponent;
};

// Hook for error boundary context
export const useErrorBoundary = () => {
  const [error, setError] = React.useState(null);
  
  const resetError = React.useCallback(() => {
    setError(null);
  }, []);
  
  const captureError = React.useCallback((error) => {
    setError(error);
  }, []);
  
  React.useEffect(() => {
    if (error) {
      throw error;
    }
  }, [error]);
  
  return { captureError, resetError };
};

export default ErrorBoundary;
