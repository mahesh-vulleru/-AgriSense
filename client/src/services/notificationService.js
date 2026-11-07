import apiClient from './api.js';

export const notificationService = {
  /**
   * Fetch paginated list of notifications with optional filters and KPI summary
   */
  async getNotifications(params = {}) {
    const response = await apiClient.get('/notifications', { params });
    return response.data;
  },

  /**
   * Fast retrieval of unread notifications count for badges
   */
  async getUnreadCount() {
    const response = await apiClient.get('/notifications/unread-count');
    return response.data;
  },

  /**
   * Scan active database records (irrigations, crops, soils, diseases, weather)
   * and create genuine real-time alerts.
   */
  async syncAlerts() {
    const response = await apiClient.post('/notifications/sync');
    return response.data;
  },

  /**
   * Mark a single notification as read
   */
  async markAsRead(id) {
    const response = await apiClient.patch(`/notifications/${id}/read`);
    return response.data;
  },

  /**
   * Mark all unread notifications (or within a category) as read
   */
  async markAllAsRead(category = 'all') {
    const response = await apiClient.patch('/notifications/mark-all-read', { category });
    return response.data;
  },

  /**
   * Delete a single notification
   */
  async deleteNotification(id) {
    const response = await apiClient.delete(`/notifications/${id}`);
    return response.data;
  },

  /**
   * Clear all read notifications
   */
  async clearReadNotifications() {
    const response = await apiClient.delete('/notifications/clear-read');
    return response.data;
  },

  /**
   * Get farmer notification delivery preferences
   */
  async getPreferences() {
    const response = await apiClient.get('/notifications/preferences');
    return response.data;
  },

  /**
   * Update farmer notification delivery preferences
   */
  async updatePreferences(preferences) {
    const response = await apiClient.put('/notifications/preferences', preferences);
    return response.data;
  },
};

export default notificationService;
