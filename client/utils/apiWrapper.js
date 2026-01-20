/**
 * Standardized API call wrapper for consistent error handling and response processing
 */

import { API_URL } from '../config/api.js';

/**
 * Custom API error class
 */
export class ApiError extends Error {
  constructor(message, status, details = null) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.details = details;
  }
}

/**
 * Extract error message from response
 * @param {Response} response - Fetch response object
 * @returns {Promise<Object>} Error information
 */
async function extractErrorInfo(response) {
  let bodyText = '';
  try {
    bodyText = await response.text();
    const parsed = JSON.parse(bodyText);
    return {
      message: parsed?.error || parsed?.message || `HTTP ${response.status}: ${response.statusText}`,
      details: parsed?.details || null
    };
  } catch (e) {
    // If JSON parsing fails, return status text
    return {
      message: bodyText || `HTTP ${response.status}: ${response.statusText}`,
      details: null
    };
  }
}

/**
 * Standardized API call function
 * @param {string} endpoint - API endpoint path (e.g., '/participants')
 * @param {Object} options - Fetch options
 * @param {Object} config - Additional configuration
 * @returns {Promise<any>} API response data
 */
export async function apiCall(endpoint, options = {}, config = {}) {
  const {
    baseUrl = API_URL,
    extractData = true,
    throwOnError = true
  } = config;

  // Build full URL
  const url = endpoint.startsWith('http') ? endpoint : `${baseUrl}${endpoint}`;

  // Default options
  const defaultOptions = {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    }
  };

  // Merge options
  const fetchOptions = {
    ...defaultOptions,
    ...options,
    headers: {
      ...defaultOptions.headers,
      ...options.headers
    }
  };

  try {
    const response = await fetch(url, fetchOptions);

    // Handle error responses
    if (!response.ok) {
      const errorInfo = await extractErrorInfo(response);
      const error = new ApiError(errorInfo.message, response.status, errorInfo.details);

      if (throwOnError) {
        throw error;
      }

      return {
        success: false,
        error: error.message,
        status: error.status,
        details: error.details
      };
    }

    // Parse response
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      const result = await response.json();

      // Extract data from nested structure if configured
      if (extractData) {
        return extractResponseData(result);
      }

      return result;
    }

    // Return text for non-JSON responses
    return await response.text();
  } catch (error) {
    // Re-throw ApiError
    if (error instanceof ApiError) {
      throw error;
    }

    // Wrap other errors
    throw new ApiError(
      error.message || 'Network request failed',
      0,
      { originalError: error }
    );
  }
}

/**
 * Extract data from nested API response structures
 * @param {Object} response - API response object
 * @returns {any} Extracted data
 */
export function extractResponseData(response) {
  // Handle various response structures
  if (response?.data?.data?.rows) {
    return response.data.data.rows;
  }
  if (response?.data?.rows) {
    return response.data.rows;
  }
  if (response?.data) {
    return response.data;
  }
  if (Array.isArray(response)) {
    return response;
  }
  return response;
}

/**
 * Standardized GET request
 * @param {string} endpoint - API endpoint path
 * @param {Object} config - Request configuration
 * @returns {Promise<any>} API response data
 */
export async function apiGet(endpoint, config = {}) {
  return apiCall(endpoint, { method: 'GET' }, config);
}

/**
 * Standardized POST request
 * @param {string} endpoint - API endpoint path
 * @param {Object} data - Request body data
 * @param {Object} config - Request configuration
 * @returns {Promise<any>} API response data
 */
export async function apiPost(endpoint, data = {}, config = {}) {
  return apiCall(
    endpoint,
    {
      method: 'POST',
      body: JSON.stringify(data)
    },
    config
  );
}

/**
 * Standardized PUT request
 * @param {string} endpoint - API endpoint path
 * @param {Object} data - Request body data
 * @param {Object} config - Request configuration
 * @returns {Promise<any>} API response data
 */
export async function apiPut(endpoint, data = {}, config = {}) {
  return apiCall(
    endpoint,
    {
      method: 'PUT',
      body: JSON.stringify(data)
    },
    config
  );
}

/**
 * Standardized DELETE request
 * @param {string} endpoint - API endpoint path
 * @param {Object} config - Request configuration
 * @returns {Promise<any>} API response data
 */
export async function apiDelete(endpoint, config = {}) {
  return apiCall(endpoint, { method: 'DELETE' }, config);
}

/**
 * Standardized PATCH request
 * @param {string} endpoint - API endpoint path
 * @param {Object} data - Request body data
 * @param {Object} config - Request configuration
 * @returns {Promise<any>} API response data
 */
export async function apiPatch(endpoint, data = {}, config = {}) {
  return apiCall(
    endpoint,
    {
      method: 'PATCH',
      body: JSON.stringify(data)
    },
    config
  );
}

/**
 * Helper for file upload requests
 * @param {string} endpoint - API endpoint path
 * @param {FormData} formData - Form data with file
 * @param {Object} config - Request configuration
 * @returns {Promise<any>} API response data
 */
export async function apiUpload(endpoint, formData, config = {}) {
  const options = {
    method: 'POST',
    body: formData,
    headers: {} // Let browser set Content-Type with boundary for multipart/form-data
  };

  return apiCall(endpoint, options, { ...config, extractData: false });
}

/**
 * Check if an error is an ApiError
 * @param {Error} error - Error object
 * @returns {boolean} True if ApiError
 */
export function isApiError(error) {
  return error instanceof ApiError;
}

/**
 * Get user-friendly error message
 * @param {Error} error - Error object
 * @returns {string} Error message
 */
export function getErrorMessage(error) {
  if (isApiError(error)) {
    return error.message;
  }
  return error?.message || 'Ein unbekannter Fehler ist aufgetreten';
}
