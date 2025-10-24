/**
 * useFormManager Hook Unit Tests
 * 
 * Tests for centralized form state management hook
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useFormManager, useFormPersistence, useFormManagerWithPersistence } from '../useFormManager.js';
import { z } from 'zod';

// Mock the useError hook
vi.mock('../useError.js', () => ({
  useError: () => ({
    error: null,
    handleError: vi.fn(),
    clearError: vi.fn()
  })
}));

describe('useFormManager', () => {
  const testSchema = z.object({
    name: z.string().min(1, 'Name ist erforderlich'),
    email: z.string().email('Ungültige E-Mail'),
    age: z.number().min(18, 'Mindestalter 18 Jahre')
  });

  const defaultValues = {
    name: '',
    email: '',
    age: 18
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Basic functionality', () => {
    it('should initialize with default values', () => {
      const { result } = renderHook(() => 
        useFormManager(testSchema, { defaultValues })
      );

      expect(result.current.form).toBeDefined();
      expect(result.current.isSubmitting).toBe(false);
      expect(result.current.isDirty).toBe(false);
      expect(result.current.error).toBe(null);
    });

    it('should track form state', () => {
      const { result } = renderHook(() => 
        useFormManager(testSchema, { defaultValues })
      );

      const formState = result.current.getFormState();
      expect(formState.isSubmitting).toBe(false);
      expect(formState.isDirty).toBe(false);
      expect(formState.isValid).toBe(false);
      expect(formState.values).toEqual(defaultValues);
    });
  });

  describe('Form submission', () => {
    it('should handle successful form submission', async () => {
      const mockOnSubmit = vi.fn().mockResolvedValue({ success: true });
      const { result } = renderHook(() => 
        useFormManager(testSchema, { defaultValues })
      );

      // Set valid form values
      act(() => {
        result.current.setFieldValue('name', 'John Doe');
        result.current.setFieldValue('email', 'john@example.com');
        result.current.setFieldValue('age', 25);
      });

      await act(async () => {
        await result.current.submitForm(mockOnSubmit);
      });

      expect(mockOnSubmit).toHaveBeenCalledWith({
        name: 'John Doe',
        email: 'john@example.com',
        age: 25
      });
      expect(result.current.isSubmitting).toBe(false);
    });

    it('should handle form submission errors', async () => {
      const mockOnSubmit = vi.fn().mockRejectedValue(new Error('Submission failed'));
      const { result } = renderHook(() => 
        useFormManager(testSchema, { defaultValues })
      );

      await act(async () => {
        await result.current.submitForm(mockOnSubmit);
      });

      expect(result.current.isSubmitting).toBe(false);
      // Error handling is mocked, so we can't test the actual error state
    });

    it('should track submission state', async () => {
      const mockOnSubmit = vi.fn().mockImplementation(() => 
        new Promise(resolve => setTimeout(resolve, 100))
      );
      const { result } = renderHook(() => 
        useFormManager(testSchema, { defaultValues })
      );

      // Set valid form values
      act(() => {
        result.current.setFieldValue('name', 'John Doe');
        result.current.setFieldValue('email', 'john@example.com');
        result.current.setFieldValue('age', 25);
      });

      // Start submission
      act(() => {
        result.current.submitForm(mockOnSubmit);
      });

      expect(result.current.isSubmitting).toBe(true);

      // Wait for completion
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 150));
      });

      expect(result.current.isSubmitting).toBe(false);
    });
  });

  describe('Form reset', () => {
    it('should reset form to default values', () => {
      const { result } = renderHook(() => 
        useFormManager(testSchema, { defaultValues })
      );

      // Set some values
      act(() => {
        result.current.setFieldValue('name', 'John Doe');
        result.current.setFieldValue('email', 'john@example.com');
      });

      expect(result.current.getFieldValue('name')).toBe('John Doe');

      // Reset form
      act(() => {
        result.current.resetForm();
      });

      expect(result.current.getFieldValue('name')).toBe('');
      expect(result.current.getFieldValue('email')).toBe('');
      expect(result.current.isDirty).toBe(false);
    });

    it('should reset form to specific values', () => {
      const { result } = renderHook(() => 
        useFormManager(testSchema, { defaultValues })
      );

      const newValues = {
        name: 'Jane Doe',
        email: 'jane@example.com',
        age: 30
      };

      act(() => {
        result.current.resetForm(newValues);
      });

      expect(result.current.getFieldValue('name')).toBe('Jane Doe');
      expect(result.current.getFieldValue('email')).toBe('jane@example.com');
      expect(result.current.getFieldValue('age')).toBe(30);
    });
  });

  describe('Field management', () => {
    it('should get and set field values', () => {
      const { result } = renderHook(() => 
        useFormManager(testSchema, { defaultValues })
      );

      act(() => {
        result.current.setFieldValue('name', 'John Doe');
      });

      expect(result.current.getFieldValue('name')).toBe('John Doe');
    });

    it('should get field errors', () => {
      const { result } = renderHook(() => 
        useFormManager(testSchema, { defaultValues })
      );

      // Set invalid value
      act(() => {
        result.current.setFieldValue('email', 'invalid-email');
      });

      // Trigger validation
      act(() => {
        result.current.form.trigger('email');
      });

      const error = result.current.getFieldError('email');
      expect(error).toBe('Ungültige E-Mail');
    });

    it('should clear field errors', () => {
      const { result } = renderHook(() => 
        useFormManager(testSchema, { defaultValues })
      );

      // Set invalid value
      act(() => {
        result.current.setFieldValue('email', 'invalid-email');
      });

      // Trigger validation
      act(() => {
        result.current.form.trigger('email');
      });

      expect(result.current.getFieldError('email')).toBe('Ungültige E-Mail');

      // Clear error
      act(() => {
        result.current.clearFieldError('email');
      });

      expect(result.current.getFieldError('email')).toBeUndefined();
    });
  });

  describe('Form validation', () => {
    it('should validate form', async () => {
      const { result } = renderHook(() => 
        useFormManager(testSchema, { defaultValues })
      );

      // Set invalid values
      act(() => {
        result.current.setFieldValue('name', '');
        result.current.setFieldValue('email', 'invalid-email');
        result.current.setFieldValue('age', 17);
      });

      const isValid = await act(async () => {
        return await result.current.validateForm();
      });

      expect(isValid).toBe(false);
    });

    it('should track dirty state', () => {
      const { result } = renderHook(() => 
        useFormManager(testSchema, { defaultValues })
      );

      expect(result.current.isDirty).toBe(false);

      // Make a change
      act(() => {
        result.current.setFieldValue('name', 'John Doe');
      });

      expect(result.current.isDirty).toBe(true);
    });

    it('should check for unsaved changes', () => {
      const { result } = renderHook(() => 
        useFormManager(testSchema, { defaultValues })
      );

      expect(result.current.hasUnsavedChanges()).toBe(false);

      // Make a change
      act(() => {
        result.current.setFieldValue('name', 'John Doe');
      });

      expect(result.current.hasUnsavedChanges()).toBe(true);
    });
  });

  describe('Form state helpers', () => {
    it('should provide form state summary', () => {
      const { result } = renderHook(() => 
        useFormManager(testSchema, { defaultValues })
      );

      const formState = result.current.getFormState();
      
      expect(formState).toHaveProperty('isSubmitting');
      expect(formState).toHaveProperty('isDirty');
      expect(formState).toHaveProperty('isValid');
      expect(formState).toHaveProperty('values');
      expect(formState).toHaveProperty('errors');
    });

    it('should expose form methods', () => {
      const { result } = renderHook(() => 
        useFormManager(testSchema, { defaultValues })
      );

      expect(result.current.register).toBeDefined();
      expect(result.current.control).toBeDefined();
      expect(result.current.handleSubmit).toBeDefined();
      expect(result.current.watch).toBeDefined();
      expect(result.current.setValue).toBeDefined();
      expect(result.current.getValues).toBeDefined();
      expect(result.current.formState).toBeDefined();
    });
  });
});

describe('useFormPersistence', () => {
  const mockForm = {
    watch: vi.fn(),
    reset: vi.fn()
  };

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('should save form data to localStorage', () => {
    const { result } = renderHook(() => 
      useFormPersistence('test-form', mockForm)
    );

    const testData = { name: 'John Doe', email: 'john@example.com' };
    
    act(() => {
      result.current.saveFormData(testData);
    });

    const saved = localStorage.getItem('form_test-form');
    expect(saved).toBe(JSON.stringify(testData));
  });

  it('should load form data from localStorage', () => {
    const testData = { name: 'John Doe', email: 'john@example.com' };
    localStorage.setItem('form_test-form', JSON.stringify(testData));

    const { result } = renderHook(() => 
      useFormPersistence('test-form', mockForm)
    );

    act(() => {
      result.current.loadFormData();
    });

    expect(mockForm.reset).toHaveBeenCalledWith(testData);
  });

  it('should clear form data from localStorage', () => {
    localStorage.setItem('form_test-form', JSON.stringify({ name: 'John Doe' }));

    const { result } = renderHook(() => 
      useFormPersistence('test-form', mockForm)
    );

    act(() => {
      result.current.clearFormData();
    });

    const saved = localStorage.getItem('form_test-form');
    expect(saved).toBeNull();
  });

  it('should handle localStorage errors gracefully', () => {
    // Mock localStorage to throw error
    const originalSetItem = localStorage.setItem;
    localStorage.setItem = vi.fn().mockImplementation(() => {
      throw new Error('Storage quota exceeded');
    });

    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const { result } = renderHook(() => 
      useFormPersistence('test-form', mockForm)
    );

    act(() => {
      result.current.saveFormData({ name: 'John Doe' });
    });

    expect(consoleSpy).toHaveBeenCalledWith('Failed to save form data:', expect.any(Error));

    // Restore
    localStorage.setItem = originalSetItem;
    consoleSpy.mockRestore();
  });
});

describe('useFormManagerWithPersistence', () => {
  const testSchema = z.object({
    name: z.string().min(1, 'Name ist erforderlich'),
    email: z.string().email('Ungültige E-Mail')
  });

  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('should combine form management with persistence', () => {
    const { result } = renderHook(() => 
      useFormManagerWithPersistence(testSchema, 'test-form')
    );

    expect(result.current.form).toBeDefined();
    expect(result.current.saveFormData).toBeDefined();
    expect(result.current.loadFormData).toBeDefined();
    expect(result.current.clearFormData).toBeDefined();
  });

  it('should auto-save form data on changes', () => {
    const { result } = renderHook(() => 
      useFormManagerWithPersistence(testSchema, 'test-form')
    );

    // Simulate form changes
    act(() => {
      result.current.setFieldValue('name', 'John Doe');
      result.current.setFieldValue('email', 'john@example.com');
    });

    // Check if data was saved
    const saved = localStorage.getItem('form_test-form');
    expect(saved).toBeDefined();
    
    const parsedData = JSON.parse(saved);
    expect(parsedData.name).toBe('John Doe');
    expect(parsedData.email).toBe('john@example.com');
  });
});
