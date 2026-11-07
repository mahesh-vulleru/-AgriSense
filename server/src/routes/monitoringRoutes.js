import { Router } from 'express';
import { monitoringController } from '../controllers/monitoringController.js';
import { protect } from '../middleware/auth.js';
import { requireDB } from '../middleware/checkDbConnection.js';

const router = Router();

// Ensure DB is connected
router.use(requireDB);

// All monitoring routes require authenticated session
router.use(protect);

// GET /api/monitoring/dashboard - Telemetry summary and active crop health overview
router.get('/dashboard', monitoringController.getDashboard);

// GET /api/monitoring/crop/:cropId - Individual crop telemetry, assessment timeline, and risks
router.get('/crop/:cropId', monitoringController.getCropMonitoring);

// POST /api/monitoring/assessment - Log a field health assessment
router.post('/assessment', monitoringController.recordAssessment);

// POST /api/monitoring/upload-photo - Upload an assessment photo
router.post('/upload-photo', monitoringController.uploadPhoto);

// GET /api/monitoring/weather-risks/:cropId - Real-time weather-driven crop alerts
router.get('/weather-risks/:cropId', monitoringController.getCropWeatherRisks);

export default router;
