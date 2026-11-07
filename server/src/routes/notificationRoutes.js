import { Router } from 'express';
import {
  getNotifications,
  getUnreadCount,
  syncAlerts,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  clearReadNotifications,
  getPreferences,
  updatePreferences,
} from '../controllers/notificationController.js';
import { protect } from '../middleware/auth.js';
import { requireDB } from '../middleware/checkDbConnection.js';

const router = Router();

// Ensure MongoDB connection is healthy
router.use(requireDB);

// All notification routes require authenticated session
router.use(protect);

// 1. Core Notifications List & Unread Count
router.get('/', getNotifications);
router.get('/unread-count', getUnreadCount);

// 2. Alert Sync Engine (Populates real notifications from active DB records)
router.post('/sync', syncAlerts);

// 3. Status Modification
router.patch('/mark-all-read', markAllAsRead);
router.patch('/:id/read', markAsRead);

// 4. Deletion Endpoints
router.delete('/clear-read', clearReadNotifications);
router.delete('/:id', deleteNotification);

// 5. Notification Preferences
router.get('/preferences', getPreferences);
router.put('/preferences', updatePreferences);

export default router;
