import { useState, useCallback } from 'react';

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

      const response = await fetch(endpoint, {
        method: 'POST',
        body: formData,
        credentials: 'include'
      });

      if (!response.ok) {
        let errorMessage = 'Upload failed';

        try {
          // Attempt to parse error response as JSON
          const contentType = response.headers.get('content-type');
          if (contentType && contentType.includes('application/json')) {
            const errorData = await response.json();
            errorMessage = errorData.error || errorMessage;
          } else {
            // Non-JSON error response, try to read as text
            const errorText = await response.text();
            errorMessage = errorText || `HTTP ${response.status}: ${response.statusText}`;
          }
        } catch (parseError) {
          // If parsing fails, use HTTP status
          console.error('Failed to parse error response:', parseError);
          errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        }

        throw new Error(errorMessage);
      }

      let result;
      try {
        result = await response.json();
      } catch (parseError) {
        console.error('Failed to parse success response:', parseError);
        throw new Error('Upload succeeded but response format was invalid');
      }

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
