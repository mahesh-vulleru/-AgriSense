import { Router } from 'express';
import { soilController } from '../controllers/soilController.js';
import { protect } from '../middleware/auth.js';
import { requireDB } from '../middleware/checkDbConnection.js';

const router = Router();

// Ensure MongoDB is connected
router.use(requireDB);

// All soil analysis routes require authenticated farmer session
router.use(protect);

// GET /api/soil-analysis/dashboard - Aggregated metrics & latest soil assessments
router.get('/dashboard', soilController.getDashboard);

// GET /api/soil-analysis - List all soil analysis records (optional farmId, soilType, etc.)
router.get('/', soilController.getSoilAnalyses);

// POST /api/soil-analysis - Register a new soil test record
router.post('/', soilController.createSoilAnalysis);

// GET /api/soil-analysis/history/:farmId - Historical tests, trend analysis, and charts for a farm
router.get('/history/:farmId', soilController.getFarmSoilHistory);

// POST /api/soil-analysis/upload-report - Upload laboratory report (PDF or image)
router.post('/upload-report', soilController.uploadReport);

// POST /api/soil-analysis/recommendations - Generate custom fertilizer & amendment guidance
router.post('/recommendations', soilController.getFertilizerGuidance);

// GET /api/soil-analysis/:id - Detail view with full assessment & guidance
router.get('/:id', soilController.getSoilAnalysisById);

// PUT /api/soil-analysis/:id - Update an existing soil test record
router.put('/:id', soilController.updateSoilAnalysis);

// DELETE /api/soil-analysis/:id - Remove a soil test record
router.delete('/:id', soilController.deleteSoilAnalysis);

export default router;
