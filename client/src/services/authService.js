import apiClient, {
  setStoredToken,
  removeStoredToken,
  getStoredToken,
  getStoredUser,
  setStoredUser,
} from './api.js';

let currentUserPromise = null;

export const authService = {
  /**
   * Log in user
   * @param {Object} credentials - { email, password, rememberMe }
   */
  async login({ email, password, rememberMe = true }) {
    const response = await apiClient.post('/auth/login', { email, password });
    const { token, user } = response.data;
    if (token) {
      setStoredToken(token, rememberMe);
    }
    if (user) {
      setStoredUser(user, rememberMe);
    }
    return response.data;
  },

  /**
   * Register a new Farmer or Expert account
   * @param {Object} formData - { name, email, password, phone, location, role }
   */
  async register(formData) {
    const response = await apiClient.post('/auth/register', formData);
    const { token, user } = response.data;
    if (token) {
      setStoredToken(token, true);
    }
    if (user) {
      setStoredUser(user, true);
    }
    return response.data;
  },

  /**
   * Retrieve current user profile using active token (deduplicated)
   */
  async getCurrentUser() {
    if (currentUserPromise) {
      return currentUserPromise;
    }

    currentUserPromise = apiClient
      .get('/auth/me')
      .then((response) => {
        currentUserPromise = null;
        if (response.data?.user) {
          setStoredUser(response.data.user);
        }
        return response.data;
      })
      .catch((error) => {
        currentUserPromise = null;
        throw error;
      });

    return currentUserPromise;
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

  /**
   * Get cached user profile
   */
  getCachedUser() {
    return getStoredUser();
  },
};

export default authService;
