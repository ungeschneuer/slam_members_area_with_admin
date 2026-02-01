import React from 'react';

export default function LoadingSpinner({ size = "md", text = "Lädt..." }) {
  const sizeClasses = {
    sm: "w-4 h-4",
    md: "w-6 h-6", 
    lg: "w-8 h-8",
    xl: "w-12 h-12"
  };

  return (
    <div className="flex flex-col items-center justify-center py-12" role="status" aria-live="polite" aria-busy="true">
      <svg
        className={`animate-spin ${sizeClasses[size]} text-primary dark:text-accent mb-4`}
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <circle
          className="opacity-25"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="4"
        />
        <path
          className="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
        />
      </svg>
      <p className="text-gray-600 dark:text-gray-300">{text}</p>
    </div>
  );
}

export function LoadingCard({ className = '' }) {
  return (
    <div className={`bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700 ${className}`}>
      <LoadingSpinner size="lg" text="Inhalt wird geladen..." />
    </div>
  );
}

export function LoadingPage({ className = '' }) {
  return (
    <div className={`min-h-screen flex items-center justify-center ${className}`}>
      <LoadingSpinner size="xl" text="Anwendung wird geladen..." />
    </div>
  );
}
