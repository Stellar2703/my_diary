export const errorHandler = (err, req, res, next) => {
  const statusCode = err.statusCode || err.status || 500;
  if (statusCode !== 404) {
    
  }

  // Default error
  let error = {
    success: false,
    message: err.message || 'Internal server error',
    statusCode: statusCode
  };

  // Validation error
  if (err.name === 'ValidationError') {
    error.statusCode = 400;
    error.message = Object.values(err.errors).map(e => e.message).join(', ');
  }

  // MongoDB duplicate key error
  if (err.code === 11000) {
    error.statusCode = 400;
    const field = Object.keys(err.keyPattern || {})[0];
    error.message = field 
      ? `Duplicate ${field}. This record already exists.`
      : 'Duplicate entry. This record already exists.';
  }

  // MongoDB cast error (invalid ObjectId)
  if (err.name === 'CastError') {
    error.statusCode = 400;
    error.message = `Invalid ${err.path}: ${err.value}`;
  }

  res.status(error.statusCode).json({
    success: false,
    message: error.message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
};

export const notFound = (req, res, next) => {
  const error = new Error(`Not Found - ${req.originalUrl}`);
  error.statusCode = 404;
  next(error);
};
