import React from 'react';
import { Link } from 'react-router-dom';

/**
 * Reusable back button component
 * Supports both Link (to prop) and button (onClick prop)
 * Used 12+ times across detail pages (top + bottom)
 */
const BackButton = ({ to, onClick, children, className = '' }) => {
  const baseClasses = "btn-primary inline-flex items-center";
  
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
