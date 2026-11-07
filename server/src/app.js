import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import path from 'path';
import { env } from './config/env.js';
import apiRoutes from './routes/index.js';
import { notFound } from './middleware/notFound.js';
import { errorHandler } from './middleware/errorHandler.js';

const app = express();

// CORS configuration
const allowedOrigins = [
  env.CLIENT_URL,
  'http://localhost:5173',
  'http://localhost:3000',
  'http://127.0.0.1:5173',
];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g. mobile apps, curl, Postman)
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(null, true); // Permissive for local development
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  })
);

// Built-in body parsers with 10MB capacity for crop monitoring photos
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static file serving for uploaded crop photos
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

// Request logging in development
if (env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Root ping
app.get('/', (req, res) => {
  res.status(200).json({
    message: 'Welcome to AgriSense Server API',
    status: 'online',
    healthCheck: '/api/health',
  });
});

// Mount modular API routes under /api
app.use('/api', apiRoutes);

// 404 & Central Error Handling
app.use(notFound);
app.use(errorHandler);

export default app;

