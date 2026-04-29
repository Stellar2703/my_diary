import express from 'express';
import { body } from 'express-validator';
import {
  createDepartment,
  getDepartments,
  getJoinedDepartments,
  getDepartmentById,
  joinDepartment,
  leaveDepartment,
  getDepartmentMembers,
  getDepartmentPosts,
  updateDepartment,
  deleteDepartment,
  uploadDepartmentAvatar
} from '../controllers/departmentController.js';
import { authenticate, optionalAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validator.js';
import { uploadAvatar } from '../middleware/upload.js';

const router = express.Router();

// Validation rules
const createDepartmentValidation = [
  body('name').trim().notEmpty().withMessage('Department name is required'),
  body('type')
    .isIn(['college', 'government', 'corporate', 'community'])
    .withMessage('Invalid department type'),
  body('description').optional().trim()
];

// Routes
router.post('/', authenticate, createDepartmentValidation, validate, createDepartment);
router.get('/', optionalAuth, getDepartments);
router.get('/joined', authenticate, getJoinedDepartments);
router.get('/:id', optionalAuth, getDepartmentById);
router.get('/:id/posts', authenticate, getDepartmentPosts);
router.post('/:id/join', authenticate, joinDepartment);
router.post('/:id/leave', authenticate, leaveDepartment);
router.get('/:id/members', getDepartmentMembers);
router.put('/:id', authenticate, updateDepartment);
router.delete('/:id', authenticate, deleteDepartment);
router.post('/:id/avatar', authenticate, uploadAvatar.single('avatar'), uploadDepartmentAvatar);

export default router;
