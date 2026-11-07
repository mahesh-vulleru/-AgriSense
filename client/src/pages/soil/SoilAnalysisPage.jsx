import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Layers,
  FlaskConical,
  FileText,
  Plus,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  Droplets,
  Thermometer,
  Calendar,
  MapPin,
  UploadCloud,
  Trash2,
  Edit,
  Eye,
  Info,
  Sparkles,
  Search,
  ShieldAlert,
  FileCheck,
  Compass,
  Activity,
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import soilService from '../../services/soilService.js';
import farmService from '../../services/farmService.js';
import Button from '../../components/common/Button.jsx';
import Badge from '../../components/common/Badge.jsx';
import Modal from '../../components/common/Modal.jsx';
import {
  SOIL_TYPES,
  TEST_METHODS,
  CROP_OPTIONS,
  GROWTH_STAGES,
  SOIL_HEALTH_CONFIG,
} from '../../constants/soilConstants.js';

export default function SoilAnalysisPage() {
  // Main data states
  const [dashboardData, setDashboardData] = useState({
    summary: {
      totalFarms: 0,
      totalFarmsWithRecords: 0,
      totalAnalysesRecorded: 0,
      latestAnalysisDate: null,
      healthDistribution: {},
      averages: {},
    },
    latestSoilAnalysis: null,
    farmSoilSummaries: [],
  });
  const [farms, setFarms] = useState([]);
  const [records, setRecords] = useState([]);
  const [farmHistory, setFarmHistory] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [actionSuccess, setActionSuccess] = useState(null);

  // Filter toolbar states
  const [selectedFarmFilter, setSelectedFarmFilter] = useState('all');
  const [selectedMethodFilter, setSelectedMethodFilter] = useState('all');
  const [selectedHealthFilter, setSelectedHealthFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Interactive Fertilizer Guidance state
  const [guidanceCrop, setGuidanceCrop] = useState('General');
  const [guidanceStage, setGuidanceStage] = useState('Sowing / Planting');
  const [guidanceAcreage, setGuidanceAcreage] = useState(1);
  const [customGuidance, setCustomGuidance] = useState(null);
  const [calculatingGuidance, setCalculatingGuidance] = useState(false);

  // Modals state
  const [showTestModal, setShowTestModal] = useState(false);
  const [editingRecordId, setEditingRecordId] = useState(null);
  const [submittingTest, setSubmittingTest] = useState(false);
  const [testFormError, setTestFormError] = useState(null);

  const [testForm, setTestForm] = useState({
    farmId: '',
    sampleId: '',
    sampleDate: new Date().toISOString().split('T')[0],
    labName: 'Krishi Vigyan Kendra Soil Testing Lab',
    testMethod: 'Certified Laboratory',
    soilType: 'Loamy',
    pH: '',
    pHEstimated: false,
    nitrogen: '',
    nitrogenEstimated: false,
    phosphorus: '',
    phosphorusEstimated: false,
    potassium: '',
    potassiumEstimated: false,
    organicCarbon: '',
    organicCarbonEstimated: false,
    electricalConductivity: '',
    electricalConductivityEstimated: false,
    soilMoisture: '',
    soilTemperature: '',
    notes: '',
    labReportUrl: '',
    labReportName: '',
    labReportMime: '',
    labReportSize: 0,
  });

  const [uploadingReport, setUploadingReport] = useState(false);
  const [reportFilePreview, setReportFilePreview] = useState(null);

  // Detail & Delete modals
  const [activeDetailRecord, setActiveDetailRecord] = useState(null);
  const [recordToDelete, setRecordToDelete] = useState(null);
  const [deletingRecord, setDeletingRecord] = useState(false);

  // Fetch initial data
  const loadDashboardData = useCallback(async (isSilent = false) => {
    if (isSilent) setRefreshing(true);
    setError(null);

    try {
      const [dashRes, farmsRes, recordsRes] = await Promise.all([
        soilService.getDashboard(),
        farmService.getFarms(),
        soilService.getSoilAnalyses({ limit: 100 }),
      ]);

      if (dashRes?.success) {
        setDashboardData(dashRes);
      }
      if (farmsRes?.success && Array.isArray(farmsRes.farms)) {
        setFarms(farmsRes.farms);
      } else if (Array.isArray(farmsRes?.data)) {
        setFarms(farmsRes.data);
      }
      if (recordsRes?.success && Array.isArray(recordsRes.records)) {
        setRecords(recordsRes.records);
      }
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || 'Failed to load soil analysis data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    let isSubscribed = true;
    const fetchInitialData = async () => {
      try {
        const [dashRes, farmsRes, recordsRes] = await Promise.all([
          soilService.getDashboard(),
          farmService.getFarms(),
          soilService.getSoilAnalyses({ limit: 100 }),
        ]);

        if (isSubscribed) {
          if (dashRes?.success) setDashboardData(dashRes);
          if (farmsRes?.success && Array.isArray(farmsRes.farms)) {
            setFarms(farmsRes.farms);
          } else if (Array.isArray(farmsRes?.data)) {
            setFarms(farmsRes.data);
          }
          if (recordsRes?.success && Array.isArray(recordsRes.records)) {
            setRecords(recordsRes.records);
          }
        }
      } catch (err) {
        if (isSubscribed) {
          setError(err?.response?.data?.message || err?.message || 'Failed to load soil analysis data');
        }
      } finally {
        if (isSubscribed) {
          setLoading(false);
        }
      }
    };

    fetchInitialData();
    return () => {
      isSubscribed = false;
    };
  }, []);

  // Handler for Farm selection changes (updates filter, guidance acreage and default crop)
  const handleFarmFilterChange = (fId) => {
    setSelectedFarmFilter(fId);
    if (fId !== 'all') {
      const farm = farms.find((f) => f._id === fId);
      if (farm) {
        setGuidanceAcreage(farm.acreage || 1);
        if (farm.mainCrops && farm.mainCrops.length > 0) {
          const matchedCrop = CROP_OPTIONS.find((c) =>
            farm.mainCrops.some((fc) => fc.toLowerCase().includes(c.toLowerCase()))
          );
          if (matchedCrop) setGuidanceCrop(matchedCrop);
        }
      }
    }
  };

  // Load history when a specific farm is selected
  useEffect(() => {
    let isSubscribed = true;
    const loadHistory = async () => {
      if (selectedFarmFilter && selectedFarmFilter !== 'all') {
        try {
          const res = await soilService.getFarmSoilHistory(selectedFarmFilter);
          if (isSubscribed && res?.success) {
            setFarmHistory(res);
          }
        } catch {
          if (isSubscribed) setFarmHistory(null);
        }
      } else {
        if (isSubscribed) setFarmHistory(null);
      }
    };
    loadHistory();
    return () => {
      isSubscribed = false;
    };
  }, [selectedFarmFilter]);

  // Filtered records list
  const filteredRecords = useMemo(() => {
    return records.filter((rec) => {
      const farmId = rec.farm?._id || rec.farm;
      if (selectedFarmFilter !== 'all' && farmId !== selectedFarmFilter) return false;
      if (selectedMethodFilter !== 'all' && rec.testMethod !== selectedMethodFilter) return false;
      if (selectedHealthFilter !== 'all' && rec.overallHealthStatus !== selectedHealthFilter) return false;

      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const sampleMatch = rec.sampleId?.toLowerCase().includes(term);
        const labMatch = rec.labName?.toLowerCase().includes(term);
        const farmName = rec.farm?.name?.toLowerCase().includes(term);
        const soilTypeMatch = rec.soilType?.toLowerCase().includes(term);
        return sampleMatch || labMatch || farmName || soilTypeMatch;
      }
      return true;
    });
  }, [records, selectedFarmFilter, selectedMethodFilter, selectedHealthFilter, searchTerm]);

  // Target record for detailed parameters grid (either latest for selected farm or overall latest)
  const currentDisplayedAnalysis = useMemo(() => {
    if (selectedFarmFilter !== 'all') {
      const farmTests = records.filter((r) => (r.farm?._id || r.farm) === selectedFarmFilter);
      if (farmTests.length > 0) return farmTests[0];
    }
    return dashboardData.latestSoilAnalysis;
  }, [selectedFarmFilter, records, dashboardData.latestSoilAnalysis]);

  // Calculate customized fertilizer guidance
  const handleCalculateGuidance = async () => {
    if (!currentDisplayedAnalysis?._id) return;
    setCalculatingGuidance(true);
    try {
      const res = await soilService.getFertilizerGuidance({
        soilAnalysisId: currentDisplayedAnalysis._id,
        cropName: guidanceCrop,
        cropStage: guidanceStage,
        acreage: Number(guidanceAcreage) || 1,
      });
      if (res?.success) {
        setCustomGuidance(res.guidance);
      }
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to calculate fertilizer guidance');
    } finally {
      setCalculatingGuidance(false);
    }
  };

  // Open "Record Soil Test" modal
  const handleOpenCreateModal = () => {
    setEditingRecordId(null);
    setTestFormError(null);
    setReportFilePreview(null);
    const defaultFarmId = selectedFarmFilter !== 'all' ? selectedFarmFilter : farms[0]?._id || '';
    const defaultFarm = farms.find((f) => f._id === defaultFarmId);

    setTestForm({
      farmId: defaultFarmId,
      sampleId: `SMP-${defaultFarm?.name?.substring(0, 3)?.toUpperCase() || 'FLD'}-${Date.now().toString().slice(-4)}`,
      sampleDate: new Date().toISOString().split('T')[0],
      labName: 'Krishi Vigyan Kendra Soil Testing Lab',
      testMethod: 'Certified Laboratory',
      soilType: defaultFarm?.soilType || 'Loamy',
      pH: '',
      pHEstimated: false,
      nitrogen: '',
      nitrogenEstimated: false,
      phosphorus: '',
      phosphorusEstimated: false,
      potassium: '',
      potassiumEstimated: false,
      organicCarbon: '',
      organicCarbonEstimated: false,
      electricalConductivity: '',
      electricalConductivityEstimated: false,
      soilMoisture: '',
      soilTemperature: '',
      notes: '',
      labReportUrl: '',
      labReportName: '',
      labReportMime: '',
      labReportSize: 0,
    });
    setShowTestModal(true);
  };

  // Open "Edit Soil Test" modal
  const handleOpenEditModal = (rec) => {
    setEditingRecordId(rec._id);
    setTestFormError(null);
    setReportFilePreview(rec.labReport?.url || null);

    setTestForm({
      farmId: rec.farm?._id || rec.farm,
      sampleId: rec.sampleId || '',
      sampleDate: rec.sampleDate ? new Date(rec.sampleDate).toISOString().split('T')[0] : '',
      labName: rec.labName || '',
      testMethod: rec.testMethod || 'Certified Laboratory',
      soilType: rec.soilType || 'Loamy',
      pH: rec.pH?.value !== null && rec.pH?.value !== undefined ? rec.pH.value : '',
      pHEstimated: Boolean(rec.pH?.isEstimated),
      nitrogen: rec.nitrogen?.value !== null && rec.nitrogen?.value !== undefined ? rec.nitrogen.value : '',
      nitrogenEstimated: Boolean(rec.nitrogen?.isEstimated),
      phosphorus: rec.phosphorus?.value !== null && rec.phosphorus?.value !== undefined ? rec.phosphorus.value : '',
      phosphorusEstimated: Boolean(rec.phosphorus?.isEstimated),
      potassium: rec.potassium?.value !== null && rec.potassium?.value !== undefined ? rec.potassium.value : '',
      potassiumEstimated: Boolean(rec.potassium?.isEstimated),
      organicCarbon: rec.organicCarbon?.value !== null && rec.organicCarbon?.value !== undefined ? rec.organicCarbon.value : '',
      organicCarbonEstimated: Boolean(rec.organicCarbon?.isEstimated),
      electricalConductivity: rec.electricalConductivity?.value !== null && rec.electricalConductivity?.value !== undefined ? rec.electricalConductivity.value : '',
      electricalConductivityEstimated: Boolean(rec.electricalConductivity?.isEstimated),
      soilMoisture: rec.soilMoisture?.value !== null && rec.soilMoisture?.value !== undefined ? rec.soilMoisture.value : '',
      soilTemperature: rec.soilTemperature?.value !== null && rec.soilTemperature?.value !== undefined ? rec.soilTemperature.value : '',
      notes: rec.notes || '',
      labReportUrl: rec.labReport?.url || '',
      labReportName: rec.labReport?.originalName || '',
      labReportMime: rec.labReport?.mimeType || '',
      labReportSize: rec.labReport?.sizeBytes || 0,
    });
    setShowTestModal(true);
  };

  // Lab Report File Upload Handler
  const handleReportFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setTestFormError('Report file size exceeds the 5MB limit.');
      return;
    }

    const allowedMimes = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
    if (!allowedMimes.includes(file.type)) {
      setTestFormError('Unsupported file format. Please upload PDF, JPEG, PNG, or WEBP.');
      return;
    }

    setTestFormError(null);
    setUploadingReport(true);

    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const base64Data = reader.result;
        const uploadRes = await soilService.uploadReport({
          fileBase64: base64Data,
          filename: file.name,
          mimeType: file.type,
        });

        if (uploadRes?.success) {
          setTestForm((prev) => ({
            ...prev,
            labReportUrl: uploadRes.url,
            labReportName: uploadRes.originalName,
            labReportMime: uploadRes.mimeType,
            labReportSize: uploadRes.sizeBytes,
          }));
          setReportFilePreview(uploadRes.url);
        }
      } catch (err) {
        setTestFormError(err?.response?.data?.message || 'Failed to upload laboratory document.');
      } finally {
        setUploadingReport(false);
      }
    };
    reader.onerror = () => {
      setTestFormError('Failed to read the selected file.');
      setUploadingReport(false);
    };
    reader.readAsDataURL(file);
  };

  // Submit Test Registration or Update
  const handleSubmitTestForm = async (e) => {
    e.preventDefault();
    setTestFormError(null);

    if (!testForm.farmId) {
      setTestFormError('Please select a target farm parcel.');
      return;
    }

    if (testForm.pH === '' || isNaN(Number(testForm.pH)) || Number(testForm.pH) < 0 || Number(testForm.pH) > 14) {
      setTestFormError('A valid soil pH value between 0.0 and 14.0 is required.');
      return;
    }

    setSubmittingTest(true);

    const payload = {
      farmId: testForm.farmId,
      sampleId: testForm.sampleId,
      sampleDate: testForm.sampleDate,
      labName: testForm.labName,
      testMethod: testForm.testMethod,
      soilType: testForm.soilType,
      pH: {
        value: Number(testForm.pH),
        isEstimated: testForm.pHEstimated,
      },
      nitrogen: {
        value: testForm.nitrogen !== '' ? Number(testForm.nitrogen) : null,
        isEstimated: testForm.nitrogenEstimated,
      },
      phosphorus: {
        value: testForm.phosphorus !== '' ? Number(testForm.phosphorus) : null,
        isEstimated: testForm.phosphorusEstimated,
      },
      potassium: {
        value: testForm.potassium !== '' ? Number(testForm.potassium) : null,
        isEstimated: testForm.potassiumEstimated,
      },
      organicCarbon: {
        value: testForm.organicCarbon !== '' ? Number(testForm.organicCarbon) : null,
        isEstimated: testForm.organicCarbonEstimated,
      },
      electricalConductivity: {
        value: testForm.electricalConductivity !== '' ? Number(testForm.electricalConductivity) : null,
        isEstimated: testForm.electricalConductivityEstimated,
      },
      soilMoisture: {
        value: testForm.soilMoisture !== '' ? Number(testForm.soilMoisture) : null,
      },
      soilTemperature: {
        value: testForm.soilTemperature !== '' ? Number(testForm.soilTemperature) : null,
      },
      notes: testForm.notes,
      labReport: testForm.labReportUrl
        ? {
            url: testForm.labReportUrl,
            originalName: testForm.labReportName,
            mimeType: testForm.labReportMime,
            sizeBytes: testForm.labReportSize,
          }
        : undefined,
    };

    try {
      if (editingRecordId) {
        await soilService.updateSoilAnalysis(editingRecordId, payload);
        setActionSuccess('Soil test record successfully updated.');
      } else {
        await soilService.createSoilAnalysis(payload);
        setActionSuccess('New soil analysis successfully registered.');
      }
      setShowTestModal(false);
      await loadDashboardData(true);
    } catch (err) {
      setTestFormError(err?.response?.data?.message || 'Failed to save soil test record.');
    } finally {
      setSubmittingTest(false);
    }
  };

  // Delete Soil Test Record
  const handleConfirmDelete = async () => {
    if (!recordToDelete) return;
    setDeletingRecord(true);
    try {
      await soilService.deleteSoilAnalysis(recordToDelete._id);
      setActionSuccess('Soil analysis record successfully deleted.');
      setRecordToDelete(null);
      await loadDashboardData(true);
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to delete soil record.');
    } finally {
      setDeletingRecord(false);
    }
  };

  // Open Full Detail Modal
  const handleOpenDetailModal = async (rec) => {
    try {
      const res = await soilService.getSoilAnalysisById(rec._id);
      if (res?.success) {
        setActiveDetailRecord(res.record);
      } else {
        setActiveDetailRecord(rec);
      }
    } catch {
      setActiveDetailRecord(rec);
    }
  };

  // Health config helper
  const getHealthMeta = (status) => {
    return SOIL_HEALTH_CONFIG[status] || SOIL_HEALTH_CONFIG['Insufficient Data'];
  };

  // Loading skeleton state
  if (loading && records.length === 0) {
    return (
      <div className="space-y-6 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
        <div className="flex items-center justify-between animate-pulse">
          <div className="space-y-2">
            <div className="h-8 w-64 bg-slate-200 rounded"></div>
            <div className="h-4 w-96 bg-slate-100 rounded"></div>
          </div>
          <div className="h-10 w-36 bg-slate-200 rounded"></div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 bg-white rounded-xl border border-slate-200 p-5 shadow-xs animate-pulse"></div>
          ))}
        </div>
        <div className="h-96 bg-white rounded-xl border border-slate-200 p-6 animate-pulse"></div>
      </div>
    );
  }

  const activeHealthMeta = getHealthMeta(currentDisplayedAnalysis?.overallHealthStatus);

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
      {/* 1. Header & Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
              Soil Health & NPK Diagnostics
            </h1>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
              Phase 7
            </span>
          </div>
          <p className="mt-1 text-sm text-slate-500">
            Precision laboratory soil records, NPK fertility indices, pH reaction mapping, and crop-specific fertilizer guidance.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => loadDashboardData(true)}
            disabled={refreshing}
            className="border-slate-200 text-slate-700 hover:bg-slate-50"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={handleOpenCreateModal}
            className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
          >
            <Plus className="w-4 h-4 mr-2" />
            Record Soil Test
          </Button>
        </div>
      </div>

      {/* Action Notification Banner */}
      {actionSuccess && (
        <div className="flex items-center justify-between p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-sm">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span className="font-medium">{actionSuccess}</span>
          </div>
          <button
            onClick={() => setActionSuccess(null)}
            className="text-emerald-700 hover:text-emerald-900 font-semibold text-xs ml-4"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Global Error Alert */}
      {error && (
        <div className="flex items-center justify-between p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-sm">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
            <span className="font-medium">{error}</span>
          </div>
          <Button variant="outline" size="xs" onClick={() => loadDashboardData()} className="border-rose-300 text-rose-700">
            Retry
          </Button>
        </div>
      )}

      {/* 2. Top KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Farms Tested */}
        <div className="bg-white rounded-xl p-5 border border-slate-200/80 shadow-xs hover:border-slate-300 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Farms Tested</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600">
              <MapPin className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">
              {dashboardData.summary.totalFarmsWithRecords} / {dashboardData.summary.totalFarms}
            </span>
            <span className="text-xs text-slate-500">Parcels</span>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            {dashboardData.summary.totalAnalysesRecorded} total tests recorded to date
          </p>
        </div>

        {/* Latest Test Date */}
        <div className="bg-white rounded-xl p-5 border border-slate-200/80 shadow-xs hover:border-slate-300 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Latest Test</span>
            <div className="w-8 h-8 rounded-lg bg-teal-50 flex items-center justify-center text-teal-600">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-lg font-bold text-slate-900 truncate">
              {dashboardData.summary.latestAnalysisDate
                ? new Date(dashboardData.summary.latestAnalysisDate).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })
                : 'No tests recorded'}
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-500 truncate">
            {dashboardData.latestSoilAnalysis?.farm?.name || 'Awaiting initial soil sampling'}
          </p>
        </div>

        {/* Soil Health Status */}
        <div className="bg-white rounded-xl p-5 border border-slate-200/80 shadow-xs hover:border-slate-300 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Health Index</span>
            <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600">
              <Activity className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-center gap-2">
            <span className={`w-2.5 h-2.5 rounded-full ${activeHealthMeta.dot}`}></span>
            <span className="text-lg font-bold text-slate-900">
              {currentDisplayedAnalysis?.overallHealthStatus || 'Insufficient Data'}
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-500 truncate">
            {activeHealthMeta.badge}
          </p>
        </div>

        {/* Primary Alert / Deficiency */}
        <div className="bg-white rounded-xl p-5 border border-slate-200/80 shadow-xs hover:border-slate-300 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Fertility Alert</span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center text-amber-600">
              <ShieldAlert className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-sm font-bold text-slate-900 truncate">
              {currentDisplayedAnalysis?.pH?.rating?.includes('Acidic')
                ? 'Acid Soil Reaction'
                : currentDisplayedAnalysis?.nitrogen?.rating === 'Low'
                ? 'Nitrogen Deficit'
                : currentDisplayedAnalysis?.phosphorus?.rating === 'Low'
                ? 'Phosphate Deficit'
                : currentDisplayedAnalysis?.overallHealthStatus === 'Optimal'
                ? 'Optimal Balance'
                : 'Check Test Values'}
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-500 truncate">
            {currentDisplayedAnalysis?.pH?.value !== undefined
              ? `pH ${currentDisplayedAnalysis.pH.value} · NPK monitored`
              : 'Record soil test to inspect'}
          </p>
        </div>
      </div>

      {/* 3. Farm Selector & Filter Toolbar */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            {/* Farm Selector */}
            <div className="min-w-[200px]">
              <label className="block text-xs font-medium text-slate-500 mb-1">Filter by Farm</label>
              <select
                value={selectedFarmFilter}
                onChange={(e) => handleFarmFilterChange(e.target.value)}
                className="w-full text-sm rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              >
                <option value="all">All Farm Parcels ({farms.length})</option>
                {farms.map((f) => (
                  <option key={f._id} value={f._id}>
                    {f.name} ({f.acreage} ac · {f.soilType || 'Soil'})
                  </option>
                ))}
              </select>
            </div>

            {/* Test Method */}
            <div className="min-w-[170px]">
              <label className="block text-xs font-medium text-slate-500 mb-1">Testing Method</label>
              <select
                value={selectedMethodFilter}
                onChange={(e) => setSelectedMethodFilter(e.target.value)}
                className="w-full text-sm rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              >
                <option value="all">All Methods</option>
                {TEST_METHODS.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>

            {/* Health Status */}
            <div className="min-w-[170px]">
              <label className="block text-xs font-medium text-slate-500 mb-1">Health Condition</label>
              <select
                value={selectedHealthFilter}
                onChange={(e) => setSelectedHealthFilter(e.target.value)}
                className="w-full text-sm rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              >
                <option value="all">All Health Ratings</option>
                <option value="Optimal">Optimal</option>
                <option value="Moderately Healthy">Moderately Healthy</option>
                <option value="Needs Improvement">Needs Improvement</option>
                <option value="Degraded / Critical">Degraded / Critical</option>
                <option value="Insufficient Data">Insufficient Data</option>
              </select>
            </div>
          </div>

          {/* Live Search */}
          <div className="w-full lg:w-72">
            <label className="block text-xs font-medium text-slate-500 mb-1">Search Records</label>
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search sample ID, lab, soil..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-sm rounded-lg border border-slate-300 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              />
            </div>
          </div>
        </div>
      </div>

      {/* 4. Latest Soil Parameters & Agronomic Gauge Grid */}
      {currentDisplayedAnalysis ? (
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-slate-200 p-5 sm:p-6 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-slate-100 gap-2">
              <div>
                <div className="flex items-center gap-2">
                  <FlaskConical className="w-5 h-5 text-emerald-600" />
                  <h2 className="text-lg font-bold text-slate-900">
                    Active Soil Chemistry & NPK Profile
                  </h2>
                  <Badge variant={activeHealthMeta.variant}>
                    {currentDisplayedAnalysis.overallHealthStatus}
                  </Badge>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Sample: <strong className="text-slate-700">{currentDisplayedAnalysis.sampleId}</strong> · Farm:{' '}
                  <strong className="text-slate-700">{currentDisplayedAnalysis.farm?.name || 'Selected Parcel'}</strong> · Date:{' '}
                  {new Date(currentDisplayedAnalysis.sampleDate).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}{' '}
                  · Lab: {currentDisplayedAnalysis.labName || 'Standard Lab'}
                </p>
              </div>

              {currentDisplayedAnalysis.labReport?.url && (
                <a
                  href={currentDisplayedAnalysis.labReport.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center text-xs font-semibold text-emerald-600 hover:text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200"
                >
                  <FileCheck className="w-3.5 h-3.5 mr-1.5" />
                  View Certified Lab Report
                </a>
              )}
            </div>

            {/* 8-Parameter Diagnostic Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mt-6">
              {/* Parameter 1: Soil pH */}
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-slate-50 transition-colors">
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span className="font-semibold uppercase tracking-wider">Soil Reaction (pH)</span>
                  <span className="text-[10px] text-slate-400">Scale 0 - 14</span>
                </div>
                <div className="mt-2 flex items-baseline justify-between">
                  <span className="text-2xl font-extrabold text-slate-900">
                    {currentDisplayedAnalysis.pH?.value !== null && currentDisplayedAnalysis.pH?.value !== undefined
                      ? Number(currentDisplayedAnalysis.pH.value).toFixed(1)
                      : 'N/A'}
                  </span>
                  <Badge
                    variant={
                      currentDisplayedAnalysis.pH?.rating === 'Neutral / Optimal'
                        ? 'success'
                        : currentDisplayedAnalysis.pH?.rating?.includes('Strongly')
                        ? 'danger'
                        : 'warning'
                    }
                  >
                    {currentDisplayedAnalysis.pH?.rating || 'Unrated'}
                  </Badge>
                </div>
                {/* Visual pH color spectrum bar */}
                <div className="mt-3 h-1.5 w-full bg-gradient-to-r from-red-500 via-emerald-500 to-indigo-600 rounded-full relative">
                  {currentDisplayedAnalysis.pH?.value !== null && currentDisplayedAnalysis.pH?.value !== undefined && (
                    <div
                      className="absolute top-1/2 -mt-1.5 w-3 h-3 bg-white border-2 border-slate-900 rounded-full shadow-xs"
                      style={{
                        left: `${Math.min(96, Math.max(2, (Number(currentDisplayedAnalysis.pH.value) / 14) * 100))}%`,
                      }}
                    />
                  )}
                </div>
                <p className="mt-2 text-[11px] text-slate-500">
                  Optimal: 6.5 - 7.5 {currentDisplayedAnalysis.pH?.isEstimated && '(Estimated field kit)'}
                </p>
              </div>

              {/* Parameter 2: Available Nitrogen */}
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-slate-50 transition-colors">
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span className="font-semibold uppercase tracking-wider">Nitrogen (N)</span>
                  <span className="text-[10px] text-slate-400">Target &gt; 280 kg/ha</span>
                </div>
                <div className="mt-2 flex items-baseline justify-between">
                  <span className="text-2xl font-extrabold text-slate-900">
                    {currentDisplayedAnalysis.nitrogen?.value !== null && currentDisplayedAnalysis.nitrogen?.value !== undefined
                      ? `${currentDisplayedAnalysis.nitrogen.value} kg/ha`
                      : 'Not Measured'}
                  </span>
                  <Badge
                    variant={
                      currentDisplayedAnalysis.nitrogen?.rating === 'Medium'
                        ? 'success'
                        : currentDisplayedAnalysis.nitrogen?.rating === 'Low'
                        ? 'danger'
                        : currentDisplayedAnalysis.nitrogen?.rating === 'High'
                        ? 'warning'
                        : 'neutral'
                    }
                  >
                    {currentDisplayedAnalysis.nitrogen?.rating || 'Unmeasured'}
                  </Badge>
                </div>
                <p className="mt-3 text-[11px] text-slate-500">
                  Low: &lt;280 · Medium: 280-560 · High: &gt;560
                </p>
              </div>

              {/* Parameter 3: Available Phosphorus */}
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-slate-50 transition-colors">
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span className="font-semibold uppercase tracking-wider">Phosphorus (P)</span>
                  <span className="text-[10px] text-slate-400">Target 10-25 kg/ha</span>
                </div>
                <div className="mt-2 flex items-baseline justify-between">
                  <span className="text-2xl font-extrabold text-slate-900">
                    {currentDisplayedAnalysis.phosphorus?.value !== null && currentDisplayedAnalysis.phosphorus?.value !== undefined
                      ? `${currentDisplayedAnalysis.phosphorus.value} kg/ha`
                      : 'Not Measured'}
                  </span>
                  <Badge
                    variant={
                      currentDisplayedAnalysis.phosphorus?.rating === 'Medium'
                        ? 'success'
                        : currentDisplayedAnalysis.phosphorus?.rating === 'Low'
                        ? 'danger'
                        : 'neutral'
                    }
                  >
                    {currentDisplayedAnalysis.phosphorus?.rating || 'Unmeasured'}
                  </Badge>
                </div>
                <p className="mt-3 text-[11px] text-slate-500">
                  Low: &lt;10 · Medium: 10-25 · High: &gt;25
                </p>
              </div>

              {/* Parameter 4: Available Potassium */}
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-slate-50 transition-colors">
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span className="font-semibold uppercase tracking-wider">Potassium (K)</span>
                  <span className="text-[10px] text-slate-400">Target 110-280 kg/ha</span>
                </div>
                <div className="mt-2 flex items-baseline justify-between">
                  <span className="text-2xl font-extrabold text-slate-900">
                    {currentDisplayedAnalysis.potassium?.value !== null && currentDisplayedAnalysis.potassium?.value !== undefined
                      ? `${currentDisplayedAnalysis.potassium.value} kg/ha`
                      : 'Not Measured'}
                  </span>
                  <Badge
                    variant={
                      currentDisplayedAnalysis.potassium?.rating === 'Medium' || currentDisplayedAnalysis.potassium?.rating === 'High'
                        ? 'success'
                        : currentDisplayedAnalysis.potassium?.rating === 'Low'
                        ? 'danger'
                        : 'neutral'
                    }
                  >
                    {currentDisplayedAnalysis.potassium?.rating || 'Unmeasured'}
                  </Badge>
                </div>
                <p className="mt-3 text-[11px] text-slate-500">
                  Low: &lt;110 · Medium: 110-280 · High: &gt;280
                </p>
              </div>

              {/* Parameter 5: Organic Carbon */}
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-slate-50 transition-colors">
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span className="font-semibold uppercase tracking-wider">Organic Carbon (OC)</span>
                  <span className="text-[10px] text-slate-400">Target &gt; 0.50%</span>
                </div>
                <div className="mt-2 flex items-baseline justify-between">
                  <span className="text-2xl font-extrabold text-slate-900">
                    {currentDisplayedAnalysis.organicCarbon?.value !== null && currentDisplayedAnalysis.organicCarbon?.value !== undefined
                      ? `${currentDisplayedAnalysis.organicCarbon.value}%`
                      : 'Not Measured'}
                  </span>
                  <Badge
                    variant={
                      currentDisplayedAnalysis.organicCarbon?.rating === 'Medium' || currentDisplayedAnalysis.organicCarbon?.rating === 'High'
                        ? 'success'
                        : currentDisplayedAnalysis.organicCarbon?.rating?.includes('Low')
                        ? 'warning'
                        : 'neutral'
                    }
                  >
                    {currentDisplayedAnalysis.organicCarbon?.rating || 'Unmeasured'}
                  </Badge>
                </div>
                <p className="mt-3 text-[11px] text-slate-500">
                  &lt;0.5%: Low · 0.5-0.75%: Medium · &gt;0.75%: High
                </p>
              </div>

              {/* Parameter 6: Electrical Conductivity */}
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-slate-50 transition-colors">
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span className="font-semibold uppercase tracking-wider">Salinity (EC)</span>
                  <span className="text-[10px] text-slate-400">Target &lt; 0.8 dS/m</span>
                </div>
                <div className="mt-2 flex items-baseline justify-between">
                  <span className="text-2xl font-extrabold text-slate-900">
                    {currentDisplayedAnalysis.electricalConductivity?.value !== null && currentDisplayedAnalysis.electricalConductivity?.value !== undefined
                      ? `${currentDisplayedAnalysis.electricalConductivity.value} dS/m`
                      : 'Not Measured'}
                  </span>
                  <Badge
                    variant={
                      currentDisplayedAnalysis.electricalConductivity?.rating === 'Non-saline'
                        ? 'success'
                        : currentDisplayedAnalysis.electricalConductivity?.rating?.includes('Saline')
                        ? 'warning'
                        : 'neutral'
                    }
                  >
                    {currentDisplayedAnalysis.electricalConductivity?.rating || 'Unmeasured'}
                  </Badge>
                </div>
                <p className="mt-3 text-[11px] text-slate-500">
                  &lt;0.8: Non-saline · 0.8-1.6: Slight · &gt;1.6: Saline
                </p>
              </div>

              {/* Parameter 7: Soil Moisture */}
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-slate-50 transition-colors">
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span className="font-semibold uppercase tracking-wider">Soil Moisture</span>
                  <Droplets className="w-3.5 h-3.5 text-blue-500" />
                </div>
                <div className="mt-2 flex items-baseline justify-between">
                  <span className="text-xl font-extrabold text-slate-900">
                    {currentDisplayedAnalysis.soilMoisture?.value !== null && currentDisplayedAnalysis.soilMoisture?.value !== undefined
                      ? `${currentDisplayedAnalysis.soilMoisture.value}%`
                      : 'Sensor / Test Not Recorded'}
                  </span>
                </div>
                <p className="mt-3 text-[11px] text-slate-500">
                  {currentDisplayedAnalysis.soilMoisture?.value !== null && currentDisplayedAnalysis.soilMoisture?.value !== undefined
                    ? 'Root-zone moisture'
                    : 'Sensor data unavailable'}
                </p>
              </div>

              {/* Parameter 8: Soil Temperature */}
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-slate-50 transition-colors">
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span className="font-semibold uppercase tracking-wider">Soil Temperature</span>
                  <Thermometer className="w-3.5 h-3.5 text-amber-500" />
                </div>
                <div className="mt-2 flex items-baseline justify-between">
                  <span className="text-xl font-extrabold text-slate-900">
                    {currentDisplayedAnalysis.soilTemperature?.value !== null && currentDisplayedAnalysis.soilTemperature?.value !== undefined
                      ? `${currentDisplayedAnalysis.soilTemperature.value}°C`
                      : 'Sensor / Test Not Recorded'}
                  </span>
                </div>
                <p className="mt-3 text-[11px] text-slate-500">
                  {currentDisplayedAnalysis.soilTemperature?.value !== null && currentDisplayedAnalysis.soilTemperature?.value !== undefined
                    ? 'Subsurface temperature'
                    : 'Sensor data unavailable'}
                </p>
              </div>
            </div>

            {/* Scientific Assessment Summary Box */}
            <div className="mt-6 p-4 rounded-xl bg-slate-50 border border-slate-200">
              <div className="flex items-start gap-3">
                <Info className="w-5 h-5 text-slate-600 mt-0.5 shrink-0" />
                <div>
                  <h4 className="text-sm font-semibold text-slate-900">Agronomic Soil Assessment Summary</h4>
                  <p className="text-sm text-slate-600 mt-0.5 leading-relaxed">
                    {currentDisplayedAnalysis.assessmentSummary || activeHealthMeta.description}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* 5. Interactive Fertilizer & Soil Conditioner Guidance Panel */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 sm:p-6 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-slate-100 gap-2">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-amber-600" />
                <h3 className="text-lg font-bold text-slate-900">
                  Soil-Based Fertilizer & Conditioner Advisory
                </h3>
              </div>
              <span className="text-xs text-slate-500">
                Calculated from current soil test nutrient ratings
              </span>
            </div>

            {/* Crop, Stage & Acreage Customizer Form */}
            <div className="mt-4 p-4 rounded-xl bg-slate-50 border border-slate-200">
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 items-end">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Target Crop</label>
                  <select
                    value={guidanceCrop}
                    onChange={(e) => setGuidanceCrop(e.target.value)}
                    className="w-full text-sm rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    {CROP_OPTIONS.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Growth Stage</label>
                  <select
                    value={guidanceStage}
                    onChange={(e) => setGuidanceStage(e.target.value)}
                    className="w-full text-sm rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    {GROWTH_STAGES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Cultivated Acreage</label>
                  <input
                    type="number"
                    min="0.1"
                    step="0.1"
                    value={guidanceAcreage}
                    onChange={(e) => setGuidanceAcreage(e.target.value)}
                    className="w-full text-sm rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <Button
                    variant="primary"
                    size="md"
                    onClick={handleCalculateGuidance}
                    disabled={calculatingGuidance}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
                  >
                    {calculatingGuidance ? 'Recalculating...' : 'Calculate Fertilizer Dose'}
                  </Button>
                </div>
              </div>
            </div>

            {/* Fertilizer Output Display */}
            {customGuidance ? (
              <div className="mt-6 space-y-6">
                {/* Commercial Fertilizer Dosage */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/60">
                    <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider">
                      Urea (46% Nitrogen)
                    </span>
                    <div className="mt-2 text-2xl font-black text-emerald-950">
                      {customGuidance.indicativeCommercialFertilizers.urea_46_N_kg} kg
                    </div>
                    <p className="mt-1 text-xs text-emerald-700">
                      Supplies net {customGuidance.nutrientRequirements.nitrogen_N_kg} kg active N for {customGuidance.acreage} acres
                    </p>
                  </div>

                  <div className="p-4 rounded-xl border border-teal-200 bg-teal-50/60">
                    <span className="text-xs font-bold text-teal-800 uppercase tracking-wider">
                      DAP (18-46-0 Phosphate)
                    </span>
                    <div className="mt-2 text-2xl font-black text-teal-950">
                      {customGuidance.indicativeCommercialFertilizers.dap_18_46_0_kg} kg
                    </div>
                    <p className="mt-1 text-xs text-teal-700">
                      Supplies net {customGuidance.nutrientRequirements.phosphorus_P2O5_kg} kg active P2O5
                    </p>
                  </div>

                  <div className="p-4 rounded-xl border border-indigo-200 bg-indigo-50/60">
                    <span className="text-xs font-bold text-indigo-800 uppercase tracking-wider">
                      MOP (60% Potash)
                    </span>
                    <div className="mt-2 text-2xl font-black text-indigo-950">
                      {customGuidance.indicativeCommercialFertilizers.mop_60_K2O_kg} kg
                    </div>
                    <p className="mt-1 text-xs text-indigo-700">
                      Supplies net {customGuidance.nutrientRequirements.potassium_K2O_kg} kg active K2O
                    </p>
                  </div>
                </div>

                {/* Growth Stage Application Schedule */}
                {customGuidance.stageGuidance && customGuidance.stageGuidance.length > 0 && (
                  <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/50">
                    <h4 className="text-sm font-bold text-slate-900 mb-2">
                      Growth Stage Split Timing: {customGuidance.stageGuidance[0].timing}
                    </h4>
                    <ul className="space-y-1.5 text-xs text-slate-700">
                      {customGuidance.stageGuidance[0].actions.map((act, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
                          <span>{act}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Soil Conditioners & Amendments */}
                {customGuidance.soilConditioners && customGuidance.soilConditioners.length > 0 && (
                  <div className="p-4 rounded-xl border border-amber-200 bg-amber-50/70">
                    <h4 className="text-xs font-bold text-amber-900 uppercase tracking-wider mb-2">
                      Recommended Soil Conditioner (pH Rectification)
                    </h4>
                    {customGuidance.soilConditioners.map((cond, idx) => (
                      <div key={idx} className="text-xs text-amber-800">
                        <strong>{cond.material}</strong>: {cond.estimatedDose} · <span>{cond.purpose}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Bio-fertilizers & Organic Amendments */}
                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600">
                  <span className="font-semibold text-slate-800">Recommended Bio-fertilizer Inoculants:</span>
                  {customGuidance.biofertilizers?.map((bio, i) => (
                    <span key={i} className="px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200">
                      {bio}
                    </span>
                  ))}
                </div>

                {/* Expert Verification Disclaimer */}
                <div className="p-3.5 rounded-lg bg-slate-100 border border-slate-200 text-slate-600 text-[11px] leading-relaxed">
                  <strong>DISCLAIMER & EXTENSION GUIDANCE:</strong> {customGuidance.disclaimer}
                </div>
              </div>
            ) : (
              <div className="mt-4 text-center py-6 text-slate-500 text-xs">
                Select your crop and growth stage above to calculate split fertilizer scheduling.
              </div>
            )}
          </div>

          {/* 6. Longitudinal History & Trend Comparison Charts */}
          {farmHistory && farmHistory.chartPoints && farmHistory.chartPoints.length > 0 && (
            <div className="bg-white rounded-xl border border-slate-200 p-5 sm:p-6 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-slate-100 gap-2">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-emerald-600" />
                  <h3 className="text-lg font-bold text-slate-900">
                    Soil Health Trends & Nutrient Depletion History
                  </h3>
                </div>
                <span className="text-xs text-slate-500">
                  {farmHistory.farm?.name} ({farmHistory.testsCount} tests recorded)
                </span>
              </div>

              {farmHistory.hasSufficientHistory ? (
                <div className="mt-6 space-y-6">
                  {/* Recharts Multi-line Trend Chart */}
                  <div className="h-72 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={farmHistory.chartPoints} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                        <XAxis dataKey="date" stroke="#64748b" fontSize={11} />
                        <YAxis stroke="#64748b" fontSize={11} />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: '#ffffff',
                            borderColor: '#e2e8f0',
                            borderRadius: '0.75rem',
                            fontSize: '12px',
                          }}
                        />
                        <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                        <Line
                          type="monotone"
                          dataKey="nitrogen"
                          name="Nitrogen (kg/ha)"
                          stroke="#10b981"
                          strokeWidth={2}
                          dot={{ r: 4 }}
                        />
                        <Line
                          type="monotone"
                          dataKey="phosphorus"
                          name="Phosphorus (kg/ha)"
                          stroke="#06b6d4"
                          strokeWidth={2}
                          dot={{ r: 4 }}
                        />
                        <Line
                          type="monotone"
                          dataKey="potassium"
                          name="Potassium (kg/ha)"
                          stroke="#6366f1"
                          strokeWidth={2}
                          dot={{ r: 4 }}
                        />
                        <Line
                          type="monotone"
                          dataKey="pH"
                          name="Soil pH"
                          stroke="#f59e0b"
                          strokeWidth={2}
                          dot={{ r: 4 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Trend Highlights Card */}
                  {farmHistory.trends && (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                      <div>
                        <span className="text-slate-500">pH Change:</span>
                        <div className="font-bold text-slate-900 mt-0.5">
                          {farmHistory.trends.pHDelta !== null
                            ? `${farmHistory.trends.pHDelta > 0 ? '+' : ''}${farmHistory.trends.pHDelta}`
                            : 'N/A'}
                        </div>
                      </div>
                      <div>
                        <span className="text-slate-500">Nitrogen Delta:</span>
                        <div className="font-bold text-slate-900 mt-0.5">
                          {farmHistory.trends.nitrogenDelta !== null
                            ? `${farmHistory.trends.nitrogenDelta > 0 ? '+' : ''}${farmHistory.trends.nitrogenDelta} kg/ha`
                            : 'N/A'}
                        </div>
                      </div>
                      <div>
                        <span className="text-slate-500">Phosphorus Delta:</span>
                        <div className="font-bold text-slate-900 mt-0.5">
                          {farmHistory.trends.phosphorusDelta !== null
                            ? `${farmHistory.trends.phosphorusDelta > 0 ? '+' : ''}${farmHistory.trends.phosphorusDelta} kg/ha`
                            : 'N/A'}
                        </div>
                      </div>
                      <div>
                        <span className="text-slate-500">Organic Carbon:</span>
                        <div className="font-bold text-slate-900 mt-0.5">
                          {farmHistory.trends.organicCarbonDelta !== null
                            ? `${farmHistory.trends.organicCarbonDelta > 0 ? '+' : ''}${farmHistory.trends.organicCarbonDelta}%`
                            : 'N/A'}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="mt-4 p-5 text-center bg-slate-50 rounded-xl border border-slate-200 text-slate-500 text-xs">
                  <Compass className="w-6 h-6 mx-auto mb-2 text-slate-400" />
                  <strong>1 test recorded for this farm.</strong> Record a second soil test over time to unlock
                  longitudinal nutrient depletion curves and pH progression trends.
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        /* Empty state when no soil tests exist */
        <div className="bg-white rounded-xl border border-slate-200 p-8 text-center shadow-xs">
          <Layers className="w-12 h-12 text-slate-400 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-slate-900">No Soil Test Records Found</h3>
          <p className="mt-1 text-sm text-slate-500 max-w-md mx-auto">
            You haven&apos;t recorded any laboratory soil tests or digital sensor analyses yet. Add your first soil
            sample to generate nutrient indices and fertilizer recommendations.
          </p>
          <div className="mt-5">
            <Button
              variant="primary"
              size="md"
              onClick={handleOpenCreateModal}
              className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
            >
              <Plus className="w-4 h-4 mr-2" />
              Record First Soil Test
            </Button>
          </div>
        </div>
      )}

      {/* 7. Historical Records Table */}
      {filteredRecords.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900">Soil Analysis Log & Laboratory Reports</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Showing {filteredRecords.length} registered soil records
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-3.5">Sample ID & Farm</th>
                  <th className="px-6 py-3.5">Date & Method</th>
                  <th className="px-6 py-3.5">Reaction (pH)</th>
                  <th className="px-6 py-3.5">NPK Profile</th>
                  <th className="px-6 py-3.5">OC & Salinity</th>
                  <th className="px-6 py-3.5">Health Status</th>
                  <th className="px-6 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredRecords.map((rec) => {
                  const meta = getHealthMeta(rec.overallHealthStatus);
                  return (
                    <tr key={rec._id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-semibold text-slate-900">{rec.sampleId}</div>
                        <div className="text-xs text-slate-500 mt-0.5">
                          {rec.farm?.name || 'Farm Parcel'} · {rec.soilType || 'Soil'}
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <div className="text-slate-800 font-medium">
                          {new Date(rec.sampleDate).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </div>
                        <div className="text-xs text-slate-400 mt-0.5">{rec.testMethod}</div>
                      </td>

                      <td className="px-6 py-4">
                        <div className="font-bold text-slate-900">
                          {rec.pH?.value !== null && rec.pH?.value !== undefined ? `pH ${rec.pH.value}` : 'N/A'}
                        </div>
                        <div className="text-xs text-slate-500">{rec.pH?.rating}</div>
                      </td>

                      <td className="px-6 py-4">
                        <div className="text-xs space-y-0.5">
                          <div>
                            <span className="font-semibold text-slate-700">N:</span>{' '}
                            {rec.nitrogen?.value !== null && rec.nitrogen?.value !== undefined
                              ? `${rec.nitrogen.value} kg/ha`
                              : 'Not Measured'}
                          </div>
                          <div>
                            <span className="font-semibold text-slate-700">P:</span>{' '}
                            {rec.phosphorus?.value !== null && rec.phosphorus?.value !== undefined
                              ? `${rec.phosphorus.value} kg/ha`
                              : 'Not Measured'}
                          </div>
                          <div>
                            <span className="font-semibold text-slate-700">K:</span>{' '}
                            {rec.potassium?.value !== null && rec.potassium?.value !== undefined
                              ? `${rec.potassium.value} kg/ha`
                              : 'Not Measured'}
                          </div>
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <div className="text-xs space-y-0.5">
                          <div>
                            <span className="font-semibold text-slate-700">OC:</span>{' '}
                            {rec.organicCarbon?.value !== null && rec.organicCarbon?.value !== undefined
                              ? `${rec.organicCarbon.value}%`
                              : 'Not Measured'}
                          </div>
                          <div>
                            <span className="font-semibold text-slate-700">EC:</span>{' '}
                            {rec.electricalConductivity?.value !== null && rec.electricalConductivity?.value !== undefined
                              ? `${rec.electricalConductivity.value} dS/m`
                              : 'Not Measured'}
                          </div>
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <Badge variant={meta.variant}>{rec.overallHealthStatus}</Badge>
                      </td>

                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleOpenDetailModal(rec)}
                            title="View Full Diagnostics"
                            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => handleOpenEditModal(rec)}
                            title="Edit Record"
                            className="p-1.5 text-slate-400 hover:text-emerald-600 rounded-lg hover:bg-slate-100"
                          >
                            <Edit className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => setRecordToDelete(rec)}
                            title="Delete Record"
                            className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-slate-100"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ======================================================================== */}
      {/* MODAL 1: REGISTER / EDIT SOIL TEST RECORD                                */}
      {/* Using Portal Modal to guarantee ZERO screen flicker or brightness jumps */}
      {/* ======================================================================== */}
      <Modal
        isOpen={showTestModal}
        onClose={() => setShowTestModal(false)}
        title={editingRecordId ? 'Edit Soil Analysis Record' : 'Record New Soil Test'}
        maxWidth="max-w-2xl"
      >
        <form onSubmit={handleSubmitTestForm} className="space-y-4 text-sm">
          {testFormError && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{testFormError}</span>
            </div>
          )}

          {/* Farm and Sample ID */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Target Farm Parcel <span className="text-rose-500">*</span>
              </label>
              <select
                required
                value={testForm.farmId}
                onChange={(e) => {
                  const fId = e.target.value;
                  const f = farms.find((farm) => farm._id === fId);
                  setTestForm((prev) => ({
                    ...prev,
                    farmId: fId,
                    soilType: f?.soilType || prev.soilType,
                  }));
                }}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="">Select farm parcel</option>
                {farms.map((f) => (
                  <option key={f._id} value={f._id}>
                    {f.name} ({f.acreage} ac)
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Sample Identification Code
              </label>
              <input
                type="text"
                value={testForm.sampleId}
                onChange={(e) => setTestForm((prev) => ({ ...prev, sampleId: e.target.value }))}
                placeholder="e.g. SMP-PARCEL-001"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          {/* Collection Date & Testing Source */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Collection Date <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                required
                value={testForm.sampleDate}
                onChange={(e) => setTestForm((prev) => ({ ...prev, sampleDate: e.target.value }))}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Testing Method</label>
              <select
                value={testForm.testMethod}
                onChange={(e) => setTestForm((prev) => ({ ...prev, testMethod: e.target.value }))}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                {TEST_METHODS.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Soil Type</label>
              <select
                value={testForm.soilType}
                onChange={(e) => setTestForm((prev) => ({ ...prev, soilType: e.target.value }))}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                {SOIL_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Laboratory / Testing Facility Name */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Laboratory or Testing Center</label>
            <input
              type="text"
              value={testForm.labName}
              onChange={(e) => setTestForm((prev) => ({ ...prev, labName: e.target.value }))}
              placeholder="e.g. District Krishi Vigyan Kendra Soil Testing Lab"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* Measured Soil Chemical Parameters Section */}
          <div className="pt-2 border-t border-slate-200">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2">
              Soil Test Parameters (Leave blank if not measured)
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {/* Soil pH */}
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Soil pH (0 - 14) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max="14"
                  required
                  placeholder="e.g. 6.8"
                  value={testForm.pH}
                  onChange={(e) => setTestForm((prev) => ({ ...prev, pH: e.target.value }))}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {/* Available Nitrogen */}
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Nitrogen (kg/ha)</label>
                <input
                  type="number"
                  step="1"
                  min="0"
                  max="2000"
                  placeholder="e.g. 280"
                  value={testForm.nitrogen}
                  onChange={(e) => setTestForm((prev) => ({ ...prev, nitrogen: e.target.value }))}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {/* Available Phosphorus */}
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Phosphorus (kg/ha)</label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="500"
                  placeholder="e.g. 18"
                  value={testForm.phosphorus}
                  onChange={(e) => setTestForm((prev) => ({ ...prev, phosphorus: e.target.value }))}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {/* Available Potassium */}
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Potassium (kg/ha)</label>
                <input
                  type="number"
                  step="1"
                  min="0"
                  max="2000"
                  placeholder="e.g. 210"
                  value={testForm.potassium}
                  onChange={(e) => setTestForm((prev) => ({ ...prev, potassium: e.target.value }))}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {/* Organic Carbon */}
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Organic Carbon (%)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  placeholder="e.g. 0.65"
                  value={testForm.organicCarbon}
                  onChange={(e) => setTestForm((prev) => ({ ...prev, organicCarbon: e.target.value }))}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {/* Electrical Conductivity */}
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">EC (dS/m)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max="50"
                  placeholder="e.g. 0.45"
                  value={testForm.electricalConductivity}
                  onChange={(e) => setTestForm((prev) => ({ ...prev, electricalConductivity: e.target.value }))}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>
          </div>

          {/* Optional Telemetry */}
          <div className="pt-2 border-t border-slate-200">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2">
              Physical Soil Telemetry (Optional)
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Soil Moisture (%)</label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="100"
                  placeholder="e.g. 24"
                  value={testForm.soilMoisture}
                  onChange={(e) => setTestForm((prev) => ({ ...prev, soilMoisture: e.target.value }))}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Soil Temperature (°C)</label>
                <input
                  type="number"
                  step="0.1"
                  min="-20"
                  max="80"
                  placeholder="e.g. 26"
                  value={testForm.soilTemperature}
                  onChange={(e) => setTestForm((prev) => ({ ...prev, soilTemperature: e.target.value }))}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>
          </div>

          {/* Laboratory Report Upload */}
          <div className="pt-2 border-t border-slate-200">
            <label className="block text-xs font-bold text-slate-900 uppercase tracking-wider mb-1">
              Upload Laboratory Certificate / Report (PDF, PNG, JPG, WEBP - Max 5MB)
            </label>
            <div className="flex items-center gap-3">
              <label className="cursor-pointer inline-flex items-center px-3.5 py-2 rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 text-xs font-semibold">
                <UploadCloud className="w-4 h-4 mr-2 text-slate-500" />
                {uploadingReport ? 'Uploading...' : 'Choose Document'}
                <input
                  type="file"
                  accept="application/pdf,image/jpeg,image/png,image/webp"
                  onChange={handleReportFileChange}
                  disabled={uploadingReport}
                  className="hidden"
                />
              </label>

              {reportFilePreview && (
                <div className="flex items-center gap-2 text-xs text-emerald-700 bg-emerald-50 px-2.5 py-1.5 rounded-md border border-emerald-200 truncate">
                  <FileText className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">{testForm.labReportName || 'Laboratory_Report'}</span>
                  <button
                    type="button"
                    onClick={() => {
                      setReportFilePreview(null);
                      setTestForm((prev) => ({
                        ...prev,
                        labReportUrl: '',
                        labReportName: '',
                        labReportMime: '',
                        labReportSize: 0,
                      }));
                    }}
                    className="text-rose-500 hover:text-rose-700 ml-1"
                  >
                    ×
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Observations & Field Notes */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Field Observations & Notes</label>
            <textarea
              rows={2}
              value={testForm.notes}
              onChange={(e) => setTestForm((prev) => ({ ...prev, notes: e.target.value }))}
              placeholder="e.g. Soil collected from top 15cm root-zone across 6 zig-zag points."
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* Modal Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowTestModal(false)}
              disabled={submittingTest}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={submittingTest}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {submittingTest ? 'Saving...' : editingRecordId ? 'Update Record' : 'Save Soil Test'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* ======================================================================== */}
      {/* MODAL 2: FULL SOIL ANALYSIS RECORD DETAILS & DIAGNOSTICS                 */}
      {/* ======================================================================== */}
      <Modal
        isOpen={Boolean(activeDetailRecord)}
        onClose={() => setActiveDetailRecord(null)}
        title={`Soil Analysis: ${activeDetailRecord?.sampleId || ''}`}
        maxWidth="max-w-2xl"
      >
        {activeDetailRecord && (
          <div className="space-y-4 text-sm">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
              <div>
                <span className="text-xs text-slate-500">Farm Parcel:</span>
                <div className="font-bold text-slate-900">{activeDetailRecord.farm?.name}</div>
              </div>
              <Badge variant={getHealthMeta(activeDetailRecord.overallHealthStatus).variant}>
                {activeDetailRecord.overallHealthStatus}
              </Badge>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
              <div className="p-3 bg-white border border-slate-200 rounded-lg">
                <span className="text-slate-400">Date:</span>
                <div className="font-semibold text-slate-800 mt-0.5">
                  {new Date(activeDetailRecord.sampleDate).toLocaleDateString()}
                </div>
              </div>
              <div className="p-3 bg-white border border-slate-200 rounded-lg">
                <span className="text-slate-400">Testing Method:</span>
                <div className="font-semibold text-slate-800 mt-0.5">{activeDetailRecord.testMethod}</div>
              </div>
              <div className="p-3 bg-white border border-slate-200 rounded-lg">
                <span className="text-slate-400">Soil Type:</span>
                <div className="font-semibold text-slate-800 mt-0.5">{activeDetailRecord.soilType}</div>
              </div>
            </div>

            {/* Parameters Table */}
            <div className="border border-slate-200 rounded-xl overflow-hidden text-xs">
              <table className="w-full text-left">
                <thead className="bg-slate-50 border-b border-slate-200 font-semibold text-slate-600">
                  <tr>
                    <th className="px-4 py-2">Parameter</th>
                    <th className="px-4 py-2">Measured Value</th>
                    <th className="px-4 py-2">Agronomic Rating</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  <tr>
                    <td className="px-4 py-2 font-medium">Soil Reaction (pH)</td>
                    <td className="px-4 py-2">{activeDetailRecord.pH?.value ?? 'N/A'}</td>
                    <td className="px-4 py-2 font-semibold text-slate-700">{activeDetailRecord.pH?.rating}</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-2 font-medium">Available Nitrogen (N)</td>
                    <td className="px-4 py-2">{activeDetailRecord.nitrogen?.value ? `${activeDetailRecord.nitrogen.value} kg/ha` : 'Not Measured'}</td>
                    <td className="px-4 py-2 font-semibold text-slate-700">{activeDetailRecord.nitrogen?.rating}</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-2 font-medium">Available Phosphorus (P)</td>
                    <td className="px-4 py-2">{activeDetailRecord.phosphorus?.value ? `${activeDetailRecord.phosphorus.value} kg/ha` : 'Not Measured'}</td>
                    <td className="px-4 py-2 font-semibold text-slate-700">{activeDetailRecord.phosphorus?.rating}</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-2 font-medium">Available Potassium (K)</td>
                    <td className="px-4 py-2">{activeDetailRecord.potassium?.value ? `${activeDetailRecord.potassium.value} kg/ha` : 'Not Measured'}</td>
                    <td className="px-4 py-2 font-semibold text-slate-700">{activeDetailRecord.potassium?.rating}</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-2 font-medium">Organic Carbon (OC)</td>
                    <td className="px-4 py-2">{activeDetailRecord.organicCarbon?.value ? `${activeDetailRecord.organicCarbon.value}%` : 'Not Measured'}</td>
                    <td className="px-4 py-2 font-semibold text-slate-700">{activeDetailRecord.organicCarbon?.rating}</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-2 font-medium">Electrical Conductivity (EC)</td>
                    <td className="px-4 py-2">{activeDetailRecord.electricalConductivity?.value ? `${activeDetailRecord.electricalConductivity.value} dS/m` : 'Not Measured'}</td>
                    <td className="px-4 py-2 font-semibold text-slate-700">{activeDetailRecord.electricalConductivity?.rating}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {activeDetailRecord.assessmentSummary && (
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 leading-relaxed">
                <strong>Agronomic Summary:</strong> {activeDetailRecord.assessmentSummary}
              </div>
            )}

            {activeDetailRecord.labReport?.url && (
              <div className="pt-2">
                <a
                  href={activeDetailRecord.labReport.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center text-xs font-semibold text-emerald-600 hover:text-emerald-700 bg-emerald-50 px-3 py-2 rounded-lg border border-emerald-200 w-full justify-center"
                >
                  <FileCheck className="w-4 h-4 mr-2" />
                  Open Certified Laboratory Document
                </a>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* ======================================================================== */}
      {/* MODAL 3: DELETE CONFIRMATION DIALOG                                      */}
      {/* ======================================================================== */}
      <Modal
        isOpen={Boolean(recordToDelete)}
        onClose={() => setRecordToDelete(null)}
        title="Delete Soil Test Record"
        maxWidth="max-w-md"
      >
        {recordToDelete && (
          <div className="space-y-4 text-sm">
            <p className="text-slate-600">
              Are you sure you want to delete soil test record{' '}
              <strong className="text-slate-900">{recordToDelete.sampleId}</strong>? This action cannot be
              undone.
            </p>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setRecordToDelete(null)}
                disabled={deletingRecord}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={handleConfirmDelete}
                disabled={deletingRecord}
                className="bg-rose-600 hover:bg-rose-700 text-white"
              >
                {deletingRecord ? 'Deleting...' : 'Confirm Delete'}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
