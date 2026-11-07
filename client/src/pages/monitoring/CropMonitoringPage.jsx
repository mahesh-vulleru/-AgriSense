import { useState, useEffect, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Droplets,
  CloudRain,
  Sprout,
  Plus,
  RefreshCw,
  Search,
  ChevronRight,
  Eye,
  Camera,
  ShieldAlert,
  Info,
  Clock,
} from 'lucide-react';
import monitoringService from '../../services/monitoringService.js';
import Button from '../../components/common/Button.jsx';
import Badge from '../../components/common/Badge.jsx';
import Modal from '../../components/common/Modal.jsx';
import { GROWTH_STAGES } from '../../constants/cropConstants.js';

const HEALTH_CONFIG = {
  Healthy: {
    variant: 'success',
    color: 'text-emerald-700 bg-emerald-50 border-emerald-200',
    dot: 'bg-emerald-500',
    description: 'Vigorous vegetative growth with optimal canopy index',
  },
  Normal: {
    variant: 'success',
    color: 'text-teal-700 bg-teal-50 border-teal-200',
    dot: 'bg-teal-500',
    description: 'Normal development within seasonal benchmarks',
  },
  'Needs Attention': {
    variant: 'warning',
    color: 'text-amber-700 bg-amber-50 border-amber-200',
    dot: 'bg-amber-500',
    description: 'Minor leaf chlorosis, water stress, or early pest traces',
  },
  'At Risk': {
    variant: 'danger',
    color: 'text-orange-700 bg-orange-50 border-orange-200',
    dot: 'bg-orange-500',
    description: 'Moderate foliar symptoms or unmanaged moisture stress',
  },
  Critical: {
    variant: 'danger',
    color: 'text-rose-700 bg-rose-50 border-rose-200',
    dot: 'bg-rose-500',
    description: 'Severe disease infection or acute physiological wilt',
  },
};

