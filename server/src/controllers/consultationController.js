import fs from 'fs';
import path from 'path';
import consultationService from '../services/consultationService.js';
import { logger } from '../utils/logger.js';

/**
 * GET /api/consultations/experts
 * Retrieve directory of verified agricultural specialists
 */
export const getExperts = async (req, res) => {
  try {
    const experts = await consultationService.getExperts(req.query);
    return res.status(200).json({
      success: true,
      data: experts,
    });
  } catch (err) {
    logger.error(`[CONSULTATION] Error fetching experts: ${err.message}`);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve expert directory.',
      error: err.message,
    });
  }
};

/**
 * POST /api/consultations
 * Create a new consultation request (Farmer role)
 */
export const createConsultation = async (req, res) => {
  try {
    const farmerId = req.user.id;
    const {
      farmId,
      cropId,
      diseaseScanId,
      expertId,
      subject,
      description,
      category,
      priority,
      preferredMethod,
      attachments,
    } = req.body;

    if (!farmId || !cropId || !subject || !description || !category) {
      return res.status(400).json({
        success: false,
        message: 'Farm, crop, subject, problem description, and category are required.',
      });
    }

    const consultation = await consultationService.createConsultation({
      farmerId,
      farmId,
      cropId,
      diseaseScanId,
      expertId,
      subject,
      description,
      category,
      priority,
      preferredMethod,
      attachments,
    });

    return res.status(201).json({
      success: true,
      message: 'Consultation request logged successfully.',
      data: consultation,
    });
  } catch (err) {
    logger.error(`[CONSULTATION] Error creating consultation: ${err.message}`);
    const status = err.message.includes('not found') || err.message.includes('unauthorized') ? 403 : 400;
    return res.status(status).json({
      success: false,
      message: err.message || 'Failed to create consultation request.',
    });
  }
};

/**
 * GET /api/consultations/farmer
 * Get consultations for currently authenticated farmer
 */
export const getFarmerConsultations = async (req, res) => {
  try {
    const farmerId = req.user.id;
    const result = await consultationService.getFarmerConsultations(farmerId, req.query);
    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (err) {
    logger.error(`[CONSULTATION] Error getting farmer consultations: ${err.message}`);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve consultations.',
      error: err.message,
    });
  }
};

/**
 * GET /api/consultations/expert
 * Get consultation queue for authenticated expert
 */
export const getExpertConsultations = async (req, res) => {
  try {
    const expertId = req.user.id;
    const result = await consultationService.getExpertConsultations(expertId, req.query);
    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (err) {
    logger.error(`[CONSULTATION] Error getting expert consultations: ${err.message}`);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve expert consultation queue.',
      error: err.message,
    });
  }
};

/**
 * GET /api/consultations/:id
 * Retrieve details for a specific consultation
 */
export const getConsultationById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;

    const consultation = await consultationService.getConsultationById(id, userId, userRole);
    return res.status(200).json({
      success: true,
      data: consultation,
    });
  } catch (err) {
    logger.error(`[CONSULTATION] Error getting consultation by ID: ${err.message}`);
    const status = err.message.includes('Unauthorized') ? 403 : err.message.includes('not found') ? 404 : 400;
    return res.status(status).json({
      success: false,
      message: err.message,
    });
  }
};

/**
 * PATCH /api/consultations/:id/accept
 * Expert accepts consultation
 */
export const acceptConsultation = async (req, res) => {
  try {
    const { id } = req.params;
    const expertId = req.user.id;

    if (req.user.role !== 'expert' && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only agricultural specialists can accept consultations.',
      });
    }

    const consultation = await consultationService.acceptConsultation(id, expertId);
    return res.status(200).json({
      success: true,
      message: 'Consultation accepted successfully.',
      data: consultation,
    });
  } catch (err) {
    logger.error(`[CONSULTATION] Error accepting consultation: ${err.message}`);
    return res.status(400).json({
      success: false,
      message: err.message,
    });
  }
};

/**
 * PATCH /api/consultations/:id/reject
 * Expert rejects consultation
 */
export const rejectConsultation = async (req, res) => {
  try {
    const { id } = req.params;
    const expertId = req.user.id;
    const { reason = '' } = req.body;

    if (req.user.role !== 'expert' && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only agricultural specialists can decline consultations.',
      });
    }

    const consultation = await consultationService.rejectConsultation(id, expertId, reason);
    return res.status(200).json({
      success: true,
      message: 'Consultation declined.',
      data: consultation,
    });
  } catch (err) {
    logger.error(`[CONSULTATION] Error rejecting consultation: ${err.message}`);
    return res.status(400).json({
      success: false,
      message: err.message,
    });
  }
};

/**
 * PATCH /api/consultations/:id/status
 * Update status
 */
