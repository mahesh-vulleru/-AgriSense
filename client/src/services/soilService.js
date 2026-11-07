import apiClient from './api.js';

export const soilService = {
  /**
   * Fetch aggregated metrics and summaries for farmer's soil dashboard
   */
  async getDashboard() {
    const response = await apiClient.get('/soil-analysis/dashboard');
    return response.data;
  },

  /**
   * List soil analyses with optional filtering (farmId, soilType, healthStatus)
   */
  async getSoilAnalyses(params = {}) {
    const response = await apiClient.get('/soil-analysis', { params });
    return response.data;
  },

  /**
   * Retrieve full details of a specific soil analysis test
   */
  async getSoilAnalysisById(id) {
    const response = await apiClient.get(`/soil-analysis/${id}`);
    return response.data;
  },

  /**
   * Register a new soil test record
   */
  async createSoilAnalysis(data) {
    const response = await apiClient.post('/soil-analysis', data);
    return response.data;
  },

  /**
   * Update an existing soil test record
   */
  async updateSoilAnalysis(id, data) {
    const response = await apiClient.put(`/soil-analysis/${id}`, data);
    return response.data;
  },

  /**
   * Delete a soil test record
   */
  async deleteSoilAnalysis(id) {
    const response = await apiClient.delete(`/soil-analysis/${id}`);
    return response.data;
  },

  /**
   * Fetch chronological test history & trends for a specific farm
   */
  async getFarmSoilHistory(farmId) {
    const response = await apiClient.get(`/soil-analysis/history/${farmId}`);
    return response.data;
  },

  /**
   * Upload laboratory report document (PDF, PNG, JPG, WEBP)
   */
  async uploadReport({ fileBase64, filename, mimeType }) {
    const response = await apiClient.post('/soil-analysis/upload-report', {
      fileBase64,
      filename,
      mimeType,
    });
    return response.data;
  },

  /**
   * Generate customized fertilizer & soil conditioner recommendations
   */
  async getFertilizerGuidance({ soilAnalysisId, cropName, cropStage, acreage }) {
    const response = await apiClient.post('/soil-analysis/recommendations', {
      soilAnalysisId,
      cropName,
      cropStage,
      acreage,
    });
    return response.data;
  },
};

export default soilService;
