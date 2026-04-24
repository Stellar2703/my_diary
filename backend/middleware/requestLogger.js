import logger from '../config/logger.js';

/**
 * Request logging middleware with detailed info
 */
export const requestLogger = (req, res, next) => {
  const start = Date.now();
  const originalSend = res.send;

  // Log incoming request
  logger.info('Incoming request:', {
    method: req.method,
    path: req.path,
    ip: req.ip,
    userId: req.user?.id || 'anonymous',
    body: req.body && Object.keys(req.body).length > 0 ? req.body : undefined
  });

  // Override res.send to capture response
  res.send = function (data) {
    const duration = Date.now() - start;

    // Log outgoing response
    logger.info('Outgoing response:', {
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      userId: req.user?.id || 'anonymous',
      ip: req.ip,
      responseSize: Buffer.byteLength(JSON.stringify(data))
    });

    // Call original send
    return originalSend.call(this, data);
  };

  next();
};

export default requestLogger;
