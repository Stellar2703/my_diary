import { body, param, query, validationResult } from 'express-validator';
import logger from '../config/logger.js';
import { formatErrorResponse } from '../utils/errorHandler.js';

/**
 * Validation middleware to handle validation errors
 */
export const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    logger.warn('Validation error', { path: req.path, errors: errors.array() });
    return res.status(400).json(
      formatErrorResponse(400, 'Validation error', errors.array())
    );
  }
  next();
};

// ==================== AUTH VALIDATIONS ====================
export const validateRegister = [
  body('username')
    .trim()
    .isLength({ min: 3, max: 30 })
    .withMessage('Username must be between 3 and 30 characters')
    .matches(/^[a-zA-Z0-9_-]+$/)
    .withMessage('Username can only contain letters, numbers, underscores, and hyphens'),
  body('email')
    .trim()
    .isEmail()
    .withMessage('Invalid email address')
    .normalizeEmail(),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain uppercase, lowercase, and numbers'),
  handleValidationErrors
];

export const validateLogin = [
  body('email')
    .trim()
    .isEmail()
    .withMessage('Invalid email address')
    .normalizeEmail(),
  body('password')
    .notEmpty()
    .withMessage('Password is required'),
  handleValidationErrors
];

export const validateProfileUpdate = [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be between 2 and 100 characters'),
  body('bio')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Bio must not exceed 500 characters'),
  body('email')
    .optional()
    .isEmail()
    .withMessage('Invalid email address'),
  body('dateOfBirth')
    .optional()
    .isISO8601()
    .withMessage('Invalid date format'),
  body('gender')
    .optional()
    .isIn(['M', 'F', 'Other'])
    .withMessage('Invalid gender'),
  handleValidationErrors
];

// ==================== POST VALIDATIONS ====================
export const validateCreatePost = [
  body('content')
    .trim()
    .isLength({ min: 1, max: 5000 })
    .withMessage('Post content must be between 1 and 5000 characters'),
  body('mediaType')
    .optional()
    .isIn(['none', 'photo', 'video', 'audio'])
    .withMessage('Invalid media type'),
  body('country')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Country must be between 2 and 100 characters'),
  body('city')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('City must be between 2 and 100 characters'),
  body('latitude')
    .optional()
    .isFloat({ min: -90, max: 90 })
    .withMessage('Invalid latitude'),
  body('longitude')
    .optional()
    .isFloat({ min: -180, max: 180 })
    .withMessage('Invalid longitude'),
  handleValidationErrors
];

export const validateUpdatePost = [
  body('content')
    .optional()
    .trim()
    .isLength({ min: 1, max: 5000 })
    .withMessage('Post content must be between 1 and 5000 characters'),
  handleValidationErrors
];

// ==================== COMMENT VALIDATIONS ====================
export const validateCreateComment = [
  body('content')
    .trim()
    .isLength({ min: 1, max: 2000 })
    .withMessage('Comment must be between 1 and 2000 characters'),
  body('isBold')
    .optional()
    .isBoolean()
    .withMessage('isBold must be a boolean'),
  body('isItalic')
    .optional()
    .isBoolean()
    .withMessage('isItalic must be a boolean'),
  handleValidationErrors
];

// ==================== DEPARTMENT VALIDATIONS ====================
export const validateCreateDepartment = [
  body('name')
    .trim()
    .isLength({ min: 3, max: 100 })
    .withMessage('Department name must be between 3 and 100 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Description must not exceed 1000 characters'),
  body('type')
    .isIn(['college', 'government', 'corporate', 'community'])
    .withMessage('Invalid department type'),
  body('isPrivate')
    .optional()
    .isBoolean()
    .withMessage('isPrivate must be a boolean'),
  handleValidationErrors
];

// ==================== SEARCH VALIDATIONS ====================
export const validateSearch = [
  query('q')
    .trim()
    .isLength({ min: 1, max: 200 })
    .withMessage('Search query must be between 1 and 200 characters'),
  query('type')
    .optional()
    .isIn(['all', 'posts', 'users', 'departments', 'hashtags'])
    .withMessage('Invalid search type'),
  query('sortBy')
    .optional()
    .isIn(['relevance', 'recent', 'popular'])
    .withMessage('Invalid sort option'),
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  handleValidationErrors
];

// ==================== PAGINATION VALIDATIONS ====================
export const validatePagination = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer')
    .toInt(),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100')
    .toInt(),
  handleValidationErrors
];

// ==================== ID VALIDATIONS ====================
export const validateMongoId = (paramName = 'id') => [
  param(paramName)
    .matches(/^[0-9a-fA-F]{24}$/)
    .withMessage(`Invalid ${paramName} format`),
  handleValidationErrors
];

// ==================== REACTION VALIDATIONS ====================
export const validateReaction = [
  body('reactionType')
    .isIn(['like', 'love', 'wow', 'sad', 'angry', 'celebrate'])
    .withMessage('Invalid reaction type'),
  handleValidationErrors
];

// ==================== MESSAGE VALIDATIONS ====================
export const validateCreateMessage = [
  body('content')
    .trim()
    .isLength({ min: 1, max: 5000 })
    .withMessage('Message must be between 1 and 5000 characters'),
  body('conversationId')
    .matches(/^[0-9a-fA-F]{24}$/)
    .withMessage('Invalid conversation ID'),
  handleValidationErrors
];

export default {
  handleValidationErrors,
  validateRegister,
  validateLogin,
  validateProfileUpdate,
  validateCreatePost,
  validateUpdatePost,
  validateCreateComment,
  validateCreateDepartment,
  validateSearch,
  validatePagination,
  validateMongoId,
  validateReaction,
  validateCreateMessage
};
