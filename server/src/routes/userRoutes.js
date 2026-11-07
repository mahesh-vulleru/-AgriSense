import { Router } from 'express';
import {
  getProfile,
  updateProfile,
  uploadAvatar,
  removeAvatar,
  changePassword,
  getPreferences,
  updatePreferences,
  requestAccountDeletion,
} from '../controllers/userController.js';
import { protect } from '../middleware/auth.js';
import { requireDB } from '../middleware/checkDbConnection.js';

const router = Router();

// Ensure DB connected
router.use(requireDB);

// Protect all user profile & settings endpoints
router.use(protect);

// Profile management
router.get('/profile', getProfile);
router.get('/me', getProfile);
router.put('/profile', updateProfile);

// Profile photograph
router.post('/profile/avatar', uploadAvatar);
router.delete('/profile/avatar', removeAvatar);

// Security & Password
router.put('/change-password', changePassword);

// Farm & Account Preferences
router.get('/preferences', getPreferences);
router.put('/preferences', updatePreferences);

// Privacy & Deletion request
router.post('/delete-request', requestAccountDeletion);

export default router;
