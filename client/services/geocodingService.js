/**
 * Geocoding Service
 * 
 * Centralized service for handling external geocoding API calls with proper
 * error handling, rate limiting, and fallback mechanisms.
 */

import { ErrorService } from './errorService.js';

class GeocodingService {
  constructor() {
    this.baseURL = 'https://nominatim.openstreetmap.org';
    this.rateLimitDelay = 1000; // 1 second between requests
    this.lastRequestTime = 0;
    this.maxRetries = 3;
    this.timeout = 10000; // 10 seconds
  }

  /**
   * Geocode an address to coordinates
   * @param {string} address - The address to geocode
   * @param {Object} options - Additional options
   * @returns {Promise<{lat: number, lng: number, displayName: string}>}
   */
  async geocodeAddress(address, options = {}) {
    if (!address || address.trim() === '') {
      throw new Error('Address is required for geocoding');
    }

    // Rate limiting
    await this.enforceRateLimit();

    const params = new URLSearchParams({
      format: 'json',
      q: address.trim(),
      limit: '1',
      countrycodes: 'de', // Restrict to Germany
      addressdetails: '1',
      ...options
    });

    const url = `${this.baseURL}/search?${params}`;
    
    return this.makeRequestWithRetry(url);
  }

  /**
   * Make request with retry logic
   * @param {string} url - The URL to request
   * @returns {Promise<Object>} Geocoding result
   */
  async makeRequestWithRetry(url) {
    let lastError;
    
    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        const result = await this.makeRequest(url);
        return result;
      } catch (error) {
        lastError = error;
        
        // Don't retry on certain errors
        if (this.isNonRetryableError(error)) {
          throw error;
        }
        
        // Wait before retry (exponential backoff)
        if (attempt < this.maxRetries) {
          const delay = Math.pow(2, attempt) * 1000; // 2s, 4s, 8s
          await this.delay(delay);
        }
      }
    }
    
    throw lastError;
  }

  /**
   * Make a single request
   * @param {string} url - The URL to request
   * @returns {Promise<Object>} Geocoding result
   */
  async makeRequest(url) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(url, {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'SLAM25-Members-Area/1.0' // Required by Nominatim
        },
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Geocoding API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();

      if (!Array.isArray(data) || data.length === 0) {
        throw new Error('No results found for the given address');
      }

      const result = data[0];
      return {
        lat: parseFloat(result.lat),
        lng: parseFloat(result.lon),
        displayName: result.display_name,
        address: result.address || {}
      };

    } catch (error) {
      clearTimeout(timeoutId);
      
      if (error.name === 'AbortError') {
        throw new Error('Geocoding request timed out');
      }
      
      throw error;
    }
  }

  /**
   * Check if error should not be retried
   * @param {Error} error - The error to check
   * @returns {boolean} True if error should not be retried
   */
  isNonRetryableError(error) {
    const nonRetryablePatterns = [
      'No results found',
      'Address is required',
      'Invalid address format'
    ];
    
    return nonRetryablePatterns.some(pattern => 
      error.message.includes(pattern)
    );
  }

  /**
   * Enforce rate limiting between requests
   */
  async enforceRateLimit() {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    
    if (timeSinceLastRequest < this.rateLimitDelay) {
      const delay = this.rateLimitDelay - timeSinceLastRequest;
      await this.delay(delay);
    }
    
    this.lastRequestTime = Date.now();
  }

  /**
   * Delay execution
   * @param {number} ms - Milliseconds to delay
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Handle geocoding errors with user-friendly messages
   * @param {Error} error - The error to handle
   * @returns {Object} Processed error information
   */
  handleError(error) {
    return ErrorService.handleError(error, {
      context: 'geocoding',
      service: 'nominatim'
    });
  }
}

// Export singleton instance
export const geocodingService = new GeocodingService();
export default geocodingService;
