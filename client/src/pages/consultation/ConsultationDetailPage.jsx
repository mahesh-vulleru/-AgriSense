import { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  MessageSquare,
  ShieldCheck,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Send,
  Paperclip,
  X,
  Sparkles,
  MapPin,
  Sprout,
  User,
  Star,
  FileText,
  Building,
  GraduationCap,
  Award,
  ExternalLink,
  Check,
  AlertCircle,
} from 'lucide-react';
import consultationService from '../../services/consultationService.js';
import { useAuth } from '../../hooks/useAuth.js';
import { useNotifications } from '../../hooks/useNotifications.js';
import Badge from '../../components/common/Badge.jsx';
import Modal from '../../components/common/Modal.jsx';

function formatKolkataTime(isoString) {
  if (!isoString) return '';
  const d = new Date(isoString);
  return d.toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

const STAGES = [
  { key: 'Submitted', label: '1. Request Submitted' },
  { key: 'Assigned', label: '2. Specialist Assigned' },
  { key: 'Accepted', label: '3. Advisory Accepted' },
  { key: 'In Progress', label: '4. Active Discussion' },
  { key: 'Response Provided', label: '5. Advice Provided' },
  { key: 'Completed', label: '6. Resolved' },
];

export default function ConsultationDetailPage({ isExpertView: propIsExpertView }) {
  const { id } = useParams();
  const { user } = useAuth();
  const { socket } = useNotifications();

  // Detect mode: prop or pathname or user role
  const isExpertView =
    typeof propIsExpertView === 'boolean'
      ? propIsExpertView
      : window.location.pathname.startsWith('/expert') || user?.role === 'expert';

  const [consultation, setConsultation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Chat input state
  const [messageText, setMessageText] = useState('');
  const [pendingAttachment, setPendingAttachment] = useState(null);
  const [isUploadingAttachment, setIsUploadingAttachment] = useState(false);
  const [isSendingMessage, setIsSendingMessage] = useState(false);

  // Modals state
  const [activeModal, setActiveModal] = useState(null); // 'recommend' | 'reject' | 'complete' | 'image'
  const [lightboxImage, setLightboxImage] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);

  // Rejection modal state
  const [rejectionReason, setRejectionReason] = useState('');

  // Structured Advisory Modal state
  const [advisoryForm, setAdvisoryForm] = useState({
    problemAssessment: '',
    possibleCauses: '',
    recommendedPractices: '',
    preventiveMeasures: '',
    followUpTimeline: '',
    expertNotes: '',
  });

  // Completion modal state
  const [rating, setRating] = useState(5);
  const [feedback, setFeedback] = useState('');

  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  // Auto scroll chat to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Load Consultation & Messages on Mount or id change
  useEffect(() => {
    let isMounted = true;
    if (!id) return;

    const load = async () => {
      try {
        const [consRes, msgRes] = await Promise.all([
          consultationService.getConsultationById(id),
          consultationService.getMessages(id),
        ]);

        if (isMounted) {
          if (consRes?.success && consRes.data) {
            setConsultation(consRes.data);
          } else {
            setError('Consultation details could not be found.');
          }

          if (msgRes?.success && msgRes.data) {
            setMessages(msgRes.data);
          }
        }
      } catch (err) {
        if (isMounted) {
          console.error('[LOAD_CONSULTATION_DETAIL_ERROR]', err);
          setError(err?.response?.data?.message || err.message || 'Failed to load consultation.');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    load();

    return () => {
      isMounted = false;
    };
  }, [id]);

  // Socket.IO Room Lifecycle
  useEffect(() => {
    if (!socket || !id) return;

    socket.emit('consultation:join', { consultationId: id });

    const handleNewMessage = (newMsg) => {
      setMessages((prev) => {
        const msgId = newMsg._id || newMsg.id;
        const exists = prev.some((m) => (m._id || m.id) === msgId);
        if (exists) return prev;
        return [...prev, newMsg];
      });
    };

    const handleConsultationUpdate = (updatedCons) => {
      if (updatedCons && (updatedCons._id === id || updatedCons.id === id)) {
        setConsultation((prev) => ({ ...prev, ...updatedCons }));
      }
    };

    socket.on('consultation:message', handleNewMessage);
    socket.on('consultation:update', handleConsultationUpdate);

    return () => {
      socket.emit('consultation:leave', { consultationId: id });
      socket.off('consultation:message', handleNewMessage);
      socket.off('consultation:update', handleConsultationUpdate);
    };
  }, [socket, id]);

  const showToast = (type, text) => {
    setToastMessage({ type, text });
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Handle Photo Attachment for Chat
  const handleAttachmentUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      showToast('error', 'Attachment must be smaller than 10MB.');
      return;
    }

    setIsUploadingAttachment(true);
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const res = await consultationService.uploadAttachment(reader.result, file.name);
        if (res?.success && res.attachment) {
          setPendingAttachment(res.attachment);
          showToast('success', 'Image attached. Send message to share.');
        }
      } catch (err) {
        showToast('error', err.message || 'Failed to upload photo attachment.');
      } finally {
        setIsUploadingAttachment(false);
      }
    };
    reader.readAsDataURL(file);
  };

  // Send Message
  const handleSendMessage = async (e) => {
    e?.preventDefault();
    if ((!messageText.trim() && !pendingAttachment) || isSendingMessage) return;

    setIsSendingMessage(true);
    try {
      const payload = {
        message: messageText.trim() || (pendingAttachment ? 'Attached photograph' : ''),
        attachments: pendingAttachment ? [pendingAttachment] : [],
      };

      const res = await consultationService.sendMessage(id, payload);
      if (res?.success && res.data) {
        setMessages((prev) => {
          const exists = prev.some((m) => (m._id || m.id) === (res.data._id || res.data.id));
          if (exists) return prev;
          return [...prev, res.data];
        });
        setMessageText('');
        setPendingAttachment(null);
      }
    } catch (err) {
      showToast('error', err.message || 'Failed to send message.');
    } finally {
      setIsSendingMessage(false);
    }
  };

  // Expert: Accept Consultation
  const handleAcceptConsultation = async () => {
    setActionLoading(true);
    try {
      const res = await consultationService.acceptConsultation(id);
      if (res?.success) {
        setConsultation(res.data);
        showToast('success', 'Consultation accepted! You can now advise the farmer.');
      }
    } catch (err) {
      showToast('error', err.message || 'Failed to accept consultation.');
    } finally {
      setActionLoading(false);
    }
  };

  // Expert: Reject Consultation
  const handleRejectConsultation = async () => {
    if (!rejectionReason.trim()) {
      showToast('error', 'Please provide a reason for declining.');
      return;
    }
    setActionLoading(true);
    try {
      const res = await consultationService.rejectConsultation(id, rejectionReason.trim());
      if (res?.success) {
        setConsultation(res.data);
        setActiveModal(null);
        showToast('success', 'Consultation declined.');
      }
    } catch (err) {
      showToast('error', err.message || 'Failed to decline consultation.');
    } finally {
      setActionLoading(false);
    }
  };

  // Farmer: Cancel Consultation
  const handleCancelConsultation = async () => {
    if (!window.confirm('Are you sure you want to cancel this consultation request?')) return;
    setActionLoading(true);
    try {
      const res = await consultationService.updateStatus(id, 'Cancelled', 'Cancelled by farmer');
      if (res?.success) {
        setConsultation(res.data);
        showToast('success', 'Consultation request cancelled.');
      }
    } catch (err) {
      showToast('error', err.message || 'Failed to cancel consultation.');
    } finally {
      setActionLoading(false);
    }
  };

  // Expert: Submit Structured Recommendations
  const handleSubmitRecommendation = async (e) => {
    e.preventDefault();
    if (!advisoryForm.problemAssessment.trim() || !advisoryForm.recommendedPractices.trim()) {
      showToast('error', 'Please provide both Problem Assessment and Recommended Practices.');
      return;
    }

    setActionLoading(true);
    try {
      const payload = {
        problemAssessment: advisoryForm.problemAssessment.trim(),
        possibleCauses: advisoryForm.possibleCauses
          .split('\n')
          .map((s) => s.trim())
          .filter(Boolean),
        recommendedPractices: advisoryForm.recommendedPractices.trim(),
        preventiveMeasures: advisoryForm.preventiveMeasures.trim(),
        followUpTimeline: advisoryForm.followUpTimeline.trim(),
        expertNotes: advisoryForm.expertNotes.trim(),
      };

      const res = await consultationService.submitRecommendation(id, payload);
      if (res?.success) {
        setConsultation(res.data);
        setActiveModal(null);
        showToast('success', 'Structured agronomic advice successfully published to farmer!');
        // Reload messages to get the auto-generated system summary
        consultationService.getMessages(id).then((m) => {
          if (m?.data) setMessages(m.data);
        });
      }
    } catch (err) {
      showToast('error', err.message || 'Failed to submit advisory.');
    } finally {
      setActionLoading(false);
    }
  };

  // Farmer: Complete & Rate Consultation
  const handleCompleteConsultation = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      const res = await consultationService.completeConsultation(id, {
        rating,
        feedback: feedback.trim(),
      });
      if (res?.success) {
        setConsultation(res.data);
        setActiveModal(null);
        showToast('success', 'Consultation marked as completed! Thank you for rating.');
      }
    } catch (err) {
      showToast('error', err.message || 'Failed to complete consultation.');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-4">
        <div className="w-10 h-10 border-4 border-[#166534] border-t-transparent rounded-full animate-spin" />
        <p className="text-sm font-semibold text-slate-600">Loading consultation workspace...</p>
      </div>
    );
  }

  if (error || !consultation) {
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50 p-8 text-center max-w-lg mx-auto mt-12 space-y-4">
        <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
          <AlertCircle className="w-6 h-6" />
        </div>
        <h2 className="text-lg font-bold text-rose-900">Consultation Workspace Unavailable</h2>
        <p className="text-xs text-rose-700">{error || 'Consultation record not found.'}</p>
        <Link
          to={isExpertView ? '/expert/consultations' : '/dashboard/consultation'}
          className="inline-flex items-center gap-2 rounded-xl bg-slate-900 text-white px-4 py-2 text-xs font-bold"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Return to Consultation Hub</span>
        </Link>
      </div>
    );
  }

  const isCompleted = consultation.status === 'Completed';
  const isRejected = consultation.status === 'Rejected';
  const isCancelled = consultation.status === 'Cancelled';
  const isPending =
    consultation.status === 'Submitted' || consultation.status === 'Pending Assignment';
  const isAssigned = consultation.status === 'Assigned';
  const isAcceptedOrActive =
    consultation.status === 'Accepted' ||
    consultation.status === 'In Progress' ||
    consultation.status === 'Response Provided';

  // Determine stage progression index
  const getStageStatus = (stageKey) => {
    const statusOrder = [
      'Submitted',
      'Assigned',
      'Accepted',
      'In Progress',
      'Response Provided',
      'Completed',
    ];
    const currentIdx = statusOrder.indexOf(consultation.status);
    const stageIdx = statusOrder.indexOf(stageKey);

    if (currentIdx === -1) return 'pending';
    if (stageIdx < currentIdx) return 'completed';
    if (stageIdx === currentIdx) return 'current';
    return 'pending';
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Toast Banner */}
      {toastMessage && (
        <div
          className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-xs font-bold transition-all ${
            toastMessage.type === 'error'
              ? 'bg-rose-600 text-white'
              : 'bg-[#166534] text-white'
          }`}
        >
          {toastMessage.type === 'error' ? (
            <AlertCircle className="w-4 h-4" />
          ) : (
            <CheckCircle2 className="w-4 h-4" />
          )}
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* Back Navigation & Main Header */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <Link
            to={isExpertView ? '/expert/consultations' : '/dashboard/consultation'}
            className="p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 transition-all shadow-2xs"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-xs font-bold text-[#166534] bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-lg">
                {consultation.referenceId}
              </span>

              <Badge
                variant={
                  isCompleted
                    ? 'success'
                    : isAcceptedOrActive
                    ? 'forest'
                    : isRejected || isCancelled
                    ? 'danger'
                    : 'warning'
                }
                size="sm"
                className="font-bold text-[10px]"
              >
                {consultation.status}
              </Badge>

              <Badge
                variant={
                  consultation.priority === 'Urgent' || consultation.priority === 'High'
                    ? 'danger'
                    : 'default'
                }
                size="sm"
                className="font-bold text-[10px]"
              >
                {consultation.priority} Priority
              </Badge>

              <span className="text-[11px] font-semibold text-slate-500">
                {consultation.category}
              </span>

              <span className="ml-auto text-[11px] text-slate-400">
                Created: {formatKolkataTime(consultation.createdAt)}
              </span>
            </div>

            <h1 className="text-xl sm:text-2xl font-extrabold text-[#17251B] tracking-tight mt-1 truncate">
              {consultation.subject}
            </h1>
          </div>
        </div>

        {/* Action Buttons Header Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
          <div className="flex items-center gap-2 text-xs text-slate-600">
            <Clock className="w-4 h-4 text-slate-400" />
            <span>
              Channel: <strong>{consultation.preferredMethod || 'In-App Message'}</strong>
            </span>
            <span className="text-slate-300">&bull;</span>
            <span>
              Target: <strong>{consultation.crop?.name || 'Crop'}</strong> at{' '}
              <strong>{consultation.farm?.name || 'Farm'}</strong>
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Expert Actions */}
            {isExpertView && (
              <>
                {(isPending || isAssigned) && (
                  <>
                    <button
                      type="button"
                      disabled={actionLoading}
                      onClick={handleAcceptConsultation}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-[#166534] hover:bg-[#14532d] text-white px-3.5 py-1.5 text-xs font-bold transition-all cursor-pointer shadow-2xs"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Accept Inquiry</span>
                    </button>

                    <button
                      type="button"
                      disabled={actionLoading}
                      onClick={() => setActiveModal('reject')}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-rose-300 bg-rose-50 hover:bg-rose-100 text-rose-700 px-3.5 py-1.5 text-xs font-bold transition-all cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                      <span>Decline</span>
                    </button>
                  </>
                )}

                {isAcceptedOrActive && (
                  <button
                    type="button"
                    onClick={() => {
                      if (consultation.recommendation) {
                        setAdvisoryForm({
                          problemAssessment: consultation.recommendation.problemAssessment || '',
                          possibleCauses: (consultation.recommendation.possibleCauses || []).join(
                            '\n'
                          ),
                          recommendedPractices:
                            consultation.recommendation.recommendedPractices || '',
                          preventiveMeasures: consultation.recommendation.preventiveMeasures || '',
                          followUpTimeline: consultation.recommendation.followUpTimeline || '',
                          expertNotes: consultation.recommendation.expertNotes || '',
                        });
                      }
                      setActiveModal('recommend');
                    }}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-[#166534] hover:bg-[#14532d] text-white px-3.5 py-1.5 text-xs font-bold transition-all cursor-pointer shadow-2xs"
                  >
                    <Award className="w-3.5 h-3.5" />
                    <span>
                      {consultation.recommendation
                        ? 'Update Structured Advisory'
                        : 'Publish Structured Advisory'}
                    </span>
                  </button>
                )}
              </>
            )}

            {/* Farmer Actions */}
            {!isExpertView && (
              <>
                {consultation.status === 'Response Provided' && (
                  <button
                    type="button"
                    onClick={() => setActiveModal('complete')}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-[#166534] hover:bg-[#14532d] text-white px-3.5 py-1.5 text-xs font-bold transition-all cursor-pointer shadow-2xs"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Mark as Resolved & Rate Specialist</span>
                  </button>
                )}

                {isPending && (
                  <button
                    type="button"
                    disabled={actionLoading}
                    onClick={handleCancelConsultation}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 hover:bg-slate-100 text-slate-600 px-3 py-1.5 text-xs font-bold transition-all cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                    <span>Cancel Request</span>
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Visual Workflow Stage Progression Tracker */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs">
        <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
          Consultation Lifecycle & Verification Stages
        </h2>

        {isRejected || isCancelled ? (
          <div className="flex items-center gap-3 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs">
            <AlertTriangle className="w-5 h-5 shrink-0 text-rose-600" />
            <div>
              <p className="font-bold">
                Consultation terminated ({consultation.status})
              </p>
              {consultation.rejectionReason && (
                <p className="text-[11px] mt-0.5 text-rose-700">
                  Reason provided: {consultation.rejectionReason}
                </p>
              )}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
            {STAGES.map((s) => {
              const state = getStageStatus(s.key);
              return (
                <div
                  key={s.key}
                  className={`flex flex-col p-2.5 rounded-xl border text-center transition-all ${
                    state === 'current'
                      ? 'border-[#166534] bg-emerald-50/80 text-[#166534] shadow-2xs'
                      : state === 'completed'
                      ? 'border-emerald-200 bg-emerald-50/30 text-emerald-800'
                      : 'border-slate-200 bg-slate-50 text-slate-400'
                  }`}
                >
                  <div className="flex items-center justify-center mb-1">
                    {state === 'completed' ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    ) : state === 'current' ? (
                      <div className="w-3 h-3 rounded-full bg-[#166534] animate-pulse" />
                    ) : (
                      <div className="w-2.5 h-2.5 rounded-full bg-slate-300" />
                    )}
                  </div>
                  <span className="text-[11px] font-bold tracking-tight">{s.label}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Main 2-Column Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Columns: Inquiry Info, AI Scan, Advisory, and Real-Time Chat */}
        <div className="lg:col-span-2 space-y-6">
          {/* Inquiry Details Card */}
          <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <FileText className="w-4 h-4 text-[#166534]" />
                <span>Problem Statement & Field Context</span>
              </h2>
              <span className="text-[11px] text-slate-400">
                Method: {consultation.preferredMethod}
              </span>
            </div>

            <p className="text-xs sm:text-sm text-slate-700 leading-relaxed whitespace-pre-line">
              {consultation.description}
            </p>

            {/* Farm & Crop metadata tags */}
            <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100">
              <div className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
                <MapPin className="w-3.5 h-3.5 text-slate-400" />
                <span>
                  Farm: {consultation.farm?.name} ({consultation.farm?.location?.district || 'Location'})
                </span>
              </div>

              <div className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 px-2.5 py-1 text-xs font-semibold">
                <Sprout className="w-3.5 h-3.5 text-emerald-600" />
                <span>
                  Crop: {consultation.crop?.name || consultation.crop?.cropName} (
                  {consultation.crop?.variety || 'Standard'}) &bull; Stage: {consultation.crop?.stage || 'Active'}
                </span>
              </div>
            </div>

            {/* Initial attachments gallery */}
            {consultation.attachments?.length > 0 && (
              <div className="pt-2">
                <h4 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                  Uploaded Field Photos ({consultation.attachments.length})
                </h4>
                <div className="flex flex-wrap gap-3">
                  {consultation.attachments.map((att, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setLightboxImage(att.url);
                        setActiveModal('image');
                      }}
                      className="group relative w-20 h-20 rounded-xl overflow-hidden border border-slate-200 shadow-2xs hover:border-[#166534] transition-all cursor-pointer"
                    >
                      <img
                        src={att.url}
                        alt={att.filename || 'Field Attachment'}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      />
                      <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                        <ExternalLink className="w-4 h-4 text-white" />
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Linked AI Disease Scan (Clearly distinguished as preliminary machine prediction) */}
          {consultation.diseaseScan && (
            <div className="rounded-2xl border border-indigo-200 bg-indigo-50/40 p-5 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-extrabold text-indigo-950 uppercase tracking-wider">
                      Linked AI Multimodal Foliage Scan
                    </h3>
                    <p className="text-[10px] text-indigo-700 font-semibold">
                      [AI Preliminary Scan: Not Human Verified &bull; Requires Agronomist Review]
                    </p>
                  </div>
                </div>

                {consultation.diseaseScan.confidence && (
                  <Badge variant="indigo" size="sm" className="font-mono font-bold text-xs">
                    {(consultation.diseaseScan.confidence * 100).toFixed(1)}% AI Confidence
                  </Badge>
                )}
              </div>

              <div className="flex flex-col sm:flex-row gap-4 pt-2">
                {consultation.diseaseScan.imageUrl && (
                  <button
                    type="button"
                    onClick={() => {
                      setLightboxImage(consultation.diseaseScan.imageUrl);
                      setActiveModal('image');
                    }}
                    className="w-24 h-24 rounded-xl overflow-hidden border border-indigo-200 shrink-0 shadow-2xs group relative cursor-pointer"
                  >
                    <img
                      src={consultation.diseaseScan.imageUrl}
                      alt="AI Disease Scan"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    />
                    <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                      <ExternalLink className="w-4 h-4 text-white" />
                    </div>
                  </button>
                )}

                <div className="min-w-0 flex-1 space-y-1.5 text-xs">
                  <div>
                    <span className="text-slate-500 font-medium">Predicted Condition: </span>
                    <strong className="text-slate-900 font-bold">
                      {consultation.diseaseScan.diseaseName ||
                        consultation.diseaseScan.diagnosis ||
                        'Unspecified Condition'}
                    </strong>
                  </div>

                  {consultation.diseaseScan.severity && (
                    <div>
                      <span className="text-slate-500 font-medium">Estimated Severity: </span>
                      <span className="font-bold text-amber-700 uppercase">
                        {consultation.diseaseScan.severity}
                      </span>
                    </div>
                  )}

                  {consultation.diseaseScan.description && (
                    <p className="text-slate-600 line-clamp-3">
                      {consultation.diseaseScan.description}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Structured Agricultural Specialist Recommendations (If Provided) */}
          {consultation.recommendation && (
            <div className="rounded-2xl border-2 border-emerald-500/80 bg-gradient-to-br from-emerald-50/50 via-white to-emerald-50/20 p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-emerald-200/60 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-[#166534] text-white flex items-center justify-center shadow-xs">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-extrabold text-[#17251B] tracking-tight">
                      Official Agronomic Advisory & Recovery Protocol
                    </h3>
                    <p className="text-[11px] text-[#166534] font-bold">
                      [Verified Agricultural Specialist Advice &bull; Human Verified]
                    </p>
                  </div>
                </div>

                <Badge variant="forest" size="sm" dot>
                  OFFICIAL ADVISORY
                </Badge>
              </div>

              <div className="space-y-4 text-xs sm:text-sm">
                {/* 1. Problem Assessment */}
                <div>
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Specialist Clinical Assessment</span>
                  </h4>
                  <p className="text-slate-700 leading-relaxed bg-white/80 p-3 rounded-xl border border-slate-200/70">
                    {consultation.recommendation.problemAssessment}
                  </p>
                </div>

                {/* 2. Possible Causes */}
                {consultation.recommendation.possibleCauses?.length > 0 && (
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-1.5">
                      Identified Underlying Causes & Pathogens
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {consultation.recommendation.possibleCauses.map((cause, cIdx) => (
                        <span
                          key={cIdx}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-100/70 text-emerald-900 font-semibold text-xs border border-emerald-200"
                        >
                          &bull; {cause}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* 3. Recommended Practices & Chemical/Organic Solutions */}
                <div>
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                    <Sprout className="w-3.5 h-3.5 text-[#166534]" />
                    <span>Recommended Practices & Curative Measures</span>
                  </h4>
                  <div className="text-slate-800 leading-relaxed bg-white/80 p-3 rounded-xl border border-slate-200/70 whitespace-pre-line font-medium">
                    {consultation.recommendation.recommendedPractices}
                  </div>
                </div>

                {/* 4. Preventive Measures */}
                {consultation.recommendation.preventiveMeasures && (
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-1">
                      Preventive Measures & Future Safeguards
                    </h4>
                    <p className="text-slate-700 leading-relaxed bg-white/80 p-3 rounded-xl border border-slate-200/70 whitespace-pre-line">
                      {consultation.recommendation.preventiveMeasures}
                    </p>
                  </div>
                )}

                {/* 5. Follow-Up Schedule */}
                {consultation.recommendation.followUpTimeline && (
                  <div className="flex items-center gap-2 p-3 rounded-xl bg-amber-50/70 border border-amber-200 text-amber-900 text-xs">
                    <Clock className="w-4 h-4 text-amber-600 shrink-0" />
                    <div>
                      <span className="font-bold">Follow-Up Monitoring Schedule: </span>
                      <span>{consultation.recommendation.followUpTimeline}</span>
                    </div>
                  </div>
                )}

                {/* 6. Expert Notes */}
                {consultation.recommendation.expertNotes && (
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-600 text-xs italic">
                    <strong>Specialist Notes:</strong> {consultation.recommendation.expertNotes}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Real-Time Live Messaging Workspace */}
          <div className="rounded-2xl border border-slate-200/80 bg-white overflow-hidden shadow-xs flex flex-col h-[560px]">
            {/* Chat Header */}
            <div className="p-4 border-b border-slate-100 bg-slate-50/60 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-[#166534] text-white flex items-center justify-center">
                  <MessageSquare className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-900">
                    Live Specialist Consultation Thread
                  </h3>
                  <p className="text-[10px] text-slate-500">
                    Real-time encrypted advisory room &bull; Instant synchronisation
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-bold border border-emerald-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Live Sync
                </span>
              </div>
            </div>

            {/* Chat Messages Stream */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#FBFBFA]">
              {messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400 space-y-2">
                  <MessageSquare className="w-8 h-8 stroke-1 text-slate-300" />
                  <p className="text-xs font-semibold">No messages in this workspace yet.</p>
                  <p className="text-[11px] max-w-xs">
                    {isExpertView
                      ? 'Type an answer or greeting to begin communicating with the farmer.'
                      : 'Ask your assigned agricultural specialist questions about treatment, dosage, or recovery.'}
                  </p>
                </div>
              ) : (
                messages.map((m) => {
                  const mId = m._id || m.id;
                  const isFarmer = m.senderRole === 'farmer';
                  const isExpert = m.senderRole === 'expert';
                  const isSystem = m.senderRole === 'system';

                  if (isSystem) {
                    return (
                      <div key={mId} className="flex justify-center my-2">
                        <div className="px-3 py-1 rounded-full bg-slate-200/80 text-slate-600 text-[10px] font-semibold text-center max-w-md">
                          {m.message}
                        </div>
                      </div>
                    );
                  }

                  const isOwn = String(m.sender?._id || m.sender?.id || m.sender) === String(user?._id || user?.id);

                  return (
                    <div
                      key={mId}
                      className={`flex flex-col ${isOwn ? 'items-end' : 'items-start'}`}
                    >
                      <div className="flex items-center gap-1.5 mb-1 px-1">
                        <span className="text-[10px] font-bold text-slate-500">
                          {m.sender?.name || (isExpert ? 'Agricultural Specialist' : 'Farmer')}
                        </span>
                        {isExpert && (
                          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 text-[9px] font-bold">
                            <ShieldCheck className="w-2.5 h-2.5" />
                            Specialist
                          </span>
                        )}
                        {isFarmer && (
                          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded bg-slate-200 text-slate-700 text-[9px] font-bold">
                            Farmer
                          </span>
                        )}
                        <span className="text-[9px] text-slate-400">
                          {formatKolkataTime(m.createdAt)}
                        </span>
                      </div>

                      <div
                        className={`max-w-[85%] rounded-2xl p-3.5 text-xs sm:text-sm shadow-2xs space-y-2 ${
                          isOwn
                            ? 'bg-[#166534] text-white rounded-tr-xs'
                            : isExpert
                            ? 'bg-white border-2 border-emerald-400 text-slate-900 rounded-tl-xs'
                            : 'bg-white border border-slate-200 text-slate-900 rounded-tl-xs'
                        }`}
                      >
                        <p className="leading-relaxed whitespace-pre-line">{m.message}</p>

                        {/* Message Image Attachments */}
                        {m.attachments?.length > 0 && (
                          <div className="flex flex-wrap gap-2 pt-1">
                            {m.attachments.map((att, aIdx) => (
                              <button
                                key={aIdx}
                                type="button"
                                onClick={() => {
                                  setLightboxImage(att.url);
                                  setActiveModal('image');
                                }}
                                className="w-24 h-24 rounded-lg overflow-hidden border border-white/20 shadow-xs cursor-pointer hover:opacity-90"
                              >
                                <img
                                  src={att.url}
                                  alt={att.filename || 'Attachment'}
                                  className="w-full h-full object-cover"
                                />
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Attachment Preview Chip */}
            {pendingAttachment && (
              <div className="px-4 py-2 bg-emerald-50 border-t border-emerald-200 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <img
                    src={pendingAttachment.url}
                    alt="Pending upload"
                    className="w-8 h-8 rounded object-cover border border-emerald-300"
                  />
                  <span className="text-xs font-semibold text-emerald-900 truncate max-w-xs">
                    {pendingAttachment.filename || 'Photo ready to send'}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setPendingAttachment(null)}
                  className="p-1 text-emerald-700 hover:text-emerald-900"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Chat Input Bar */}
            <form
              onSubmit={handleSendMessage}
              className="p-3 border-t border-slate-200 bg-white flex items-center gap-2"
            >
              <input
                type="file"
                ref={fileInputRef}
                accept="image/*"
                onChange={handleAttachmentUpload}
                className="hidden"
              />

              <button
                type="button"
                disabled={isUploadingAttachment || isCompleted || isRejected || isCancelled}
                onClick={() => fileInputRef.current?.click()}
                className="p-2.5 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-500 transition-all disabled:opacity-40 cursor-pointer"
                title="Attach Photograph"
              >
                <Paperclip className="w-4 h-4" />
              </button>

              <input
                type="text"
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                disabled={isCompleted || isRejected || isCancelled || isSendingMessage}
                placeholder={
                  isCompleted
                    ? 'Consultation resolved. Messaging is closed.'
                    : 'Type a message to your specialist...'
                }
                className="flex-1 rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-[#166534] disabled:bg-slate-100"
              />

              <button
                type="submit"
                disabled={
                  (!messageText.trim() && !pendingAttachment) ||
                  isSendingMessage ||
                  isCompleted ||
                  isRejected ||
                  isCancelled
                }
                className="p-2.5 rounded-xl bg-[#166534] hover:bg-[#14532d] text-white disabled:opacity-40 transition-all cursor-pointer shadow-xs"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>

        {/* Right 1 Column: Specialist & Farmer Profiles, Status Timeline */}
        <div className="space-y-6">
          {/* Assigned Specialist Card */}
          <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs space-y-4">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Assigned Agricultural Specialist</span>
            </h3>

            {consultation.expert ? (
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-[#166534] text-white flex items-center justify-center font-bold text-lg shadow-xs">
                    {consultation.expert.name?.charAt(0) || 'E'}
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 flex items-center gap-1">
                      <span>{consultation.expert.name}</span>
                      <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
                    </h4>
                    <p className="text-xs text-[#166534] font-semibold">
                      {consultation.expert.expertProfile?.specialization || 'Agronomy Specialist'}
                    </p>
                  </div>
                </div>

                <div className="space-y-2 text-xs text-slate-600 pt-2 border-t border-slate-100">
                  {consultation.expert.expertProfile?.qualification && (
                    <div className="flex items-center gap-2">
                      <GraduationCap className="w-4 h-4 text-slate-400 shrink-0" />
                      <span>{consultation.expert.expertProfile.qualification}</span>
                    </div>
                  )}

                  {consultation.expert.expertProfile?.institution && (
                    <div className="flex items-center gap-2">
                      <Building className="w-4 h-4 text-slate-400 shrink-0" />
                      <span>{consultation.expert.expertProfile.institution}</span>
                    </div>
                  )}

                  {consultation.expert.expertProfile?.experienceYears && (
                    <div className="flex items-center gap-2">
                      <Award className="w-4 h-4 text-slate-400 shrink-0" />
                      <span>
                        {consultation.expert.expertProfile.experienceYears} Years Verified
                        Experience
                      </span>
                    </div>
                  )}

                  {consultation.expert.expertProfile?.rating && (
                    <div className="flex items-center gap-2">
                      <Star className="w-4 h-4 text-amber-500 fill-amber-500 shrink-0" />
                      <span className="font-bold text-slate-900">
                        {consultation.expert.expertProfile.rating.toFixed(1)} / 5.0
                      </span>
                      <span className="text-slate-400">
                        ({consultation.expert.expertProfile.reviewsCount || 0} reviews)
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-center space-y-2">
                <Clock className="w-6 h-6 text-amber-600 mx-auto" />
                <p className="text-xs font-bold text-amber-900">
                  Awaiting Specialist Assignment
                </p>
                <p className="text-[11px] text-amber-700">
                  AgriSense coordinators are matching your crop condition with the appropriate
                  pathology or agronomy expert.
                </p>
              </div>
            )}
          </div>

          {/* Farmer Profile Card */}
          <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs space-y-3">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <User className="w-4 h-4 text-slate-400" />
              <span>Registered Farmer</span>
            </h3>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center font-bold text-sm">
                {consultation.farmer?.name?.charAt(0) || 'F'}
              </div>
              <div className="min-w-0 flex-1">
                <h4 className="text-xs font-bold text-slate-900 truncate">
                  {consultation.farmer?.name || 'Farmer'}
                </h4>
                <p className="text-[11px] text-slate-500 truncate">
                  {consultation.farmer?.email || 'Registered AgriSense Member'}
                </p>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100 text-xs text-slate-600 space-y-1">
              <div>
                Farm: <strong>{consultation.farm?.name}</strong>
              </div>
              <div>
                Location:{' '}
                <strong>
                  {consultation.farm?.location?.district || ''},{' '}
                  {consultation.farm?.location?.state || ''}
                </strong>
              </div>
            </div>
          </div>

          {/* Status Progression Timeline History */}
          <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs space-y-3">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Status Audit History
            </h3>

            <div className="space-y-3">
              {consultation.statusHistory?.map((entry, idx) => (
                <div key={idx} className="flex items-start gap-2.5 text-xs">
                  <div className="w-2 h-2 rounded-full bg-[#166534] mt-1 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900">{entry.status}</span>
                      <span className="text-[10px] text-slate-400">
                        {formatKolkataTime(entry.changedAt)}
                      </span>
                    </div>
                    {entry.notes && (
                      <p className="text-[11px] text-slate-500 mt-0.5">{entry.notes}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Farmer Review & Feedback (If Completed) */}
          {consultation.rating && (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-5 shadow-xs space-y-2">
              <h3 className="text-xs font-bold text-emerald-950 uppercase tracking-wider flex items-center gap-1.5">
                <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                <span>Farmer Advisory Feedback</span>
              </h3>
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    className={`w-4 h-4 ${
                      star <= consultation.rating
                        ? 'text-amber-500 fill-amber-500'
                        : 'text-slate-300'
                    }`}
                  />
                ))}
                <span className="text-xs font-bold text-slate-700 ml-2">
                  {consultation.rating} / 5 Stars
                </span>
              </div>
              {consultation.feedback && (
                <p className="text-xs text-slate-700 italic pt-1">
                  &ldquo;{consultation.feedback}&rdquo;
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ======================================================== */}
      {/* MODAL 1: Structured Agricultural Advisory (Expert View) */}
      {/* ======================================================== */}
      {activeModal === 'recommend' && (
        <Modal
          isOpen={true}
          onClose={() => setActiveModal(null)}
          title="Provide Structured Agronomic Advisory"
          subtitle={`Case: ${consultation.referenceId} &bull; Crop: ${consultation.crop?.name || 'Crop'}`}
          size="xl"
        >
          <form onSubmit={handleSubmitRecommendation} className="space-y-4">
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-[#166534] shrink-0" />
              <span>
                Your recommendation will be stamped with your verified agronomist credentials and
                sent directly to the farmer.
              </span>
            </div>

            {/* Problem Assessment */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Specialist Problem Assessment *
              </label>
              <textarea
                rows={3}
                required
                value={advisoryForm.problemAssessment}
                onChange={(e) =>
                  setAdvisoryForm((prev) => ({ ...prev, problemAssessment: e.target.value }))
                }
                placeholder="Detailed clinical evaluation of the disease/pest condition..."
                className="w-full rounded-xl border border-slate-200 p-3 text-xs text-slate-900 focus:outline-none focus:border-[#166534]"
              />
            </div>

            {/* Possible Causes */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Identified Causes & Pathogens (one per line)
              </label>
              <textarea
                rows={2}
                value={advisoryForm.possibleCauses}
                onChange={(e) =>
                  setAdvisoryForm((prev) => ({ ...prev, possibleCauses: e.target.value }))
                }
                placeholder="e.g.&#10;Xanthomonas axonopodis pv. vesicatoria&#10;Excessive canopy moisture"
                className="w-full rounded-xl border border-slate-200 p-3 text-xs text-slate-900 focus:outline-none focus:border-[#166534]"
              />
            </div>

            {/* Recommended Practices */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Recommended Curative Practices & Chemical/Organic Solutions *
              </label>
              <textarea
                rows={4}
                required
                value={advisoryForm.recommendedPractices}
                onChange={(e) =>
                  setAdvisoryForm((prev) => ({
                    ...prev,
                    recommendedPractices: e.target.value,
                  }))
                }
                placeholder="Specific dosage, spray schedules, active ingredients, and soil remedies..."
                className="w-full rounded-xl border border-slate-200 p-3 text-xs text-slate-900 focus:outline-none focus:border-[#166534]"
              />
            </div>

            {/* Preventive Measures */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Preventive Measures & Cultural Controls
              </label>
              <textarea
                rows={2}
                value={advisoryForm.preventiveMeasures}
                onChange={(e) =>
                  setAdvisoryForm((prev) => ({
                    ...prev,
                    preventiveMeasures: e.target.value,
                  }))
                }
                placeholder="Sanitation, crop rotation, irrigation timing, and seed treatment..."
                className="w-full rounded-xl border border-slate-200 p-3 text-xs text-slate-900 focus:outline-none focus:border-[#166534]"
              />
            </div>

            {/* Follow-up Timeline */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Recommended Follow-Up Schedule
              </label>
              <input
                type="text"
                value={advisoryForm.followUpTimeline}
                onChange={(e) =>
                  setAdvisoryForm((prev) => ({ ...prev, followUpTimeline: e.target.value }))
                }
                placeholder="e.g. Inspect foliage 5 days after first spray"
                className="w-full rounded-xl border border-slate-200 p-3 text-xs text-slate-900 focus:outline-none focus:border-[#166534]"
              />
            </div>

            {/* Expert Notes */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Additional Expert Notes (Optional)
              </label>
              <textarea
                rows={2}
                value={advisoryForm.expertNotes}
                onChange={(e) =>
                  setAdvisoryForm((prev) => ({ ...prev, expertNotes: e.target.value }))
                }
                placeholder="Cautions, weather considerations, or emergency contacts..."
                className="w-full rounded-xl border border-slate-200 p-3 text-xs text-slate-900 focus:outline-none focus:border-[#166534]"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={actionLoading}
                className="inline-flex items-center gap-1.5 rounded-xl bg-[#166534] hover:bg-[#14532d] text-white px-5 py-2 text-xs font-bold transition-all shadow-xs"
              >
                <Check className="w-4 h-4" />
                <span>Publish Official Advisory</span>
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* ======================================================== */}
      {/* MODAL 2: Decline Consultation Request (Expert View)       */}
      {/* ======================================================== */}
      {activeModal === 'reject' && (
        <Modal
          isOpen={true}
          onClose={() => setActiveModal(null)}
          title="Decline Consultation Request"
          size="md"
        >
          <div className="space-y-4">
            <p className="text-xs text-slate-600">
              Please explain why you are declining this consultation request so the farmer can be
              directed to another agronomist.
            </p>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Decline Reason *
              </label>
              <textarea
                rows={3}
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="e.g. Case requires specialized entomological lab analysis..."
                className="w-full rounded-xl border border-slate-200 p-3 text-xs text-slate-900 focus:outline-none focus:border-rose-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
              >
                Keep Request
              </button>
              <button
                type="button"
                disabled={actionLoading || !rejectionReason.trim()}
                onClick={handleRejectConsultation}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold disabled:opacity-40"
              >
                Confirm Decline
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* ======================================================== */}
      {/* MODAL 3: Mark Complete & Rate Specialist (Farmer View)     */}
      {/* ======================================================== */}
      {activeModal === 'complete' && (
        <Modal
          isOpen={true}
          onClose={() => setActiveModal(null)}
          title="Complete Consultation & Rate Specialist"
          size="md"
        >
          <form onSubmit={handleCompleteConsultation} className="space-y-4">
            <p className="text-xs text-slate-600">
              Has the specialist&apos;s advisory helped resolve your crop issue? Please rate your
              consultation experience.
            </p>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Advisory Rating (1 to 5 Stars) *
              </label>
              <div className="flex items-center gap-2 pt-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    className="p-1 hover:scale-110 transition-transform cursor-pointer"
                  >
                    <Star
                      className={`w-7 h-7 ${
                        star <= rating
                          ? 'text-amber-500 fill-amber-500'
                          : 'text-slate-300'
                      }`}
                    />
                  </button>
                ))}
                <span className="text-xs font-bold text-slate-700 ml-2">
                  {rating} of 5 Stars
                </span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Farmer Feedback & Comments (Optional)
              </label>
              <textarea
                rows={3}
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                placeholder="Share your experience regarding accuracy, response time, and crop recovery..."
                className="w-full rounded-xl border border-slate-200 p-3 text-xs text-slate-900 focus:outline-none focus:border-[#166534]"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={actionLoading}
                className="px-5 py-2 rounded-xl bg-[#166534] hover:bg-[#14532d] text-white text-xs font-bold shadow-xs cursor-pointer"
              >
                Submit Review & Close Case
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* ======================================================== */}
      {/* MODAL 4: Fullscreen Lightbox Image Viewer                */}
      {/* ======================================================== */}
      {activeModal === 'image' && lightboxImage && (
        <Modal
          isOpen={true}
          onClose={() => {
            setActiveModal(null);
            setLightboxImage(null);
          }}
          title="Photograph Inspection"
          size="xl"
        >
          <div className="flex flex-col items-center justify-center p-2">
            <img
              src={lightboxImage}
              alt="Inspected photograph"
              className="max-h-[70vh] w-auto max-w-full rounded-xl object-contain shadow-md"
            />
          </div>
        </Modal>
      )}
    </div>
  );
}
