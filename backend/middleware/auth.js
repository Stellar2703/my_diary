import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import { User } from '../models/index.js';

dotenv.config();

export const authenticate = async (req, res, next) => {
  try {
    // Get token from header
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({ 
        success: false, 
        message: 'Access denied. No token provided.' 
      });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Fetch latest user state for permission checks
    const dbUser = await User.findById(decoded.id).select('_id username email role isActive').lean();
    if (!dbUser || !dbUser.isActive) {
      return res.status(403).json({
        success: false,
        message: 'Account is disabled.'
      });
    }
    
    // Add user info to request
    req.user = {
      id: dbUser._id.toString(),
      username: dbUser.username,
      email: dbUser.email,
      role: dbUser.role || 'user'
    };

    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid token.' 
      });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        success: false, 
        message: 'Token expired.' 
      });
    }
    res.status(500).json({ 
      success: false, 
      message: 'Authentication failed.' 
    });
  }
};

export const optionalAuth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const dbUser = await User.findById(decoded.id).select('_id username email role isActive').lean();
      if (dbUser && dbUser.isActive) {
        req.user = {
          id: dbUser._id.toString(),
          username: dbUser.username,
          email: dbUser.email,
          role: dbUser.role || 'user'
        };
      }
    }

    next();
  } catch (error) {
    // If token is invalid or expired, just continue without user
    next();
  }
};

export const authorizeAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Admin access required.'
    });
  }

  next();
};
