import rateLimit from 'express-rate-limit';

// Rate limiter for authentication endpoints (prevent brute force & credential stuffing)
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'test' ? 1000 : 50, // generous in test, safe in dev/prod
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many requests from this IP address. Please try again after 15 minutes.',
  },
  skip: () => process.env.NODE_ENV === 'test',
});

