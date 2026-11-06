import { Router } from 'express';
import { getFarmerDashboardStats } from '../controllers/dashboardController.js';
import { protect, authorize } from '../middleware/auth.js';
import { requireDB } from '../middleware/checkDbConnection.js';

const router = Router();

// Ensure database connection is healthy
router.use(requireDB);

// Enforce JWT authentication
router.use(protect);

// Farmer dashboard statistics endpoint (accessible by farmers and admins)
router.get('/farmer', authorize('farmer', 'admin'), getFarmerDashboardStats);

export default router;
