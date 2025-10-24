import logger from '../config/logger.js';

// Logs camelCase keys in request bodies to help monitor naming mismatches
export default function caseMonitor(req, res, next) {
  try {
    const body = req.body;
    if (!body || typeof body !== 'object' || Array.isArray(body)) return next();

    const camelKeys = Object.keys(body).filter((k) => /[A-Z]/.test(k));
    if (camelKeys.length > 0) {
      logger.warn('camelCase keys detected in request body', {
        path: req.path,
        method: req.method,
        keys: camelKeys
      });
    }
  } catch (e) {
    // Do not block the request on monitoring errors
  }
  return next();
}


