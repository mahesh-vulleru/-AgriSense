import apiClient from './api.js';

export const dashboardService = {
  /**
   * Fetch authenticated farmer dashboard aggregated statistics
   * @param {Object} config - Optional axios configuration (e.g. signal for request cancellation)
   */
  async getFarmerStats(config = {}) {
    const response = await apiClient.get('/dashboard/farmer', config);
    return response.data;
  },
};

export default dashboardService;
