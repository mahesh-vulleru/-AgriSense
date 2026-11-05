import apiClient, {
  setStoredToken,
  removeStoredToken,
  getStoredToken,
} from './api.js';

export const authService = {
  /**
   * Log in user
   * @param {Object} credentials - { email, password, rememberMe }
   */
  async login({ email, password, rememberMe = true }) {
    const response = await apiClient.post('/auth/login', { email, password });
    const { token } = response.data;
    if (token) {
      setStoredToken(token, rememberMe);
    }
    return response.data;
  },

  /**
   * Register a new Farmer or Expert account
   * @param {Object} formData - { name, email, password, phone, location, role }
   */
  async register(formData) {
    const response = await apiClient.post('/auth/register', formData);
    const { token } = response.data;
    if (token) {
      setStoredToken(token, true);
    }
    return response.data;
  },

  /**
   * Retrieve current user profile using active token
   */
  async getCurrentUser() {
    const response = await apiClient.get('/auth/me');
    return response.data;
  },

  /**
   * Remove stored session tokens
   */
  logout() {
    removeStoredToken();
  },

  /**
   * Check if token is present in storage
   */
  hasStoredToken() {
    return Boolean(getStoredToken());
  },
};

export default authService;
