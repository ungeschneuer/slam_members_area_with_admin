import React, { useState } from 'react';
import { handleLinkClick } from '../../utils/linkUtils.js';

/**
 * Reusable PDF display component
 * Handles PDF display with proper accessibility and error handling
 */
function PDFDisplay({ 
  pdfUrl, 
  title = "PDF-Dokument", 
  description = "Zugehöriges PDF-Dokument",
  variant = "default", // "default" | "compact" | "inline"
  className = ""
}) {
  const [hasError, setHasError] = useState(false);

  if (!pdfUrl) return null;

  const handleError = () => {
    setHasError(true);
  };

  const handleClick = (e) => {
    e.preventDefault();
    const pdfLink = {
      url: pdfUrl,
      title: title,
      is_external: true
    };
    handleLinkClick(pdfLink, e, () => {
      console.error('Failed to open PDF:', pdfUrl);
      setHasError(true);
    });
  };

  if (hasError) {
    return (
      <div className={`flex items-center space-x-3 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg ${className}`}>
        <span className="text-2xl" aria-hidden="true">⚠️</span>
        <div>
          <p className="text-sm font-medium text-red-700 dark:text-red-300">
            PDF konnte nicht geladen werden
          </p>
          <p className="text-xs text-red-600 dark:text-red-400">
            Bitte versuchen Sie es später erneut
          </p>
        </div>
      </div>
    );
  }

  const baseClasses = "flex items-center space-x-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg";
  const variantClasses = {
    default: "space-x-4 p-6",
    compact: "space-x-3 p-3",
    inline: "space-x-2 p-2"
  };

  const iconSizes = {
    default: "text-4xl",
    compact: "text-2xl", 
    inline: "text-xl"
  };

  const textSizes = {
    default: "text-lg",
    compact: "text-sm",
    inline: "text-xs"
  };

  return (
    <div className={`${baseClasses} ${variantClasses[variant]} ${className}`}>
      <span 
        className={iconSizes[variant]} 
        aria-hidden="true"
      >
        📄
      </span>
      <div>
        <p className={`font-medium text-gray-700 dark:text-gray-300 ${textSizes[variant]}`}>
          {title}
        </p>
        {description && variant !== 'inline' && (
          <p className={`text-gray-600 dark:text-gray-400 ${variant === 'compact' ? 'text-xs' : 'text-sm'}`}>
            {description}
          </p>
        )}
        <button
          onClick={handleClick}
          className={`text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 transition-colors ${
            variant === 'inline' ? 'text-xs' : 'text-sm'
          }`}
          aria-label={`${title} in neuem Tab öffnen`}
        >
          PDF anzeigen
        </button>
      </div>
    </div>
  );
}

export default PDFDisplay;
