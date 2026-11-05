/**
 * Validation utilities for AgriSense Authentication
 */

const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
const PHONE_REGEX = /^[+]?[(]?[0-9]{1,4}[)]?[-\s./0-9]{6,15}$/;

/**
 * Validates registration input
 * @param {Object} data - Input payload
 * @returns {{ isValid: boolean, errors: Object }}
 */
export const validateRegistrationInput = (data = {}) => {
  const errors = {};
  const name = data.fullName || data.name;
  const { email, password, confirmPassword, phone, role } = data;

  // Name validation
  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    errors.name = 'Full name is required';
  } else if (name.trim().length < 2) {
    errors.name = 'Full name must be at least 2 characters long';
  } else if (name.trim().length > 100) {
    errors.name = 'Full name cannot exceed 100 characters';
  }

  // Email validation
  if (!email || typeof email !== 'string' || email.trim().length === 0) {
    errors.email = 'Email address is required';
  } else if (!EMAIL_REGEX.test(email.trim())) {
    errors.email = 'Please provide a valid email address';
  }

  // Password validation
  if (!password || typeof password !== 'string') {
    errors.password = 'Password is required';
  } else if (password.length < 8) {
    errors.password = 'Password must be at least 8 characters long';
  } else if (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
    errors.password = 'Password must contain at least one letter and one number';
  }

  // Confirm password validation (if provided)
  if (confirmPassword !== undefined && confirmPassword !== password) {
    errors.confirmPassword = 'Passwords do not match';
  }

  // Phone validation (optional field, but if provided, must look valid)
  if (phone && typeof phone === 'string' && phone.trim().length > 0) {
    if (!PHONE_REGEX.test(phone.trim())) {
      errors.phone = 'Please provide a valid phone number';
    }
  }

  // Role validation: prevent admin self-registration
  if (role) {
    const normalizedRole = String(role).toLowerCase().trim();
    if (normalizedRole === 'admin') {
      errors.role = 'Admin registration is strictly prohibited through the public API';
    } else if (!['farmer', 'expert'].includes(normalizedRole)) {
      errors.role = 'Role must be either "farmer" or "expert"';
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
};

/**
 * Validates login input
 * @param {Object} data - Login credentials
 * @returns {{ isValid: boolean, errors: Object }}
 */
export const validateLoginInput = (data = {}) => {
  const errors = {};
  const { email, password } = data;

  if (!email || typeof email !== 'string' || email.trim().length === 0) {
    errors.email = 'Email address is required';
  } else if (!EMAIL_REGEX.test(email.trim())) {
    errors.email = 'Please provide a valid email address';
  }

  if (!password || typeof password !== 'string' || password.length === 0) {
    errors.password = 'Password is required';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
};

