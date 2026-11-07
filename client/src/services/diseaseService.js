import apiClient from './api.js';

export const diseaseService = {
  /**
   * Fetch AI provider status, model name, and configuration state
   */
  async getProviderStatus() {
    const response = await apiClient.get('/disease-detection/status');
    return response.data;
  },

  /**
   * Send actual crop photograph to Gemini AI for real-time pathology diagnosis
   * @param {Object} payload - { farmId, cropId, imageBase64, filename, captureMethod, notes }
   */
  async scanCrop(payload) {
    const response = await apiClient.post('/disease-detection/scan', payload);
    return response.data;
  },

  /**
   * List historical disease scans with optional filters
   * @param {Object} params - { farmId, cropId, status, page, limit }
   */
  async getHistory(params = {}) {
    const response = await apiClient.get('/disease-detection/history', { params });
    return response.data;
  },

  /**
   * Get single scan details by ID
   */
  async getScanById(id) {
    const response = await apiClient.get(`/disease-detection/history/${id}`);
    return response.data;
  },

  /**
   * Delete a scan record
   */
  async deleteScan(id) {
    const response = await apiClient.delete(`/disease-detection/history/${id}`);
    return response.data;
  },
};

export default diseaseService;
