import mongoose from 'mongoose';
import Consultation, {
  CONSULTATION_STATUSES,
  CONSULTATION_PRIORITIES,
  CONSULTATION_CATEGORIES,
} from '../models/Consultation.js';
import ConsultationMessage from '../models/ConsultationMessage.js';
import User from '../models/User.js';
import Farm from '../models/Farm.js';
import Crop from '../models/Crop.js';
import DiseaseScan from '../models/DiseaseScan.js';
import notificationService from './notificationService.js';
import {
  sendConsultationMessage,
  sendConsultationUpdate,
} from '../socket/socket.js';
import { logger } from '../utils/logger.js';

/**
 * Fetch verified agricultural experts directory
 * @param {object} query
 */
export const getExperts = async (query = {}) => {
  const { specialization, search } = query;
  const filter = { role: 'expert', isActive: true };

  if (specialization && specialization !== 'all') {
    filter.$or = [
      { 'expertProfile.specialization': { $regex: specialization, $options: 'i' } },
      { 'expertProfile.areasOfExpertise': { $in: [new RegExp(specialization, 'i')] } },
    ];
  }

  if (search && search.trim()) {
    const q = search.trim();
    filter.$or = [
      { name: { $regex: q, $options: 'i' } },
      { 'expertProfile.specialization': { $regex: q, $options: 'i' } },
      { 'expertProfile.institution': { $regex: q, $options: 'i' } },
      { 'expertProfile.areasOfExpertise': { $in: [new RegExp(q, 'i')] } },
    ];
  }

  const experts = await User.find(filter)
    .select('name email phone location expertProfile createdAt')
    .lean({ virtuals: true });

  return experts;
};

/**
 * Create a new consultation request submitted by a farmer
 * @param {object} params
 */
export const createConsultation = async ({
  farmerId,
  farmId,
  cropId,
  diseaseScanId = null,
  expertId = null,
  subject,
  description,
  category,
  priority = 'Medium',
  preferredMethod = 'In-App Message',
  attachments = [],
}) => {
  // 1. Validate farm parcel ownership
  const farm = await Farm.findOne({
    _id: farmId,
    $or: [{ owner: farmerId }, { farmer: farmerId }],
  });
  if (!farm) {
    throw new Error('Associated farm parcel not found or unauthorized access.');
  }

  // 2. Validate crop ownership
  const crop = await Crop.findOne({
    _id: cropId,
    farm: farmId,
    $or: [{ owner: farmerId }, { farmer: farmerId }],
  });
  if (!crop) {
    throw new Error('Associated crop does not belong to this farm parcel or user.');
  }

  // 3. Validate optional disease scan
  if (diseaseScanId) {
    const scan = await DiseaseScan.findOne({ _id: diseaseScanId, farmer: farmerId });
    if (!scan) {
      throw new Error('Linked AI Disease scan not found or unauthorized access.');
    }
  }

  // 4. Validate requested expert if specified
  let assignedExpert = null;
  let initialStatus = 'Submitted';
  if (expertId && mongoose.Types.ObjectId.isValid(expertId)) {
    const expert = await User.findOne({ _id: expertId, role: 'expert', isActive: true });
    if (expert) {
      assignedExpert = expert._id;
      initialStatus = 'Assigned';
    }
  }

  // 5. Generate human-readable reference ID
  const referenceId = await Consultation.generateReferenceId();

  // 6. Build document
  const consultation = new Consultation({
    referenceId,
    farmer: farmerId,
    expert: assignedExpert,
    farm: farmId,
    crop: cropId,
    diseaseScan: diseaseScanId || null,
    subject: subject.trim(),
    description: description.trim(),
    category,
    priority: CONSULTATION_PRIORITIES.includes(priority) ? priority : 'Medium',
    preferredMethod,
    status: initialStatus,
    attachments,
    statusHistory: [
      {
        status: initialStatus,
        changedBy: farmerId,
        changedAt: new Date(),
        notes: assignedExpert
          ? 'Consultation request submitted and routed to requested specialist.'
          : 'Consultation request submitted by farmer.',
      },
    ],
  });

  await consultation.save();

  // 7. Send notification to farmer
  await notificationService.createNotification({
    farmerId,
    title: `Consultation Request Logged (${referenceId})`,
    message: `Your agricultural inquiry regarding ${crop.name || crop.cropName} at ${farm.name} has been submitted for expert evaluation.`,
    category: 'system',
    severity: 'info',
    farm: farmId,
    crop: cropId,
    relatedId: consultation._id,
    relatedModel: 'Consultation',
    actionUrl: `/dashboard/consultation/${consultation._id}`,
    actionLabel: 'View Request',
  });

  // 8. If expert assigned, notify expert
  if (assignedExpert) {
    await notificationService.createNotification({
      farmerId: assignedExpert,
      title: `New Consultation Assigned (${referenceId})`,
      message: `Farmer has requested your agronomic advisory regarding ${crop.name || crop.cropName}: "${subject}".`,
      category: 'system',
      severity: 'info',
      farm: farmId,
      crop: cropId,
      relatedId: consultation._id,
      relatedModel: 'Consultation',
      actionUrl: `/expert/consultations/${consultation._id}`,
      actionLabel: 'Review Request',
    });
  }

  // Populate references
  const populated = await Consultation.findById(consultation._id)
    .populate('farmer', 'name email phone location')
    .populate('expert', 'name email location expertProfile')
    .populate('farm', 'name location acreage')
    .populate('crop', 'name cropName variety healthStatus growthStage')
    .populate('diseaseScan');

  return populated;
};

