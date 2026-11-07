import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import Farm from '../models/Farm.js';
import NotificationPreference from '../models/NotificationPreference.js';
import { logger } from '../utils/logger.js';

/**
 * GET /api/users/profile
 * Get authenticated user's complete profile
 */
export const getProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id).populate('defaultFarm', 'name location totalAcreage soilType');
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User profile not found.',
      });
    }

    return res.status(200).json({
      success: true,
      user: user.toSafeUser(),
    });
  } catch (err) {
    logger.error(`[USER] Error fetching profile: ${err.message}`);
    next(err);
  }
};

/**
 * PUT /api/users/profile
 * Update editable profile fields (Name, Phone, Address, Mandal, District, State, Pincode, Language)
 * Strictly prevents role/permission escalation.
 */
export const updateProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found.',
      });
    }

    // Role Escalation Protection: Disallow changing role or isActive
    if (req.body.role && req.body.role !== user.role) {
      logger.warn(`[SECURITY] User ${user.email} attempted to alter role from ${user.role} to ${req.body.role}`);
      return res.status(403).json({
        success: false,
        message: 'Unauthorized: Modifying user role or permissions is strictly prohibited.',
      });
    }

    const {
      name,
      phone,
      location,
      address,
      village,
      mandal,
      district,
      state,
      pincode,
      language,
    } = req.body;

    // Validation: Name
    if (name !== undefined) {
      const trimmedName = String(name).trim();
      if (trimmedName.length < 2) {
        return res.status(400).json({
          success: false,
          message: 'Full Name must be at least 2 characters long.',
        });
      }
      user.name = trimmedName;
    }

    // Validation: Phone
    if (phone !== undefined) {
      const trimmedPhone = String(phone).trim();
      if (trimmedPhone && !/^\+?[0-9\s-]{10,15}$/.test(trimmedPhone)) {
        return res.status(400).json({
          success: false,
          message: 'Please provide a valid 10-digit mobile number.',
        });
      }
      user.phone = trimmedPhone;
    }

    // Validation: PIN Code
    if (pincode !== undefined) {
      const trimmedPin = String(pincode).trim();
      if (trimmedPin && !/^[1-9][0-9]{5}$/.test(trimmedPin)) {
        return res.status(400).json({
          success: false,
          message: 'Please provide a valid 6-digit Indian PIN code.',
        });
      }
      user.pincode = trimmedPin;
    }

    if (location !== undefined) user.location = String(location).trim();
    if (address !== undefined) user.address = String(address).trim();
    if (village !== undefined) user.village = String(village).trim();
    if (mandal !== undefined) user.mandal = String(mandal).trim();
    if (district !== undefined) user.district = String(district).trim();
    if (state !== undefined) user.state = String(state).trim();
    if (language !== undefined && ['en', 'te', 'hi'].includes(language)) {
      user.language = language;
    }

    await user.save();
    logger.info(`[USER] Profile updated for: ${user.email}`);

    return res.status(200).json({
      success: true,
      message: 'Profile updated successfully.',
      user: user.toSafeUser(),
    });
  } catch (err) {
    logger.error(`[USER] Error updating profile: ${err.message}`);
    next(err);
  }
};

/**
 * POST /api/users/profile/avatar
 * Upload and update profile photograph
 */
export const uploadAvatar = async (req, res, next) => {
  try {
    const { imageBase64, filename = 'avatar.jpg' } = req.body;

    if (!imageBase64 || typeof imageBase64 !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Base64 image data is required.',
      });
    }

    const match = imageBase64.match(/^data:image\/(jpeg|png|webp|jpg);base64,/i);
    if (!match) {
      return res.status(400).json({
        success: false,
        message: 'Unsupported image format. Allowed formats: JPEG, PNG, WEBP.',
      });
    }

    const rawExt = match[1].toLowerCase();
    const ext = rawExt === 'jpeg' ? 'jpg' : rawExt;

    const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');

    // 5MB Limit for profile photographs
    if (buffer.length > 5 * 1024 * 1024) {
      return res.status(400).json({
        success: false,
        message: 'Profile picture must be smaller than 5MB.',
      });
    }

    const uploadDir = path.join(process.cwd(), 'uploads', 'avatars');
    await fs.promises.mkdir(uploadDir, { recursive: true });

    const uniqueName = `avatar_${req.user.id}_${Date.now()}.${ext}`;
    const filePath = path.join(uploadDir, uniqueName);
    await fs.promises.writeFile(filePath, buffer);

    const publicUrl = `/uploads/avatars/${uniqueName}`;

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    user.avatar = publicUrl;
    await user.save();

    logger.info(`[USER] Avatar updated for ${user.email}: ${publicUrl}`);

    return res.status(200).json({
      success: true,
      message: 'Profile photograph updated successfully.',
      avatar: publicUrl,
      user: user.toSafeUser(),
    });
  } catch (err) {
    logger.error(`[USER] Error uploading avatar: ${err.message}`);
    next(err);
  }
};

/**
 * DELETE /api/users/profile/avatar
 * Remove profile photograph
 */
export const removeAvatar = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    // If existing avatar is a local file, remove it cleanly
    if (user.avatar && user.avatar.startsWith('/uploads/avatars/')) {
      const localPath = path.join(process.cwd(), user.avatar.replace(/^\//, ''));
      fs.unlink(localPath, () => {});
    }

    user.avatar = '';
    await user.save();

    logger.info(`[USER] Avatar removed for ${user.email}`);

    return res.status(200).json({
      success: true,
      message: 'Profile photograph removed.',
      user: user.toSafeUser(),
    });
  } catch (err) {
    logger.error(`[USER] Error removing avatar: ${err.message}`);
    next(err);
  }
};

