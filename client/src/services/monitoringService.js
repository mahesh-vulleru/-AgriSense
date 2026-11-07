import apiClient from './api.js';

export const monitoringService = {
  /**
   * Retrieve monitoring dashboard KPIs, crops health summary, recent alerts
   */
  async getDashboard() {
    const response = await apiClient.get('/monitoring/dashboard');
    return response.data;
  },

  /**
   * Retrieve individual crop monitoring details, assessment history, and risks
   */
  async getCropMonitoring(cropId) {
    const response = await apiClient.get(`/monitoring/crop/${cropId}`);
    return response.data;
  },

  /**
   * Record a new manual or field crop health assessment
   */
  async recordAssessment(assessmentData) {
    const response = await apiClient.post('/monitoring/assessment', assessmentData);
    return response.data;
  },

  /**
   * Upload an assessment image (base64 data URL)
   */
  async uploadPhoto({ imageBase64, filename, caption = '', cropId = null }) {
    const response = await apiClient.post('/monitoring/upload-photo', {
      imageBase64,
      filename,
      caption,
      cropId,
    });
    return response.data;
  },

  /**
   * Retrieve real-time weather-driven crop alerts
   */
  async getCropWeatherRisks(cropId) {
    const response = await apiClient.get(`/monitoring/weather-risks/${cropId}`);
    return response.data;
  },
};

export default monitoringService;
