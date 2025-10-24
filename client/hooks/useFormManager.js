import { useState, useCallback, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useError } from './useError.js';

/**
 * useFormManager Hook
 * 
 * Centralized form state management with error handling and validation.
 * Replaces dual form instances (addForm/editForm) with single managed form.
 */

export function useFormManager(schema, options = {}) {
  const { error, handleError, clearError } = useError();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  // Create form instance with schema validation
  const form = useForm({
    resolver: zodResolver(schema),
    mode: 'onChange',
    ...options
  });

  // Track form changes
  const { watch } = form;
  const watchedValues = watch();

  useEffect(() => {
    const subscription = watch((value, { name, type }) => {
      if (type === 'change') {
        setIsDirty(true);
      }
    });
    return () => subscription.unsubscribe();
  }, [watch]);

  /**
   * Submit form with error handling
   * @param {Function} onSubmit - The submit handler function
   * @param {Object} context - Additional context for error handling
   */
  const submitForm = useCallback(async (onSubmit, context = {}) => {
    setIsSubmitting(true);
    clearError();

    try {
      // CRITICAL FIX: Explicitly validate and show errors
      const isValid = await form.trigger();
      console.log('[useFormManager] Form validation:', { 
        isValid, 
        errors: form.formState.errors 
      });
      
      if (!isValid) {
        const errorMessages = Object.entries(form.formState.errors)
          .map(([field, error]) => `${field}: ${error.message}`)
          .join(', ');
        throw new Error(`Validation failed: ${errorMessages}`);
      }
      
      // Now submit if validation passed
      await form.handleSubmit(onSubmit)();
      setIsDirty(false);
    } catch (err) {
      console.error('[useFormManager] Submission error:', err);
      handleError(err, { context: 'form_submission', ...context });
    } finally {
      setIsSubmitting(false);
    }
  }, [form, handleError, clearError]);

  /**
   * Reset form to default values
   * @param {Object} values - Values to reset to (optional)
   */
  const resetForm = useCallback((values = null) => {
    if (values) {
      form.reset(values);
    } else {
      form.reset();
    }
    setIsDirty(false);
    clearError();
  }, [form, clearError]);

  /**
   * Set form values programmatically
   * @param {Object} values - Values to set
   */
  const setFormValues = useCallback((values) => {
    form.reset(values);
    setIsDirty(false);
    clearError();
  }, [form, clearError]);

  /**
   * Get form field value
   * @param {string} name - Field name
   * @returns {any} Field value
   */
  const getFieldValue = useCallback((name) => {
    return form.getValues(name);
  }, [form]);

  /**
   * Set form field value
   * @param {string} name - Field name
   * @param {any} value - Field value
   */
  const setFieldValue = useCallback((name, value) => {
    form.setValue(name, value, { shouldDirty: true });
    setIsDirty(true);
  }, [form]);

  /**
   * Get form field error
   * @param {string} name - Field name
   * @returns {string|undefined} Field error message
   */
  const getFieldError = useCallback((name) => {
    return form.formState.errors[name]?.message;
  }, [form]);

  /**
   * Clear form field error
   * @param {string} name - Field name
   */
  const clearFieldError = useCallback((name) => {
    form.clearErrors(name);
  }, [form]);

  /**
   * Validate form without submitting
   * @returns {boolean} Whether form is valid
   */
  const validateForm = useCallback(async () => {
    try {
      await form.trigger();
      return form.formState.isValid;
    } catch (err) {
      handleError(err, { context: 'form_validation' });
      return false;
    }
  }, [form, handleError]);

  /**
   * Check if form has unsaved changes
   * @returns {boolean} Whether form is dirty
   */
  const hasUnsavedChanges = useCallback(() => {
    return isDirty && !isSubmitting;
  }, [isDirty, isSubmitting]);

  /**
   * Get form state summary
   * @returns {Object} Form state summary
   */
  const getFormState = useCallback(() => {
    return {
      isSubmitting,
      isDirty,
      isValid: form.formState.isValid,
      isDirty: form.formState.isDirty,
      touchedFields: form.formState.touchedFields,
      dirtyFields: form.formState.dirtyFields,
      errors: form.formState.errors,
      values: form.getValues()
    };
  }, [form, isSubmitting, isDirty]);

  return {
    // Form instance
    form,
    
    // State
    error,
    isSubmitting,
    isDirty,
    
    // Actions
    submitForm,
    resetForm,
    setFormValues,
    getFieldValue,
    setFieldValue,
    getFieldError,
    clearFieldError,
    validateForm,
    hasUnsavedChanges,
    getFormState,
    
    // Form state helpers
    register: form.register,
    control: form.control,
    handleSubmit: form.handleSubmit,
    watch: form.watch,
    setValue: form.setValue,
    getValues: form.getValues,
    formState: form.formState,
    
    // Error handling
    clearError,
    handleError
  };
}

/**
 * useFormPersistence Hook
 * 
 * Provides form data persistence to localStorage
 */
export function useFormPersistence(formKey, form) {
  const { watch, reset } = form;

  // Save form data to localStorage
  const saveFormData = useCallback((data) => {
    try {
      localStorage.setItem(`form_${formKey}`, JSON.stringify(data));
    } catch (err) {
      console.warn('Failed to save form data:', err);
    }
  }, [formKey]);

  // Load form data from localStorage
  const loadFormData = useCallback(() => {
    try {
      const saved = localStorage.getItem(`form_${formKey}`);
      if (saved) {
        const data = JSON.parse(saved);
        reset(data);
        return data;
      }
    } catch (err) {
      console.warn('Failed to load form data:', err);
    }
    return null;
  }, [formKey, reset]);

  // Clear saved form data
  const clearFormData = useCallback(() => {
    try {
      localStorage.removeItem(`form_${formKey}`);
    } catch (err) {
      console.warn('Failed to clear form data:', err);
    }
  }, [formKey]);

  // Auto-save form data on changes
  useEffect(() => {
    const subscription = watch((value) => {
      if (value && Object.keys(value).length > 0) {
        saveFormData(value);
      }
    });

    return () => subscription.unsubscribe();
  }, [watch, saveFormData]);

  // Load form data on mount
  useEffect(() => {
    loadFormData();
  }, [loadFormData]);

  return {
    saveFormData,
    loadFormData,
    clearFormData
  };
}

/**
 * useFormManager with Persistence
 * 
 * Combines form management with persistence
 */
export function useFormManagerWithPersistence(schema, formKey, options = {}) {
  const formManager = useFormManager(schema, options);
  const persistence = useFormPersistence(formKey, formManager.form);

  return {
    ...formManager,
    ...persistence
  };
}

export default useFormManager;
