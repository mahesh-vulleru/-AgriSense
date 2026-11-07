import apiClient from './api.js';

export const userService = {
  /**
   * Get authenticated user profile
   */
  async getProfile() {
    const response = await apiClient.get('/users/profile');
    return response.data;
  },

  /**
   * Update profile fields (Name, Phone, Address, Village, Mandal, District, State, Pincode, Language)
   */
  async updateProfile(profileData) {
    const response = await apiClient.put('/users/profile', profileData);
    return response.data;
  },

  /**
   * Upload and set profile photograph
   */
  async uploadAvatar(imageBase64, filename = 'avatar.jpg') {
    const response = await apiClient.post('/users/profile/avatar', {
      imageBase64,
      filename,
    });
    return response.data;
  },

  /**
   * Remove profile photograph
   */
  async removeAvatar() {
    const response = await apiClient.delete('/users/profile/avatar');
    return response.data;
  },

  /**
   * Change account password
   */
  async changePassword({ currentPassword, newPassword, confirmPassword }) {
    const response = await apiClient.put('/users/change-password', {
      currentPassword,
      newPassword,
      confirmPassword,
    });
    return response.data;
  },

  /**
   * Get user preferences and notification preferences
   */
  async getPreferences() {
    const response = await apiClient.get('/users/preferences');
    return response.data;
  },

  /**
   * Update user preferences (Default Farm, Regional Units, Theme, Timezone, Language)
   */
  async updatePreferences(preferencesData) {
    const response = await apiClient.put('/users/preferences', preferencesData);
    return response.data;
  },

  /**
   * Request account deletion
   */
  async requestAccountDeletion({ password, reason = '' }) {
    const response = await apiClient.post('/users/delete-request', {
      password,
      reason,
    });
    return response.data;
  },
};

export default userService;
