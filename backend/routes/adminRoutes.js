import express from 'express';
import {
  getAdminDashboard,
  getAdminUsers,
  updateUserRole,
  toggleUserStatus,
  getAdminPosts,
  togglePostStatus,
  getAdminDepartments,
  toggleDepartmentStatus,
} from '../controllers/adminController.js';
import { authenticate, authorizeAdmin } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticate, authorizeAdmin);

router.get('/dashboard', getAdminDashboard);

router.get('/users', getAdminUsers);
router.patch('/users/:userId/role', updateUserRole);
router.patch('/users/:userId/status', toggleUserStatus);

router.get('/posts', getAdminPosts);
router.patch('/posts/:postId/status', togglePostStatus);

router.get('/departments', getAdminDepartments);
router.patch('/departments/:departmentId/status', toggleDepartmentStatus);

export default router;
