import { Router } from 'express';
import healthRoutes from './healthRoutes.js';

const router = Router();

// Mount health routes under /api
router.use('/', healthRoutes);

// Root /api information endpoint
router.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    name: 'AgriSense API',
    version: '1.0.0',
    description: 'Intelligent Agriculture Platform REST API',
    endpoints: {
      health: '/api/health',
    },
  });
});

export default router;

