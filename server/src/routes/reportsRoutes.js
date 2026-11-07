import { Router } from 'express';
import { reportsController } from '../controllers/reportsController.js';
import { protect } from '../middleware/auth.js';
import { requireDB } from '../middleware/checkDbConnection.js';

const router = Router();

// Ensure DB is active
router.use(requireDB);

// All analytical reports require authenticated farmer session
router.use(protect);

// GET /api/reports/summary & /api/reports/overview
router.get('/summary', reportsController.getOverview);
router.get('/overview', reportsController.getOverview);

// Category specific report endpoints
router.get('/farms', reportsController.getFarmReports);
router.get('/crops', reportsController.getCropReports);
router.get('/soil', reportsController.getSoilReports);
router.get('/irrigation', reportsController.getIrrigationReports);
router.get('/weather', reportsController.getWeatherReports);
router.get('/disease', reportsController.getDiseaseReports);

// File export endpoints
router.get('/export/csv', reportsController.exportCsv);
router.get('/export/pdf', reportsController.exportPdf);

export default router;
