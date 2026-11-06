import { Router } from 'express';
import {
  createFarm,
  getFarms,
  getFarmById,
  updateFarm,
  archiveFarm,
} from '../controllers/farmController.js';
import { protect } from '../middleware/auth.js';
import { requireDB } from '../middleware/checkDbConnection.js';

const router = Router();

// Ensure MongoDB is connected before attempting any farm operation
router.use(requireDB);

// All farm operations require authentication
router.use(protect);

router.post('/', createFarm);
router.get('/', getFarms);
router.get('/:id', getFarmById);
router.put('/:id', updateFarm);
router.patch('/:id/archive', archiveFarm);

export default router;