/**
 * PUT /api/users/change-password
 * Change account password with current password verification
 */
export const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword, confirmPassword } = req.body;

    if (!currentPassword || !newPassword || !confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'Current password, new password, and confirmation are all required.',
      });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'New password and confirmation do not match.',
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'New password must be at least 6 characters long.',
      });
    }

    const user = await User.findById(req.user.id).select('+passwordHash');
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    // Verify current password
    const isCurrentValid = await user.comparePassword(currentPassword);
    if (!isCurrentValid) {
      return res.status(400).json({
        success: false,
        message: 'Current password is incorrect. Please try again.',
      });
    }

    // Disallow setting the exact same password
    const isSamePassword = await user.comparePassword(newPassword);
    if (isSamePassword) {
      return res.status(400).json({
        success: false,
        message: 'New password cannot be the same as your current password.',
      });
    }

    // Hash new password
    const saltRounds = 12;
    user.passwordHash = await bcrypt.hash(newPassword, saltRounds);
    await user.save();

    logger.info(`[SECURITY] Password changed successfully for user: ${user.email}`);

    return res.status(200).json({
      success: true,
      message: 'Password changed successfully. Please keep your credentials secure.',
    });
  } catch (err) {
    logger.error(`[USER] Error changing password: ${err.message}`);
    next(err);
  }
};

/**
 * GET /api/users/preferences
 * Get farmer preferences (Default Farm, Regional Units, Timezone, Notification Prefs)
 */
export const getPreferences = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id).populate('defaultFarm', 'name location totalAcreage');
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    let notifPrefs = await NotificationPreference.findOne({ farmer: req.user.id });
    if (!notifPrefs) {
      notifPrefs = await NotificationPreference.create({ farmer: req.user.id });
    }

    return res.status(200).json({
      success: true,
      preferences: user.preferences,
      defaultFarm: user.defaultFarm,
      language: user.language,
      notificationPreferences: notifPrefs,
    });
  } catch (err) {
    logger.error(`[USER] Error fetching preferences: ${err.message}`);
    next(err);
  }
};

/**
 * PUT /api/users/preferences
 * Update preferences (Default Farm, Regional Units, Theme, Timezone, Language)
 */
export const updatePreferences = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    const {
      defaultFarmId,
      areaUnit,
      tempUnit,
      waterUnit,
      theme,
      timezone,
      language,
    } = req.body;

    // Verify Default Farm ownership if provided
    if (defaultFarmId) {
      const farm = await Farm.findOne({
        _id: defaultFarmId,
        $or: [{ owner: req.user.id }, { farmer: req.user.id }],
      });
      if (!farm) {
        return res.status(400).json({
          success: false,
          message: 'Invalid default farm: Farm not found or not owned by your account.',
        });
      }
      user.defaultFarm = farm._id;
    } else if (defaultFarmId === null) {
      user.defaultFarm = null;
    }

    if (!user.preferences) {
      user.preferences = {};
    }

    if (areaUnit && ['acres', 'hectares'].includes(areaUnit)) {
      user.preferences.areaUnit = areaUnit;
    }
    if (tempUnit && ['celsius', 'fahrenheit'].includes(tempUnit)) {
      user.preferences.tempUnit = tempUnit;
    }
    if (waterUnit && ['liters', 'gallons'].includes(waterUnit)) {
      user.preferences.waterUnit = waterUnit;
    }
    if (theme && ['light', 'dark', 'system'].includes(theme)) {
      user.preferences.theme = theme;
    }
    if (timezone) {
      user.preferences.timezone = String(timezone).trim();
    }
    if (language && ['en', 'te', 'hi'].includes(language)) {
      user.language = language;
    }

    await user.save();
    logger.info(`[USER] Preferences updated for ${user.email}`);

    return res.status(200).json({
      success: true,
      message: 'Preferences updated successfully.',
      preferences: user.preferences,
      defaultFarm: user.defaultFarm,
      language: user.language,
      user: user.toSafeUser(),
    });
  } catch (err) {
    logger.error(`[USER] Error updating preferences: ${err.message}`);
    next(err);
  }
};

/**
 * POST /api/users/delete-request
 * Submit account deletion request with confirmation password
 */
export const requestAccountDeletion = async (req, res, next) => {
  try {
    const { password, reason } = req.body;

    if (!password) {
      return res.status(400).json({
        success: false,
        message: 'Password confirmation is required to request account deletion.',
      });
    }

    const user = await User.findById(req.user.id).select('+passwordHash');
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: 'Invalid password. Account deletion request rejected.',
      });
    }

    user.deletionRequest = {
      requested: true,
      requestedAt: new Date(),
      reason: reason ? String(reason).trim() : 'Requested by user',
    };

    await user.save();
    logger.warn(`[SECURITY] Account deletion requested for ${user.email}: ${user.deletionRequest.reason}`);

    return res.status(200).json({
      success: true,
      message: 'Account deletion request submitted. AgriSense compliance team will review your request.',
      deletionRequest: user.deletionRequest,
    });
  } catch (err) {
    logger.error(`[USER] Error requesting deletion: ${err.message}`);
    next(err);
  }
};

export default {
  getProfile,
  updateProfile,
  uploadAvatar,
  removeAvatar,
  changePassword,
  getPreferences,
  updatePreferences,
  requestAccountDeletion,
};