export const updateStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;
    const { status, notes = '' } = req.body;

    if (!status) {
      return res.status(400).json({
        success: false,
        message: 'Target status is required.',
      });
    }

    const consultation = await consultationService.updateStatus(id, userId, userRole, status, notes);
    return res.status(200).json({
      success: true,
      message: `Consultation status transitioned to ${status}.`,
      data: consultation,
    });
  } catch (err) {
    logger.error(`[CONSULTATION] Error updating status: ${err.message}`);
    return res.status(400).json({
      success: false,
      message: err.message,
    });
  }
};

/**
 * POST /api/consultations/:id/recommendations
 * Submit expert recommendations
 */
export const submitRecommendation = async (req, res) => {
  try {
    const { id } = req.params;
    const expertId = req.user.id;

    if (req.user.role !== 'expert' && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only specialists can submit agronomic recommendations.',
      });
    }

    const consultation = await consultationService.submitRecommendation(id, expertId, req.body);
    return res.status(200).json({
      success: true,
      message: 'Agronomic guidance submitted successfully.',
      data: consultation,
    });
  } catch (err) {
    logger.error(`[CONSULTATION] Error submitting recommendation: ${err.message}`);
    return res.status(400).json({
      success: false,
      message: err.message,
    });
  }
};

/**
 * PATCH /api/consultations/:id/complete
 * Mark consultation completed
 */
export const completeConsultation = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const consultation = await consultationService.completeConsultation(id, userId, req.body);
    return res.status(200).json({
      success: true,
      message: 'Consultation marked as completed.',
      data: consultation,
    });
  } catch (err) {
    logger.error(`[CONSULTATION] Error completing consultation: ${err.message}`);
    return res.status(400).json({
      success: false,
      message: err.message,
    });
  }
};

/**
 * POST /api/consultations/:id/messages
 * Send message
 */
export const sendMessage = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;

    const message = await consultationService.sendMessage(id, userId, userRole, req.body);
    return res.status(201).json({
      success: true,
      data: message,
    });
  } catch (err) {
    logger.error(`[CONSULTATION] Error sending message: ${err.message}`);
    const status = err.message.includes('Unauthorized') ? 403 : 400;
    return res.status(status).json({
      success: false,
      message: err.message,
    });
  }
};

/**
 * GET /api/consultations/:id/messages
 * Retrieve message history
 */
export const getMessages = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;

    const messages = await consultationService.getMessages(id, userId, userRole);
    return res.status(200).json({
      success: true,
      data: messages,
    });
  } catch (err) {
    logger.error(`[CONSULTATION] Error getting messages: ${err.message}`);
    const status = err.message.includes('Unauthorized') ? 403 : 400;
    return res.status(status).json({
      success: false,
      message: err.message,
    });
  }
};

/**
 * POST /api/consultations/upload-attachment
 * Upload attachment image for consultation or chat
 */
export const uploadAttachment = async (req, res) => {
  try {
    const { imageBase64, filename = 'consultation_attachment.jpg' } = req.body;

    if (!imageBase64 || typeof imageBase64 !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Valid base64 image data is required.',
      });
    }

    const match = imageBase64.match(/^data:image\/(jpeg|png|webp|jpg);base64,/i);
    if (!match) {
      return res.status(400).json({
        success: false,
        message: 'Unsupported image format. Allowed: JPEG, PNG, WEBP.',
      });
    }

    const rawMime = match[1].toLowerCase();
    const mimeType = rawMime === 'jpg' ? 'image/jpeg' : `image/${rawMime}`;
    const ext = rawMime === 'jpeg' ? 'jpg' : rawMime;

    const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');

    if (buffer.length > 10 * 1024 * 1024) {
      return res.status(400).json({
        success: false,
        message: 'Image size exceeds maximum limit of 10MB.',
      });
    }

    const uploadDir = path.join(process.cwd(), 'uploads', 'consultations');
    await fs.promises.mkdir(uploadDir, { recursive: true });

    const uniqueName = `att_${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${ext}`;
    const filePath = path.join(uploadDir, uniqueName);
    await fs.promises.writeFile(filePath, buffer);

    const publicUrl = `/uploads/consultations/${uniqueName}`;

    return res.status(200).json({
      success: true,
      attachment: {
        url: publicUrl,
        filename: filename || uniqueName,
        mimeType,
        sizeBytes: buffer.length,
      },
    });
  } catch (err) {
    logger.error(`[CONSULTATION] Error uploading attachment: ${err.message}`);
    return res.status(500).json({
      success: false,
      message: 'Failed to upload attachment.',
      error: err.message,
    });
  }
};

export default {
  getExperts,
  createConsultation,
  getFarmerConsultations,
  getExpertConsultations,
  getConsultationById,
  acceptConsultation,
  rejectConsultation,
  updateStatus,
  submitRecommendation,
  completeConsultation,
  sendMessage,
  getMessages,
  uploadAttachment,
};
