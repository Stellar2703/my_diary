import logger from '../config/logger.js';

/**
 * Standardized API Error class
 */
export class ApiError extends Error {
  constructor(statusCode, message, details = null) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
    this.name = 'ApiError';
  }
}

/**
 * Standardized error response formatter
 */
export function formatErrorResponse(statusCode, message, details = null) {
  return {
    success: false,
    statusCode,
    message,
    ...(process.env.NODE_ENV === 'development' && details && { details }),
    timestamp: new Date().toISOString()
  };
}

/**
 * Standardized success response formatter
 */
export function formatSuccessResponse(data, message = 'Success') {
  return {
    success: true,
    message,
    data,
    timestamp: new Date().toISOString()
  };
}

/**
 * Global error handling middleware
 */
export const globalErrorHandler = (err, req, res, next) => {
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal Server Error';
  let details = null;

  // Log the error
  logger.error('Request error:', {
    method: req.method,
    path: req.path,
    statusCode,
    message,
    userId: req.user?.id || 'anonymous',
    ip: req.ip,
    stack: err.stack
  });

  // Handle MongoDB validation errors
  if (err.name === 'ValidationError') {
    statusCode = 400;
    message = 'Validation Error';
    details = Object.values(err.errors).map(e => e.message);
  }

  // Handle MongoDB duplicate key errors
  if (err.code === 11000) {
    statusCode = 409;
    const field = Object.keys(err.keyValue)[0];
    message = `${field} already exists`;
  }

  // Handle MongoDB cast errors
  if (err.name === 'CastError') {
    statusCode = 400;
    message = 'Invalid ID format';
  }

  // Handle JWT errors
  if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Invalid token';
  }

  if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Token expired';
  }

  // Handle Multer errors
  if (err.name === 'MulterError') {
    statusCode = 400;
    if (err.code === 'LIMIT_FILE_SIZE') {
      message = 'File size too large';
    } else if (err.code === 'LIMIT_FILE_COUNT') {
      message = 'Too many files';
    } else {
      message = err.message;
    }
  }

  res.status(statusCode).json(
    formatErrorResponse(statusCode, message, details)
  );
};

/**
 * Async error wrapper for route handlers
 */
export const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

/**
 * Not found middleware
 */
export const notFoundHandler = (req, res) => {
  logger.warn('Route not found:', { method: req.method, path: req.path });
  res.status(404).json(
    formatErrorResponse(404, 'Route not found')
  );
};

export default {
  ApiError,
  formatErrorResponse,
  formatSuccessResponse,
  globalErrorHandler,
  asyncHandler,
  notFoundHandler
};
