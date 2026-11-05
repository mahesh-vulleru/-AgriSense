import mongoose from 'mongoose';
import { env } from '../config/env.js';

export const getHealthStatus = (req, res) => {
  const isDbConnected = mongoose.connection.readyState === 1;

  res.status(200).json({
    success: true,
    message: 'AgriSense API is running',
    environment: env.NODE_ENV,
    timestamp: new Date().toISOString(),
    uptime: Math.floor(process.uptime()),
    database: {
      status: isDbConnected ? 'connected' : 'disconnected',
      name: mongoose.connection.name || 'agrisense',
      host: mongoose.connection.host || 'unknown',
    },
  });
};

