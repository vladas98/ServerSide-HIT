'use strict';

let nextErrorId = 1;

/* Thrown by route handlers for any expected failure (bad input, not
   found, conflict, ...). Carries the HTTP status to reply with. */
class AppError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
    this.id = nextErrorId++;
  }
}

// Express recognizes an error-handling middleware by its four parameters,
// so `next` must stay even though it is never called from here.
function errorHandler(err, req, res, next) { // eslint-disable-line no-unused-vars
  const status = err.status || 500;
  res.status(status).json({
    id: err.id || 0,
    message: err.message || 'Internal server error',
  });
}

module.exports = { AppError, errorHandler };
