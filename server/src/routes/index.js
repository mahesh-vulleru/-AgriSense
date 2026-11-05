import { Router } from 'express';
import healthRoutes from './healthRoutes.js';
import authRoutes from './authRoutes.js';

const router = Router();

// Mount health routes under /api
router.use('/', healthRoutes);

// Mount authentication routes under /api/auth
router.use('/auth', authRoutes);

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
    },
  });
});

export default router;
