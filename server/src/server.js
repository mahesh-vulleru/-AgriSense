import app from './app.js';
import { env } from './config/env.js';
import { connectDB } from './config/db.js';
import { logger } from './utils/logger.js';
import mongoose from 'mongoose';
import http from 'http';
import { initSocket } from './socket/socket.js';

const startServer = async () => {
  // Connect to MongoDB (graceful mode ensures server starts even if DB is momentarily unreachable)
  await connectDB();

  const httpServer = http.createServer(app);
  initSocket(httpServer);

  const server = httpServer.listen(env.PORT, () => {
    logger.success(`AgriSense Server running in ${env.NODE_ENV} mode on http://localhost:${env.PORT}`);
    logger.info(`Health check available at http://localhost:${env.PORT}/api/health`);
    logger.info(`Socket.IO real-time notification engine initialized.`);

    // Validate weather provider configuration on startup
    if (env.WEATHER_PROVIDER === 'openweather') {
      const key = env.OPENWEATHER_API_KEY?.trim();
      if (!key || key === 'YOUR_OPENWEATHER_API_KEY') {
        logger.warn(
          '[CONFIG] OpenWeather API key is not configured or using placeholder "YOUR_OPENWEATHER_API_KEY" in server/.env. Weather endpoints will return configuration error until a valid key is set.'
        );
      } else {
        logger.success('[CONFIG] OpenWeather provider active with configured API credentials.');
      }
    }
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

