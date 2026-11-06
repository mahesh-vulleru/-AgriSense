import dotenv from 'dotenv';

dotenv.config();

export const env = {
  PORT: process.env.PORT || 5000,
  NODE_ENV: process.env.NODE_ENV || 'development',
  MONGODB_URI: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/agrisense',
  MONGODB_LOCAL_URI: process.env.MONGODB_LOCAL_URI || 'mongodb://127.0.0.1:27017/agrisense',
  CLIENT_URL: process.env.CLIENT_URL || 'http://localhost:5173',
  JWT_SECRET: process.env.JWT_SECRET || 'agrisense_dev_fallback_secret_key_2026',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',
  WEATHER_PROVIDER: (process.env.WEATHER_PROVIDER || 'openweather').toLowerCase(),
  OPENWEATHER_API_KEY: process.env.OPENWEATHER_API_KEY || '',
};

export default env;
