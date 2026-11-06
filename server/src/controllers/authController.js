import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import { generateToken } from '../utils/token.js';
import { logger } from '../utils/logger.js';
import { isDBConnected } from '../config/db.js';
import {
  validateRegistrationInput,
  validateLoginInput,
} from '../utils/validators.js';

/**
 * Register a new user (Farmer or Expert)
 * POST /api/auth/register
 */
export const register = async (req, res, next) => {
  try {
    // 1. Check database readiness
    if (!isDBConnected()) {
      logger.error('Registration failed: Database is currently unavailable');
      return res.status(503).json({
        success: false,
        message: 'Database service is currently unavailable. Please try again shortly.',
      });
    }

    const { email, password, phone, location, role } = req.body;
    const name = (req.body.fullName || req.body.name || '').trim();

    // 2. Validate request inputs
    const { isValid, errors } = validateRegistrationInput(req.body);
    if (!isValid) {
      const firstError = Object.values(errors)[0];
      return res.status(400).json({
        success: false,
        message: firstError,
        errors,
      });
    }

    // Defensive check: Strictly prohibit Admin self-registration
    if (role && String(role).toLowerCase().trim() === 'admin') {
      logger.warn(`Registration rejected: Prohibited admin role registration attempt for ${email}`);
      return res.status(400).json({
        success: false,
        message: 'Admin registration is strictly prohibited through the public API.',
      });
    }

    const normalizedEmail = email.toLowerCase().trim();
    logger.info(`Processing registration for email: ${normalizedEmail}`);

    // Check for duplicate email
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      logger.warn(`Registration rejected: Duplicate email ${normalizedEmail}`);
      return res.status(409).json({
        success: false,
        message: 'An account with this email address already exists.',
      });
    }

    // Hash password with bcrypt (12 salt rounds)
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Default to 'farmer' if not provided or valid
    const assignedRole =
      role && ['farmer', 'expert'].includes(String(role).toLowerCase().trim())
        ? String(role).toLowerCase().trim()
        : 'farmer';

    // Create user in database
    const user = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      passwordHash,
      phone: phone ? phone.trim() : '',
      location: location ? location.trim() : '',
      role: assignedRole,
    });

    // Generate JWT token
    const token = generateToken(user);
    logger.success(`Account registered successfully: ${user.name} (${user.email}) as [${user.role}]`);

    return res.status(201).json({
      success: true,
      message: 'Account registered successfully.',
      token,
      user: user.toSafeUser(),
    });
  } catch (error) {
    logger.error(`Registration error: ${error.message}`);
    // Handle Mongoose duplicate key error defensively
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: 'An account with this email address already exists.',
      });
    }
    if (error.name === 'MongooseError' || !isDBConnected()) {
      return res.status(503).json({
        success: false,
        message: 'Database service is currently unavailable. Please try again shortly.',
      });
    }
    next(error);
  }
};

/**
 * Log in an existing user
 * POST /api/auth/login
 */
export const login = async (req, res, next) => {
  try {
    // 1. Verify database connection readiness
    if (!isDBConnected()) {
      logger.error('Login attempt rejected: Database is currently unavailable (Mongoose disconnected)');
      return res.status(503).json({
        success: false,
        message: 'Database service is currently unavailable. Please try again shortly.',
      });
    }

    const { email, password } = req.body;

    // 2. Validate request inputs
    const { isValid, errors } = validateLoginInput(req.body);
    if (!isValid) {
      const firstError = Object.values(errors)[0];
      return res.status(400).json({
        success: false,
        message: firstError,
        errors,
      });
    }

    const normalizedEmail = email.toLowerCase().trim();
    logger.info(`Login attempt initiated for email: ${normalizedEmail}`);

    // 3. Query user and explicitly select passwordHash
    const user = await User.findOne({ email: normalizedEmail }).select(
      '+passwordHash'
    );

    // If user not found, return safe generic error to prevent user enumeration
    if (!user) {
      logger.warn(`Login rejected: User not found for email: ${normalizedEmail}`);
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.',
      });
    }

    // 4. Check if account is active
    if (!user.isActive) {
      logger.warn(`Login rejected: Account is inactive for user: ${normalizedEmail}`);
      return res.status(403).json({
        success: false,
        message: 'Your account has been deactivated. Please contact support.',
      });
    }

    // 5. Verify password against stored hash
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      logger.warn(`Login rejected: Password mismatch for email: ${normalizedEmail}`);
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.',
      });
    }

    // 6. Update lastLogin timestamp
    user.lastLogin = new Date();
    await user.save();

    // 7. Generate JWT token
    const token = generateToken(user);
    logger.success(`Login successful for user: ${user.name} (${user.email}) [Role: ${user.role}]`);

    return res.status(200).json({
      success: true,
      message: 'Logged in successfully.',
      token,
      user: user.toSafeUser(),
    });
  } catch (error) {
    logger.error(`Login error: ${error.message}`);
    // If it's a Mongoose disconnection error
    if (error.name === 'MongooseError' || !isDBConnected()) {
      return res.status(503).json({
        success: false,
        message: 'Database service is currently unavailable. Please try again shortly.',
      });
    }
    next(error);
  }
};

/**
 * Get current authenticated user details
 * GET /api/auth/me
 */
export const getCurrentUser = async (req, res, next) => {
  try {
    if (!isDBConnected()) {
      return res.status(503).json({
        success: false,
        message: 'Database service is currently unavailable.',
      });
    }

    // req.user is set by the protect middleware
    const safeUser = req.user.toSafeUser ? req.user.toSafeUser() : req.user;

    return res.status(200).json({
      success: true,
      user: safeUser,
    });
  } catch (error) {
    next(error);
  }
};
