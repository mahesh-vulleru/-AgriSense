import apiClient from './api.js';

export const weatherService = {
  /**
   * Get summary list of all farmer-owned farms with coordinate availability
   */
  async getFarmsWeatherSummary() {
    const response = await apiClient.get('/weather/farms-summary');
    return response.data;
  },

  /**
   * Get full agricultural weather advisory for a specific farm
   * @param {string} farmId
   */
  async getFarmWeather(farmId) {
    const response = await apiClient.get(`/weather/farm/${farmId}`);
    return response.data;
  },

  /**
   * Get weather advisory by latitude and longitude
   * @param {number} lat
   * @param {number} lon
   */
  async getWeatherByCoordinates(lat, lon) {
    const response = await apiClient.get('/weather/coordinates', {
      params: { lat, lon },
    });
    return response.data;
  },

  /**
   * Update farm coordinates directly and receive updated weather
   * @param {string} farmId
   * @param {number} latitude
   * @param {number} longitude
   */
  async updateFarmCoordinates(farmId, latitude, longitude) {
    const response = await apiClient.patch(`/weather/farm/${farmId}/coordinates`, {
      latitude: Number(latitude),
      longitude: Number(longitude),
    });
    return response.data;
  },
};

export default weatherService;
