import apiClient from './api.js';

export const cropService = {
  /**
   * Fetch all crops for authenticated farmer with filters and summary statistics
   * @param {Object} params - { farmId, status, growthStage, category, season, search, sort }
   */
  async getCrops(params = {}) {
    const response = await apiClient.get('/crops', { params });
    return response.data;
  },

  /**
   * Fetch complete crop details by ID
   * @param {string} id - Crop ObjectId
   */
  async getCropById(id) {
    const response = await apiClient.get(`/crops/${id}`);
    return response.data;
  },

  /**
   * Register a new crop
   * @param {Object} cropData
   */
  async createCrop(cropData) {
    const response = await apiClient.post('/crops', cropData);
    return response.data;
  },

  /**
   * Update crop details
   * @param {string} id
   * @param {Object} cropData
   */
  async updateCrop(id, cropData) {
    const response = await apiClient.put(`/crops/${id}`, cropData);
    return response.data;
  },

  /**
   * Update growth stage with transition history log
   * @param {string} id
   * @param {Object} stageData - { stage, transitionDate, notes }
   */
  async updateCropStage(id, stageData) {
    const response = await apiClient.patch(`/crops/${id}/stage`, stageData);
    return response.data;
  },

  /**
   * Record actual harvest data
   * @param {string} id
   * @param {Object} harvestData - { harvestDate, actualYield, yieldUnit, qualityGrade, harvestNotes }
   */
  async recordHarvest(id, harvestData) {
    const response = await apiClient.post(`/crops/${id}/harvest`, harvestData);
    return response.data;
  },

  /**
   * Add a calendar milestone
   * @param {string} id
   * @param {Object} milestoneData - { activity, category, targetDate, notes }
   */
  async addCalendarMilestone(id, milestoneData) {
    const response = await apiClient.post(`/crops/${id}/calendar`, milestoneData);
    return response.data;
  },

  /**
   * Toggle or update a calendar milestone
   * @param {string} id
   * @param {string} milestoneId
   * @param {Object} updateData - { completed, notes }
   */
  async updateCalendarMilestone(id, milestoneId, updateData) {
    const response = await apiClient.patch(`/crops/${id}/calendar/${milestoneId}`, updateData);
    return response.data;
  },

  /**
   * Archive crop (soft delete)
   * @param {string} id
   */
  async archiveCrop(id) {
    const response = await apiClient.patch(`/crops/${id}/archive`);
    return response.data;
  },

  /**
   * Permanently delete crop
   * @param {string} id
   */
  async deleteCrop(id) {
    const response = await apiClient.delete(`/crops/${id}`);
    return response.data;
  },
};

export default cropService;
