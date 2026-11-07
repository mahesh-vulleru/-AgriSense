import { Router } from 'express';
import {
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
} from '../controllers/consultationController.js';
import { protect } from '../middleware/auth.js';
import { requireDB } from '../middleware/checkDbConnection.js';

const router = Router();

// Ensure DB is connected
router.use(requireDB);

// Protect all consultation endpoints with JWT authentication
router.use(protect);

// 1. Directory of verified agricultural specialists
router.get('/experts', getExperts);

// 2. Consultation Creation & Queue Views
router.post('/', createConsultation);
router.get('/farmer', getFarmerConsultations);
router.get('/expert', getExpertConsultations);

// 3. Attachments upload
router.post('/upload-attachment', uploadAttachment);

// 4. Consultation Details & Actions
router.get('/:id', getConsultationById);
router.patch('/:id/accept', acceptConsultation);
router.patch('/:id/reject', rejectConsultation);
router.patch('/:id/status', updateStatus);
router.post('/:id/recommendations', submitRecommendation);
router.patch('/:id/complete', completeConsultation);

// 5. Consultation Messaging
router.post('/:id/messages', sendMessage);
router.get('/:id/messages', getMessages);

export default router;
