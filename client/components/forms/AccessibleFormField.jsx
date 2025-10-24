import React from 'react';
import { Controller } from 'react-hook-form';

/**
 * AccessibleFormField - Standardized form field component
 * Ensures consistent accessibility across all admin forms
 */
export default function AccessibleFormField({
  name,
  control,
  rules,
  defaultValue,
  render,
  errors,
  className = '',
  label,
  required = false,
  description,
  ariaDescribedBy
}) {
  const hasError = errors && errors[name];
  const fieldId = `${name}-field`;
  const errorId = `${name}-error`;
  const descriptionId = `${name}-description`;

  return (
    <div className={className}>
      {label && (
        <label 
          htmlFor={fieldId} 
          className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2"
        >
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      
      {description && (
        <p id={descriptionId} className="text-sm text-gray-600 dark:text-gray-300 mb-2">
          {description}
        </p>
      )}
      
      <Controller
        name={name}
        control={control}
        defaultValue={defaultValue}
        rules={rules}
        render={({ field, fieldState }) => (
          <div>
            {render({ 
              field: {
                ...field,
                id: fieldId,
                'aria-label': label || name,
                'aria-describedby': [
                  hasError ? errorId : null,
                  description ? descriptionId : null,
                  ariaDescribedBy
                ].filter(Boolean).join(' ') || undefined,
                'aria-invalid': hasError ? 'true' : 'false'
              }, 
              fieldState, 
              hasError 
            })}
            
            {hasError && (
              <p 
                id={errorId}
                className="mt-1 text-sm text-red-600 dark:text-red-400" 
                role="alert"
                aria-live="polite"
              >
                {errors[name].message}
              </p>
            )}
          </div>
        )}
      />
    </div>
  );
}
