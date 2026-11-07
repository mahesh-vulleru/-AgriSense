import apiClient from './api.js';

export const consultationService = {
  /**
   * Get verified agricultural specialists directory
   */
  async getExperts(params = {}) {
    const response = await apiClient.get('/consultations/experts', { params });
    return response.data;
  },

  /**
   * Submit a new consultation request
   */
  async createConsultation(data) {
    const response = await apiClient.post('/consultations', data);
    return response.data;
  },

  /**
   * Get farmer consultation requests with filters and KPIs
   */
  async getFarmerConsultations(params = {}) {
    const response = await apiClient.get('/consultations/farmer', { params });
    return response.data;
  },

  /**
   * Get expert consultation queue with filters and KPIs
   */
  async getExpertConsultations(params = {}) {
    const response = await apiClient.get('/consultations/expert', { params });
    return response.data;
  },

  /**
   * Get detailed consultation with associated farm, crop, AI scan, and timeline
   */
  async getConsultationById(id) {
    const response = await apiClient.get(`/consultations/${id}`);
    return response.data;
  },

  /**
   * Specialist accepts consultation request
   */
  async acceptConsultation(id) {
    const response = await apiClient.patch(`/consultations/${id}/accept`);
    return response.data;
  },

  /**
   * Specialist declines consultation request
   */
  async rejectConsultation(id, reason = '') {
    const response = await apiClient.patch(`/consultations/${id}/reject`, { reason });
    return response.data;
  },

  /**
   * Update consultation status
   */
  async updateStatus(id, status, notes = '') {
    const response = await apiClient.patch(`/consultations/${id}/status`, { status, notes });
    return response.data;
  },

  /**
   * Submit structured expert agronomic recommendations
   */
  async submitRecommendation(id, recommendation) {
    const response = await apiClient.post(`/consultations/${id}/recommendations`, recommendation);
    return response.data;
  },

  /**
   * Complete consultation and submit farmer review
   */
  async completeConsultation(id, feedbackData = {}) {
    const response = await apiClient.patch(`/consultations/${id}/complete`, feedbackData);
    return response.data;
  },

  /**
   * Send a chat message in consultation thread
   */
  async sendMessage(id, messageData) {
    const response = await apiClient.post(`/consultations/${id}/messages`, messageData);
    return response.data;
  },

  /**
   * Retrieve chronological message history
   */
  async getMessages(id) {
    const response = await apiClient.get(`/consultations/${id}/messages`);
    return response.data;
  },

  /**
   * Upload image attachment for consultation or chat
   */
  async uploadAttachment(imageBase64, filename) {
    const response = await apiClient.post('/consultations/upload-attachment', {
      imageBase64,
      filename,
    });
    return response.data;
  },
};

export default consultationService;
