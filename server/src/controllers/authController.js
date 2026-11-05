import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import { generateToken } from '../utils/token.js';
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
    const { name, email, password, phone, location, role } = req.body;

    // Validate request inputs
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
      return res.status(400).json({
        success: false,
        message: 'Admin registration is strictly prohibited through the public API.',
      });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Check for duplicate email
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
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

    return res.status(201).json({
      success: true,
      message: 'Account registered successfully.',
      token,
      user: user.toSafeUser(),
    });
  } catch (error) {
    // Handle Mongoose duplicate key error defensively
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: 'An account with this email address already exists.',
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
    const { email, password } = req.body;

    // Validate request inputs
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

    // Query user and explicitly select passwordHash
    const user = await User.findOne({ email: normalizedEmail }).select(
      '+passwordHash'
    );

    // If user not found, return safe generic error to prevent user enumeration
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.',
      });
    }

    // Check if account is active
    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: 'Your account has been deactivated. Please contact support.',
      });
    }

    // Verify password against stored hash
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.',
      });
    }

    // Update lastLogin timestamp
    user.lastLogin = new Date();
    await user.save();

    // Generate JWT token
    const token = generateToken(user);

    return res.status(200).json({
      success: true,
      message: 'Logged in successfully.',
      token,
      user: user.toSafeUser(),
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get current authenticated user details
 * GET /api/auth/me
 */
export const getCurrentUser = async (req, res, next) => {
  try {
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

