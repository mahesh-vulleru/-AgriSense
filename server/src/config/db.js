import mongoose from 'mongoose';
import dns from 'dns';
import { env } from './env.js';
import { logger } from '../utils/logger.js';

// Resolve MongoDB Atlas SRV query on Windows environments
if (env.MONGODB_URI && env.MONGODB_URI.startsWith('mongodb+srv://')) {
  try {
    dns.setServers(['8.8.8.8', '1.1.1.1', '8.8.4.4']);
  } catch (err) {
    logger.warn(`Could not set custom DNS servers: ${err.message}`);
  }
}

export const connectDB = async () => {
  try {
    const conn = await mongoose.connect(env.MONGODB_URI, {
      dbName: 'agrisense',
      serverSelectionTimeoutMS: 8000,
    });

    logger.success(`MongoDB Connected: ${conn.connection.host}/${conn.connection.name}`);
    return conn;
  } catch (error) {
    logger.warn(`MongoDB Connection Failed: ${error.message}`);
    logger.warn('Server will continue running in offline/graceful mode. Database operations will be unavailable until MongoDB is connected.');
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
