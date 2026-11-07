import mongoose from 'mongoose';
import notificationService from '../services/notificationService.js';
import { logger } from '../utils/logger.js';

/**
 * GET /api/notifications
 * Retrieve filtered list of notifications for the authenticated farmer
 */
export const getNotifications = async (req, res) => {
  try {
    const farmerId = req.user.id;
    const result = await notificationService.getNotifications(farmerId, req.query);

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (err) {
    logger.error(`[NOTIFICATION CONTROLLER] Error fetching notifications: ${err.message}`);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve notifications. Please try again.',
      error: err.message,
    });
  }
};

/**
 * GET /api/notifications/unread-count
 * Fast endpoint for live unread count badges in Navbar and Sidebar
 */
export const getUnreadCount = async (req, res) => {
  try {
    const farmerId = req.user.id;
    const unreadCount = await notificationService.getUnreadCount(farmerId);

    return res.status(200).json({
      success: true,
      data: { unreadCount },
    });
  } catch (err) {
    logger.error(`[NOTIFICATION CONTROLLER] Error getting unread count: ${err.message}`);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve unread count.',
      error: err.message,
    });
  }
};

/**
 * POST /api/notifications/sync
 * Scan actual database records (irrigations, crops, soils, diseases, weather)
 * and generate real notifications for the authenticated farmer.
 */
export const syncAlerts = async (req, res) => {
  try {
    const farmerId = req.user.id;
    const result = await notificationService.syncFarmerAlerts(farmerId);

    return res.status(200).json({
      success: true,
      message: 'System alerts synced successfully with database records.',
      data: result,
    });
  } catch (err) {
    logger.error(`[NOTIFICATION CONTROLLER] Error syncing alerts: ${err.message}`);
    return res.status(500).json({
      success: false,
      message: 'Failed to synchronize system alerts.',
      error: err.message,
    });
  }
};

/**
 * PATCH /api/notifications/:id/read
 * Mark a single notification as read
 */
export const markAsRead = async (req, res) => {
  try {
    const { id } = req.params;
    const farmerId = req.user.id;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid notification ID format.',
      });
    }

    const notification = await notificationService.markAsRead(id, farmerId);
    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found or unauthorized access.',
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Notification marked as read.',
      data: notification,
    });
  } catch (err) {
    logger.error(`[NOTIFICATION CONTROLLER] Error marking as read: ${err.message}`);
    return res.status(500).json({
      success: false,
      message: 'Failed to update notification status.',
      error: err.message,
    });
  }
};

/**
 * PATCH /api/notifications/mark-all-read
 * Mark all notifications (or all in a specific category) as read
 */
export const markAllAsRead = async (req, res) => {
  try {
    const farmerId = req.user.id;
    const category = req.body?.category || req.query?.category || null;

    const result = await notificationService.markAllAsRead(farmerId, category);

    return res.status(200).json({
      success: true,
      message: `Marked ${result.modifiedCount} notifications as read.`,
      data: result,
    });
  } catch (err) {
    logger.error(`[NOTIFICATION CONTROLLER] Error marking all as read: ${err.message}`);
    return res.status(500).json({
      success: false,
      message: 'Failed to mark all notifications as read.',
      error: err.message,
    });
  }
};

/**
 * DELETE /api/notifications/:id
 * Delete a single notification
 */
export const deleteNotification = async (req, res) => {
  try {
    const { id } = req.params;
    const farmerId = req.user.id;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid notification ID format.',
      });
    }

    const deleted = await notificationService.deleteNotification(id, farmerId);
    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found or unauthorized access.',
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Notification deleted successfully.',
    });
  } catch (err) {
    logger.error(`[NOTIFICATION CONTROLLER] Error deleting notification: ${err.message}`);
    return res.status(500).json({
      success: false,
      message: 'Failed to delete notification.',
      error: err.message,
    });
  }
};

/**
 * DELETE /api/notifications/clear-read
 * Delete all read notifications for farmer
 */
export const clearReadNotifications = async (req, res) => {
  try {
    const farmerId = req.user.id;
    const result = await notificationService.clearAllRead(farmerId);

    return res.status(200).json({
      success: true,
      message: `Cleared ${result.deletedCount} read notifications.`,
      data: result,
    });
  } catch (err) {
    logger.error(`[NOTIFICATION CONTROLLER] Error clearing read notifications: ${err.message}`);
    return res.status(500).json({
      success: false,
      message: 'Failed to clear read notifications.',
      error: err.message,
    });
  }
};

/**
 * GET /api/notifications/preferences
 * Retrieve farmer notification delivery preferences
 */
export const getPreferences = async (req, res) => {
  try {
    const farmerId = req.user.id;
    const preferences = await notificationService.getPreferences(farmerId);

    return res.status(200).json({
      success: true,
      data: preferences,
    });
  } catch (err) {
    logger.error(`[NOTIFICATION CONTROLLER] Error getting preferences: ${err.message}`);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve notification preferences.',
      error: err.message,
    });
  }
};

/**
 * PUT /api/notifications/preferences
 * Update farmer notification delivery preferences
 */
export const updatePreferences = async (req, res) => {
  try {
    const farmerId = req.user.id;
    const preferences = await notificationService.updatePreferences(farmerId, req.body);

    return res.status(200).json({
      success: true,
      message: 'Notification preferences updated successfully.',
      data: preferences,
    });
  } catch (err) {
    logger.error(`[NOTIFICATION CONTROLLER] Error updating preferences: ${err.message}`);
    return res.status(500).json({
      success: false,
      message: 'Failed to update notification preferences.',
      error: err.message,
    });
  }
};

export default {
  getNotifications,
  getUnreadCount,
  syncAlerts,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  clearReadNotifications,
  getPreferences,
  updatePreferences,
};
