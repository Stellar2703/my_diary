import rateLimit from 'express-rate-limit';
import logger from '../config/logger.js';

// Simple memory-based rate limiter for development
// For production, use Redis-backed limiters

// General API rate limiter
export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: {
    success: false,
    message: 'Too many requests, please try again later.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req, res) => {
    // Skip rate limiting in development or if disabled
    if (process.env.NODE_ENV === 'development' || process.env.DISABLE_RATE_LIMITER === 'true') {
      return true;
    }
    return false;
  }
});

// Strict rate limiter for authentication
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5, // limit each IP to 5 login/register attempts
  skipSuccessfulRequests: true,
  message: {
    success: false,
    message: 'Too many authentication attempts, please try again after 15 minutes.'
  },
  skip: (req, res) => {
    if (process.env.NODE_ENV === 'development' || process.env.DISABLE_RATE_LIMITER === 'true') {
      return true;
    }
    return false;
  }
});

// Strict rate limiter for file uploads
export const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20, // limit each IP to 20 uploads per hour
  message: {
    success: false,
    message: 'Too many uploads, please try again later.'
  },
  skip: (req, res) => {
    if (process.env.NODE_ENV === 'development' || process.env.DISABLE_RATE_LIMITER === 'true') {
      return true;
    }
    return false;
  }
});

// Moderate rate limiter for create operations
export const createLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 50, // limit each IP to 50 create operations per hour
  message: {
    success: false,
    message: 'Too many requests, please try again later.'
  },
  skip: (req, res) => {
    if (process.env.NODE_ENV === 'development' || process.env.DISABLE_RATE_LIMITER === 'true') {
      return true;
    }
    return false;
  }
});

// Looser rate limiter for read operations
export const readLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 300, // limit each IP to 300 read operations per 5 minutes
  message: {
    success: false,
    message: 'Too many requests, please try again later.'
  },
  skip: (req, res) => {
    if (process.env.NODE_ENV === 'development' || process.env.DISABLE_RATE_LIMITER === 'true') {
      return true;
    }
    return false;
  }
});

// Per-user rate limiter for API operations
export const userOperationLimiter = (windowMs = 60 * 1000, max = 30) => {
  return rateLimit({
    windowMs,
    max,
    keyGenerator: (req, res) => {
      // Use user ID if authenticated, otherwise use IP
      return req.user?.id || req.ip;
    },
    skip: (req, res) => {
      // Skip if user is not authenticated
      if (!req.user) return true;
      // Skip in development or if disabled
      if (process.env.NODE_ENV === 'development' || process.env.DISABLE_RATE_LIMITER === 'true') {
        return true;
      }
      return false;
    }
  });
};

export default generalLimiter;
