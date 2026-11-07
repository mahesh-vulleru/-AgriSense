import apiClient from './api.js';

export const irrigationService = {
  /**
   * Fetch irrigation dashboard aggregated statistics, upcoming activities, and advisory
   */
  async getDashboard() {
    const response = await apiClient.get('/irrigation/dashboard');
    return response.data;
  },

  /**
   * List irrigation plans with optional filters
   */
  async getPlans(params = {}) {
    const response = await apiClient.get('/irrigation/plans', { params });
    return response.data;
  },

  /**
   * Create a new irrigation plan
   */
  async createPlan(data) {
    const response = await apiClient.post('/irrigation/plans', data);
    return response.data;
  },

  /**
   * Retrieve plan details by ID
   */
  async getPlanById(id) {
    const response = await apiClient.get(`/irrigation/plans/${id}`);
    return response.data;
  },

  /**
   * Update an existing irrigation plan
   */
  async updatePlan(id, data) {
    const response = await apiClient.put(`/irrigation/plans/${id}`, data);
    return response.data;
  },

  /**
   * Delete an irrigation plan
   */
  async deletePlan(id) {
    const response = await apiClient.delete(`/irrigation/plans/${id}`);
    return response.data;
  },

  /**
   * List scheduled irrigation activities
   */
  async getSchedules(params = {}) {
    const response = await apiClient.get('/irrigation/schedules', { params });
    return response.data;
  },

  /**
   * Schedule a new irrigation activity
   */
  async createSchedule(data) {
    const response = await apiClient.post('/irrigation/schedules', data);
    return response.data;
  },

  /**
   * Update schedule details
   */
  async updateSchedule(id, data) {
    const response = await apiClient.put(`/irrigation/schedules/${id}`, data);
    return response.data;
  },

  /**
   * Transition schedule status (e.g. Completed, Cancelled, Skipped)
   */
  async updateScheduleStatus(id, data) {
    const response = await apiClient.patch(`/irrigation/schedules/${id}/status`, data);
    return response.data;
  },

  /**
   * Delete a scheduled activity
   */
  async deleteSchedule(id) {
    const response = await apiClient.delete(`/irrigation/schedules/${id}`);
    return response.data;
  },

  /**
   * List water usage records and chart aggregation
   */
  async getWaterUsage(params = {}) {
    const response = await apiClient.get('/irrigation/water-usage', { params });
    return response.data;
  },

  /**
   * Record a manual water usage log
   */
  async recordWaterUsage(data) {
    const response = await apiClient.post('/irrigation/water-usage', data);
    return response.data;
  },

  /**
   * Fetch weather and soil-based irrigation advisory for a farm and crop
   */
  async getAdvisory(farmId, cropId = null) {
    const response = await apiClient.get(`/irrigation/advisory/${farmId}`, {
      params: cropId ? { cropId } : {},
    });
    return response.data;
  },
};

export default irrigationService;
