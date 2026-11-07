import { Router } from 'express';
import { diseaseController } from '../controllers/diseaseController.js';
import { protect } from '../middleware/auth.js';
import { requireDB } from '../middleware/checkDbConnection.js';

const router = Router();

// Ensure DB is connected
router.use(requireDB);

// All AI disease routes require authenticated farmer session
router.use(protect);

// GET /api/disease-detection/status - Provider status, model name, and configuration state
router.get('/status', diseaseController.getStatus);

// POST /api/disease-detection/scan - Upload/capture photograph and run Gemini AI diagnosis
router.post('/scan', diseaseController.scanCrop);

// GET /api/disease-detection/history - Retrieve historical scan records with filters
router.get('/history', diseaseController.getHistory);

// GET /api/disease-detection/history/:id - View full details of a specific scan
router.get('/history/:id', diseaseController.getScanById);

// DELETE /api/disease-detection/history/:id - Remove a scan record
router.delete('/history/:id', diseaseController.deleteScan);

export default router;
