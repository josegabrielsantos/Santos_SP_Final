import express from 'express';
import {
  getNotifications,
  getUnreadCount,
  markAsRead,
} from '../controllers/notification_controller.js';
import { protectRoute } from '../middleware/protectRoute.js';

const router = express.Router();

router.get('/', protectRoute, getNotifications);
router.get('/unread-count', protectRoute, getUnreadCount);
router.post('/mark-read', protectRoute, markAsRead);

export default router;
