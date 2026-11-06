import { Router } from 'express';
import {
  getCrops,
  getCropById,
  createCrop,
  updateCrop,
  updateCropStage,
  recordHarvest,
  addCalendarMilestone,
  updateCalendarMilestone,
  archiveCrop,
  deleteCrop,
} from '../controllers/cropController.js';
import { protect } from '../middleware/auth.js';
import { requireDB } from '../middleware/checkDbConnection.js';

const router = Router();

// Ensure MongoDB is connected before attempting any crop operation
router.use(requireDB);

// All crop operations require authentication
router.use(protect);

router.get('/', getCrops);
router.post('/', createCrop);
router.get('/:id', getCropById);
router.put('/:id', updateCrop);
router.patch('/:id/stage', updateCropStage);
router.post('/:id/harvest', recordHarvest);
router.post('/:id/calendar', addCalendarMilestone);
router.patch('/:id/calendar/:milestoneId', updateCalendarMilestone);
router.patch('/:id/archive', archiveCrop);
router.delete('/:id', deleteCrop);

export default router;
