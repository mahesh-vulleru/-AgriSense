import apiClient from './api.js';

export const reportService = {
  /**
   * Fetch overview summary metrics and distributions
   */
  async getSummary(params = {}) {
    const response = await apiClient.get('/reports/summary', { params });
    return response.data;
  },

  /**
   * Fetch farm audit reports
   */
  async getFarms(params = {}) {
    const response = await apiClient.get('/reports/farms', { params });
    return response.data;
  },

  /**
   * Fetch crop performance & yield realization reports
   */
  async getCrops(params = {}) {
    const response = await apiClient.get('/reports/crops', { params });
    return response.data;
  },

  /**
   * Fetch soil health & nutrient reports
   */
  async getSoil(params = {}) {
    const response = await apiClient.get('/reports/soil', { params });
    return response.data;
  },

  /**
   * Fetch irrigation & water usage reports
   */
  async getIrrigation(params = {}) {
    const response = await apiClient.get('/reports/irrigation', { params });
    return response.data;
  },

  /**
   * Fetch agro-meteorological weather reports
   */
  async getWeather(params = {}) {
    const response = await apiClient.get('/reports/weather', { params });
    return response.data;
  },

  /**
   * Fetch AI disease detection diagnostic reports
   */
  async getDisease(params = {}) {
    const response = await apiClient.get('/reports/disease', { params });
    return response.data;
  },

  /**
   * Export CSV report and trigger browser download
   */
  async downloadCsv(category, params = {}) {
    const response = await apiClient.get('/reports/export/csv', {
      params: { ...params, category },
      responseType: 'blob',
    });

    const blob = new Blob([response.data], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `agrisense_${category}_report_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },

  /**
   * Export PDF report and trigger browser download
   */
  async downloadPdf(category, params = {}) {
    const response = await apiClient.get('/reports/export/pdf', {
      params: { ...params, category },
      responseType: 'blob',
    });

    const blob = new Blob([response.data], { type: 'application/pdf' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `agrisense_${category}_report_${Date.now()}.pdf`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },
};

export default reportService;
