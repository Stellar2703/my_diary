import express from 'express';
import { body } from 'express-validator';
import { register, login, getProfile, updateProfile, uploadUserAvatar, logout } from '../controllers/authController.js';
import { authenticate } from '../middleware/auth.js';
import { validate } from '../middleware/validator.js';
import { uploadFace, uploadAvatar } from '../middleware/upload.js';

const router = express.Router();

// Validation rules
const registerValidation = [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('username')
    .trim()
    .isLength({ min: 3, max: 50 })
    .withMessage('Username must be 3-50 characters')
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('Username can only contain letters, numbers, and underscores'),
  body('email').isEmail().withMessage('Valid email is required'),
  body('mobileNumber')
    .matches(/^[0-9]{10}$/)
    .withMessage('Valid 10-digit mobile number is required'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters')
];

const loginValidation = [
  body('username').trim().notEmpty().withMessage('Username or email is required'),
  body('password').notEmpty().withMessage('Password is required')
];

// Routes
router.post('/register', uploadFace.single('faceImage'), registerValidation, validate, register);
router.post('/login', loginValidation, validate, login);
router.get('/profile', authenticate, getProfile);
router.put('/profile', authenticate, updateProfile);
router.post('/avatar', authenticate, uploadAvatar.single('avatar'), uploadUserAvatar);
router.post('/logout', authenticate, logout);

export default router;
