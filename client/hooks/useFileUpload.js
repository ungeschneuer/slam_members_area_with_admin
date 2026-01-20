import { useState, useCallback } from 'react';
import { apiUpload } from '../utils/apiWrapper.js';

/**
 * Unified file upload hook
 * Handles both image and PDF uploads with consistent validation and error handling
 */
export function useFileUpload() {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);

  const uploadFile = useCallback(async ({
    file,
    endpoint,
    onSuccess,
    onError,
    maxSize = 15 * 1024 * 1024, // 15MB default
    allowedTypes = ['image/*', 'application/pdf'],
    fieldName = 'file',
    additionalData = {}
  }) => {
    if (!file) return;

    // Reset error state
    setError(null);

    // Client-side validation
    if (file.size > maxSize) {
      const errorMsg = `Datei zu groß. Maximale Größe ist ${Math.round(maxSize / (1024 * 1024))}MB.`;
      setError(errorMsg);
      onError?.(errorMsg);
      return;
    }

    // Type validation
    const isValidType = allowedTypes.some(type => {
      if (type.endsWith('/*')) {
        return file.type.startsWith(type.slice(0, -1));
      }
      return file.type === type;
    });

    if (!isValidType) {
      const errorMsg = `Ungültiger Dateityp. Erlaubt: ${allowedTypes.join(', ')}`;
      setError(errorMsg);
      onError?.(errorMsg);
      return;
    }

    try {
      setUploading(true);
      const formData = new FormData();
      formData.append(fieldName, file);

      // Append additional data to FormData
      Object.entries(additionalData).forEach(([key, value]) => {
        if (value !== null && value !== undefined) {
          formData.append(key, value);
        }
      });

      const result = await apiUpload(endpoint, formData);
      onSuccess?.(result);
      return result;
    } catch (err) {
      const errorMsg = `Upload fehlgeschlagen: ${err.message}`;
      setError(errorMsg);
      onError?.(errorMsg);
      throw err;
    } finally {
      setUploading(false);
    }
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    uploading,
    error,
    uploadFile,
    clearError
  };
}
