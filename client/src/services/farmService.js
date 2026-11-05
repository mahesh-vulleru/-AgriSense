import apiClient from './api.js';

export const farmService = {
  /**
   * Fetch all farms for the authenticated user with optional search, filtering and sorting
   * @param {Object} params - { search, status, sortBy, sortOrder, page, limit }
   */
  async getFarms(params = {}) {
    const response = await apiClient.get('/farms', { params });
    return response.data;
  },

  /**
   * Fetch detailed farm information by ID
   * @param {string} id - Farm ObjectId
   */
  async getFarmById(id) {
    const response = await apiClient.get(`/farms/${id}`);
    return response.data;
  },

  /**
   * Register a new farm
   * @param {Object} farmData
   */
  async createFarm(farmData) {
    const response = await apiClient.post('/farms', farmData);
    return response.data;
  },

  /**
   * Update an existing farm
   * @param {string} id - Farm ObjectId
   * @param {Object} farmData
   */
  async updateFarm(id, farmData) {
    const response = await apiClient.put(`/farms/${id}`, farmData);
    return response.data;
  },

  /**
   * Archive or restore a farm (soft delete)
   * @param {string} id - Farm ObjectId
   * @param {Object} data - { restore?: boolean }
   */
  async archiveFarm(id, data = {}) {
    const response = await apiClient.patch(`/farms/${id}/archive`, data);
    return response.data;
  },
};

export default farmService;

