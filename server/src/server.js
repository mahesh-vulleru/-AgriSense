import app from './app.js';
import { env } from './config/env.js';
import { connectDB } from './config/db.js';
import { logger } from './utils/logger.js';
import mongoose from 'mongoose';

const startServer = async () => {
  // Connect to MongoDB (graceful mode ensures server starts even if DB is momentarily unreachable)
  await connectDB();

  const server = app.listen(env.PORT, () => {
    logger.success(`AgriSense Server running in ${env.NODE_ENV} mode on http://localhost:${env.PORT}`);
    logger.info(`Health check available at http://localhost:${env.PORT}/api/health`);
  });

  // Graceful shutdown handling
  const shutdown = async (signal) => {
    logger.warn(`${signal} received. Initiating graceful shutdown...`);
    server.close(async () => {
      logger.info('HTTP server closed.');
      try {
        await mongoose.connection.close(false);
        logger.info('MongoDB connection closed.');
      } catch (err) {
        logger.error(`Error closing MongoDB connection: ${err.message}`);
      }
      process.exit(0);
    });
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
};

startServer().catch((error) => {
  logger.error(`Fatal error during server startup: ${error.message}`);
  process.exit(1);
});

