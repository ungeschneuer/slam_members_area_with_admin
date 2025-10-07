/**
 * Unified Response Handler for Server Responses
 * 
 * This service standardizes server response handling across all endpoints
 * to ensure consistent entity extraction for incremental updates.
 * Integrated with errorReportingService for error response handling.
 */

import errorReportingService from './errorReportingService.js';

class ResponseHandler {
  constructor() {
    this.responsePatterns = {
      // Standard success responses with data field
      standard: {
        pattern: /success.*true.*data.*:/,
        extractor: (response) => response.data
      },
      
      // Direct entity responses (no wrapper)
      direct: {
        pattern: /^\{.*"id".*\}$/,
        extractor: (response) => response
      },
      
      // Delete responses with deleted field
      delete: {
        pattern: /success.*true.*deleted.*:/,
        extractor: (response) => response.deleted
      },
      
      // Countdown config responses (special case)
      countdown: {
        pattern: /target_date.*button_text/,
        extractor: (response) => response
      },
      
      // Error responses
      error: {
        pattern: /success.*false|error.*:/,
        extractor: () => null
      }
    };
  }

  /**
   * Extract entity from server response using pattern matching
   * @param {Object} response - Server response object
   * @param {string} operation - Operation type (create, update, delete)
   * @returns {Object|null} - Extracted entity or null if not found
   */
  extractEntity(response, operation = 'create') {
    try {
      // Handle null/undefined responses
      if (!response) {
        console.warn('ResponseHandler: Null response received');
        return null;
      }

      // Handle error responses
      if (response.success === false || response.error) {
        console.warn('ResponseHandler: Error response received', {
          success: response.success,
          error: response.error
        });
        
        // Report error response to centralized service
        const error = new Error(response.error || 'Server returned error response');
        errorReportingService.logError(error, null, 'ResponseHandler', {
          response: response,
          operation: operation
        });
        
        return null;
      }

      // Handle direct entity responses (no wrapper)
      if (this.isDirectEntity(response)) {
        if (import.meta.env.DEV) {
          console.log('ResponseHandler: Direct entity response detected');
        }
        return response;
      }

      // Handle standard wrapped responses
      if (response.success === true && response.data) {
        if (import.meta.env.DEV) {
          console.log('ResponseHandler: Standard wrapped response detected');
        }
        return response.data;
      }

      // Handle delete responses
      if (response.success === true && response.deleted) {
        if (import.meta.env.DEV) {
          console.log('ResponseHandler: Delete response detected');
        }
        return response.deleted;
      }

      // Handle countdown config responses (special case)
      if (response.target_date && response.button_text) {
        if (import.meta.env.DEV) {
          console.log('ResponseHandler: Countdown config response detected');
        }
        return response;
      }

      // Fallback: try to extract from common patterns
      const entity = this.extractFromPatterns(response);
      if (entity) {
        if (import.meta.env.DEV) {
          console.log('ResponseHandler: Pattern-based extraction successful');
        }
        return entity;
      }

      console.warn('ResponseHandler: No entity found in response', {
        response: response,
        operation: operation
      });
      return null;

    } catch (error) {
      console.error('ResponseHandler: Error extracting entity', error);
      
      // Report extraction error to centralized service
      errorReportingService.logError(error, null, 'ResponseHandler.extractEntity', {
        response: response,
        operation: operation
      });
      
      return null;
    }
  }

  /**
   * Check if response is a direct entity (no wrapper)
   * @param {Object} response - Server response
   * @returns {boolean} - True if direct entity
   */
  isDirectEntity(response) {
    return (
      response &&
      typeof response === 'object' &&
      response.id !== undefined &&
      !response.success &&
      !response.data &&
      !response.error
    );
  }

  /**
   * Extract entity using pattern matching
   * @param {Object} response - Server response
   * @returns {Object|null} - Extracted entity or null
   */
  extractFromPatterns(response) {
    const responseStr = JSON.stringify(response);
    
    for (const [patternName, pattern] of Object.entries(this.responsePatterns)) {
      if (pattern.pattern.test(responseStr)) {
        try {
          return pattern.extractor(response);
        } catch (error) {
          console.warn(`ResponseHandler: Pattern ${patternName} extraction failed`, error);
        }
      }
    }
    
    return null;
  }

  /**
   * Validate extracted entity has required fields
   * @param {Object} entity - Extracted entity
   * @param {string} operation - Operation type
   * @returns {boolean} - True if valid
   */
  validateEntity(entity, operation = 'create') {
    if (!entity) {
      return false;
    }

    // For delete operations, entity might be null/undefined
    if (operation === 'delete') {
      return true;
    }

    // Check for required fields based on operation
    const requiredFields = this.getRequiredFields(operation);
    
    for (const field of requiredFields) {
      if (entity[field] === undefined || entity[field] === null) {
        console.warn(`ResponseHandler: Missing required field '${field}' in entity`, {
          entity: entity,
          operation: operation
        });
        return false;
      }
    }

    return true;
  }

  /**
   * Get required fields for operation type
   * @param {string} operation - Operation type
   * @returns {Array} - Required field names
   */
  getRequiredFields(operation) {
    const baseFields = ['id'];
    
    switch (operation) {
      case 'create':
      case 'update':
        return baseFields;
      case 'delete':
        return []; // Delete operations don't need entity validation
      default:
        return baseFields;
    }
  }

  /**
   * Standardize response handling for incremental updates
   * @param {Object} response - Server response
   * @param {string} operation - Operation type
   * @param {string} dataType - Data type being updated
   * @returns {Object} - Standardized result
   */
  handleResponse(response, operation, dataType) {
    const entity = this.extractEntity(response, operation);
    const isValid = this.validateEntity(entity, operation);
    
    return {
      success: isValid,
      entity: entity,
      operation: operation,
      dataType: dataType,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Log response handling for debugging
   * @param {Object} result - Handle response result
   * @param {Object} originalResponse - Original server response
   */
  logResponseHandling(result, originalResponse) {
    if (import.meta.env.DEV) {
      console.log('ResponseHandler: Response handling result', {
        success: result.success,
        operation: result.operation,
        dataType: result.dataType,
        hasEntity: !!result.entity,
        entityId: result.entity?.id,
        originalResponse: originalResponse
      });
    }
  }
}

// Export singleton instance
export default new ResponseHandler();
