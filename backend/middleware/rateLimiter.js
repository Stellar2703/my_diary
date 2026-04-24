import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import redis from '../config/redis.js';
import logger from '../config/logger.js';

// General API rate limiter
export const generalLimiter = rateLimit({
  store: new RedisStore({
    sendCommand: (cmd, args) => redis.call(cmd, ...args),
    prefix: 'rate-limit:',
    expiry: 15 * 60 // 15 minutes
  }),
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: {
    success: false,
    message: 'Too many requests, please try again later.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false // Disable the `X-RateLimit-*` headers
});

// Strict rate limiter for authentication
export const authLimiter = rateLimit({
  store: new RedisStore({
    sendCommand: (cmd, args) => redis.call(cmd, ...args),
    prefix: 'rate-limit:auth:',
    expiry: 15 * 60
  }),
  windowMs: 15 * 60 * 1000,
  max: 5, // limit each IP to 5 login/register attempts
  skipSuccessfulRequests: true, // Don't count successful requests
  message: {
    success: false,
    message: 'Too many authentication attempts, please try again after 15 minutes.'
  }
});

// Strict rate limiter for file uploads
export const uploadLimiter = rateLimit({
  store: new RedisStore({
    sendCommand: (cmd, args) => redis.call(cmd, ...args),
    prefix: 'rate-limit:upload:',
    expiry: 60 * 60 // 1 hour
  }),
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20, // limit each IP to 20 uploads per hour
  message: {
    success: false,
    message: 'Too many uploads, please try again later.'
  }
});

// Moderate rate limiter for create operations
export const createLimiter = rateLimit({
  store: new RedisStore({
    sendCommand: (cmd, args) => redis.call(cmd, ...args),
    prefix: 'rate-limit:create:',
    expiry: 60 * 60
  }),
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 50, // limit each IP to 50 create operations per hour
  message: {
    success: false,
    message: 'Too many requests, please try again later.'
  }
});

// Looser rate limiter for read operations
export const readLimiter = rateLimit({
  store: new RedisStore({
    sendCommand: (cmd, args) => redis.call(cmd, ...args),
    prefix: 'rate-limit:read:',
    expiry: 5 * 60
  }),
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 300, // limit each IP to 300 read operations per 5 minutes
  message: {
    success: false,
    message: 'Too many requests, please try again later.'
  }
});

// Per-user rate limiter for API operations
export const userOperationLimiter = (windowMs = 60 * 1000, max = 30) => {
  return rateLimit({
    store: new RedisStore({
      sendCommand: (cmd, args) => redis.call(cmd, ...args),
      prefix: 'rate-limit:user-op:',
      expiry: Math.ceil(windowMs / 1000)
    }),
    windowMs,
    max,
    keyGenerator: (req, res) => {
      // Use user ID if authenticated, otherwise use IP
      return req.user?.id || req.ip;
    },
    skip: (req, res) => {
      // Skip if user is not authenticated
      return !req.user;
    }
  });
};

export default generalLimiter;