/**
 * Get farmer consultation requests with filters, pagination, and KPI summary
 * @param {string} farmerId
 * @param {object} query
 */
export const getFarmerConsultations = async (farmerId, query = {}) => {
  const { status = 'all', category, search, page = 1, limit = 20 } = query;

  const filter = { farmer: farmerId };

  // Status mapping
  if (status === 'pending') {
    filter.status = { $in: ['Submitted', 'Pending Assignment', 'Assigned'] };
  } else if (status === 'accepted') {
    filter.status = 'Accepted';
  } else if (status === 'active') {
    filter.status = { $in: ['Accepted', 'In Progress', 'Response Provided'] };
  } else if (status === 'completed') {
    filter.status = 'Completed';
  } else if (status === 'cancelled') {
    filter.status = { $in: ['Cancelled', 'Rejected'] };
  } else if (status !== 'all' && CONSULTATION_STATUSES.includes(status)) {
    filter.status = status;
  }

  if (category && category !== 'all') {
    filter.category = category;
  }

  if (search && search.trim()) {
    const q = search.trim();
    filter.$or = [
      { referenceId: { $regex: q, $options: 'i' } },
      { subject: { $regex: q, $options: 'i' } },
      { description: { $regex: q, $options: 'i' } },
    ];
  }

  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
  const skip = (pageNum - 1) * limitNum;

  const [consultations, totalFiltered, totalAll, pendingCount, acceptedCount, activeCount, completedCount] =
    await Promise.all([
      Consultation.find(filter)
        .populate('farmer', 'name email phone location')
        .populate('expert', 'name email location expertProfile')
        .populate('farm', 'name location acreage')
        .populate('crop', 'name cropName variety healthStatus growthStage')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean({ virtuals: true }),
      Consultation.countDocuments(filter),
      Consultation.countDocuments({ farmer: farmerId }),
      Consultation.countDocuments({
        farmer: farmerId,
        status: { $in: ['Submitted', 'Pending Assignment', 'Assigned'] },
      }),
      Consultation.countDocuments({ farmer: farmerId, status: 'Accepted' }),
      Consultation.countDocuments({
        farmer: farmerId,
        status: { $in: ['Accepted', 'In Progress', 'Response Provided'] },
      }),
      Consultation.countDocuments({ farmer: farmerId, status: 'Completed' }),
    ]);

  return {
    consultations,
    pagination: {
      total: totalFiltered,
      page: pageNum,
      limit: limitNum,
      pages: Math.ceil(totalFiltered / limitNum) || 1,
    },
    summary: {
      total: totalAll,
      pending: pendingCount,
      accepted: acceptedCount,
      active: activeCount,
      completed: completedCount,
    },
  };
};

/**
 * Get expert consultation queue with filters, pagination, and KPI summary
 * @param {string} expertId
 * @param {object} query
 */
