import React from 'react';
import { Controller } from 'react-hook-form';

export default function CheckboxInput({
  label,
  name,
  register,
  rules,
  disabled = false,
  errors,
  className = '',
  control,
  defaultValue = false,
  required = false,
  description
}) {
  const hasError = errors && errors[name];
  
  // If control is provided, use Controller for better RHF integration
  if (control) {
    return (
      <div>
        <Controller
          name={name}
          control={control}
          defaultValue={defaultValue}
          rules={rules}
          render={({ field }) => (
            <div className="flex items-start">
              <div className="flex items-center h-5">
                <input
                  {...field}
                  id={name}
                  type="checkbox"
                  checked={field.value}
                  disabled={disabled}
                  aria-invalid={hasError ? 'true' : 'false'}
                  className={`h-4 w-4 text-blue-600 focus:ring-2 focus:ring-blue-500 border-gray-300 dark:border-gray-600 rounded ${hasError ? 'border-red-500 focus:ring-red-500' : ''} ${className}`}
                />
              </div>
              <div className="ml-3 text-sm">
                <label htmlFor={name} className="font-medium text-gray-700 dark:text-gray-300">
                  {label}
                  {required && <span className="text-red-500 ml-1">*</span>}
                </label>
                {description && (
                  <p className="text-gray-500 dark:text-gray-400">{description}</p>
                )}
              </div>
            </div>
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
      <div className="flex items-start">
        <div className="flex items-center h-5">
          <input
            id={name}
            name={name}
            type="checkbox"
            disabled={disabled}
            aria-invalid={hasError ? 'true' : 'false'}
            {...(register ? register(name, rules) : {})}
            className={`h-4 w-4 text-blue-600 focus:ring-2 focus:ring-blue-500 border-gray-300 dark:border-gray-600 rounded ${hasError ? 'border-red-500 focus:ring-red-500' : ''} ${className}`}
          />
        </div>
        <div className="ml-3 text-sm">
          <label htmlFor={name} className="font-medium text-gray-700 dark:text-gray-300">
            {label}
            {required && <span className="text-red-500 ml-1">*</span>}
          </label>
          {description && (
            <p className="text-gray-500 dark:text-gray-400">{description}</p>
          )}
        </div>
      </div>
      {hasError && (
        <p className="mt-1 text-sm text-red-600 dark:text-red-400" role="alert">{errors[name].message}</p>
      )}
    </div>
  );
}
