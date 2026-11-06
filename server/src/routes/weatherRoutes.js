import { Router } from 'express';
import {
  getFarmWeather,
  getWeatherByCoordinates,
  updateFarmCoordinates,
  getFarmerFarmsWeatherSummary,
} from '../controllers/weatherController.js';
import { protect } from '../middleware/auth.js';
import { requireDB } from '../middleware/checkDbConnection.js';

const router = Router();

// Ensure database connection
router.use(requireDB);

// All weather operations are farm/user authenticated
router.use(protect);

router.get('/farms-summary', getFarmerFarmsWeatherSummary);
router.get('/coordinates', getWeatherByCoordinates);
router.get('/farm/:farmId', getFarmWeather);
router.patch('/farm/:farmId/coordinates', updateFarmCoordinates);

export default router;
