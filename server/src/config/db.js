import mongoose from 'mongoose';
import dns from 'dns';
import { env } from './env.js';
import { logger } from '../utils/logger.js';

// Disable command buffering so queries fail fast if DB is disconnected instead of hanging for 10 seconds
mongoose.set('bufferCommands', false);

// Resolve MongoDB Atlas SRV query on Windows environments
if (env.MONGODB_URI && env.MONGODB_URI.startsWith('mongodb+srv://')) {
  try {
    dns.setServers(['8.8.8.8', '1.1.1.1', '8.8.4.4']);
  } catch (err) {
    logger.warn(`Could not set custom DNS servers: ${err.message}`);
  }
}

/**
 * Helper to check whether database connection is fully active
 * @returns {boolean}
 */
export const isDBConnected = () => {
  return mongoose.connection.readyState === 1;
};

/**
 * Initialize MongoDB connection with automatic fallback
 */
export const connectDB = async () => {
  const primaryUri = env.MONGODB_URI;
  const localFallbackUri = env.MONGODB_LOCAL_URI || 'mongodb://127.0.0.1:27017/agrisense';

  const connectionOptions = {
    dbName: 'agrisense',
    serverSelectionTimeoutMS: 5000,
    connectTimeoutMS: 5000,
  };

  try {
    const maskedUri = primaryUri.replace(/\/\/([^:]+):([^@]+)@/, '//***:***@');
    logger.info(`Attempting MongoDB connection to: ${maskedUri}`);

    const conn = await mongoose.connect(primaryUri, connectionOptions);
    logger.success(`MongoDB Connected: ${conn.connection.host}/${conn.connection.name}`);
    return conn;
  } catch (primaryError) {
    logger.warn(`Primary MongoDB Connection Failed: ${primaryError.message}`);

    // If primary was Atlas or remote and local fallback is available, attempt fallback
    if (primaryUri !== localFallbackUri) {
      logger.info(`Attempting fallback to local MongoDB instance (${localFallbackUri})...`);
      try {
        const fallbackConn = await mongoose.connect(localFallbackUri, {
          ...connectionOptions,
          serverSelectionTimeoutMS: 3000,
        });
        logger.success(
          `MongoDB Connected (Local Fallback): ${fallbackConn.connection.host}/${fallbackConn.connection.name}`
        );
        return fallbackConn;
      } catch (fallbackError) {
        logger.error(`Local MongoDB Fallback Failed: ${fallbackError.message}`);
      }
    }

    logger.warn(
      'Server will continue running in offline/graceful mode. Database operations will return 503 until MongoDB is connected.'
    );
    return null;
  }
};

mongoose.connection.on('disconnected', () => {
  logger.warn('MongoDB connection lost. Attempting reconnection...');
});

mongoose.connection.on('reconnected', () => {
  logger.success('MongoDB reconnected successfully.');
});

mongoose.connection.on('error', (err) => {
  logger.error(`MongoDB connection error: ${err.message}`);
});
