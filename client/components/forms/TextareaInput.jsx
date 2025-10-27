import React from 'react';
import { Controller, useFormContext } from 'react-hook-form';

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
  ariaLabel,
  maxLength
}) {
  const hasError = errors && errors[name];
  const formContext = useFormContext();
  const watchedValue = formContext?.watch ? (formContext.watch(name) || '') : '';
  
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
            <>
              <textarea
                {...field}
                id={name}
                rows={rows}
                placeholder={placeholder}
                disabled={disabled}
                aria-label={ariaLabel || label}
                aria-invalid={hasError ? 'true' : 'false'}
                maxLength={maxLength}
                className={`textarea-base ${hasError ? 'border-red-500 focus:ring-red-500' : 'focus:ring-[#A2D2B9] focus:border-[#185757]'} ${className}`}
              />
              {maxLength && (
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  {field.value?.length || 0}/{maxLength} Zeichen
                </p>
              )}
            </>
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
      <textarea
        id={name}
        name={name}
        rows={rows}
        placeholder={placeholder}
        disabled={disabled}
        aria-label={ariaLabel || label}
        aria-invalid={hasError ? 'true' : 'false'}
        maxLength={maxLength}
        {...(register ? register(name, rules) : {})}
        className={`textarea-base ${hasError ? 'border-red-500 focus:ring-red-500' : 'focus:ring-[#A2D2B9] focus:border-[#185757]'} ${className}`}
      />
      {hasError && (
        <p className="mt-1 text-sm text-red-600 dark:text-red-400" role="alert">{errors[name].message}</p>
      )}
      {maxLength && (
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          {watchedValue.length}/{maxLength} Zeichen
        </p>
      )}
    </div>
  );
}
