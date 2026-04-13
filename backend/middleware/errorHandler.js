const logger = require('./logger');

/**
 * Global error handler middleware
 * Should be placed at the end of all middleware/routes
 */
const errorHandler = (err, req, res, next) => {
  // Log the error
  logger.error({
    message: err.message,
    code: err.code || 'UNKNOWN_ERROR',
    statusCode: err.statusCode || 500,
    stack: err.stack,
    path: req.path,
    method: req.method,
    body: req.body,
  });

  // AppError handling removed (errors.js deleted)
  // TODO: Implement standardized error class if needed

  // Handle validation errors from joi
  if (err.isJoi) {
    const details = err.details.map((detail) => ({
      field: detail.path.join('.'),
      message: detail.message,
    }));
    return res.status(400).json({
      status: 'error',
      code: 'VALIDATION_ERROR',
      message: 'Validation failed',
      errors: details,
    });
  }

  // Handle JSON parsing errors
  if (err instanceof SyntaxError && 'body' in err) {
    return res.status(400).json({
      status: 'error',
      code: 'INVALID_JSON',
      message: 'Invalid JSON in request body',
    });
  }

  // Handle Prisma errors
  if (err.name === 'PrismaClientKnownRequestError') {
    logger.warn({ message: 'Prisma known error', code: err.code });
    return res.status(400).json({
      status: 'error',
      code: 'DATABASE_ERROR',
      message: 'Database operation failed',
    });
  }

  // Default error response
  res.status(err.statusCode || 500).json({
    status: 'error',
    code: err.code || 'INTERNAL_SERVER_ERROR',
    message: process.env.NODE_ENV === 'production' ? 'An error occurred' : err.message,
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack }),
    timestamp: new Date().toISOString(),
  });
};

/**
 * Async error handler wrapper
 * Wraps async route handlers to catch errors
 */
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = errorHandler;
module.exports.asyncHandler = asyncHandler;
