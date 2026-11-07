import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  MessageSquare,
  Users,
  CheckCircle2,
  Clock,
  Search,
  Plus,
  ShieldCheck,
  AlertTriangle,
  MapPin,
  Sprout,
  Upload,
  X,
  RefreshCw,
  ChevronRight,
  Award,
  GraduationCap,
  Building,
} from 'lucide-react';
import consultationService from '../../services/consultationService.js';
import farmService from '../../services/farmService.js';
import cropService from '../../services/cropService.js';
import diseaseService from '../../services/diseaseService.js';
import Modal from '../../components/common/Modal.jsx';
import Badge from '../../components/common/Badge.jsx';

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

const CATEGORY_LIST = [
  'Crop Protection',
  'Plant Diseases',
  'Soil Health',
  'Irrigation',
  'Horticulture',
  'Agricultural Practices',
  'Pest Management',
  'General Advisory',
];

export default function ConsultationPage({ isExpertView = false }) {
  // Active Tab
  const [activeTab, setActiveTab] = useState(isExpertView ? 'queue' : 'my_consultations');

  // Consultation Queue State
  const [consultations, setConsultations] = useState([]);
  const [summary, setSummary] = useState({
    total: 0,
    pending: 0,
    accepted: 0,
    active: 0,
    completed: 0,
    assigned: 0,
    open: 0,
  });
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Experts Directory State
  const [experts, setExperts] = useState([]);
  const [expertsLoading, setExpertsLoading] = useState(false);
  const [expertSearch, setExpertSearch] = useState('');
  const [expertSpecialization, setExpertSpecialization] = useState('all');

  // Request Modal State
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
  const [farms, setFarms] = useState([]);
  const [crops, setCrops] = useState([]);
  const [scans, setScans] = useState([]);
  const [loadingFormData, setLoadingFormData] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);

  // Form State
  const [selectedFarmId, setSelectedFarmId] = useState('');
  const [selectedCropId, setSelectedCropId] = useState('');
  const [selectedScanId, setSelectedScanId] = useState('');
  const [selectedExpertId, setSelectedExpertId] = useState('');
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Crop Protection');
  const [priority, setPriority] = useState('Medium');
  const [preferredMethod, setPreferredMethod] = useState('In-App Message');
  const [attachments, setAttachments] = useState([]);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Fetch Consultations
  useEffect(() => {
    let ignore = false;
    const fetchList = async () => {
      try {
        const res = isExpertView
          ? await consultationService.getExpertConsultations({
              status: statusFilter,
              category: categoryFilter,
              search: searchQuery,
            })
          : await consultationService.getFarmerConsultations({
              status: statusFilter,
              category: categoryFilter,
              search: searchQuery,
            });
        if (!ignore && res?.success && res.data) {
          setConsultations(res.data.consultations || []);
          if (res.data.summary) setSummary(res.data.summary);
        }
      } catch (err) {
        console.error('[FETCH_CONSULTATIONS_ERROR]', err);
      } finally {
        if (!ignore) setLoading(false);
      }
    };

    fetchList();

    return () => {
      ignore = true;
    };
  }, [isExpertView, statusFilter, categoryFilter, searchQuery, refreshTrigger]);

  // Fetch Experts Directory
  useEffect(() => {
    let ignore = false;
    if (activeTab !== 'experts') return;

    const fetchDir = async () => {
      try {
        const res = await consultationService.getExperts({
          specialization: expertSpecialization,
          search: expertSearch,
        });
        if (!ignore && res?.success && res.data) {
          setExperts(res.data);
        }
      } catch (err) {
        console.error('[FETCH_EXPERTS_ERROR]', err);
      } finally {
        if (!ignore) setExpertsLoading(false);
      }
    };

    fetchDir();

    return () => {
      ignore = true;
    };
  }, [activeTab, expertSpecialization, expertSearch]);

  // Load Farmer Data for Request Modal
  const loadFormData = async () => {
    setLoadingFormData(true);
    try {
      const [farmsRes, cropsRes, scansRes] = await Promise.all([
        farmService.getFarms({ limit: 50 }),
        cropService.getCrops({ status: 'Active', limit: 50 }),
        diseaseService.getScanHistory({ limit: 10 }).catch(() => ({ scans: [] })),
      ]);

      const farmList = farmsRes?.data?.farms || farmsRes?.farms || farmsRes?.data || [];
      const cropList = cropsRes?.crops || cropsRes?.data?.crops || [];
      const scanList = scansRes?.scans || scansRes?.data?.scans || [];

      setFarms(farmList);
      setCrops(cropList);
      setScans(scanList);

      if (farmList.length > 0 && !selectedFarmId) {
        setSelectedFarmId(farmList[0]._id || farmList[0].id);
      }
    } catch (err) {
      console.error('[LOAD_FORM_DATA_ERROR]', err);
    } finally {
      setLoadingFormData(false);
    }
  };

  // Filter crops based on selected farm
  const availableCrops = useMemo(() => {
    if (!selectedFarmId) return crops;
    return crops.filter((c) => {
      const fId = c.farm?._id || c.farm?.id || c.farm;
      return String(fId) === String(selectedFarmId);
    });
  }, [crops, selectedFarmId]);

  // Open Request Modal
  const handleOpenRequestModal = (preselectedExpertId = '') => {
    if (preselectedExpertId) {
      setSelectedExpertId(preselectedExpertId);
    }
    loadFormData();
    setIsRequestModalOpen(true);
  };

  // Handle Photo Attachment
  const handlePhotoUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      setToastMessage({ type: 'error', text: 'Attachment must be smaller than 10MB.' });
      return;
    }

    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const res = await consultationService.uploadAttachment(reader.result, file.name);
        if (res?.success && res.attachment) {
          setAttachments((prev) => [...prev, res.attachment]);
          setToastMessage({ type: 'success', text: 'Photo attached successfully.' });
          setTimeout(() => setToastMessage(null), 3000);
        }
      } catch (err) {
        setToastMessage({ type: 'error', text: err.message || 'Failed to upload image.' });
        setTimeout(() => setToastMessage(null), 3000);
      }
    };
    reader.readAsDataURL(file);
  };

  // Submit Consultation Request
  const handleSubmitRequest = async (e) => {
    e.preventDefault();

    if (!selectedFarmId || !selectedCropId || !subject.trim() || !description.trim()) {
      setToastMessage({
        type: 'error',
        text: 'Please complete all required fields (Farm, Crop, Subject, and Description).',
      });
      setTimeout(() => setToastMessage(null), 4000);
      return;
    }

    setSubmitting(true);
    try {
      const res = await consultationService.createConsultation({
        farmId: selectedFarmId,
        cropId: selectedCropId,
        diseaseScanId: selectedScanId || null,
        expertId: selectedExpertId || null,
        subject: subject.trim(),
        description: description.trim(),
        category,
        priority,
        preferredMethod,
        attachments,
      });

      if (res?.success && res.data) {
        setIsRequestModalOpen(false);
        // Reset form
        setSubject('');
        setDescription('');
        setAttachments([]);
        setSelectedScanId('');
        setSelectedExpertId('');
        setToastMessage({
          type: 'success',
          text: `Consultation request #${res.data.referenceId} submitted successfully!`,
        });
        setTimeout(() => setToastMessage(null), 4000);
        setRefreshTrigger((k) => k + 1);
        setActiveTab('my_consultations');
      }
    } catch (err) {
      setToastMessage({
        type: 'error',
        text: err.response?.data?.message || err.message || 'Failed to submit consultation.',
      });
      setTimeout(() => setToastMessage(null), 4000);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Toast Alert */}
      {toastMessage && (
        <div
          role="alert"
          className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg border text-sm font-semibold transition-all ${
            toastMessage.type === 'error'
              ? 'bg-rose-50 text-rose-800 border-rose-200'
              : 'bg-emerald-50 text-emerald-800 border-emerald-200'
          }`}
        >
          {toastMessage.type === 'error' ? (
            <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
          ) : (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          )}
          <span>{toastMessage.text}</span>
          <button
            type="button"
            onClick={() => setToastMessage(null)}
            className="ml-2 text-slate-400 hover:text-slate-600"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header Section */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#166534] text-white shadow-xs">
            <MessageSquare className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#17251B]">
              {isExpertView
                ? 'Expert Consultation Workspace'
                : 'Expert Consultation & Farmer Support'}
            </h1>
            <p className="text-xs sm:text-sm text-slate-600">
              {isExpertView
                ? 'Review farmer inquiries, analyze telemetry, and deliver verified agronomic guidance.'
                : 'Connect with verified agricultural scientists and agronomic specialists for personalized crop advice.'}
            </p>
          </div>
        </div>

        {/* Action Button */}
        {!isExpertView && (
          <button
            type="button"
            onClick={() => handleOpenRequestModal('')}
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#166534] to-[#145A32] hover:from-[#145A32] hover:to-[#0f3d22] text-white px-4 py-2 text-xs sm:text-sm font-bold shadow-xs transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Request Consultation</span>
          </button>
        )}
      </div>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {/* Card 1 */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold tracking-wider text-slate-400 uppercase">
              {isExpertView ? 'Assigned Cases' : 'Total Consultations'}
            </span>
            <div className="rounded-xl bg-slate-100 p-2 text-slate-600">
              <MessageSquare className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">
              {isExpertView ? summary.assigned : summary.total}
            </span>
            <span className="text-[11px] text-slate-500 font-medium">all records</span>
          </div>
        </div>

        {/* Card 2 */}
        <div className="rounded-2xl border border-amber-200/80 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold tracking-wider text-amber-700 uppercase">
              {isExpertView ? 'Open Inquiries' : 'Pending Requests'}
            </span>
            <div className="rounded-xl bg-amber-50 p-2 text-amber-600">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-amber-700">
              {isExpertView ? summary.open : summary.pending}
            </span>
            <span className="text-[11px] text-amber-600 font-medium">awaiting review</span>
          </div>
        </div>

        {/* Card 3 */}
        <div className="rounded-2xl border border-blue-200/80 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold tracking-wider text-blue-700 uppercase">
              Active Advisory
            </span>
            <div className="rounded-xl bg-blue-50 p-2 text-blue-600">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-blue-700">{summary.active}</span>
            <span className="text-[11px] text-blue-600 font-medium">in discussion</span>
          </div>
        </div>

        {/* Card 4 */}
        <div className="rounded-2xl border border-emerald-200/80 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold tracking-wider text-emerald-700 uppercase">
              Completed
            </span>
            <div className="rounded-xl bg-emerald-50 p-2 text-emerald-600">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-emerald-700">{summary.completed}</span>
            <span className="text-[11px] text-emerald-600 font-medium">resolved cases</span>
          </div>
        </div>
      </div>

      {/* Main Tabs (Farmer: My Consultations vs Expert Directory) */}
      {!isExpertView && (
        <div className="flex border-b border-slate-200">
          <button
            type="button"
            onClick={() => setActiveTab('my_consultations')}
            className={`flex items-center gap-2 px-5 py-3 text-xs sm:text-sm font-bold border-b-2 transition-all cursor-pointer ${
              activeTab === 'my_consultations'
                ? 'border-[#166534] text-[#166534]'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            <span>My Consultations</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-bold">
              {summary.total}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('experts')}
            className={`flex items-center gap-2 px-5 py-3 text-xs sm:text-sm font-bold border-b-2 transition-all cursor-pointer ${
              activeTab === 'experts'
                ? 'border-[#166534] text-[#166534]'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Verified Expert Directory</span>
          </button>
        </div>
      )}

      {/* VIEW 1: Consultations List (Farmer or Expert View) */}
      {(activeTab === 'my_consultations' || activeTab === 'queue') && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              {/* Status Tabs */}
              <div className="flex flex-wrap items-center gap-1.5 p-1 rounded-xl bg-slate-100/80">
                {[
                  { id: 'all', label: 'All', count: summary.total || (summary.assigned + summary.open) },
                  { id: 'pending', label: 'Pending', count: summary.pending || summary.open },
                  { id: 'active', label: 'Active', count: summary.active },
                  { id: 'completed', label: 'Completed', count: summary.completed },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setStatusFilter(tab.id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      statusFilter === tab.id
                        ? 'bg-white text-slate-900 shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
                    }`}
                  >
                    <span>{tab.label}</span>
                    <span
                      className={`text-[10px] px-1.5 rounded-full font-bold ${
                        statusFilter === tab.id
                          ? 'bg-slate-900 text-white'
                          : 'bg-slate-200 text-slate-600'
                      }`}
                    >
                      {tab.count}
                    </span>
                  </button>
                ))}
              </div>

              {/* Category Filter & Search Box */}
              <div className="flex items-center gap-2">
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="rounded-xl border border-slate-200 bg-slate-50/80 px-3 py-1.5 text-xs font-semibold text-slate-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#166534]"
                >
                  <option value="all">All Topics</option>
                  {CATEGORY_LIST.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>

                <div className="relative sm:w-56">
                  <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search consultations..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/80 py-1.5 pl-8 pr-3 text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#166534]"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Cards List */}
          {loading ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-xs">
              <RefreshCw className="w-8 h-8 text-[#166534] animate-spin mx-auto mb-3" />
              <h3 className="text-sm font-bold text-slate-800">Loading consultations...</h3>
            </div>
          ) : consultations.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center shadow-xs">
              <div className="h-12 w-12 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto text-slate-400 mb-3">
                <MessageSquare className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-slate-800">No consultations found</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
                {statusFilter !== 'all' || categoryFilter !== 'all' || searchQuery
                  ? 'No consultations match the selected filters.'
                  : isExpertView
                  ? 'No pending inquiries in the queue. New farmer requests will appear here.'
                  : 'You have not submitted any consultation inquiries yet. Need advice on crop disease, pest infestation, or soil health?'}
              </p>
              {!isExpertView && statusFilter === 'all' && (
                <button
                  type="button"
                  onClick={() => handleOpenRequestModal('')}
                  className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[#166534] text-white px-4 py-2 text-xs font-bold cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Request Your First Consultation</span>
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {consultations.map((c) => {
                const cId = c._id || c.id;
                const isUrgent = c.priority === 'Urgent' || c.priority === 'High';
                const isCompleted = c.status === 'Completed';

                return (
                  <div
                    key={cId}
                    className="group relative rounded-2xl border border-slate-200/80 bg-white hover:border-slate-300 transition-all p-4 sm:p-5 shadow-xs"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                      {/* Left: Info & Badges */}
                      <div className="min-w-0 flex-1 space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          {/* Reference ID */}
                          <span className="font-mono text-xs font-bold text-[#166534] bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-lg">
                            {c.referenceId}
                          </span>

                          {/* Status Badge */}
                          <Badge
                            variant={
                              c.status === 'Completed'
                                ? 'success'
                                : c.status === 'Accepted' || c.status === 'In Progress'
                                ? 'forest'
                                : c.status === 'Rejected' || c.status === 'Cancelled'
                                ? 'danger'
                                : 'warning'
                            }
                            size="sm"
                            className="font-bold text-[10px]"
                          >
                            {c.status}
                          </Badge>

                          {/* Priority */}
                          {isUrgent && (
                            <Badge variant="danger" size="sm" className="font-bold text-[10px]">
                              {c.priority} Priority
                            </Badge>
                          )}

                          {/* Category */}
                          <span className="text-[11px] font-semibold text-slate-500">
                            {c.category}
                          </span>

                          {/* Time */}
                          <span className="ml-auto text-[11px] text-slate-400">
                            {formatKolkataTime(c.createdAt)}
                          </span>
                        </div>

                        {/* Subject */}
                        <h3 className="text-sm sm:text-base font-bold text-slate-900 group-hover:text-[#166534] transition-colors">
                          {c.subject}
                        </h3>

                        {/* Description Preview */}
                        <p className="text-xs text-slate-600 line-clamp-2">
                          {c.description}
                        </p>

                        {/* Parcel & Crop tags */}
                        <div className="flex flex-wrap items-center gap-2 pt-1">
                          {c.farm?.name && (
                            <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-700">
                              <MapPin className="w-3 h-3 text-slate-400" />
                              <span>{c.farm.name}</span>
                            </span>
                          )}

                          {(c.crop?.name || c.crop?.cropName) && (
                            <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 text-[11px] font-semibold">
                              <Sprout className="w-3 h-3 text-emerald-600" />
                              <span>{c.crop.name || c.crop.cropName}</span>
                            </span>
                          )}

                          {c.expert?.name ? (
                            <span className="inline-flex items-center gap-1 rounded-md bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 text-[11px] font-semibold">
                              <ShieldCheck className="w-3 h-3 text-blue-600" />
                              <span>Specialist: {c.expert.name}</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 text-amber-700 px-2 py-0.5 text-[11px] font-semibold">
                              <Clock className="w-3 h-3 text-amber-500" />
                              <span>Awaiting Specialist Assignment</span>
                            </span>
                          )}

                          {isExpertView && c.farmer?.name && (
                            <span className="text-[11px] text-slate-500 font-medium">
                              Farmer: <strong className="text-slate-700">{c.farmer.name}</strong>
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Right: Action Button */}
                      <div className="shrink-0 sm:self-center">
                        <Link
                          to={
                            isExpertView
                              ? `/expert/consultations/${cId}`
                              : `/dashboard/consultation/${cId}`
                          }
                          className="flex items-center justify-center gap-1.5 rounded-xl bg-slate-100 hover:bg-[#166534] text-slate-700 hover:text-white px-4 py-2 text-xs font-bold transition-all shadow-2xs"
                        >
                          <span>{isCompleted ? 'View Advisory Log' : 'Open Workspace'}</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </Link>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* VIEW 2: Verified Agricultural Specialists Directory */}
      {activeTab === 'experts' && (
        <div className="space-y-4">
          {/* Expert Directory Filters */}
          <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mr-1">
                Specialization:
              </span>
              <select
                value={expertSpecialization}
                onChange={(e) => setExpertSpecialization(e.target.value)}
                className="rounded-xl border border-slate-200 bg-slate-50/80 px-3 py-1.5 text-xs font-semibold text-slate-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#166534]"
              >
                <option value="all">All Disciplines</option>
                <option value="Crop Protection">Crop Protection</option>
                <option value="Plant Pathology">Plant Pathology &amp; Diseases</option>
                <option value="Soil Health">Soil Health &amp; Fertility</option>
                <option value="Irrigation">Precision Irrigation</option>
                <option value="Horticulture">Horticulture</option>
              </select>
            </div>

            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search specialists, areas, crops..."
                value={expertSearch}
                onChange={(e) => setExpertSearch(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50/80 py-1.5 pl-8 pr-3 text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#166534]"
              />
            </div>
          </div>

          {/* Expert Cards Grid */}
          {expertsLoading ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-xs">
              <RefreshCw className="w-8 h-8 text-[#166534] animate-spin mx-auto mb-3" />
              <h3 className="text-sm font-bold text-slate-800">Loading specialist directory...</h3>
            </div>
          ) : experts.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center shadow-xs">
              <Users className="w-8 h-8 text-slate-400 mx-auto mb-2" />
              <h3 className="text-sm font-bold text-slate-800">No specialists found</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
                No verified agricultural experts match your filter.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {experts.map((exp) => {
                const profile = exp.expertProfile || {};
                return (
                  <div
                    key={exp.id || exp._id}
                    className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs flex flex-col justify-between space-y-4 hover:border-slate-300 transition-all"
                  >
                    <div className="space-y-3">
                      {/* Top: Avatar, Name, Verified Badge */}
                      <div className="flex items-start gap-3">
                        <div className="h-12 w-12 rounded-2xl bg-[#166534] text-white flex items-center justify-center font-extrabold text-sm ring-2 ring-emerald-100 shrink-0">
                          {exp.name
                            .split(' ')
                            .map((p) => p[0])
                            .join('')
                            .substring(0, 2)
                            .toUpperCase()}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <h3 className="text-sm font-bold text-slate-900 truncate">
                              {exp.name}
                            </h3>
                            {profile.isVerified && (
                              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" title="Verified Specialist" />
                            )}
                          </div>
                          <p className="text-xs font-semibold text-[#166534] mt-0.5">
                            {profile.specialization || 'Agronomy Specialist'}
                          </p>
                          <div className="flex items-center gap-1.5 mt-1 text-[11px] text-slate-400">
                            <MapPin className="w-3 h-3 text-slate-400" />
                            <span className="truncate">{exp.location || 'Regional Research Station'}</span>
                          </div>
                        </div>
                      </div>

                      {/* Qualifications & Experience */}
                      <div className="space-y-1.5 pt-2 border-t border-slate-100 text-xs text-slate-600">
                        {profile.qualification && (
                          <div className="flex items-center gap-2 text-[11px]">
                            <GraduationCap className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span className="truncate">{profile.qualification}</span>
                          </div>
                        )}
                        {profile.institution && (
                          <div className="flex items-center gap-2 text-[11px]">
                            <Building className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span className="truncate">{profile.institution}</span>
                          </div>
                        )}
                        {profile.experienceYears > 0 && (
                          <div className="flex items-center gap-2 text-[11px]">
                            <Award className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span>{profile.experienceYears} Years Verified Agronomic Experience</span>
                          </div>
                        )}
                      </div>

                      {/* Areas of Expertise Tags */}
                      {profile.areasOfExpertise?.length > 0 && (
                        <div className="pt-2">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                            Focus Areas:
                          </span>
                          <div className="flex flex-wrap gap-1">
                            {profile.areasOfExpertise.map((area) => (
                              <span
                                key={area}
                                className="text-[10px] font-semibold rounded-md bg-slate-100 text-slate-700 px-2 py-0.5"
                              >
                                {area}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Bottom: Availability Status & Request Button */}
                    <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <span className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                        </span>
                        <span className="text-[11px] font-bold text-emerald-700">
                          {profile.availabilityStatus || 'Available'}
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleOpenRequestModal(exp.id || exp._id)}
                        className="rounded-xl bg-[#166534] hover:bg-[#145A32] text-white px-3 py-1.5 text-xs font-bold transition-all shadow-2xs cursor-pointer"
                      >
                        Request Advisory
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* MODAL: Request New Consultation */}
      <Modal
        isOpen={isRequestModalOpen}
        onClose={() => setIsRequestModalOpen(false)}
        title="Submit Consultation Request"
        subtitle="Provide farm observations, select affected crop parcel, and link preliminary AI scans."
        maxWidth="max-w-2xl"
      >
        <form onSubmit={handleSubmitRequest} className="space-y-4">
          {loadingFormData && (
            <div className="flex items-center gap-2 p-2.5 rounded-xl bg-emerald-50 text-emerald-800 text-xs font-semibold">
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#166534]" />
              <span>Loading farm parcels and active crops...</span>
            </div>
          )}
          {/* Step 1: Farm and Crop Selectors */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Target Farm Parcel *
              </label>
              <select
                value={selectedFarmId}
                onChange={(e) => setSelectedFarmId(e.target.value)}
                required
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#166534]"
              >
                <option value="">Select Farm Parcel</option>
                {farms.map((f) => (
                  <option key={f._id || f.id} value={f._id || f.id}>
                    {f.name} ({f.acreage || f.totalAcreage || 0} Acres)
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Affected Crop *
              </label>
              <select
                value={selectedCropId}
                onChange={(e) => setSelectedCropId(e.target.value)}
                required
                disabled={!selectedFarmId}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#166534] disabled:opacity-50"
              >
                <option value="">Select Crop Parcel</option>
                {availableCrops.map((c) => (
                  <option key={c._id || c.id} value={c._id || c.id}>
                    {c.name || c.cropName} ({c.variety || 'Standard'}) &bull; {c.growthStage}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Optional: Link AI Disease Scan */}
          {scans.length > 0 && (
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center justify-between">
                <span>Link AI Disease Detection Scan (Optional)</span>
                <span className="text-[10px] text-slate-400">Pre-attaches AI diagnostic findings</span>
              </label>
              <select
                value={selectedScanId}
                onChange={(e) => setSelectedScanId(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#166534]"
              >
                <option value="">None (General Inquiry / Visual Observation)</option>
                {scans.map((s) => (
                  <option key={s._id || s.id} value={s._id || s.id}>
                    {s.status}: {s.possibleDisease || 'AI Scan'} ({formatKolkataTime(s.scanTimestamp || s.createdAt)})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Step 2: Subject & Category */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Consultation Topic / Category *
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                required
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#166534]"
              >
                {CATEGORY_LIST.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Urgency / Priority
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#166534]"
              >
                <option value="Low">Low - General seasonal planning</option>
                <option value="Medium">Medium - Routine pest/nutrient inquiry</option>
                <option value="High">High - Noticeable foliar symptoms or spreading pest</option>
                <option value="Urgent">Urgent - Acute crop loss risk or rapid wilting</option>
              </select>
            </div>
          </div>

          {/* Subject Line */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Inquiry Subject *
            </label>
            <input
              type="text"
              placeholder="e.g., Downward leaf curling and necrotic margins on chili canopy"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              required
              maxLength={160}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#166534]"
            />
          </div>

          {/* Detailed Problem Description */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Field Observations &amp; Problem Description *
            </label>
            <textarea
              rows={4}
              placeholder="Describe symptoms, when they first appeared, recent pesticide/fertilizer spray, and weather conditions..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
              maxLength={2500}
              className="w-full rounded-xl border border-slate-200 bg-white p-3 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#166534]"
            />
          </div>

          {/* Preferred Consultation Method */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Preferred Advisory Channel
              </label>
              <select
                value={preferredMethod}
                onChange={(e) => setPreferredMethod(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#166534]"
              >
                <option value="In-App Message">In-App Chat &amp; Structured Advisory</option>
                <option value="Audio Call">Audio Call with Agronomist</option>
                <option value="Video Call">Video Inspection Call</option>
                <option value="Field Visit">On-Site Field Visit Request</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Attach Crop Photo (Optional)
              </label>
              <label className="flex items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 hover:border-[#166534] bg-slate-50 py-2 px-3 text-xs font-semibold text-slate-600 cursor-pointer">
                <Upload className="w-4 h-4 text-slate-400" />
                <span>Upload Photograph</span>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handlePhotoUpload}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          {/* Attached photos list */}
          {attachments.length > 0 && (
            <div className="flex items-center gap-2 overflow-x-auto pt-1">
              {attachments.map((att, idx) => (
                <div key={idx} className="relative h-16 w-16 rounded-xl border overflow-hidden shrink-0">
                  <img src={att.url} alt="Attached crop foliage" className="h-full w-full object-cover" />
                  <button
                    type="button"
                    onClick={() => setAttachments(attachments.filter((_, i) => i !== idx))}
                    className="absolute top-1 right-1 rounded-full bg-slate-900/70 text-white p-0.5 hover:bg-rose-600"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Modal Footer Actions */}
          <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={() => setIsRequestModalOpen(false)}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer shadow-2xs"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-xl bg-[#166534] hover:bg-[#145A32] px-5 py-2 text-xs font-bold text-white transition-colors cursor-pointer shadow-xs disabled:opacity-50"
            >
              {submitting ? 'Submitting Request...' : 'Submit Consultation Request'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
