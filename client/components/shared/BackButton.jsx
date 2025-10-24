import React from 'react';
import { Link } from 'react-router-dom';

/**
 * Reusable back button component
 * Supports both Link (to prop) and button (onClick prop)
 * Used 12+ times across detail pages (top + bottom)
 */
const BackButton = ({ to, onClick, children, className = '' }) => {
  const baseClasses = "inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200";
  
  if (to) {
    return (
      <Link
        to={to}
        className={`${baseClasses} ${className}`}
      >
        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        {children || 'Zurück'}
      </Link>
    );
  }
  
  if (onClick) {
    return (
      <button
        onClick={onClick}
        className={`${baseClasses} ${className}`}
      >
        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        {children || 'Zurück'}
      </button>
    );
  }
  
  return null;
};

export default BackButton;
