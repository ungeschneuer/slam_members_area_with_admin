import React from 'react';
import { Controller } from 'react-hook-form';

export default function TextInput({
  label,
  name,
  register,
  rules,
  type = 'text',
  placeholder = '',
  disabled = false,
  errors,
  autoComplete,
  className = '',
  control,
  defaultValue,
  required = false
}) {
  const hasError = errors && errors[name];
  
  // If control is provided, use Controller for better RHF integration
  if (control) {
    return (
      <div>
        {label && (
          <label htmlFor={name} className="label-base">
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
            <input
              {...field}
              id={name}
              type={type}
              placeholder={placeholder}
              autoComplete={autoComplete}
              disabled={disabled}
              aria-invalid={hasError ? 'true' : 'false'}
              className={`input-base ${hasError ? 'border-red-500 focus:ring-red-500' : 'focus:ring-accent focus:border-primary'} ${className}`}
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
        <label htmlFor={name} className="label-base">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      <input
        id={name}
        name={name}
        type={type}
        placeholder={placeholder}
        autoComplete={autoComplete}
        aria-invalid={hasError ? 'true' : 'false'}
        {...(register ? register(name, rules) : {})}
        disabled={disabled}
        className={`input-base ${hasError ? 'border-red-500 focus:ring-red-500' : 'focus:ring-accent focus:border-primary'} ${className}`}
      />
      {hasError && (
        <p className="mt-1 text-sm text-red-600 dark:text-red-400" role="alert">{errors[name].message}</p>
      )}
    </div>
  );
}


