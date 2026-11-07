import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Droplets,
  CloudRain,
  Calendar,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Plus,
  RefreshCw,
  Search,
  Check,
  Edit,
  Trash2,
  Waves,
  MapPin,
  Sprout,
  Layers,
  Thermometer,
  Wind,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import irrigationService from '../../services/irrigationService.js';
import farmService from '../../services/farmService.js';
import cropService from '../../services/cropService.js';
import Button from '../../components/common/Button.jsx';
import Badge from '../../components/common/Badge.jsx';
import Modal from '../../components/common/Modal.jsx';
import {
  IRRIGATION_METHODS,
  WATER_SOURCES,
  IRRIGATION_FREQUENCIES,
  WATER_UNITS,
  SCHEDULE_STATUS_CONFIG,
  ADVISORY_STATUS_CONFIG,
} from '../../constants/irrigationConstants.js';

export default function SmartIrrigationPage() {
  // Primary data states
  const [dashboardData, setDashboardData] = useState({
    summary: {
      totalFarms: 0,
      totalFarmsWithPlans: 0,
      upcomingCount: 0,
      completedCount: 0,
      pendingCount: 0,
      totalWaterLiters: 0,
      waterRecordsCount: 0,
    },
    primaryAdvisory: null,
    upcomingActivities: [],
    recentCompleted: [],
    activePlans: [],
    cropOverview: [],
    farms: [],
  });

  const [farms, setFarms] = useState([]);
  const [crops, setCrops] = useState([]);
  const [plans, setPlans] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [waterUsage, setWaterUsage] = useState({
    totalLiters: 0,
    hasRecords: false,
    chartPoints: [],
    records: [],
  });

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [actionSuccess, setActionSuccess] = useState(null);

  // Active view tab: 'schedules' | 'plans' | 'water'
  const [activeTab, setActiveTab] = useState('schedules');

  // Filters
  const [selectedFarmFilter, setSelectedFarmFilter] = useState('all');
  const [selectedCropFilter, setSelectedCropFilter] = useState('all');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Modals state
  // 1. Plan Modal
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [editingPlanId, setEditingPlanId] = useState(null);
  const [submittingPlan, setSubmittingPlan] = useState(false);
  const [planFormError, setPlanFormError] = useState(null);
  const [planForm, setPlanForm] = useState({
    farmId: '',
    cropId: '',
    name: '',
    method: 'Drip',
    cultivatedArea: 1,
    waterSource: 'Borewell / Tubewell',
    startDate: new Date().toISOString().split('T')[0],
    frequency: 'Alternate Days',
    plannedDurationMinutes: 60,
    waterVolumePerSessionLiters: '',
    notes: '',
  });

  // 2. Schedule Modal
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [editingScheduleId, setEditingScheduleId] = useState(null);
  const [submittingSchedule, setSubmittingSchedule] = useState(false);
  const [scheduleFormError, setScheduleFormError] = useState(null);
  const [scheduleForm, setScheduleForm] = useState({
    farmId: '',
    cropId: '',
    planId: '',
    title: '',
    scheduledDate: new Date().toISOString().slice(0, 16), // YYYY-MM-DDTHH:MM
    durationMinutes: 60,
    method: 'Drip',
    waterSource: 'Borewell / Tubewell',
    notes: '',
  });

  // 3. Complete Activity Modal
  const [activityToComplete, setActivityToComplete] = useState(null);
  const [submittingCompletion, setSubmittingCompletion] = useState(false);
  const [completionForm, setCompletionForm] = useState({
    waterVolume: '',
    waterUnit: 'Liters',
    notes: '',
  });

  // 4. Manual Water Usage Modal
  const [showWaterModal, setShowWaterModal] = useState(false);
  const [submittingWater, setSubmittingWater] = useState(false);
  const [waterFormError, setWaterFormError] = useState(null);
  const [waterForm, setWaterForm] = useState({
    farmId: '',
    cropId: '',
    volume: '',
    unit: 'Liters',
    date: new Date().toISOString().split('T')[0],
    durationMinutes: 60,
    waterSource: 'Borewell / Tubewell',
    notes: '',
  });

  // 5. Delete Confirmation Modal
  const [itemToDelete, setItemToDelete] = useState(null); // { type: 'plan' | 'schedule', id, name }
  const [deletingItem, setDeletingItem] = useState(false);

  // Load dashboard, plans, schedules, and water data
  const loadData = useCallback(async (isSilent = false) => {
    if (isSilent) setRefreshing(true);
    setError(null);

    try {
      const [dashRes, farmsRes, cropsRes, plansRes, schedsRes, waterRes] = await Promise.all([
        irrigationService.getDashboard(),
        farmService.getFarms(),
        cropService.getCrops(),
        irrigationService.getPlans(),
        irrigationService.getSchedules(),
        irrigationService.getWaterUsage(),
      ]);

      if (dashRes?.success) setDashboardData(dashRes);
      if (farmsRes?.success && Array.isArray(farmsRes.farms)) setFarms(farmsRes.farms);
      else if (Array.isArray(farmsRes?.data)) setFarms(farmsRes.data);

      if (cropsRes?.success && Array.isArray(cropsRes.crops)) setCrops(cropsRes.crops);
      else if (Array.isArray(cropsRes?.data)) setCrops(cropsRes.data);

      if (plansRes?.success && Array.isArray(plansRes.plans)) setPlans(plansRes.plans);
      if (schedsRes?.success && Array.isArray(schedsRes.schedules)) setSchedules(schedsRes.schedules);
      if (waterRes?.success) setWaterUsage(waterRes);
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || 'Failed to load smart irrigation data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    let isSubscribed = true;
    const fetchInitial = async () => {
      try {
        const [dashRes, farmsRes, cropsRes, plansRes, schedsRes, waterRes] = await Promise.all([
          irrigationService.getDashboard(),
          farmService.getFarms(),
          cropService.getCrops(),
          irrigationService.getPlans(),
          irrigationService.getSchedules(),
          irrigationService.getWaterUsage(),
        ]);

        if (isSubscribed) {
          if (dashRes?.success) setDashboardData(dashRes);
          if (farmsRes?.success && Array.isArray(farmsRes.farms)) setFarms(farmsRes.farms);
          else if (Array.isArray(farmsRes?.data)) setFarms(farmsRes.data);

          if (cropsRes?.success && Array.isArray(cropsRes.crops)) setCrops(cropsRes.crops);
          else if (Array.isArray(cropsRes?.data)) setCrops(cropsRes.data);

          if (plansRes?.success && Array.isArray(plansRes.plans)) setPlans(plansRes.plans);
          if (schedsRes?.success && Array.isArray(schedsRes.schedules)) setSchedules(schedsRes.schedules);
          if (waterRes?.success) setWaterUsage(waterRes);
        }
      } catch (err) {
        if (isSubscribed) {
          setError(err?.response?.data?.message || err?.message || 'Failed to load smart irrigation data');
        }
      } finally {
        if (isSubscribed) {
          setLoading(false);
        }
      }
    };

    fetchInitial();
    return () => {
      isSubscribed = false;
    };
  }, []);

  // Available crops for selected farm in modals
  const getCropsForFarm = (farmId) => {
    if (!farmId) return crops;
    return crops.filter((c) => {
      const cFarmId = c.farm?._id || c.farm;
      return cFarmId === farmId;
    });
  };

  // Filtered schedules list
  const filteredSchedules = useMemo(() => {
    return schedules.filter((s) => {
      const fId = s.farm?._id || s.farm;
      const cId = s.crop?._id || s.crop;

      if (selectedFarmFilter !== 'all' && fId !== selectedFarmFilter) return false;
      if (selectedCropFilter !== 'all' && cId !== selectedCropFilter) return false;
      if (selectedStatusFilter !== 'all' && s.status !== selectedStatusFilter) return false;

      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const titleMatch = s.title?.toLowerCase().includes(term);
        const farmName = s.farm?.name?.toLowerCase().includes(term);
        const cropName = s.crop?.name?.toLowerCase().includes(term);
        const methodMatch = s.method?.toLowerCase().includes(term);
        return titleMatch || farmName || cropName || methodMatch;
      }
      return true;
    });
  }, [schedules, selectedFarmFilter, selectedCropFilter, selectedStatusFilter, searchTerm]);

  // Filtered plans list
  const filteredPlans = useMemo(() => {
    return plans.filter((p) => {
      const fId = p.farm?._id || p.farm;
      const cId = p.crop?._id || p.crop;

      if (selectedFarmFilter !== 'all' && fId !== selectedFarmFilter) return false;
      if (selectedCropFilter !== 'all' && cId !== selectedCropFilter) return false;

      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const nameMatch = p.name?.toLowerCase().includes(term);
        const farmName = p.farm?.name?.toLowerCase().includes(term);
        const cropName = p.crop?.name?.toLowerCase().includes(term);
        const methodMatch = p.method?.toLowerCase().includes(term);
        return nameMatch || farmName || cropName || methodMatch;
      }
      return true;
    });
  }, [plans, selectedFarmFilter, selectedCropFilter, searchTerm]);

  // Open "Create Plan" Modal
  const handleOpenCreatePlan = () => {
    setEditingPlanId(null);
    setPlanFormError(null);
    const defaultFarm = selectedFarmFilter !== 'all' ? selectedFarmFilter : farms[0]?._id || '';
    const availableCrops = getCropsForFarm(defaultFarm);
    const defaultCrop = availableCrops[0]?._id || '';

    setPlanForm({
      farmId: defaultFarm,
      cropId: defaultCrop,
      name: '',
      method: 'Drip',
      cultivatedArea: availableCrops[0]?.cultivatedArea || 1,
      waterSource: 'Borewell / Tubewell',
      startDate: new Date().toISOString().split('T')[0],
      frequency: 'Alternate Days',
      plannedDurationMinutes: 60,
      waterVolumePerSessionLiters: '',
      notes: '',
    });
    setShowPlanModal(true);
  };

  // Open "Edit Plan" Modal
  const handleOpenEditPlan = (plan) => {
    setEditingPlanId(plan._id);
    setPlanFormError(null);
    setPlanForm({
      farmId: plan.farm?._id || plan.farm,
      cropId: plan.crop?._id || plan.crop,
      name: plan.name || '',
      method: plan.method || 'Drip',
      cultivatedArea: plan.cultivatedArea || 1,
      waterSource: plan.waterSource || 'Borewell / Tubewell',
      startDate: plan.startDate ? new Date(plan.startDate).toISOString().split('T')[0] : '',
      frequency: plan.frequency || 'Alternate Days',
      plannedDurationMinutes: plan.plannedDurationMinutes || 60,
      waterVolumePerSessionLiters: plan.waterVolumePerSessionLiters || '',
      notes: plan.notes || '',
    });
    setShowPlanModal(true);
  };

  // Submit Plan Form
  const handleSubmitPlanForm = async (e) => {
    e.preventDefault();
    setPlanFormError(null);

    if (!planForm.farmId || !planForm.cropId) {
      setPlanFormError('Please select both a farm parcel and an active crop.');
      return;
    }

    setSubmittingPlan(true);
    try {
      const payload = {
        farmId: planForm.farmId,
        cropId: planForm.cropId,
        name: planForm.name,
        method: planForm.method,
        cultivatedArea: Number(planForm.cultivatedArea) || 1,
        waterSource: planForm.waterSource,
        startDate: planForm.startDate,
        frequency: planForm.frequency,
        plannedDurationMinutes: Number(planForm.plannedDurationMinutes) || 60,
        waterVolumePerSessionLiters: planForm.waterVolumePerSessionLiters ? Number(planForm.waterVolumePerSessionLiters) : null,
        notes: planForm.notes,
      };

      if (editingPlanId) {
        await irrigationService.updatePlan(editingPlanId, payload);
        setActionSuccess('Irrigation plan updated successfully.');
      } else {
        await irrigationService.createPlan(payload);
        setActionSuccess('New irrigation plan registered successfully.');
      }

      setShowPlanModal(false);
      await loadData(true);
    } catch (err) {
      setPlanFormError(err?.response?.data?.message || 'Failed to save irrigation plan.');
    } finally {
      setSubmittingPlan(false);
    }
  };

  // Open "Schedule Activity" Modal
  const handleOpenScheduleModal = (prefillPlan = null) => {
    setEditingScheduleId(null);
    setScheduleFormError(null);

    const defaultFarm = prefillPlan ? (prefillPlan.farm?._id || prefillPlan.farm) : (selectedFarmFilter !== 'all' ? selectedFarmFilter : farms[0]?._id || '');
    const availableCrops = getCropsForFarm(defaultFarm);
    const defaultCrop = prefillPlan ? (prefillPlan.crop?._id || prefillPlan.crop) : (availableCrops[0]?._id || '');

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(7, 0, 0, 0); // 7:00 AM default

    setScheduleForm({
      farmId: defaultFarm,
      cropId: defaultCrop,
      planId: prefillPlan?._id || '',
      title: prefillPlan ? `Morning Drip Run - ${prefillPlan.name}` : '',
      scheduledDate: tomorrow.toISOString().slice(0, 16),
      durationMinutes: prefillPlan?.plannedDurationMinutes || 60,
      method: prefillPlan?.method || 'Drip',
      waterSource: prefillPlan?.waterSource || 'Borewell / Tubewell',
      notes: prefillPlan?.notes || '',
    });
    setShowScheduleModal(true);
  };

  // Open "Edit Schedule" Modal
  const handleOpenEditSchedule = (sched) => {
    setEditingScheduleId(sched._id);
    setScheduleFormError(null);
    setScheduleForm({
      farmId: sched.farm?._id || sched.farm,
      cropId: sched.crop?._id || sched.crop,
      planId: sched.plan?._id || sched.plan || '',
      title: sched.title || '',
      scheduledDate: sched.scheduledDate ? new Date(sched.scheduledDate).toISOString().slice(0, 16) : '',
      durationMinutes: sched.durationMinutes || 60,
      method: sched.method || 'Drip',
      waterSource: sched.waterSource || 'Borewell / Tubewell',
      notes: sched.notes || '',
    });
    setShowScheduleModal(true);
  };

  // Submit Schedule Form
  const handleSubmitScheduleForm = async (e) => {
    e.preventDefault();
    setScheduleFormError(null);

    if (!scheduleForm.farmId || !scheduleForm.cropId || !scheduleForm.scheduledDate) {
      setScheduleFormError('Please fill in farm parcel, crop, and scheduled date.');
      return;
    }

    setSubmittingSchedule(true);
    try {
      const payload = {
        farmId: scheduleForm.farmId,
        cropId: scheduleForm.cropId,
        planId: scheduleForm.planId || null,
        title: scheduleForm.title,
        scheduledDate: scheduleForm.scheduledDate,
        durationMinutes: Number(scheduleForm.durationMinutes) || 60,
        method: scheduleForm.method,
        waterSource: scheduleForm.waterSource,
        notes: scheduleForm.notes,
      };

      if (editingScheduleId) {
        await irrigationService.updateSchedule(editingScheduleId, payload);
        setActionSuccess('Scheduled irrigation run updated.');
      } else {
        await irrigationService.createSchedule(payload);
        setActionSuccess('Irrigation activity successfully scheduled.');
      }

      setShowScheduleModal(false);
      await loadData(true);
    } catch (err) {
      setScheduleFormError(err?.response?.data?.message || 'Failed to schedule irrigation run.');
    } finally {
      setSubmittingSchedule(false);
    }
  };

  // Submit Mark Activity Completed
  const handleCompleteActivity = async (e) => {
    e.preventDefault();
    if (!activityToComplete) return;

    setSubmittingCompletion(true);
    try {
      await irrigationService.updateScheduleStatus(activityToComplete._id, {
        status: 'Completed',
        completedAt: new Date().toISOString(),
        waterVolume: completionForm.waterVolume ? Number(completionForm.waterVolume) : null,
        waterUnit: completionForm.waterUnit,
        notes: completionForm.notes,
      });

      setActionSuccess(`Activity "${activityToComplete.title}" marked as Completed.`);
      setActivityToComplete(null);
      await loadData(true);
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to complete activity.');
    } finally {
      setSubmittingCompletion(false);
    }
  };

  // Submit Manual Water Usage
  const handleSubmitWaterForm = async (e) => {
    e.preventDefault();
    setWaterFormError(null);

    if (!waterForm.farmId || !waterForm.volume) {
      setWaterFormError('Please select farm parcel and specify water volume.');
      return;
    }

    setSubmittingWater(true);
    try {
      await irrigationService.recordWaterUsage({
        farmId: waterForm.farmId,
        cropId: waterForm.cropId || null,
        volume: Number(waterForm.volume),
        unit: waterForm.unit,
        date: waterForm.date,
        durationMinutes: Number(waterForm.durationMinutes) || 60,
        waterSource: waterForm.waterSource,
        notes: waterForm.notes,
      });

      setActionSuccess('Water usage logged successfully.');
      setShowWaterModal(false);
      await loadData(true);
    } catch (err) {
      setWaterFormError(err?.response?.data?.message || 'Failed to log water consumption.');
    } finally {
      setSubmittingWater(false);
    }
  };

  // Confirm Delete
  const handleConfirmDelete = async () => {
    if (!itemToDelete) return;
    setDeletingItem(true);
    try {
      if (itemToDelete.type === 'plan') {
        await irrigationService.deletePlan(itemToDelete.id);
        setActionSuccess('Irrigation plan deleted.');
      } else if (itemToDelete.type === 'schedule') {
        await irrigationService.deleteSchedule(itemToDelete.id);
        setActionSuccess('Scheduled activity deleted.');
      }
      setItemToDelete(null);
      await loadData(true);
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to delete item.');
    } finally {
      setDeletingItem(false);
    }
  };

  // Skeleton loading state
  if (loading && plans.length === 0 && schedules.length === 0) {
    return (
      <div className="space-y-6 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
        <div className="flex items-center justify-between animate-pulse">
          <div className="space-y-2">
            <div className="h-8 w-64 bg-slate-200 rounded"></div>
            <div className="h-4 w-96 bg-slate-100 rounded"></div>
          </div>
          <div className="h-10 w-40 bg-slate-200 rounded"></div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 bg-white rounded-xl border border-slate-200 p-5 animate-pulse"></div>
          ))}
        </div>
        <div className="h-44 bg-white rounded-xl border border-slate-200 p-6 animate-pulse"></div>
        <div className="h-80 bg-white rounded-xl border border-slate-200 p-6 animate-pulse"></div>
      </div>
    );
  }

  const advisory = dashboardData.primaryAdvisory;
  const advisoryMeta = advisory
    ? (ADVISORY_STATUS_CONFIG[advisory.primaryAction] || ADVISORY_STATUS_CONFIG['Monitor Soil Moisture'])
    : ADVISORY_STATUS_CONFIG['Monitor Soil Moisture'];

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
      {/* 1. Header & Action Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
              Smart Irrigation & Water Management
            </h1>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">
              Phase 8
            </span>
          </div>
          <p className="mt-1 text-sm text-slate-500">
            Precision water scheduling, weather-driven evapotranspiration advisories, and water consumption telemetry.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={() => loadData(true)}
            disabled={refreshing}
            className="border-slate-200 text-slate-700 hover:bg-slate-50"
          >
            <RefreshCw className={`w-4 h-4 mr-1.5 ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setWaterFormError(null);
              const defaultFarm = selectedFarmFilter !== 'all' ? selectedFarmFilter : farms[0]?._id || '';
              const availableCrops = getCropsForFarm(defaultFarm);
              setWaterForm({
                farmId: defaultFarm,
                cropId: availableCrops[0]?._id || '',
                volume: '',
                unit: 'Liters',
                date: new Date().toISOString().split('T')[0],
                durationMinutes: 60,
                waterSource: 'Borewell / Tubewell',
                notes: '',
              });
              setShowWaterModal(true);
            }}
            className="border-slate-300 text-slate-700 hover:bg-slate-50"
          >
            <Waves className="w-4 h-4 mr-1.5 text-blue-600" />
            Log Water Usage
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => handleOpenScheduleModal()}
            className="border-emerald-300 text-emerald-800 hover:bg-emerald-50"
          >
            <Calendar className="w-4 h-4 mr-1.5 text-emerald-600" />
            Schedule Run
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={handleOpenCreatePlan}
            className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
          >
            <Plus className="w-4 h-4 mr-1.5" />
            New Irrigation Plan
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
          <Button variant="outline" size="xs" onClick={() => loadData()} className="border-rose-300 text-rose-700">
            Retry
          </Button>
        </div>
      )}

      {/* 2. KPI Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Farms Covered */}
        <div className="bg-white rounded-xl p-5 border border-slate-200/80 shadow-xs hover:border-slate-300 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Farms Covered</span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
              <MapPin className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">
              {dashboardData.summary.totalFarmsWithPlans} / {dashboardData.summary.totalFarms}
            </span>
            <span className="text-xs text-slate-500">Parcels</span>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            {plans.length} active crop irrigation plans
          </p>
        </div>

        {/* Upcoming Sessions */}
        <div className="bg-white rounded-xl p-5 border border-slate-200/80 shadow-xs hover:border-slate-300 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Upcoming Sessions</span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center text-amber-600">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">
              {dashboardData.summary.upcomingCount}
            </span>
            <span className="text-xs text-slate-500">Scheduled</span>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            {dashboardData.summary.pendingCount > 0
              ? `${dashboardData.summary.pendingCount} past due activities`
              : 'All activities up to date'}
          </p>
        </div>

        {/* Completed Activities */}
        <div className="bg-white rounded-xl p-5 border border-slate-200/80 shadow-xs hover:border-slate-300 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Completed Activities</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">
              {dashboardData.summary.completedCount}
            </span>
            <span className="text-xs text-slate-500">Runs</span>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            Executed with recorded run durations
          </p>
        </div>

        {/* Total Water Consumed */}
        <div className="bg-white rounded-xl p-5 border border-slate-200/80 shadow-xs hover:border-slate-300 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Water Applied</span>
            <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600">
              <Droplets className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900 truncate">
              {dashboardData.summary.totalWaterLiters > 0
                ? `${(dashboardData.summary.totalWaterLiters / 1000).toFixed(1)} m³`
                : '0 L'}
            </span>
            {dashboardData.summary.totalWaterLiters > 0 && (
              <span className="text-xs text-slate-500 truncate">
                ({dashboardData.summary.totalWaterLiters.toLocaleString()} L)
              </span>
            )}
          </div>
          <p className="mt-1 text-xs text-slate-500">
            {dashboardData.summary.waterRecordsCount} telemetry records logged
          </p>
        </div>
      </div>

      {/* 3. Real-Time Weather-Driven Irrigation Advisory Banner */}
      {advisory && (
        <div className="bg-white rounded-xl border border-slate-200 p-5 sm:p-6 shadow-xs">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 pb-4 border-b border-slate-100">
            <div className="flex items-start sm:items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shrink-0">
                <CloudRain className="w-5 h-5" />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-base font-bold text-slate-900">
                    Weather & Soil-Driven Irrigation Advisory
                  </h3>
                  <Badge variant={advisoryMeta.variant}>
                    {advisory.primaryAction}
                  </Badge>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Target: <strong className="text-slate-700">{advisory.cropContext?.cropName}</strong> ({advisory.cropContext?.growthStage}) · Farm Soil: <strong className="text-slate-700">{advisory.soilContext?.soilType}</strong>
                </p>
              </div>
            </div>

            {/* Weather Metric Chips */}
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-700">
                <Thermometer className="w-3.5 h-3.5 text-amber-500" />
                <span>{advisory.weatherSummary?.temperature}°C</span>
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-700">
                <CloudRain className="w-3.5 h-3.5 text-blue-500" />
                <span>Rain 48h: {advisory.weatherSummary?.expectedRainfall24h}mm ({advisory.weatherSummary?.maxRainProb}%)</span>
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-700">
                <Wind className="w-3.5 h-3.5 text-slate-500" />
                <span>{advisory.weatherSummary?.windSpeedKmh} km/h</span>
              </div>
            </div>
          </div>

          {/* Rationale and guidance */}
          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
              <span className="font-semibold text-slate-900 block">Meteorological Evaluation:</span>
              <p className="text-slate-600 leading-relaxed">
                {advisory.summary}
              </p>
              <div className="pt-1 text-[11px] text-slate-500">
                Sensitivity: <strong>{advisory.cropContext?.waterSensitivity}</strong> · {advisory.cropContext?.stageGuidance}
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-900">Soil Moisture & Telemetry:</span>
                <span className="text-[11px] font-medium text-slate-500">
                  {advisory.soilContext?.measuredSoilMoisture || 'Sensor data unavailable'}
                </span>
              </div>
              <p className="text-slate-600 leading-relaxed text-[11px]">
                {advisory.soilContext?.sensorNotice}
              </p>
              <div className="pt-1 text-[11px] text-slate-400">
                IoT Integration: Automatic pump controllers and soil capacitive sensors ready for linking.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 4. Filter Toolbar & Navigation Tabs */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs space-y-4">
        {/* Tabs */}
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-3">
          <button
            onClick={() => setActiveTab('schedules')}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
              activeTab === 'schedules'
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            Scheduled Runs ({filteredSchedules.length})
          </button>

          <button
            onClick={() => setActiveTab('plans')}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
              activeTab === 'plans'
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            Irrigation Plans ({filteredPlans.length})
          </button>

          <button
            onClick={() => setActiveTab('water')}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
              activeTab === 'water'
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            Water Consumption ({waterUsage.records.length} logs)
          </button>
        </div>

        {/* Filters and search */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 pt-1">
          <div className="flex flex-wrap items-center gap-3">
            {/* Farm Filter */}
            <div className="min-w-[180px]">
              <label className="block text-[11px] font-semibold text-slate-500 mb-1">Farm Parcel</label>
              <select
                value={selectedFarmFilter}
                onChange={(e) => {
                  setSelectedFarmFilter(e.target.value);
                  setSelectedCropFilter('all');
                }}
                className="w-full text-xs rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="all">All Farms ({farms.length})</option>
                {farms.map((f) => (
                  <option key={f._id} value={f._id}>
                    {f.name} ({f.acreage} ac)
                  </option>
                ))}
              </select>
            </div>

            {/* Crop Filter */}
            <div className="min-w-[170px]">
              <label className="block text-[11px] font-semibold text-slate-500 mb-1">Crop</label>
              <select
                value={selectedCropFilter}
                onChange={(e) => setSelectedCropFilter(e.target.value)}
                className="w-full text-xs rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="all">All Crops</option>
                {getCropsForFarm(selectedFarmFilter !== 'all' ? selectedFarmFilter : null).map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.name} ({c.variety || 'Standard'})
                  </option>
                ))}
              </select>
            </div>

            {/* Status Filter (for schedules) */}
            {activeTab === 'schedules' && (
              <div className="min-w-[160px]">
                <label className="block text-[11px] font-semibold text-slate-500 mb-1">Activity Status</label>
                <select
                  value={selectedStatusFilter}
                  onChange={(e) => setSelectedStatusFilter(e.target.value)}
                  className="w-full text-xs rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="all">All Statuses</option>
                  <option value="Scheduled">Scheduled</option>
                  <option value="Completed">Completed</option>
                  <option value="Cancelled">Cancelled</option>
                  <option value="Skipped">Skipped</option>
                </select>
              </div>
            )}
          </div>

          {/* Search */}
          <div className="w-full lg:w-72">
            <label className="block text-[11px] font-semibold text-slate-500 mb-1">Search Activities / Plans</label>
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search title, method, notes..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-1.5 text-xs rounded-lg border border-slate-300 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>
        </div>
      </div>

      {/* 5. TAB 1: SCHEDULED ACTIVITIES */}
      {activeTab === 'schedules' && (
        <div className="space-y-4">
          {filteredSchedules.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredSchedules.map((sched) => {
                const statusMeta = SCHEDULE_STATUS_CONFIG[sched.status] || SCHEDULE_STATUS_CONFIG.Scheduled;
                const dateObj = new Date(sched.scheduledDate);
                const isPast = dateObj < new Date() && sched.status === 'Scheduled';

                return (
                  <div
                    key={sched._id}
                    className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs hover:border-slate-300 transition-all flex flex-col justify-between"
                  >
                    <div>
                      {/* Top status & method */}
                      <div className="flex items-center justify-between gap-2">
                        <Badge variant={statusMeta.variant}>
                          <span className={`w-1.5 h-1.5 rounded-full ${statusMeta.dot} mr-1.5 inline-block`}></span>
                          {statusMeta.label}
                        </Badge>
                        <span className="text-xs font-semibold text-slate-500 px-2.5 py-0.5 rounded-md bg-slate-100">
                          {sched.method}
                        </span>
                      </div>

                      {/* Title */}
                      <h3 className="mt-3 text-base font-bold text-slate-900 line-clamp-1">
                        {sched.title}
                      </h3>

                      {/* Farm & Crop metadata */}
                      <div className="mt-2 text-xs text-slate-600 space-y-1">
                        <div className="flex items-center gap-1.5 truncate">
                          <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="truncate">{sched.farm?.name}</span>
                        </div>
                        <div className="flex items-center gap-1.5 truncate">
                          <Sprout className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="truncate">
                            {sched.crop?.name} ({sched.crop?.growthStage || 'Vegetative'})
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>
                            {sched.durationMinutes} Minutes · Source: {sched.waterSource}
                          </span>
                        </div>
                      </div>

                      {/* Scheduled Timing */}
                      <div className="mt-3 p-2.5 rounded-lg bg-slate-50 border border-slate-200/80 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="text-slate-500">Scheduled Date:</span>
                          <span className={`font-semibold ${isPast ? 'text-amber-600 font-bold' : 'text-slate-800'}`}>
                            {dateObj.toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>
                        {isPast && (
                          <span className="text-[10px] text-amber-600 block mt-0.5">
                            Overdue session. Ready for completion or rescheduling.
                          </span>
                        )}
                        {sched.status === 'Completed' && sched.waterUsedLiters && (
                          <div className="flex items-center justify-between mt-1 pt-1 border-t border-slate-200 text-emerald-700">
                            <span>Water Applied:</span>
                            <span className="font-bold">{sched.waterUsedLiters.toLocaleString()} L</span>
                          </div>
                        )}
                      </div>

                      {/* Weather Snapshot if available */}
                      {sched.weatherSnapshot?.condition && (
                        <div className="mt-2 text-[11px] text-slate-500 flex items-center gap-1.5">
                          <CloudRain className="w-3 h-3 text-blue-500" />
                          <span className="truncate">
                            {sched.weatherSnapshot.condition} · {sched.weatherSnapshot.temp}°C
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Action buttons */}
                    <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                      {sched.status === 'Scheduled' ? (
                        <Button
                          variant="primary"
                          size="xs"
                          onClick={() => {
                            setActivityToComplete(sched);
                            setCompletionForm({
                              waterVolume: sched.waterVolume || '',
                              waterUnit: sched.waterUnit || 'Liters',
                              notes: '',
                            });
                          }}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white"
                        >
                          <Check className="w-3.5 h-3.5 mr-1" />
                          Mark Completed
                        </Button>
                      ) : (
                        <span className="text-xs text-slate-400 font-medium">
                          Completed on {new Date(sched.completedAt || sched.updatedAt).toLocaleDateString()}
                        </span>
                      )}

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleOpenEditSchedule(sched)}
                          title="Edit Activity"
                          className="p-1.5 text-slate-400 hover:text-emerald-600 rounded-md hover:bg-slate-100"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() =>
                            setItemToDelete({
                              type: 'schedule',
                              id: sched._id,
                              name: sched.title,
                            })
                          }
                          title="Delete Activity"
                          className="p-1.5 text-slate-400 hover:text-rose-600 rounded-md hover:bg-slate-100"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-slate-200 p-8 text-center shadow-xs">
              <Calendar className="w-10 h-10 text-slate-400 mx-auto mb-2" />
              <h3 className="text-base font-bold text-slate-900">No Scheduled Activities Found</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
                You have no upcoming irrigation activities matching the active filters. Schedule a new activity to
                track upcoming watering cycles.
              </p>
              <div className="mt-4">
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => handleOpenScheduleModal()}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  <Plus className="w-4 h-4 mr-1.5" />
                  Schedule Irrigation Run
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 6. TAB 2: IRRIGATION PLANS */}
      {activeTab === 'plans' && (
        <div className="space-y-4">
          {filteredPlans.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredPlans.map((plan) => (
                <div
                  key={plan._id}
                  className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs hover:border-slate-300 transition-all flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-md border border-emerald-200">
                        {plan.method} Method
                      </span>
                      <span className="text-xs text-slate-500">
                        {plan.frequency}
                      </span>
                    </div>

                    <h3 className="mt-3 text-base font-bold text-slate-900 line-clamp-1">
                      {plan.name}
                    </h3>

                    <div className="mt-2 text-xs text-slate-600 space-y-1">
                      <div className="flex items-center gap-1.5 truncate">
                        <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="truncate">{plan.farm?.name}</span>
                      </div>
                      <div className="flex items-center gap-1.5 truncate">
                        <Sprout className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="truncate">
                          {plan.crop?.name} ({plan.crop?.variety || 'Standard'}) · {plan.cultivatedArea} ac
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>{plan.plannedDurationMinutes} min per run</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Waves className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>Source: {plan.waterSource}</span>
                      </div>
                    </div>

                    {plan.notes && (
                      <p className="mt-2 text-[11px] text-slate-500 line-clamp-2 bg-slate-50 p-2 rounded-lg border border-slate-200/80">
                        {plan.notes}
                      </p>
                    )}
                  </div>

                  {/* Plan actions */}
                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                    <Button
                      variant="outline"
                      size="xs"
                      onClick={() => handleOpenScheduleModal(plan)}
                      className="border-emerald-300 text-emerald-700 hover:bg-emerald-50"
                    >
                      <Plus className="w-3.5 h-3.5 mr-1" />
                      Schedule Run
                    </Button>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleOpenEditPlan(plan)}
                        title="Edit Plan"
                        className="p-1.5 text-slate-400 hover:text-emerald-600 rounded-md hover:bg-slate-100"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() =>
                          setItemToDelete({
                            type: 'plan',
                            id: plan._id,
                            name: plan.name,
                          })
                        }
                        title="Delete Plan"
                        className="p-1.5 text-slate-400 hover:text-rose-600 rounded-md hover:bg-slate-100"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-slate-200 p-8 text-center shadow-xs">
              <Layers className="w-10 h-10 text-slate-400 mx-auto mb-2" />
              <h3 className="text-base font-bold text-slate-900">No Irrigation Plans Configured</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
                Create structured irrigation plans for your crops to specify irrigation methods, duration, and water
                sources.
              </p>
              <div className="mt-4">
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleOpenCreatePlan}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  <Plus className="w-4 h-4 mr-1.5" />
                  Create First Irrigation Plan
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 7. TAB 3: WATER USAGE TRACKING & RECHARTS */}
      {activeTab === 'water' && (
        <div className="space-y-6">
          {waterUsage.hasRecords ? (
            <div className="bg-white rounded-xl border border-slate-200 p-5 sm:p-6 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-slate-100 gap-2">
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Historical Water Consumption Curve
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Aggregated volumetric consumption (Liters) recorded across completed sessions
                  </p>
                </div>
                <div className="text-sm font-bold text-slate-900 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200">
                  Total: {waterUsage.totalLiters.toLocaleString()} Liters
                </div>
              </div>

              {/* Recharts Bar Chart */}
              <div className="h-64 w-full mt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={waterUsage.chartPoints} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="date" stroke="#64748b" fontSize={11} />
                    <YAxis stroke="#64748b" fontSize={11} />
                    <Tooltip
                      formatter={(val) => [`${Number(val).toLocaleString()} Liters`, 'Water Volume']}
                      contentStyle={{
                        backgroundColor: '#ffffff',
                        borderColor: '#e2e8f0',
                        borderRadius: '0.75rem',
                        fontSize: '12px',
                      }}
                    />
                    <Bar dataKey="liters" fill="#0284c7" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-slate-200 p-8 text-center shadow-xs">
              <Waves className="w-10 h-10 text-slate-400 mx-auto mb-2" />
              <h3 className="text-base font-bold text-slate-900">No Water Usage Records Logged Yet</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
                Actual water consumption will be plotted here once completed activities or manual water logs are
                submitted. Simulated water savings are strictly omitted to maintain data integrity.
              </p>
            </div>
          )}

          {/* Water Usage Logs Table */}
          {waterUsage.records.length > 0 && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100">
                <h3 className="text-sm font-bold text-slate-900">Telemetry Log Records</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-semibold">
                    <tr>
                      <th className="px-6 py-3">Date</th>
                      <th className="px-6 py-3">Farm & Crop</th>
                      <th className="px-6 py-3">Quantity</th>
                      <th className="px-6 py-3">Duration</th>
                      <th className="px-6 py-3">Source</th>
                      <th className="px-6 py-3">Notes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {waterUsage.records.map((r) => (
                      <tr key={r._id} className="hover:bg-slate-50/70">
                        <td className="px-6 py-3.5 font-medium text-slate-800">
                          {new Date(r.date).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </td>
                        <td className="px-6 py-3.5">
                          <div className="font-semibold text-slate-900">{r.farm?.name}</div>
                          <div className="text-slate-400">{r.crop?.name || 'All Farm'}</div>
                        </td>
                        <td className="px-6 py-3.5 font-bold text-slate-900">
                          {r.volume} {r.unit}{' '}
                          {r.unit !== 'Liters' && (
                            <span className="text-slate-400 font-normal">
                              ({r.volumeLiters?.toLocaleString()} L)
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-3.5 text-slate-600">{r.durationMinutes} min</td>
                        <td className="px-6 py-3.5 text-slate-600">{r.waterSource}</td>
                        <td className="px-6 py-3.5 text-slate-500 truncate max-w-xs">{r.notes || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ======================================================================== */}
      {/* MODAL 1: CREATE / EDIT IRRIGATION PLAN                                   */}
      {/* ======================================================================== */}
      <Modal
        isOpen={showPlanModal}
        onClose={() => setShowPlanModal(false)}
        title={editingPlanId ? 'Edit Irrigation Plan' : 'Create New Irrigation Plan'}
        maxWidth="max-w-xl"
      >
        <form onSubmit={handleSubmitPlanForm} className="space-y-4 text-xs">
          {planFormError && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{planFormError}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Target Farm Parcel <span className="text-rose-500">*</span>
              </label>
              <select
                required
                value={planForm.farmId}
                onChange={(e) => {
                  const fId = e.target.value;
                  const availableCrops = getCropsForFarm(fId);
                  setPlanForm((prev) => ({
                    ...prev,
                    farmId: fId,
                    cropId: availableCrops[0]?._id || '',
                  }));
                }}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="">Select Farm Parcel</option>
                {farms.map((f) => (
                  <option key={f._id} value={f._id}>
                    {f.name} ({f.acreage} ac)
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Target Crop <span className="text-rose-500">*</span>
              </label>
              <select
                required
                value={planForm.cropId}
                onChange={(e) => {
                  const cId = e.target.value;
                  const c = crops.find((crop) => crop._id === cId);
                  setPlanForm((prev) => ({
                    ...prev,
                    cropId: cId,
                    cultivatedArea: c?.cultivatedArea || prev.cultivatedArea,
                  }));
                }}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="">Select Crop</option>
                {getCropsForFarm(planForm.farmId).map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.name} ({c.variety || 'Standard'})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Plan Name</label>
            <input
              type="text"
              placeholder="e.g. Sector A Micro-Drip Fertigation"
              value={planForm.name}
              onChange={(e) => setPlanForm((prev) => ({ ...prev, name: e.target.value }))}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Method</label>
              <select
                value={planForm.method}
                onChange={(e) => setPlanForm((prev) => ({ ...prev, method: e.target.value }))}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                {IRRIGATION_METHODS.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Frequency</label>
              <select
                value={planForm.frequency}
                onChange={(e) => setPlanForm((prev) => ({ ...prev, frequency: e.target.value }))}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                {IRRIGATION_FREQUENCIES.map((f) => (
                  <option key={f} value={f}>
                    {f}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Duration (Minutes)</label>
              <input
                type="number"
                min="1"
                max="1440"
                required
                value={planForm.plannedDurationMinutes}
                onChange={(e) => setPlanForm((prev) => ({ ...prev, plannedDurationMinutes: e.target.value }))}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Water Source</label>
              <select
                value={planForm.waterSource}
                onChange={(e) => setPlanForm((prev) => ({ ...prev, waterSource: e.target.value }))}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                {WATER_SOURCES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Cultivated Area (Acres)</label>
              <input
                type="number"
                step="0.1"
                min="0.1"
                required
                value={planForm.cultivatedArea}
                onChange={(e) => setPlanForm((prev) => ({ ...prev, cultivatedArea: e.target.value }))}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Notes & Specifications</label>
            <textarea
              rows={2}
              placeholder="e.g. In-line pressure compensator emitters spaced 40cm."
              value={planForm.notes}
              onChange={(e) => setPlanForm((prev) => ({ ...prev, notes: e.target.value }))}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowPlanModal(false)}
              disabled={submittingPlan}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={submittingPlan}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {submittingPlan ? 'Saving...' : editingPlanId ? 'Update Plan' : 'Create Plan'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* ======================================================================== */}
      {/* MODAL 2: SCHEDULE IRRIGATION ACTIVITY                                    */}
      {/* ======================================================================== */}
      <Modal
        isOpen={showScheduleModal}
        onClose={() => setShowScheduleModal(false)}
        title={editingScheduleId ? 'Edit Scheduled Activity' : 'Schedule Irrigation Run'}
        maxWidth="max-w-xl"
      >
        <form onSubmit={handleSubmitScheduleForm} className="space-y-4 text-xs">
          {scheduleFormError && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{scheduleFormError}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Target Farm Parcel <span className="text-rose-500">*</span>
              </label>
              <select
                required
                value={scheduleForm.farmId}
                onChange={(e) => {
                  const fId = e.target.value;
                  const availableCrops = getCropsForFarm(fId);
                  setScheduleForm((prev) => ({
                    ...prev,
                    farmId: fId,
                    cropId: availableCrops[0]?._id || '',
                  }));
                }}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="">Select Farm</option>
                {farms.map((f) => (
                  <option key={f._id} value={f._id}>
                    {f.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Crop <span className="text-rose-500">*</span>
              </label>
              <select
                required
                value={scheduleForm.cropId}
                onChange={(e) => setScheduleForm((prev) => ({ ...prev, cropId: e.target.value }))}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="">Select Crop</option>
                {getCropsForFarm(scheduleForm.farmId).map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.name} ({c.variety || 'Standard'})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Activity Title</label>
            <input
              type="text"
              placeholder="e.g. Morning Drip Run - Sector 1"
              value={scheduleForm.title}
              onChange={(e) => setScheduleForm((prev) => ({ ...prev, title: e.target.value }))}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Date & Time <span className="text-rose-500">*</span>
              </label>
              <input
                type="datetime-local"
                required
                value={scheduleForm.scheduledDate}
                onChange={(e) => setScheduleForm((prev) => ({ ...prev, scheduledDate: e.target.value }))}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Duration (Minutes)</label>
              <input
                type="number"
                min="1"
                max="1440"
                required
                value={scheduleForm.durationMinutes}
                onChange={(e) => setScheduleForm((prev) => ({ ...prev, durationMinutes: e.target.value }))}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Method</label>
              <select
                value={scheduleForm.method}
                onChange={(e) => setScheduleForm((prev) => ({ ...prev, method: e.target.value }))}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                {IRRIGATION_METHODS.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Water Source</label>
              <select
                value={scheduleForm.waterSource}
                onChange={(e) => setScheduleForm((prev) => ({ ...prev, waterSource: e.target.value }))}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                {WATER_SOURCES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Field Instructions / Notes</label>
            <textarea
              rows={2}
              placeholder="e.g. Inspect filter and verify emitter drippers."
              value={scheduleForm.notes}
              onChange={(e) => setScheduleForm((prev) => ({ ...prev, notes: e.target.value }))}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowScheduleModal(false)}
              disabled={submittingSchedule}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={submittingSchedule}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {submittingSchedule ? 'Scheduling...' : editingScheduleId ? 'Update Activity' : 'Confirm Schedule'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* ======================================================================== */}
      {/* MODAL 3: COMPLETE ACTIVITY & LOG WATER QUANTITY                          */}
      {/* ======================================================================== */}
      <Modal
        isOpen={Boolean(activityToComplete)}
        onClose={() => setActivityToComplete(null)}
        title="Complete Irrigation Activity"
        maxWidth="max-w-md"
      >
        {activityToComplete && (
          <form onSubmit={handleCompleteActivity} className="space-y-4 text-xs">
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-1">
              <span className="font-semibold text-slate-900 block truncate">
                {activityToComplete.title}
              </span>
              <p className="text-slate-500 truncate">
                {activityToComplete.farm?.name} · {activityToComplete.crop?.name} · {activityToComplete.durationMinutes} min
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Actual Water Applied
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  placeholder="e.g. 4500"
                  value={completionForm.waterVolume}
                  onChange={(e) => setCompletionForm((prev) => ({ ...prev, waterVolume: e.target.value }))}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Measurement Unit</label>
                <select
                  value={completionForm.waterUnit}
                  onChange={(e) => setCompletionForm((prev) => ({ ...prev, waterUnit: e.target.value }))}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  {WATER_UNITS.map((u) => (
                    <option key={u} value={u}>
                      {u}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Field Observations</label>
              <textarea
                rows={2}
                placeholder="e.g. Good lateral pressure, uniform emitter wetting pattern."
                value={completionForm.notes}
                onChange={(e) => setCompletionForm((prev) => ({ ...prev, notes: e.target.value }))}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setActivityToComplete(null)}
                disabled={submittingCompletion}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="sm"
                disabled={submittingCompletion}
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                {submittingCompletion ? 'Recording...' : 'Mark Completed'}
              </Button>
            </div>
          </form>
        )}
      </Modal>

      {/* ======================================================================== */}
      {/* MODAL 4: MANUAL WATER USAGE LOGGING                                      */}
      {/* ======================================================================== */}
      <Modal
        isOpen={showWaterModal}
        onClose={() => setShowWaterModal(false)}
        title="Log Water Consumption"
        maxWidth="max-w-md"
      >
        <form onSubmit={handleSubmitWaterForm} className="space-y-4 text-xs">
          {waterFormError && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{waterFormError}</span>
            </div>
          )}

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Farm Parcel <span className="text-rose-500">*</span>
            </label>
            <select
              required
              value={waterForm.farmId}
              onChange={(e) => {
                const fId = e.target.value;
                const available = getCropsForFarm(fId);
                setWaterForm((prev) => ({
                  ...prev,
                  farmId: fId,
                  cropId: available[0]?._id || '',
                }));
              }}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="">Select Farm</option>
              {farms.map((f) => (
                <option key={f._id} value={f._id}>
                  {f.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Crop (Optional)</label>
            <select
              value={waterForm.cropId}
              onChange={(e) => setWaterForm((prev) => ({ ...prev, cropId: e.target.value }))}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="">All Farm / Unspecified</option>
              {getCropsForFarm(waterForm.farmId).map((c) => (
                <option key={c._id} value={c._id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Volume <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                required
                placeholder="e.g. 5000"
                value={waterForm.volume}
                onChange={(e) => setWaterForm((prev) => ({ ...prev, volume: e.target.value }))}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Unit</label>
              <select
                value={waterForm.unit}
                onChange={(e) => setWaterForm((prev) => ({ ...prev, unit: e.target.value }))}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                {WATER_UNITS.map((u) => (
                  <option key={u} value={u}>
                    {u}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Date</label>
              <input
                type="date"
                required
                value={waterForm.date}
                onChange={(e) => setWaterForm((prev) => ({ ...prev, date: e.target.value }))}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Source</label>
              <select
                value={waterForm.waterSource}
                onChange={(e) => setWaterForm((prev) => ({ ...prev, waterSource: e.target.value }))}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                {WATER_SOURCES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Notes</label>
            <textarea
              rows={2}
              placeholder="e.g. Meter reading turn from canal feeder."
              value={waterForm.notes}
              onChange={(e) => setWaterForm((prev) => ({ ...prev, notes: e.target.value }))}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowWaterModal(false)}
              disabled={submittingWater}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={submittingWater}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {submittingWater ? 'Saving...' : 'Log Water Usage'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* ======================================================================== */}
      {/* MODAL 5: DELETE CONFIRMATION DIALOG                                      */}
      {/* ======================================================================== */}
      <Modal
        isOpen={Boolean(itemToDelete)}
        onClose={() => setItemToDelete(null)}
        title="Confirm Deletion"
        maxWidth="max-w-md"
      >
        {itemToDelete && (
          <div className="space-y-4 text-xs">
            <p className="text-slate-600 leading-relaxed">
              Are you sure you want to delete {itemToDelete.type === 'plan' ? 'irrigation plan' : 'scheduled activity'}{' '}
              <strong className="text-slate-900">{itemToDelete.name}</strong>? This action cannot be undone.
            </p>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setItemToDelete(null)}
                disabled={deletingItem}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={handleConfirmDelete}
                disabled={deletingItem}
                className="bg-rose-600 hover:bg-rose-700 text-white"
              >
                {deletingItem ? 'Deleting...' : 'Delete Permanently'}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
