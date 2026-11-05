import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';

/**
 * Generate a signed JWT token for a user
 * @param {Object} user - User document or safe user object
 * @returns {string} Signed JWT token
 */
export const generateToken = (user) => {
  const payload = {
    id: user._id || user.id,
    email: user.email,
    role: user.role,
  };

  return jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN || '7d',
  });
};

/**
 * Verify and decode a JWT token
 * @param {string} token - JWT token string
 * @returns {Object} Decoded payload
 */
export const verifyToken = (token) => {
  return jwt.verify(token, env.JWT_SECRET);
};

