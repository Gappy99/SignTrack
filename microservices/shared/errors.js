/**
 * Error Handling Utilities
 */

export class AppError extends Error {
  constructor(message, statusCode = 500, code = 'INTERNAL_ERROR') {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.timestamp = new Date().toISOString();
  }
}

export class ValidationError extends AppError {
  constructor(message, field = null) {
    super(message, 400, 'VALIDATION_ERROR');
    this.field = field;
  }
}

export class AuthenticationError extends AppError {
  constructor(message = 'Authentication required') {
    super(message, 401, 'AUTHENTICATION_ERROR');
  }
}

export class AuthorizationError extends AppError {
  constructor(message = 'Insufficient permissions') {
    super(message, 403, 'AUTHORIZATION_ERROR');
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Resource not found', resourceType = null) {
    super(message, 404, 'NOT_FOUND');
    this.resourceType = resourceType;
  }
}

export class ConflictError extends AppError {
  constructor(message = 'Resource already exists') {
    super(message, 409, 'CONFLICT');
  }
}

export class ServiceUnavailableError extends AppError {
  constructor(serviceName = 'External service') {
    super(`${serviceName} is unavailable`, 503, 'SERVICE_UNAVAILABLE');
    this.serviceName = serviceName;
  }
}

export class TimeoutError extends AppError {
  constructor(serviceName = 'Service') {
    super(`${serviceName} request timed out`, 504, 'TIMEOUT');
    this.serviceName = serviceName;
  }
}

/**
 * Error handler middleware
 */
export function errorHandler(err, req, res, next) {
  console.error(`[Error] ${err.code || 'UNKNOWN'}:`, err.message);

  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      success: false,
      error: {
        code: err.code,
        message: err.message,
        field: err.field,
        timestamp: err.timestamp
      },
      requestId: req.id
    });
  }

  // Errores de MongoDB
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid data',
        details: Object.values(err.errors).map(e => e.message)
      },
      requestId: req.id
    });
  }

  if (err.name === 'MongooseError' || err.code === 11000) {
    return res.status(409).json({
      success: false,
      error: {
        code: 'DUPLICATE_ENTRY',
        message: 'Duplicate entry'
      },
      requestId: req.id
    });
  }

  // Error genérico
  res.status(err.statusCode || 500).json({
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: process.env.NODE_ENV === 'development' 
        ? err.message 
        : 'Internal server error'
    },
    requestId: req.id,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
}

/**
 * Async wrapper para controllers
 */
export function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
