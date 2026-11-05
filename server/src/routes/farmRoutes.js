import { Router } from 'express';
import {
  createFarm,
  getFarms,
  getFarmById,
  updateFarm,
  archiveFarm,
} from '../controllers/farmController.js';
import { protect } from '../middleware/auth.js';

const router = Router();

// All farm operations require authentication
router.use(protect);

router.post('/', createFarm);
router.get('/', getFarms);
router.get('/:id', getFarmById);
router.put('/:id', updateFarm);
router.patch('/:id/archive', archiveFarm);

export default router;

