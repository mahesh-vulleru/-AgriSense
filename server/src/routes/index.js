import { Router } from 'express';
import healthRoutes from './healthRoutes.js';
import authRoutes from './authRoutes.js';
import farmRoutes from './farmRoutes.js';
import dashboardRoutes from './dashboardRoutes.js';
import weatherRoutes from './weatherRoutes.js';
import cropRoutes from './cropRoutes.js';
import monitoringRoutes from './monitoringRoutes.js';
import soilRoutes from './soilRoutes.js';
import irrigationRoutes from './irrigationRoutes.js';
import diseaseRoutes from './diseaseRoutes.js';
import reportsRoutes from './reportsRoutes.js';
import notificationRoutes from './notificationRoutes.js';
import consultationRoutes from './consultationRoutes.js';
import userRoutes from './userRoutes.js';

const router = Router();

// Mount health routes under /api
router.use('/', healthRoutes);

// Mount authentication routes under /api/auth
router.use('/auth', authRoutes);

// Mount farm management routes under /api/farms
router.use('/farms', farmRoutes);

// Mount dashboard aggregation routes under /api/dashboard
router.use('/dashboard', dashboardRoutes);

// Mount weather advisory routes under /api/weather
router.use('/weather', weatherRoutes);

// Mount crop management & lifecycle routes under /api/crops
router.use('/crops', cropRoutes);

// Mount crop monitoring & health telemetry routes under /api/monitoring
router.use('/monitoring', monitoringRoutes);

// Mount soil analysis & soil health management routes under /api/soil-analysis and /api/soil
router.use('/soil-analysis', soilRoutes);
router.use('/soil', soilRoutes);

// Mount smart irrigation & water management routes under /api/irrigation
router.use('/irrigation', irrigationRoutes);

// Mount AI crop disease detection routes under /api/disease-detection and /api/disease
router.use('/disease-detection', diseaseRoutes);
router.use('/disease', diseaseRoutes);

// Mount agricultural reports & analytics routes under /api/reports
router.use('/reports', reportsRoutes);

// Mount real-time notifications & alert management routes under /api/notifications
router.use('/notifications', notificationRoutes);

// Mount expert consultation & farmer support routes under /api/consultations
router.use('/consultations', consultationRoutes);

// Mount user profile, settings & account management routes under /api/users
router.use('/users', userRoutes);

// Root /api information endpoint
router.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    name: 'AgriSense API',
    version: '1.0.0',
    description: 'Intelligent Agriculture Platform REST API',
    endpoints: {
      health: '/api/health',
      auth: {
        register: 'POST /api/auth/register',
        login: 'POST /api/auth/login',
        me: 'GET /api/auth/me',
      },
      dashboard: {
        farmer: 'GET /api/dashboard/farmer',
      },
      farms: {
        create: 'POST /api/farms',
        list: 'GET /api/farms',
        getById: 'GET /api/farms/:id',
        update: 'PUT /api/farms/:id',
        archive: 'PATCH /api/farms/:id/archive',
      },
    },
  });
});

export default router;
