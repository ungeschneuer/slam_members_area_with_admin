import { sendErrorResponse } from './simpleRouteHelpers.js';

/**
 * Validate and parse an ID from a string
 * @param {string} idString - The ID string to validate
 * @param {string} entityName - Name of the entity for error messages
 * @returns {number|null} Parsed ID or null if invalid
 */
export const validateId = (idString, entityName = 'Resource') => {
  const id = parseInt(idString);

  if (isNaN(id) || id <= 0) {
    return null;
  }

  return id;
};

/**
 * Express middleware to validate ID parameter
 * Parses req.params.id and attaches validated ID to req.validatedId
 * Returns 400 error if ID is invalid
 *
 * @param {string} paramName - Name of the param to validate (default: 'id')
 * @param {string} entityName - Name of the entity for error messages
 * @returns {Function} Express middleware function
 */
export const validateIdMiddleware = (paramName = 'id', entityName = 'Resource') => {
  return (req, res, next) => {
    const idString = req.params[paramName];
    const id = validateId(idString, entityName);

    if (id === null) {
      return sendErrorResponse(
        res,
        new Error(`Invalid ${entityName} ID`),
        `Invalid ${entityName} ID`,
        400
      );
    }

    req.validatedId = id;
    next();
  };
};