export const getExpertConsultations = async (expertId, query = {}) => {
  const { filterType = 'all', status = 'all', category, search, page = 1, limit = 20 } = query;

  const filter = {};

  if (filterType === 'assigned') {
    filter.expert = expertId;
  } else if (filterType === 'open') {
    filter.expert = null;
    filter.status = { $in: ['Submitted', 'Pending Assignment'] };
  } else {
    // Both assigned to this expert and open available requests
    filter.$or = [
      { expert: expertId },
      { expert: null, status: { $in: ['Submitted', 'Pending Assignment'] } },
    ];
  }

  if (status && status !== 'all') {
    if (status === 'pending') {
      filter.status = { $in: ['Submitted', 'Pending Assignment', 'Assigned'] };
    } else if (status === 'active') {
      filter.status = { $in: ['Accepted', 'In Progress', 'Response Provided'] };
    } else if (status === 'completed') {
      filter.status = 'Completed';
    } else {
      filter.status = status;
    }
  }

  if (category && category !== 'all') {
    filter.category = category;
  }

  if (search && search.trim()) {
    const q = search.trim();
    filter.$or = [
      { referenceId: { $regex: q, $options: 'i' } },
      { subject: { $regex: q, $options: 'i' } },
      { description: { $regex: q, $options: 'i' } },
    ];
  }

  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
  const skip = (pageNum - 1) * limitNum;

  const [consultations, totalFiltered, assignedCount, openCount, activeCount, completedCount] =
    await Promise.all([
      Consultation.find(filter)
        .populate('farmer', 'name email phone location')
        .populate('expert', 'name email location expertProfile')
        .populate('farm', 'name location acreage')
        .populate('crop', 'name cropName variety healthStatus growthStage')
        .sort({ priority: -1, createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean({ virtuals: true }),
      Consultation.countDocuments(filter),
      Consultation.countDocuments({ expert: expertId }),
      Consultation.countDocuments({ expert: null, status: { $in: ['Submitted', 'Pending Assignment'] } }),
      Consultation.countDocuments({ expert: expertId, status: { $in: ['Accepted', 'In Progress', 'Response Provided'] } }),
      Consultation.countDocuments({ expert: expertId, status: 'Completed' }),
    ]);

  return {
    consultations,
    pagination: {
      total: totalFiltered,
      page: pageNum,
      limit: limitNum,
      pages: Math.ceil(totalFiltered / limitNum) || 1,
    },
    summary: {
      assigned: assignedCount,
      open: openCount,
      active: activeCount,
      completed: completedCount,
    },
  };
};

/**
 * Get single consultation details with strict membership validation
 * @param {string} consultationId
 * @param {string} userId
 * @param {string} userRole
 */
export const getConsultationById = async (consultationId, userId, userRole) => {
  if (!mongoose.Types.ObjectId.isValid(consultationId)) {
    throw new Error('Invalid consultation ID format.');
  }

  const consultation = await Consultation.findById(consultationId)
    .populate('farmer', 'name email phone location')
    .populate('expert', 'name email phone location expertProfile')
    .populate('farm', 'name location acreage boundaries coordinates soilType irrigationType')
    .populate('crop', 'name cropName variety category growthStage healthStatus season plantingDate expectedHarvestDate')
    .populate('diseaseScan')
    .populate('statusHistory.changedBy', 'name role')
    .populate('recommendation.submittedBy', 'name role expertProfile');

  if (!consultation) {
    throw new Error('Consultation request not found.');
  }

  // Authorization check
  const isFarmer = consultation.farmer?._id?.toString() === userId || consultation.farmer?.id === userId;
  const isAssignedExpert = consultation.expert?._id?.toString() === userId || consultation.expert?.id === userId;
  const isOpenForExperts = userRole === 'expert' && !consultation.expert && ['Submitted', 'Pending Assignment'].includes(consultation.status);
  const isAdmin = userRole === 'admin';

  if (!isFarmer && !isAssignedExpert && !isOpenForExperts && !isAdmin) {
    throw new Error('Unauthorized access: You are not a participant in this consultation.');
  }

  return consultation;
};

/**
 * Expert accepts consultation request
 * @param {string} consultationId
 * @param {string} expertId
 */
export const acceptConsultation = async (consultationId, expertId) => {
  const consultation = await Consultation.findById(consultationId);
  if (!consultation) {
    throw new Error('Consultation not found.');
  }

  if (consultation.expert && consultation.expert.toString() !== expertId) {
    throw new Error('This consultation has already been assigned to another specialist.');
  }

  if (['Completed', 'Cancelled', 'Rejected'].includes(consultation.status)) {
    throw new Error(`Cannot accept a consultation with status ${consultation.status}.`);
  }

  consultation.expert = expertId;
  consultation.status = 'Accepted';
  consultation.statusHistory.push({
    status: 'Accepted',
    changedBy: expertId,
    changedAt: new Date(),
    notes: 'Specialist has reviewed and accepted the consultation request.',
  });

  await consultation.save();

  const expertUser = await User.findById(expertId).select('name');

  // Notify farmer
  await notificationService.createNotification({
    farmerId: consultation.farmer,
    title: `Consultation Accepted (${consultation.referenceId})`,
    message: `Agricultural specialist ${expertUser?.name || 'Dr. Expert'} has accepted your consultation and will provide agronomic guidance.`,
    category: 'system',
    severity: 'success',
    farm: consultation.farm,
    crop: consultation.crop,
    relatedId: consultation._id,
    relatedModel: 'Consultation',
    actionUrl: `/dashboard/consultation/${consultation._id}`,
    actionLabel: 'Open Conversation',
  });

  // Broadcast real-time update
  sendConsultationUpdate(consultationId, consultation.toJSON());

  return consultation;
};

/**
 * Expert rejects consultation request
 * @param {string} consultationId
 * @param {string} expertId
 * @param {string} reason
 */
export const rejectConsultation = async (consultationId, expertId, reason = '') => {
  const consultation = await Consultation.findById(consultationId);
  if (!consultation) {
    throw new Error('Consultation not found.');
  }

  consultation.status = 'Rejected';
  consultation.rejectionReason = reason.trim() || 'Specialist unavailable or outside agronomic specialization.';
  consultation.statusHistory.push({
    status: 'Rejected',
    changedBy: expertId,
    changedAt: new Date(),
    notes: consultation.rejectionReason,
  });

  await consultation.save();

  // Notify farmer
  await notificationService.createNotification({
    farmerId: consultation.farmer,
    title: `Consultation Declined (${consultation.referenceId})`,
    message: `Consultation was declined: ${consultation.rejectionReason}. You may select another specialist or resubmit.`,
    category: 'system',
    severity: 'warning',
    farm: consultation.farm,
    crop: consultation.crop,
    relatedId: consultation._id,
    relatedModel: 'Consultation',
    actionUrl: `/dashboard/consultation`,
    actionLabel: 'View Consultations',
  });

  sendConsultationUpdate(consultationId, consultation.toJSON());

  return consultation;
};

/**
 * Update consultation status (In Progress, Cancelled, etc.)
 * @param {string} consultationId
 * @param {string} userId
 * @param {string} userRole
 * @param {string} newStatus
 * @param {string} notes
 */
export const updateStatus = async (consultationId, userId, userRole, newStatus, notes = '') => {
  if (!CONSULTATION_STATUSES.includes(newStatus)) {
    throw new Error(`Invalid status transition: ${newStatus}`);
  }

  const consultation = await Consultation.findById(consultationId);
  if (!consultation) {
    throw new Error('Consultation not found.');
  }

  const isFarmer = consultation.farmer.toString() === userId;
  const isExpert = consultation.expert?.toString() === userId;
  const isAdmin = userRole === 'admin';

  if (!isFarmer && !isExpert && !isAdmin) {
    throw new Error('Unauthorized status update.');
  }

  if (newStatus === 'Cancelled' && !isFarmer && !isAdmin) {
    throw new Error('Only the requesting farmer can cancel their consultation.');
  }

  consultation.status = newStatus;
  consultation.statusHistory.push({
    status: newStatus,
    changedBy: userId,
    changedAt: new Date(),
    notes: notes.trim(),
  });

  await consultation.save();

  sendConsultationUpdate(consultationId, consultation.toJSON());

  return consultation;
};

/**
 * Submit structured expert agronomic recommendations
 * @param {string} consultationId
 * @param {string} expertId
 * @param {object} recommendation
 */
export const submitRecommendation = async (consultationId, expertId, recommendation) => {
  const consultation = await Consultation.findById(consultationId);
  if (!consultation) {
    throw new Error('Consultation not found.');
  }

  if (consultation.expert && consultation.expert.toString() !== expertId) {
    throw new Error('Unauthorized: Only the assigned specialist can submit recommendations.');
  }

  const {
    problemAssessment = '',
    possibleCauses = [],
    recommendedPractices = [],
    preventiveMeasures = [],
    followUpInstructions = '',
    expertNotes = '',
    recommendedNextSteps = [],
  } = recommendation;

  if (!problemAssessment.trim()) {
    throw new Error('Problem assessment is required when submitting expert recommendations.');
  }

  consultation.recommendation = {
    problemAssessment: problemAssessment.trim(),
    possibleCauses: Array.isArray(possibleCauses) ? possibleCauses.filter(Boolean) : [],
    recommendedPractices: Array.isArray(recommendedPractices) ? recommendedPractices.filter(Boolean) : [],
    preventiveMeasures: Array.isArray(preventiveMeasures) ? preventiveMeasures.filter(Boolean) : [],
    followUpInstructions: followUpInstructions.trim(),
    expertNotes: expertNotes.trim(),
    recommendedNextSteps: Array.isArray(recommendedNextSteps) ? recommendedNextSteps.filter(Boolean) : [],
    submittedAt: new Date(),
    submittedBy: expertId,
  };

  consultation.status = 'Response Provided';
  consultation.statusHistory.push({
    status: 'Response Provided',
    changedBy: expertId,
    changedAt: new Date(),
    notes: 'Specialist submitted structured agronomic recommendations and corrective measures.',
  });

  await consultation.save();

  // Create an automatic chat message entry so the conversation stream reflects the advice
  const adviceSummaryMessage = new ConsultationMessage({
    consultation: consultationId,
    sender: expertId,
    senderRole: 'expert',
    message: `Expert Agronomic Recommendations Submitted:\n\nAssessment: ${problemAssessment}\n\nRecommended Practices:\n${(recommendedPractices || []).map(p => '• ' + p).join('\n')}`,
    messageType: 'recommendation',
    isReadByFarmer: false,
    isReadByExpert: true,
  });
  await adviceSummaryMessage.save();

  // Notify farmer
  await notificationService.createNotification({
    farmerId: consultation.farmer,
    title: `Expert Advice Provided (${consultation.referenceId})`,
    message: `Agronomic specialist has provided diagnostic assessment and recommended practices for your crop.`,
    category: 'crop',
    severity: 'success',
    farm: consultation.farm,
    crop: consultation.crop,
    relatedId: consultation._id,
    relatedModel: 'Consultation',
    actionUrl: `/dashboard/consultation/${consultation._id}`,
    actionLabel: 'Review Expert Guidance',
  });

  // Broadcast Socket events
  sendConsultationUpdate(consultationId, consultation.toJSON());
  sendConsultationMessage(consultationId, adviceSummaryMessage.toJSON());

  return consultation;
};

/**
 * Complete a consultation (Farmer or Expert)
 * @param {string} consultationId
 * @param {string} userId
 * @param {object} feedbackData
 */
export const completeConsultation = async (consultationId, userId, feedbackData = {}) => {
  const consultation = await Consultation.findById(consultationId);
  if (!consultation) {
    throw new Error('Consultation not found.');
  }

  const isFarmer = consultation.farmer.toString() === userId;
  const isExpert = consultation.expert?.toString() === userId;

  if (!isFarmer && !isExpert) {
    throw new Error('Unauthorized to complete consultation.');
  }

  consultation.status = 'Completed';
  if (isFarmer && feedbackData.rating) {
    consultation.rating = Math.min(5, Math.max(1, Number(feedbackData.rating)));
    if (feedbackData.feedback) {
      consultation.feedback = feedbackData.feedback.trim();
    }
  }

  consultation.statusHistory.push({
    status: 'Completed',
    changedBy: userId,
    changedAt: new Date(),
    notes: 'Consultation marked as successfully completed.',
  });

  await consultation.save();

  // Notify other party
  const targetId = isFarmer ? consultation.expert : consultation.farmer;
  if (targetId) {
    await notificationService.createNotification({
      farmerId: targetId,
      title: `Consultation Completed (${consultation.referenceId})`,
      message: `Consultation has been completed and archived in historical advisory logs.`,
      category: 'system',
      severity: 'info',
      farm: consultation.farm,
      crop: consultation.crop,
      relatedId: consultation._id,
      relatedModel: 'Consultation',
      actionUrl: isFarmer ? `/expert/consultations/${consultation._id}` : `/dashboard/consultation/${consultation._id}`,
      actionLabel: 'View Archived Log',
    });
  }

  sendConsultationUpdate(consultationId, consultation.toJSON());

  return consultation;
};

/**
 * Send consultation chat message
 * @param {string} consultationId
 * @param {string} userId
 * @param {string} userRole
 * @param {object} messageData
 */
export const sendMessage = async (consultationId, userId, userRole, messageData) => {
  const { message, messageType = 'text', attachments = [] } = messageData;

  if (!message || !message.trim()) {
    throw new Error('Message content cannot be empty.');
  }

  const consultation = await Consultation.findById(consultationId);
  if (!consultation) {
    throw new Error('Consultation not found.');
  }

  const isFarmer = consultation.farmer.toString() === userId;
  const isExpert = consultation.expert?.toString() === userId;
  const isAdmin = userRole === 'admin';

  if (!isFarmer && !isExpert && !isAdmin) {
    throw new Error('Unauthorized: You are not an active participant in this consultation.');
  }

  const senderRole = isFarmer ? 'farmer' : isExpert ? 'expert' : isAdmin ? 'admin' : 'system';

  const chatMessage = new ConsultationMessage({
    consultation: consultationId,
    sender: userId,
    senderRole,
    message: message.trim(),
    messageType,
    attachments: Array.isArray(attachments) ? attachments : [],
    isReadByFarmer: isFarmer,
    isReadByExpert: isExpert,
  });

  await chatMessage.save();

  // If consultation was Accepted, automatically advance to In Progress
  if (consultation.status === 'Accepted') {
    consultation.status = 'In Progress';
    consultation.statusHistory.push({
      status: 'In Progress',
      changedBy: userId,
      changedAt: new Date(),
      notes: 'Active messaging conversation initiated.',
    });
    await consultation.save();
    sendConsultationUpdate(consultationId, consultation.toJSON());
  }

  const populatedMessage = await ConsultationMessage.findById(chatMessage._id)
    .populate('sender', 'name role email');

  // Broadcast via Socket.IO
  sendConsultationMessage(consultationId, populatedMessage.toJSON());

  // Notify the other party
  const senderUser = await User.findById(userId).select('name');
  const recipientId = isFarmer ? consultation.expert : consultation.farmer;

  if (recipientId) {
    await notificationService.createNotification({
      farmerId: recipientId,
      title: `Message from ${senderUser?.name || 'Consultation Participant'}`,
      message: message.length > 90 ? `${message.substring(0, 90)}...` : message,
      category: 'system',
      severity: 'info',
      farm: consultation.farm,
      crop: consultation.crop,
      relatedId: consultation._id,
      relatedModel: 'Consultation',
      actionUrl: isFarmer ? `/expert/consultations/${consultation._id}` : `/dashboard/consultation/${consultation._id}`,
      actionLabel: 'Reply in Chat',
    });
  }

  return populatedMessage;
};

/**
 * Retrieve chronological message history for consultation
 * @param {string} consultationId
 * @param {string} userId
 * @param {string} userRole
 */
export const getMessages = async (consultationId, userId, userRole) => {
  const consultation = await Consultation.findById(consultationId);
  if (!consultation) {
    throw new Error('Consultation not found.');
  }

  const isFarmer = consultation.farmer.toString() === userId;
  const isExpert = consultation.expert?.toString() === userId;
  const isOpenForExperts = userRole === 'expert' && !consultation.expert && ['Submitted', 'Pending Assignment'].includes(consultation.status);
  const isAdmin = userRole === 'admin';

  if (!isFarmer && !isExpert && !isOpenForExperts && !isAdmin) {
    throw new Error('Unauthorized to view consultation messages.');
  }

  // Mark messages as read for caller
  if (isFarmer) {
    await ConsultationMessage.updateMany(
      { consultation: consultationId, isReadByFarmer: false },
      { $set: { isReadByFarmer: true } }
    );
  } else if (isExpert) {
    await ConsultationMessage.updateMany(
      { consultation: consultationId, isReadByExpert: false },
      { $set: { isReadByExpert: true } }
    );
  }

  const messages = await ConsultationMessage.find({ consultation: consultationId })
    .populate('sender', 'name role email')
    .sort({ createdAt: 1 })
    .lean({ virtuals: true });

  return messages;
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
};
