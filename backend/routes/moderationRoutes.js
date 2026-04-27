import express from 'express';
import {
  createReport,
  getReports,
  reviewReport,
  banUser,
  unbanUser,
  getModerationLogs,
} from '../controllers/moderationController.js';
import { authenticate, authorizeAdmin } from '../middleware/auth.js';

const router = express.Router();

// Reporting
router.post('/reports', authenticate, createReport);
router.get('/reports', authenticate, authorizeAdmin, getReports);
router.post('/reports/:reportId/review', authenticate, authorizeAdmin, reviewReport);

// User banning
router.post('/users/:userId/ban', authenticate, authorizeAdmin, banUser);
router.post('/users/:userId/unban', authenticate, authorizeAdmin, unbanUser);

// Logs
router.get('/logs', authenticate, authorizeAdmin, getModerationLogs);

export default router;
