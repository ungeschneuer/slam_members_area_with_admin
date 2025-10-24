import React from 'react';
import { Controller } from 'react-hook-form';

export default function TextareaInput({
  label,
  name,
  register,
  rules,
  placeholder = '',
  disabled = false,
  errors,
  className = '',
  control,
  defaultValue,
  required = false,
  rows = 4,
  ariaLabel
}) {
  const hasError = errors && errors[name];
  
  // If control is provided, use Controller for better RHF integration
  if (control) {
    return (
      <div>
        {label && (
          <label htmlFor={name} className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            {label}
            {required && <span className="text-red-500 ml-1">*</span>}
          </label>
        )}
        <Controller
          name={name}
          control={control}
          defaultValue={defaultValue}
          rules={rules}
          render={({ field }) => (
            <textarea
              {...field}
              id={name}
              rows={rows}
              placeholder={placeholder}
              disabled={disabled}
              aria-label={ariaLabel || label}
              aria-invalid={hasError ? 'true' : 'false'}
              className={`w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white resize-vertical ${hasError ? 'border-red-500 focus:ring-red-500' : ''} ${className}`}
            />
          )}
        />
        {hasError && (
          <p className="mt-1 text-sm text-red-600 dark:text-red-400" role="alert">{errors[name].message}</p>
        )}
      </div>
    );
  }
  
  // Fallback to register-based approach
  return (
    <div>
      {label && (
        <label htmlFor={name} className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      <textarea
        id={name}
        name={name}
        rows={rows}
        placeholder={placeholder}
        disabled={disabled}
        aria-label={ariaLabel || label}
        aria-invalid={hasError ? 'true' : 'false'}
        {...(register ? register(name, rules) : {})}
        className={`w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white resize-vertical ${hasError ? 'border-red-500 focus:ring-red-500' : ''} ${className}`}
      />
      {hasError && (
        <p className="mt-1 text-sm text-red-600 dark:text-red-400" role="alert">{errors[name].message}</p>
      )}
    </div>
  );
}
