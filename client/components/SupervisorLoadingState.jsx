import React from 'react';

/**
 * Simple supervisor loading component
 * Follows project's "Keep It Simple" principles, accessibility standards, and design system
 */
export default function SupervisorLoadingState({ onRetry, retryCount = 0, className = '' }) {
  return (
    <div 
      className={`min-h-screen bg-gradient-to-br from-primary to-primary-dark dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4 ${className}`}
      role="main"
      aria-label="Server startup in progress"
    >
      <div className="card-base max-w-md w-full p-8 text-center">
        {/* Accessible animated icon */}
        <div 
          className="w-24 h-24 bg-gradient-to-br from-accent to-primary rounded-full flex items-center justify-center mx-auto mb-6 animate-pulse"
          role="img"
          aria-label="SLAM25 Poetry Slam logo"
        >
          <span className="text-4xl" aria-hidden="true">🎭</span>
        </div>

        {/* Semantic heading */}
        <h1 className="heading-primary mb-2">
          SLAM25 wird gestartet
        </h1>
        
        <p className="text-body mb-8">
          Der Server benötigt einen Moment zum Hochfahren...
        </p>

        {/* Accessible progress indicator */}
        <div 
          className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 mb-6"
          role="progressbar"
          aria-valuenow="60"
          aria-valuemin="0"
          aria-valuemax="100"
          aria-label="Server startup progress"
        >
          <div 
            className="bg-gradient-to-r from-accent to-primary h-3 rounded-full animate-pulse" 
            style={{ width: '60%' }}
            aria-hidden="true"
          ></div>
        </div>

        {/* Accessible retry button */}
        {retryCount > 0 && onRetry && (
          <button
            onClick={onRetry}
            className="btn-primary w-full"
            aria-label={`Erneut versuchen, Versuch ${retryCount} von 3`}
          >
            Erneut versuchen ({retryCount}/3)
          </button>
        )}

        {/* Accessible tip */}
        <div className="mt-6 text-muted" role="note" aria-label="Hilfreicher Tipp">
          💡 Der Server startet normalerweise innerhalb von 30 Sekunden
        </div>
      </div>
    </div>
  );
}
