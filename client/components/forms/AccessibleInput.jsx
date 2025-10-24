import React from 'react';

/**
 * AccessibleInput - Standardized input component
 * Ensures consistent accessibility and styling
 */
export default function AccessibleInput({
  type = 'text',
  placeholder = '',
  disabled = false,
  className = '',
  field,
  hasError = false,
  ...props
}) {
  return (
    <input
      {...field}
      type={type}
      placeholder={placeholder}
      disabled={disabled}
      className={`w-full px-4 py-2 border border-gray-300 dark:border-gray-500 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white ${
        hasError ? 'border-red-500 focus:ring-red-500' : ''
      } ${className}`}
      {...props}
    />
  );
}
