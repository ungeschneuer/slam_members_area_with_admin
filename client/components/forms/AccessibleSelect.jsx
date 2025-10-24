import React from 'react';

/**
 * AccessibleSelect - Standardized select component
 * Ensures consistent accessibility and styling
 */
export default function AccessibleSelect({
  options = [],
  placeholder = 'Bitte wählen...',
  disabled = false,
  className = '',
  field,
  hasError = false,
  ...props
}) {
  return (
    <select
      {...field}
      disabled={disabled}
      className={`w-full px-4 py-2 border border-gray-300 dark:border-gray-500 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white ${
        hasError ? 'border-red-500 focus:ring-red-500' : ''
      } ${className}`}
      {...props}
    >
      <option value="">{placeholder}</option>
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}