export default function CropMonitoringPage() {
  const [data, setData] = useState({
    summary: {
      totalMonitored: 0,
      healthyCrops: 0,
      attentionCrops: 0,
      criticalAlerts: 0,
      growthStages: {},
      farmsSummary: [],
    },
    crops: [],
    recentAssessments: [],
    alerts: [],
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFarm, setSelectedFarm] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedStage, setSelectedStage] = useState('all');

  // Modal 1: Record Assessment Modal
  const [showAssessmentModal, setShowAssessmentModal] = useState(false);
  const [submittingAssessment, setSubmittingAssessment] = useState(false);
  const [assessmentForm, setAssessmentForm] = useState({
    cropId: '',
    healthStatus: 'Healthy',
    growthStage: '',
    growthCondition: 'Optimal',
    leafCondition: 'Normal / Deep Green',
    pestSeverity: 'None',
    pestDetails: '',
    diseaseSeverity: 'None',
    diseaseCategory: 'None',
    diseaseDetails: '',
    soilMoisture: 'Adequate',
    waterStress: 'None',
    notes: '',
  });

  // Photo Upload State inside Assessment Modal
  const [photoPreview, setPhotoPreview] = useState(null);
  const [photoCaption, setPhotoCaption] = useState('');
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [uploadedPhotos, setUploadedPhotos] = useState([]);

  // Modal 2: Crop Inspection / Telemetry Timeline Modal
  const [inspectedCropId, setInspectedCropId] = useState(null);
  const [cropDetailData, setCropDetailData] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  // Fetch Dashboard Monitoring Telemetry
  const loadMonitoringData = useCallback(async () => {
    setRefreshing(true);
    setError(null);

    try {
      const res = await monitoringService.getDashboard();
      if (res.success) {
        setData({
          summary: res.summary || {
            totalMonitored: 0,
            healthyCrops: 0,
            attentionCrops: 0,
            criticalAlerts: 0,
            growthStages: {},
            farmsSummary: [],
          },
          crops: res.crops || [],
          recentAssessments: res.recentAssessments || [],
          alerts: res.alerts || [],
        });
      }
    } catch (err) {
      console.error('[MONITORING_FETCH_ERROR]', err);
      setError(err.response?.data?.message || err.message || 'Failed to load monitoring data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    let isSubscribed = true;
    async function init() {
      try {
        const res = await monitoringService.getDashboard();
        if (!isSubscribed) return;
        if (res.success) {
          setData({
            summary: res.summary || {
              totalMonitored: 0,
              healthyCrops: 0,
              attentionCrops: 0,
              criticalAlerts: 0,
              growthStages: {},
              farmsSummary: [],
            },
            crops: res.crops || [],
            recentAssessments: res.recentAssessments || [],
            alerts: res.alerts || [],
          });
        }
      } catch (err) {
        if (isSubscribed) {
          setError(err.response?.data?.message || err.message || 'Failed to load monitoring data');
        }
      } finally {
        if (isSubscribed) {
          setLoading(false);
        }
      }
    }
    init();
    return () => {
      isSubscribed = false;
    };
  }, []);

  // Handle Photo File Pick
  const handlePhotoSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert('Photo file size exceeds 5MB limit. Please choose a smaller image.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setPhotoPreview(reader.result);
    };
    reader.readAsDataURL(file);
  };

  // Upload photo to backend
  const handleUploadPhoto = async () => {
    if (!photoPreview) return;
    try {
      setUploadingPhoto(true);
      const res = await monitoringService.uploadPhoto({
        imageBase64: photoPreview,
        filename: 'crop_field_scouting.jpg',
        caption: photoCaption || 'Field observation photo',
        cropId: assessmentForm.cropId || null,
      });
      if (res.success && res.url) {
        setUploadedPhotos((prev) => [
          ...prev,
          { url: res.url, caption: photoCaption || 'Field observation photo' },
        ]);
        setPhotoPreview(null);
        setPhotoCaption('');
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to upload photo');
    } finally {
      setUploadingPhoto(false);
    }
  };

  // Open Assessment Modal for specific crop
  const openAssessmentForCrop = (crop) => {
    setAssessmentForm({
      cropId: crop?._id || crop?.id || '',
      healthStatus: crop?.healthStatus || 'Healthy',
      growthStage: crop?.growthStage || 'Vegetative Growth',
      growthCondition: 'Optimal',
      leafCondition: 'Normal / Deep Green',
      pestSeverity: 'None',
      pestDetails: '',
      diseaseSeverity: 'None',
      diseaseCategory: 'None',
      diseaseDetails: '',
      soilMoisture: 'Adequate',
      waterStress: 'None',
      notes: '',
    });
    setPhotoPreview(null);
    setPhotoCaption('');
    setUploadedPhotos([]);
    setShowAssessmentModal(true);
  };

  // Submit Health Assessment
  const handleAssessmentSubmit = async (e) => {
    e.preventDefault();
    if (!assessmentForm.cropId) {
      alert('Please select a target crop');
      return;
    }

    try {
      setSubmittingAssessment(true);
      const res = await monitoringService.recordAssessment({
        ...assessmentForm,
        photos: uploadedPhotos,
      });

      if (res.success) {
        setShowAssessmentModal(false);
        loadMonitoringData(false); // background refresh
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to record health assessment');
    } finally {
      setSubmittingAssessment(false);
    }
  };

  // Inspect Crop History & Telemetry
  const handleInspectCrop = async (cropId) => {
    setInspectedCropId(cropId);
    setLoadingDetails(true);
    try {
      const res = await monitoringService.getCropMonitoring(cropId);
      if (res.success) {
        setCropDetailData(res);
      }
    } catch (err) {
      console.error('[INSPECT_CROP_ERROR]', err);
    } finally {
      setLoadingDetails(false);
    }
  };

  // Filtered crops
  const filteredCrops = useMemo(() => {
    let list = [...data.crops];

    if (selectedFarm !== 'all') {
      list = list.filter((c) => (c.farm?._id || c.farm?.id || c.farm) === selectedFarm);
    }

    if (selectedStatus !== 'all') {
      list = list.filter((c) => (c.healthStatus || 'Healthy') === selectedStatus);
    }

    if (selectedStage !== 'all') {
      list = list.filter((c) => c.growthStage === selectedStage);
    }

    if (searchTerm.trim()) {
      const q = searchTerm.trim().toLowerCase();
      list = list.filter(
        (c) =>
          c.name?.toLowerCase().includes(q) ||
          c.variety?.toLowerCase().includes(q) ||
          c.farm?.name?.toLowerCase().includes(q)
      );
    }

    return list;
  }, [data.crops, selectedFarm, selectedStatus, selectedStage, searchTerm]);

  // Extract unique farms from crops
  const uniqueFarms = useMemo(() => {
    const map = new Map();
    data.crops.forEach((c) => {
      if (c.farm && c.farm._id) {
        map.set(c.farm._id, c.farm.name || 'Unnamed Farm');
      }
    });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [data.crops]);

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse p-4">
        <div className="h-8 bg-slate-200 rounded w-64" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 bg-slate-100 rounded-2xl" />
          ))}
        </div>
        <div className="h-72 bg-slate-100 rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      {/* 1. Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#DCFCE7] text-[#166534]">
              <Activity className="h-4 w-4" />
            </span>
            <span className="text-xs font-bold text-[#166534] uppercase tracking-wider">
              Precision Telemetry
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-[#17251B] mt-1">
            Crop Monitoring & Health Tracking
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time canopy inspection, phenological growth tracking, disease scouting, and agro-meteorological risks
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="outline"
            size="sm"
            icon={RefreshCw}
            onClick={() => loadMonitoringData(false)}
            disabled={refreshing}
            className={`bg-white text-xs ${refreshing ? 'animate-spin' : ''}`}
            title="Refresh telemetry"
          >
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </Button>

          <Button
            variant="primary"
            size="sm"
            icon={Plus}
            onClick={() => openAssessmentForCrop(data.crops[0] || null)}
            className="text-xs shadow-xs"
          >
            Record Assessment
          </Button>
        </div>
      </div>

      {/* 2. Top Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Monitored Crops */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Monitored Crops</span>
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-50 text-[#166534]">
              <Sprout className="h-4 w-4" />
            </span>
          </div>
          <div className="mt-2 text-2xl font-black text-[#17251B]">
            {data.summary.totalMonitored}
          </div>
          <p className="mt-1 text-[11px] text-slate-400">
            Active parcels under observational tracking
          </p>
        </div>

        {/* KPI 2: Healthy Crops */}
        <div className="rounded-2xl border border-emerald-200/60 bg-white p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-emerald-800">Healthy & Normal</span>
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#DCFCE7] text-[#166534]">
              <CheckCircle2 className="h-4 w-4" />
            </span>
          </div>
          <div className="mt-2 text-2xl font-black text-[#166534]">
            {data.summary.healthyCrops}
          </div>
          <p className="mt-1 text-[11px] text-emerald-600 font-medium">
            Optimal vegetative development & low risk
          </p>
        </div>

        {/* KPI 3: Crops Needing Attention */}
        <div className="rounded-2xl border border-amber-200/80 bg-white p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-amber-800">Needs Attention</span>
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-50 text-amber-700">
              <AlertTriangle className="h-4 w-4" />
            </span>
          </div>
          <div className="mt-2 text-2xl font-black text-amber-700">
            {data.summary.attentionCrops}
          </div>
          <p className="mt-1 text-[11px] text-amber-700 font-medium">
            Minor moisture stress or pest traces observed
          </p>
        </div>

        {/* KPI 4: Critical Alerts */}
        <div className="rounded-2xl border border-rose-200/80 bg-white p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-rose-800">Critical Alerts</span>
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-rose-50 text-rose-600">
              <ShieldAlert className="h-4 w-4" />
            </span>
          </div>
          <div className="mt-2 text-2xl font-black text-rose-600">
            {data.summary.criticalAlerts}
          </div>
          <p className="mt-1 text-[11px] text-rose-600 font-medium">
            Immediate agronomic mitigation advised
          </p>
        </div>
      </div>

      {/* Error Alert if any */}
      {error && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50/80 p-4 text-xs text-rose-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
          <button
            type="button"
            onClick={() => loadMonitoringData()}
            className="text-rose-700 underline font-semibold hover:text-rose-900 cursor-pointer"
          >
            Retry
          </button>
        </div>
      )}

      {/* 3. Alerts Banner if critical or attention crops exist */}
      {data.alerts && data.alerts.length > 0 && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-4 shadow-2xs space-y-2">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
            <h3 className="text-xs font-bold text-amber-900 uppercase tracking-wide">
              Active Agronomic Interventions Recommended ({data.alerts.length})
            </h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 pt-1">
            {data.alerts.map((alert) => (
              <div
                key={alert.cropId}
                className="flex items-center justify-between bg-white/90 border border-amber-200/60 rounded-xl px-3 py-2 text-xs"
              >
                <div className="min-w-0 pr-2">
                  <p className="font-bold text-[#17251B] truncate">{alert.cropName}</p>
                  <p className="text-[11px] text-slate-500 truncate">{alert.farmName} • {alert.growthStage}</p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <Badge
                    size="sm"
                    variant={alert.healthStatus === 'Critical' ? 'danger' : 'warning'}
                    className="text-[10px] font-bold"
                  >
                    {alert.healthStatus}
                  </Badge>
                  <button
                    type="button"
                    onClick={() => handleInspectCrop(alert.cropId)}
                    className="text-[#166534] hover:underline text-[11px] font-bold"
                  >
                    Inspect
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 4. Telemetry Disclaimer Pill */}
      <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-100/80 border border-slate-200 text-slate-600 text-[11px]">
        <Info className="h-4 w-4 text-slate-500 shrink-0" />
        <span>
          <strong>Agronomic Telemetry Notice:</strong> Crop observations are currently recorded via verified manual field scouting and local agro-meteorology. IoT hardware sensor telemetry is marked <em>&quot;Not Connected&quot;</em> until gateway node linking.
        </span>
      </div>

      {/* 5. Filter Toolbar */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-3.5 shadow-2xs flex flex-wrap items-center justify-between gap-3">
        {/* Search Input */}
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search crops, variety, farm..."
            className="w-full rounded-xl border border-slate-200 bg-[#F7F9F5] py-1.5 pl-9 pr-3 text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#166534]"
          />
        </div>

        {/* Filter Dropdowns */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Farm Filter */}
          <select
            value={selectedFarm}
            onChange={(e) => setSelectedFarm(e.target.value)}
            className="rounded-xl border border-slate-200 bg-[#F7F9F5] px-3 py-1.5 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#166534] cursor-pointer"
          >
            <option value="all">All Farms ({uniqueFarms.length})</option>
            {uniqueFarms.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
          </select>

          {/* Health Status Filter */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="rounded-xl border border-slate-200 bg-[#F7F9F5] px-3 py-1.5 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#166534] cursor-pointer"
          >
            <option value="all">All Health Statuses</option>
            <option value="Healthy">Healthy</option>
            <option value="Normal">Normal</option>
            <option value="Needs Attention">Needs Attention</option>
            <option value="At Risk">At Risk</option>
            <option value="Critical">Critical</option>
          </select>

          {/* Growth Stage Filter */}
          <select
            value={selectedStage}
            onChange={(e) => setSelectedStage(e.target.value)}
            className="rounded-xl border border-slate-200 bg-[#F7F9F5] px-3 py-1.5 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#166534] cursor-pointer"
          >
            <option value="all">All Growth Stages</option>
            {GROWTH_STAGES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* 6. Crop Cards Grid */}
      {filteredCrops.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-300 bg-[#F7F9F5] p-12 text-center max-w-xl mx-auto space-y-3">
          <Sprout className="h-10 w-10 text-slate-400 mx-auto" />
          <h3 className="text-base font-bold text-slate-800">No Monitored Crops Found</h3>
          <p className="text-xs text-slate-500">
            {searchTerm || selectedFarm !== 'all' || selectedStatus !== 'all'
              ? 'No crops match your current filter parameters. Try clearing filters.'
              : 'Register your first crop parcel to begin precision monitoring and health tracking.'}
          </p>
          <Link to="/dashboard/crops/new">
            <Button variant="primary" size="sm" icon={Plus} className="text-xs mt-2">
              Add New Crop
            </Button>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredCrops.map((crop) => {
            const cropId = crop._id || crop.id;
            const health = crop.healthStatus || 'Healthy';
            const cfg = HEALTH_CONFIG[health] || HEALTH_CONFIG.Healthy;

            return (
              <div
                key={cropId}
                className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between space-y-4"
              >
                {/* Card Top: Name & Health Badge */}
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className={`inline-block h-2 w-2 rounded-full ${cfg.dot}`} />
                        <h3 className="text-sm font-bold text-[#17251B] truncate">
                          {crop.name}
                        </h3>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5 truncate">
                        {crop.variety ? `${crop.variety} • ` : ''}
                        {crop.farm?.name || 'Assigned Farm'}
                      </p>
                    </div>

                    <Badge
                      size="sm"
                      variant={cfg.variant}
                      className="text-[11px] font-bold shrink-0"
                    >
                      {health}
                    </Badge>
                  </div>

                  {/* Growth Stage Badge & Acreage */}
                  <div className="mt-3 flex items-center justify-between text-xs py-1.5 px-2.5 rounded-xl bg-slate-50 border border-slate-100">
                    <span className="font-semibold text-slate-600 truncate">
                      Stage: <strong className="text-[#166534]">{crop.growthStage || 'Vegetative'}</strong>
                    </span>
                    <span className="text-slate-500 shrink-0">
                      {crop.cultivatedArea} acres
                    </span>
                  </div>

                  {/* Health Telemetry Snapshot */}
                  <div className="mt-3 space-y-2 text-xs">
                    <div className="flex items-center justify-between text-slate-600">
                      <span className="flex items-center gap-1.5 text-slate-500">
                        <Activity className="h-3.5 w-3.5 text-emerald-600" />
                        Crop Health State:
                      </span>
                      <span className="font-semibold text-slate-800">{health}</span>
                    </div>

                    <div className="flex items-center justify-between text-slate-600">
                      <span className="flex items-center gap-1.5 text-slate-500">
                        <Droplets className="h-3.5 w-3.5 text-sky-600" />
                        Irrigation:
                      </span>
                      <span className="font-semibold text-slate-800">
                        {crop.irrigationMethod || crop.farm?.irrigationType || 'Drip'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-slate-600">
                      <span className="flex items-center gap-1.5 text-slate-500">
                        <Clock className="h-3.5 w-3.5 text-slate-400" />
                        Last Field Scout:
                      </span>
                      <span className="font-medium text-slate-500">
                        {crop.lastAssessmentDate
                          ? new Date(crop.lastAssessmentDate).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                            })
                          : 'Not logged yet'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Card Actions */}
                <div className="pt-3 border-t border-slate-100 flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    icon={Eye}
                    onClick={() => handleInspectCrop(cropId)}
                    className="flex-1 justify-center !py-1.5 text-xs font-semibold bg-white hover:border-[#166534] hover:text-[#166534]"
                  >
                    Telemetry & History
                  </Button>

                  <Button
                    type="button"
                    variant="primary"
                    size="sm"
                    onClick={() => openAssessmentForCrop(crop)}
                    className="text-xs !py-1.5 px-3 bg-[#166534]"
                    title="Log Field Assessment"
                  >
                    Log Inspection
                  </Button>

                  <Link to={`/dashboard/crops/${cropId}`}>
                    <Button
                      variant="outline"
                      size="sm"
                      icon={ChevronRight}
                      className="text-xs bg-white text-slate-500 hover:text-slate-800"
                      title="View Crop Profile"
                    />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 7. MODAL: Record Field Assessment */}
      <Modal
        isOpen={showAssessmentModal}
        onClose={() => setShowAssessmentModal(false)}
        title="Record Crop Health Assessment"
        subtitle="Log visual field observations, canopy conditions, water stress, and crop scouting photos"
        maxWidth="max-w-xl"
      >
        <form onSubmit={handleAssessmentSubmit} className="space-y-4">
          {/* Target Crop Selection */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Select Crop Parcel <span className="text-rose-500">*</span>
            </label>
            <select
              value={assessmentForm.cropId}
              onChange={(e) => {
                const c = data.crops.find((item) => (item._id || item.id) === e.target.value);
                setAssessmentForm((prev) => ({
                  ...prev,
                  cropId: e.target.value,
                  growthStage: c?.growthStage || prev.growthStage,
                  healthStatus: c?.healthStatus || prev.healthStatus,
                }));
              }}
              className="w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#166534]"
              required
            >
              <option value="">-- Choose Crop --</option>
              {data.crops.map((c) => (
                <option key={c._id || c.id} value={c._id || c.id}>
                  {c.name} ({c.variety || 'Standard'}) - {c.farm?.name || 'Farm'}
                </option>
              ))}
            </select>
          </div>

          {/* Health Status & Phenological Stage */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Observed Health Status <span className="text-rose-500">*</span>
              </label>
              <select
                value={assessmentForm.healthStatus}
                onChange={(e) => setAssessmentForm((prev) => ({ ...prev, healthStatus: e.target.value }))}
                className="w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#166534]"
                required
              >
                <option value="Healthy">Healthy (Optimal Growth)</option>
                <option value="Normal">Normal (Average Development)</option>
                <option value="Needs Attention">Needs Attention (Minor Stress)</option>
                <option value="At Risk">At Risk (Moderate Symptoms)</option>
                <option value="Critical">Critical (Severe Infection / Wilt)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Phenological Growth Stage
              </label>
              <select
                value={assessmentForm.growthStage}
                onChange={(e) => setAssessmentForm((prev) => ({ ...prev, growthStage: e.target.value }))}
                className="w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#166534]"
              >
                {GROWTH_STAGES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Leaf Condition & Growth Condition */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Foliage / Leaf Condition
              </label>
              <select
                value={assessmentForm.leafCondition}
                onChange={(e) => setAssessmentForm((prev) => ({ ...prev, leafCondition: e.target.value }))}
                className="w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#166534]"
              >
                <option value="Normal / Deep Green">Normal / Deep Green</option>
                <option value="Pale Green / Chlorosis">Pale Green / Chlorosis</option>
                <option value="Yellowing">Yellowing</option>
                <option value="Wilting">Wilting</option>
                <option value="Spots / Lesions">Spots / Lesions</option>
                <option value="Curling">Curling</option>
                <option value="Browning / Scorched">Browning / Scorched</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Growth Uniformity
              </label>
              <select
                value={assessmentForm.growthCondition}
                onChange={(e) => setAssessmentForm((prev) => ({ ...prev, growthCondition: e.target.value }))}
                className="w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#166534]"
              >
                <option value="Optimal">Optimal Uniform Growth</option>
                <option value="Normal">Normal Pace</option>
                <option value="Stunted">Stunted Development</option>
                <option value="Slow">Slow / Delayed</option>
                <option value="Irregular">Irregular Stand</option>
              </select>
            </div>
          </div>

          {/* Pest Severity & Disease Symptoms */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Pest Infestation Level
              </label>
              <select
                value={assessmentForm.pestSeverity}
                onChange={(e) => setAssessmentForm((prev) => ({ ...prev, pestSeverity: e.target.value }))}
                className="w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#166534]"
              >
                <option value="None">None (Pest Free)</option>
                <option value="Minor">Minor (&lt;5% canopy)</option>
                <option value="Moderate">Moderate (5-20% canopy)</option>
                <option value="Severe">Severe (&gt;20% damage)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Disease Symptoms
              </label>
              <select
                value={assessmentForm.diseaseCategory}
                onChange={(e) => setAssessmentForm((prev) => ({ ...prev, diseaseCategory: e.target.value }))}
                className="w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#166534]"
              >
                <option value="None">None Observed</option>
                <option value="Fungal">Fungal (Rust, Blight, Mildew)</option>
                <option value="Bacterial">Bacterial Spot / Canker</option>
                <option value="Viral">Viral Mosaic / Stunt</option>
                <option value="Nutrient Deficiency">Nutrient Deficiency (N/P/K/Zn)</option>
                <option value="Unknown">Unknown Symptom</option>
              </select>
            </div>
          </div>

          {/* Water Stress & Soil Moisture */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Topsoil Moisture Level
              </label>
              <select
                value={assessmentForm.soilMoisture}
                onChange={(e) => setAssessmentForm((prev) => ({ ...prev, soilMoisture: e.target.value }))}
                className="w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#166534]"
              >
                <option value="Dry">Dry (&lt;20% field capacity)</option>
                <option value="Adequate">Adequate (Optimal moisture)</option>
                <option value="Moist">Moist (High saturation)</option>
                <option value="Saturated / Waterlogged">Saturated / Waterlogged</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Plant Water Stress Level
              </label>
              <select
                value={assessmentForm.waterStress}
                onChange={(e) => setAssessmentForm((prev) => ({ ...prev, waterStress: e.target.value }))}
                className="w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#166534]"
              >
                <option value="None">None (Turgid foliage)</option>
                <option value="Low">Low Stress</option>
                <option value="Moderate">Moderate Wilting (Mid-day)</option>
                <option value="High">High Stress (Persistent wilt)</option>
                <option value="Severe">Severe Desiccation</option>
              </select>
            </div>
          </div>

          {/* Photo Upload Section */}
          <div className="border border-slate-200 rounded-xl p-3 bg-slate-50/60 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Camera className="h-4 w-4 text-[#166534]" />
                Scouting Photo Attachment
              </span>
              <span className="text-[10px] text-slate-400">Max 5MB (JPG, PNG, WEBP)</span>
            </div>

            {/* Uploaded Photos Preview List */}
            {uploadedPhotos.length > 0 && (
              <div className="flex items-center gap-2 overflow-x-auto py-1">
                {uploadedPhotos.map((p, idx) => (
                  <div key={idx} className="relative h-14 w-14 rounded-lg overflow-hidden border border-slate-200 shrink-0">
                    <img src={p.url} alt="Attached crop scout" className="h-full w-full object-cover" />
                  </div>
                ))}
              </div>
            )}

            {/* Photo Picker and Upload Action */}
            <div className="flex items-center gap-2">
              <input
                type="file"
                accept="image/png, image/jpeg, image/webp"
                onChange={handlePhotoSelect}
                className="text-xs text-slate-600 file:mr-2 file:py-1 file:px-2.5 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-[#DCFCE7] file:text-[#166534] hover:file:bg-[#bbf7d0] cursor-pointer"
              />

              {photoPreview && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleUploadPhoto}
                  disabled={uploadingPhoto}
                  className="text-xs bg-white text-[#166534] shrink-0"
                >
                  {uploadingPhoto ? 'Uploading...' : 'Confirm Upload'}
                </Button>
              )}
            </div>

            {photoPreview && (
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="text"
                  value={photoCaption}
                  onChange={(e) => setPhotoCaption(e.target.value)}
                  placeholder="Optional caption (e.g. Under-leaf aphid colonies)"
                  className="flex-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs text-slate-800"
                />
              </div>
            )}
          </div>

          {/* Field Notes & Advisory Recommendations */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Field Observations & Scouting Notes
            </label>
            <textarea
              value={assessmentForm.notes}
              onChange={(e) => setAssessmentForm((prev) => ({ ...prev, notes: e.target.value }))}
              placeholder="e.g. 70% canopy cover, noticed yellowing on lower leaves, soil moisture slightly depleted..."
              rows={2}
              className="w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#166534]"
            />
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowAssessmentModal(false)}
              disabled={submittingAssessment}
              className="bg-white text-xs"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={submittingAssessment}
              className="text-xs shadow-xs"
            >
              {submittingAssessment ? 'Recording...' : 'Save Health Assessment'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* 8. MODAL: Crop Telemetry & Assessment Timeline Inspection */}
      <Modal
        isOpen={Boolean(inspectedCropId)}
        onClose={() => {
          setInspectedCropId(null);
          setCropDetailData(null);
        }}
        title="Crop Health Telemetry & Inspection History"
        subtitle={
          cropDetailData?.crop
            ? `${cropDetailData.crop.name} (${cropDetailData.crop.variety || 'Standard'}) - ${cropDetailData.crop.farm?.name || 'Farm'}`
            : 'Loading crop assessment history...'
        }
        maxWidth="max-w-2xl"
      >
        {loadingDetails ? (
          <div className="space-y-4 animate-pulse p-4">
            <div className="h-6 bg-slate-200 rounded w-48" />
            <div className="h-20 bg-slate-100 rounded-xl" />
            <div className="h-32 bg-slate-100 rounded-xl" />
          </div>
        ) : !cropDetailData ? (
          <p className="text-xs text-slate-500 text-center py-6">
            Unable to retrieve crop details.
          </p>
        ) : (
          <div className="space-y-4 text-xs">
            {/* Quick Status Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 py-2 px-3 bg-[#F7F9F5] border border-slate-200/80 rounded-xl">
              <div>
                <span className="text-[10px] text-slate-400 font-medium">Current Stage</span>
                <p className="font-bold text-[#166534]">{cropDetailData.crop.growthStage}</p>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 font-medium">Health Status</span>
                <p className="font-bold text-slate-800">{cropDetailData.crop.healthStatus || 'Healthy'}</p>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 font-medium">Total Inspections</span>
                <p className="font-bold text-slate-800">{cropDetailData.totalAssessments || 0}</p>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 font-medium">Area</span>
                <p className="font-bold text-slate-800">{cropDetailData.crop.cultivatedArea} ac</p>
              </div>
            </div>

            {/* Weather-Driven Risks */}
            {cropDetailData.weatherRisks?.available && cropDetailData.weatherRisks?.risks?.length > 0 && (
              <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-3 space-y-2">
                <div className="flex items-center gap-1.5 text-amber-800 font-bold">
                  <CloudRain className="h-4 w-4" />
                  <span>Weather-Driven Environmental Risks</span>
                </div>
                <div className="space-y-1.5">
                  {cropDetailData.weatherRisks.risks.map((r, idx) => (
                    <div key={idx} className="bg-white/90 border border-amber-200/60 rounded-lg p-2">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-800">{r.type}</span>
                        <Badge
                          size="sm"
                          variant={r.severity === 'High' ? 'danger' : 'warning'}
                          className="text-[10px]"
                        >
                          {r.severity} Risk
                        </Badge>
                      </div>
                      <p className="text-[11px] text-slate-600 mt-0.5">{r.description}</p>
                      <p className="text-[11px] text-[#166534] font-medium mt-1">
                        <strong>Advisory:</strong> {r.recommendation}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Timeline of Recorded Health Assessments */}
            <div>
              <h4 className="font-bold text-[#17251B] mb-2 flex items-center justify-between">
                <span>Assessment Log Timeline</span>
                <span className="text-[11px] font-normal text-slate-400">Chronological scouting records</span>
              </h4>

              {cropDetailData.assessments?.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-200 p-6 text-center text-slate-400">
                  No health assessments recorded for this crop parcel yet. Click &quot;Log Inspection&quot; to create the first record.
                </div>
              ) : (
                <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                  {cropDetailData.assessments.map((a) => {
                    const cfg = HEALTH_CONFIG[a.healthStatus] || HEALTH_CONFIG.Healthy;
                    return (
                      <div
                        key={a._id || a.id}
                        className="rounded-xl border border-slate-200/80 bg-white p-3 space-y-2 shadow-2xs"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className={`inline-block h-2 w-2 rounded-full ${cfg.dot}`} />
                            <span className="font-bold text-slate-800">{a.healthStatus}</span>
                            <span className="text-slate-400">•</span>
                            <span className="text-slate-600 font-medium">{a.growthStage}</span>
                          </div>
                          <span className="text-[11px] text-slate-400">
                            {new Date(a.assessmentDate).toLocaleString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>

                        {/* Parameter Grid */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 text-[11px] bg-slate-50 p-2 rounded-lg">
                          <div>
                            <span className="text-slate-400">Leaf Condition:</span>
                            <p className="font-semibold text-slate-700 truncate">{a.leafCondition}</p>
                          </div>
                          <div>
                            <span className="text-slate-400">Pest Infestation:</span>
                            <p className="font-semibold text-slate-700">{a.pestObservations?.severity || 'None'}</p>
                          </div>
                          <div>
                            <span className="text-slate-400">Disease Category:</span>
                            <p className="font-semibold text-slate-700">{a.diseaseSymptoms?.category || 'None'}</p>
                          </div>
                          <div>
                            <span className="text-slate-400">Soil Moisture:</span>
                            <p className="font-semibold text-slate-700">{a.soilMoisture || 'Adequate'}</p>
                          </div>
                        </div>

                        {/* Notes */}
                        {a.notes && (
                          <p className="text-[11px] text-slate-600 bg-emerald-50/40 p-2 rounded-lg border border-emerald-900/10">
                            <strong>Scouting Notes:</strong> {a.notes}
                          </p>
                        )}

                        {/* Photos */}
                        {a.photos && a.photos.length > 0 && (
                          <div className="flex items-center gap-2 pt-1">
                            {a.photos.map((photo, pIdx) => (
                              <a
                                key={pIdx}
                                href={photo.url}
                                target="_blank"
                                rel="noreferrer"
                                className="group relative h-14 w-14 rounded-lg overflow-hidden border border-slate-200 shrink-0"
                                title={photo.caption || 'Scouting Photo'}
                              >
                                <img
                                  src={photo.url}
                                  alt="Crop field inspection photo"
                                  className="h-full w-full object-cover group-hover:scale-105 transition-transform"
                                />
                              </a>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Modal Bottom Close */}
            <div className="flex items-center justify-end pt-2 border-t border-slate-100">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setInspectedCropId(null);
                  setCropDetailData(null);
                }}
                className="bg-white text-xs"
              >
                Close Inspection
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
