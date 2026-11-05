import apiClient from './api.js';

/**
 * Fetch health status from AgriSense backend API.
 * Calls GET /api/health
 */
export const checkApiHealth = async () => {
  const startTime = performance.now();
  try {
    const response = await apiClient.get('/health');
    const endTime = performance.now();
    return {
      success: true,
      data: response.data,
      latency: Math.round(endTime - startTime),
    };
  } catch (error) {
    const endTime = performance.now();
    return {
      success: false,
      error: error.message || 'Unable to connect to AgriSense backend',
      latency: Math.round(endTime - startTime),
    };
  }
};

