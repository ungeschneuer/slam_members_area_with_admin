/**
 * API Client Helper
 *
 * Provides convenient wrappers for axios that match the fetch API pattern
 * used throughout the application. This allows gradual migration from fetch to axios.
 */

import api, { getErrorMessage } from './api.js';

/**
 * Perform a GET request
 * Returns data in the same format as the old fetch calls
 */
export async function apiGet(url, options = {}) {
  try {
    const { data } = await api.get(url, {
      params: options.params,
      ...options
    });
    return data;
  } catch (error) {
    const message = getErrorMessage(error);
    throw new Error(message);
  }
}

/**
 * Perform a POST request
 */
export async function apiPost(url, body, options = {}) {
  try {
    const { data } = await api.post(url, body, options);
    return data;
  } catch (error) {
    const message = getErrorMessage(error);
    throw new Error(message);
  }
}

/**
 * Perform a PUT request
 */
export async function apiPut(url, body, options = {}) {
  try {
    const { data } = await api.put(url, body, options);
    return data;
  } catch (error) {
    const message = getErrorMessage(error);
    throw new Error(message);
  }
}

/**
 * Perform a PATCH request
 */
export async function apiPatch(url, body, options = {}) {
  try {
    const { data } = await api.patch(url, body, options);
    return data;
  } catch (error) {
    const message = getErrorMessage(error);
    throw new Error(message);
  }
}

/**
 * Perform a DELETE request
 */
export async function apiDelete(url, options = {}) {
  try {
    const { data } = await api.delete(url, options);
    return data;
  } catch (error) {
    const message = getErrorMessage(error);
    throw new Error(message);
  }
}

/**
 * Upload file with FormData
 * Special handling for multipart/form-data
 */
export async function apiUpload(url, formData, options = {}) {
  try {
    const { data } = await api.post(url, formData, {
      ...options,
      headers: {
        'Content-Type': 'multipart/form-data',
        ...options.headers
      }
    });
    return data;
  } catch (error) {
    const message = getErrorMessage(error);
    throw new Error(message);
  }
}

// Export the main api instance for direct use
export { api as default };
