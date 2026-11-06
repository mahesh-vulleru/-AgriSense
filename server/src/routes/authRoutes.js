import { Router } from 'express';
import {
  register,
  login,
  getCurrentUser,
} from '../controllers/authController.js';
import { protect } from '../middleware/auth.js';
import { authLimiter } from '../middleware/rateLimiter.js';
import { requireDB } from '../middleware/checkDbConnection.js';

const router = Router();

// Ensure MongoDB is connected before attempting any authentication operation
router.use(requireDB);

// Public Authentication Endpoints (Rate-limited)
router.post('/register', authLimiter, register);
router.post('/login', authLimiter, login);

// Protected Authentication Endpoints
router.get('/me', protect, getCurrentUser);

export default router;
