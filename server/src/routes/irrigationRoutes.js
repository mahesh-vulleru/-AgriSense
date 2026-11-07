import { Router } from 'express';
import { irrigationController } from '../controllers/irrigationController.js';
import { protect } from '../middleware/auth.js';
import { requireDB } from '../middleware/checkDbConnection.js';

const router = Router();

// Ensure MongoDB is connected
router.use(requireDB);

// All smart irrigation endpoints require authenticated session
router.use(protect);

// Dashboard
router.get('/dashboard', irrigationController.getDashboard);

// Plans
router.get('/plans', irrigationController.getPlans);
router.post('/plans', irrigationController.createPlan);
router.get('/plans/:id', irrigationController.getPlanById);
router.put('/plans/:id', irrigationController.updatePlan);
router.delete('/plans/:id', irrigationController.deletePlan);

// Schedules / Activities
router.get('/schedules', irrigationController.getSchedules);
router.post('/schedules', irrigationController.createSchedule);
router.put('/schedules/:id', irrigationController.updateSchedule);
router.patch('/schedules/:id/status', irrigationController.updateScheduleStatus);
router.delete('/schedules/:id', irrigationController.deleteSchedule);

// Water Usage
router.get('/water-usage', irrigationController.getWaterUsage);
router.post('/water-usage', irrigationController.recordWaterUsage);

// Advisory
router.get('/advisory/:farmId', irrigationController.getAdvisory);

export default router;
