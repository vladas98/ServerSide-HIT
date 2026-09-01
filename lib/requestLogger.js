'use strict';

// Writes one log entry for every HTTP request a process receives, on top
// of the per-endpoint log entries each route handler writes itself.
function createRequestLogger(logger) {
  return function requestLogger(req, res, next) {
    logger.log('http request received', {
      method: req.method,
      url: req.originalUrl,
    });
    next();
  };
}

module.exports = { createRequestLogger };
