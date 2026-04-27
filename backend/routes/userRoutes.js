import express from 'express';
import {
  getUserLocations,
  getShareRecipients,
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  getUserFeed
} from '../controllers/userController.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// Routes
router.get('/locations', authenticate, getUserLocations);
router.get('/share-recipients', authenticate, getShareRecipients);
router.get('/notifications', authenticate, getNotifications);
router.put('/notifications/:id/read', authenticate, markNotificationRead);
router.put('/notifications/read-all', authenticate, markAllNotificationsRead);
router.get('/feed', authenticate, getUserFeed);

export default router;
