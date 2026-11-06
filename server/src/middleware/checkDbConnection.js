import { isDBConnected } from '../config/db.js';
import { logger } from '../utils/logger.js';

/**
 * Middleware that ensures database connection is active before executing controller logic
 * Returns 503 Service Unavailable immediately if MongoDB is disconnected, preventing request hangs
 */
export const requireDB = (req, res, next) => {
  if (!isDBConnected()) {
    logger.warn(`Rejected ${req.method} ${req.originalUrl}: Database is currently unavailable`);
    return res.status(503).json({
      success: false,
      message: 'Database service is currently unavailable. Please try again shortly.',
    });
  }
  next();
};

export default requireDB;
