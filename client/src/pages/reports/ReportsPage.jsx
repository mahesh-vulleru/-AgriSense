import { useState, useEffect, useMemo } from 'react';
import {
  BarChart3,
  Tractor,
  Sprout,
  Layers,
  Droplets,
  CloudSun,
  ScanEye,
  Download,
  FileText,
  RefreshCw,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  Filter,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  LineChart,
  Line,
} from 'recharts';
import reportService from '../../services/reportService.js';
import farmService from '../../services/farmService.js';
import cropService from '../../services/cropService.js';
import Button from '../../components/common/Button.jsx';
import Badge from '../../components/common/Badge.jsx';

// Color Palette for Analytics
const COLORS = ['#16a34a', '#0ea5e9', '#f59e0b', '#8b5cf6', '#ec4899', '#14b8a6', '#64748b'];
const HEALTH_COLORS = {
  Healthy: '#22c55e',
  Normal: '#3b82f6',
  'Needs Attention': '#f59e0b',
  'At Risk': '#f97316',
  Critical: '#ef4444',
};

const CATEGORIES = [
  { id: 'overview', name: 'Executive Overview', icon: BarChart3 },
  { id: 'farms', name: 'Farm Audit', icon: Tractor },
  { id: 'crops', name: 'Crop Performance & Yield', icon: Sprout },
  { id: 'soil', name: 'Soil Fertility & Health', icon: Layers },
  { id: 'irrigation', name: 'Irrigation & Water', icon: Droplets },
  { id: 'weather', name: 'Weather Advisory', icon: CloudSun },
  { id: 'disease', name: 'AI Disease Scans', icon: ScanEye },
];

export default function ReportsPage() {
  // Navigation & Category Tab
  const [activeCategory, setActiveCategory] = useState('overview');

  // Filters State
  const [farms, setFarms] = useState([]);
  const [crops, setCrops] = useState([]);
  const [selectedFarmId, setSelectedFarmId] = useState('');
  const [selectedCropId, setSelectedCropId] = useState('');

  // Date Range State
  const [datePreset, setDatePreset] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Data Loading & States
  const [loading, setLoading] = useState(true);
  const [reportData, setReportData] = useState(null);
  const [error, setError] = useState(null);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [exportingCsv, setExportingCsv] = useState(false);
  const [successNotice, setSuccessNotice] = useState(null);

  // Load Farms and Crops list for dropdown filters
  useEffect(() => {
    let isSubscribed = true;
    const fetchDropdowns = async () => {
      try {
        const [farmsRes, cropsRes] = await Promise.all([
          farmService.getFarms(),
          cropService.getCrops(),
        ]);
        if (isSubscribed) {
          const farmList = Array.isArray(farmsRes.farms)
            ? farmsRes.farms
            : Array.isArray(farmsRes?.data)
            ? farmsRes.data
            : [];
          setFarms(farmList);

          const cropList = Array.isArray(cropsRes.crops)
            ? cropsRes.crops
            : Array.isArray(cropsRes?.data)
            ? cropsRes.data
            : [];
          setCrops(cropList);
        }
      } catch (err) {
        if (isSubscribed) {
          setError(err?.response?.data?.message || 'Failed to load filter options');
        }
      }
    };
    fetchDropdowns();
    return () => {
      isSubscribed = false;
    };
  }, []);

  // Filter available crops dynamically based on farm selection
  const availableCrops = useMemo(() => {
    if (!selectedFarmId) return crops;
    return crops.filter((c) => {
      const cFarmId = c.farm?._id || c.farm?.id || c.farm;
      return String(cFarmId) === String(selectedFarmId);
    });
  }, [crops, selectedFarmId]);

  // Handle Preset Date selection
  const handleDatePresetChange = (preset) => {
    setDatePreset(preset);
    const now = new Date();
    let start = '';
    const end = now.toISOString().split('T')[0];

    if (preset === '7d') {
      const d = new Date(now.getTime() - 7 * 24 * 3600 * 1000);
      start = d.toISOString().split('T')[0];
    } else if (preset === '30d') {
      const d = new Date(now.getTime() - 30 * 24 * 3600 * 1000);
      start = d.toISOString().split('T')[0];
    } else if (preset === '90d') {
      const d = new Date(now.getTime() - 90 * 24 * 3600 * 1000);
      start = d.toISOString().split('T')[0];
    } else if (preset === 'ytd') {
      start = `${now.getFullYear()}-01-01`;
    } else if (preset === 'all') {
      start = '';
    }

    if (preset !== 'custom') {
      setStartDate(start);
      setEndDate(preset === 'all' ? '' : end);
    }
  };

  // Fetch report data when category or filters change
  useEffect(() => {
    let isSubscribed = true;
    const fetchReport = async () => {
      const params = {};
      if (selectedFarmId) params.farmId = selectedFarmId;
      if (selectedCropId) params.cropId = selectedCropId;
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;

      try {
        let res;
        if (activeCategory === 'overview') {
          res = await reportService.getSummary(params);
        } else if (activeCategory === 'farms') {
          res = await reportService.getFarms(params);
        } else if (activeCategory === 'crops') {
          res = await reportService.getCrops(params);
        } else if (activeCategory === 'soil') {
          res = await reportService.getSoil(params);
        } else if (activeCategory === 'irrigation') {
          res = await reportService.getIrrigation(params);
        } else if (activeCategory === 'weather') {
          res = await reportService.getWeather(params);
        } else if (activeCategory === 'disease') {
          res = await reportService.getDisease(params);
        }

        if (isSubscribed) {
          if (res?.success) {
            setReportData(res.data);
          } else {
            setError(res?.message || 'Failed to load report data');
          }
        }
      } catch (err) {
        if (isSubscribed) {
          setError(err?.response?.data?.message || err?.message || 'Error communicating with reports engine');
        }
      } finally {
        if (isSubscribed) {
          setLoading(false);
        }
      }
    };

    fetchReport();
    return () => {
      isSubscribed = false;
    };
  }, [activeCategory, selectedFarmId, selectedCropId, startDate, endDate]);

  const handleManualRefresh = async () => {
    setLoading(true);
    const params = {};
    if (selectedFarmId) params.farmId = selectedFarmId;
    if (selectedCropId) params.cropId = selectedCropId;
    if (startDate) params.startDate = startDate;
    if (endDate) params.endDate = endDate;

    try {
      let res;
      if (activeCategory === 'overview') res = await reportService.getSummary(params);
      else if (activeCategory === 'farms') res = await reportService.getFarms(params);
      else if (activeCategory === 'crops') res = await reportService.getCrops(params);
      else if (activeCategory === 'soil') res = await reportService.getSoil(params);
      else if (activeCategory === 'irrigation') res = await reportService.getIrrigation(params);
      else if (activeCategory === 'weather') res = await reportService.getWeather(params);
      else if (activeCategory === 'disease') res = await reportService.getDisease(params);

      if (res?.success) setReportData(res.data);
      else setError(res?.message || 'Failed to refresh report data');
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || 'Error refreshing report data');
    } finally {
      setLoading(false);
    }
  };

  // Export CSV Handler
  const handleExportCsv = async () => {
    setExportingCsv(true);
    setError(null);
    try {
      const params = {};
      if (selectedFarmId) params.farmId = selectedFarmId;
      if (selectedCropId) params.cropId = selectedCropId;
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;

      await reportService.downloadCsv(activeCategory, params);
      setSuccessNotice(`CSV report for ${activeCategory.toUpperCase()} exported successfully.`);
      setTimeout(() => setSuccessNotice(null), 4000);
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to export CSV report');
    } finally {
      setExportingCsv(false);
    }
  };

  // Export PDF Handler
  const handleExportPdf = async () => {
    setExportingPdf(true);
    setError(null);
    try {
      const params = {};
      if (selectedFarmId) params.farmId = selectedFarmId;
      if (selectedCropId) params.cropId = selectedCropId;
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;

      await reportService.downloadPdf(activeCategory, params);
      setSuccessNotice(`PDF report for ${activeCategory.toUpperCase()} downloaded successfully.`);
      setTimeout(() => setSuccessNotice(null), 4000);
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to export PDF report');
    } finally {
      setExportingPdf(false);
    }
  };

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
      {/* 1. Header Toolbar */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
              Agricultural Reports & Analytics
            </h1>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
              Phase 10
            </span>
          </div>
          <p className="mt-1 text-sm text-slate-500">
            Real-time farm audits, crop yield realization, soil chemistry, water telemetry, and AI foliar diagnostics.
          </p>
        </div>

        {/* Action Buttons: PDF, CSV, Refresh */}
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleManualRefresh}
            disabled={loading}
            className="border-slate-300 text-slate-700 hover:bg-slate-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCsv}
            disabled={exportingCsv || loading}
            className="border-slate-300 text-slate-700 hover:bg-slate-50"
          >
            {exportingCsv ? (
              <RefreshCw className="w-3.5 h-3.5 mr-1.5 animate-spin text-emerald-600" />
            ) : (
              <Download className="w-3.5 h-3.5 mr-1.5 text-emerald-600" />
            )}
            Export CSV
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={handleExportPdf}
            disabled={exportingPdf || loading}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-xs"
          >
            {exportingPdf ? (
              <RefreshCw className="w-3.5 h-3.5 mr-1.5 animate-spin" />
            ) : (
              <FileText className="w-3.5 h-3.5 mr-1.5" />
            )}
            Download PDF Report
          </Button>
        </div>
      </div>

      {/* Success Notification Banner */}
      {successNotice && (
        <div className="flex items-center justify-between p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-medium animate-fadeIn">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successNotice}</span>
          </div>
        </div>
      )}

      {/* Global Error Banner */}
      {error && (
        <div className="flex items-center justify-between p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            <span className="font-medium">{error}</span>
          </div>
          <button
            onClick={() => setError(null)}
            className="text-rose-700 hover:text-rose-900 font-semibold text-xs ml-4"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* 2. Global Filter & Date Range Bar */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs space-y-3">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-800 uppercase tracking-wider">
          <Filter className="w-3.5 h-3.5 text-emerald-600" />
          <span>Report Scope & Filtering</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          {/* Farm Parcel Selector */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
              Farm Parcel
            </label>
            <select
              value={selectedFarmId}
              onChange={(e) => {
                setSelectedFarmId(e.target.value);
                setSelectedCropId(''); // Reset crop filter when farm changes
              }}
              className="w-full text-xs rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="">All Farms (Entire Enterprise)</option>
              {farms.map((f) => {
                const fId = f._id || f.id;
                return (
                  <option key={fId} value={fId}>
                    {f.name} ({f.location || f.district})
                  </option>
                );
              })}
            </select>
          </div>

          {/* Crop Species Selector */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
              Crop Species
            </label>
            <select
              value={selectedCropId}
              onChange={(e) => setSelectedCropId(e.target.value)}
              className="w-full text-xs rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="">All Crop Species</option>
              {availableCrops.map((c) => {
                const cId = c._id || c.id;
                return (
                  <option key={cId} value={cId}>
                    {c.name} ({c.variety || 'Standard'}) · {c.growthStage || 'Vegetative'}
                  </option>
                );
              })}
            </select>
          </div>

          {/* Date Range Presets */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
              Time Horizon
            </label>
            <select
              value={datePreset}
              onChange={(e) => handleDatePresetChange(e.target.value)}
              className="w-full text-xs rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="all">All Historical Records</option>
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days</option>
              <option value="90d">Current Season (Last 90 Days)</option>
              <option value="ytd">Year to Date (YTD)</option>
              <option value="custom">Custom Date Range</option>
            </select>
          </div>

          {/* Custom Date Inputs if 'custom' selected */}
          {datePreset === 'custom' ? (
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">From</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full text-xs rounded-lg border border-slate-300 px-2 py-1.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">To</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full text-xs rounded-lg border border-slate-300 px-2 py-1.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>
          ) : (
            <div className="flex items-center text-xs text-slate-500 pt-6">
              <Calendar className="w-3.5 h-3.5 mr-1 text-slate-400" />
              <span>
                {startDate && endDate ? `${startDate} to ${endDate}` : 'Unbounded timeframe'}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* 3. Category Navigation Tabs */}
      <div className="flex overflow-x-auto gap-2 border-b border-slate-200 pb-2 no-scrollbar">
        {CATEGORIES.map((cat) => {
          const Icon = cat.icon;
          const isActive = activeCategory === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => {
                setLoading(true);
                setActiveCategory(cat.id);
              }}
              className={`px-3.5 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors flex items-center gap-2 ${
                isActive
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-300 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-emerald-600' : 'text-slate-400'}`} />
              {cat.name}
            </button>
          );
        })}
      </div>

      {/* 4. Loading Skeleton Indicator */}
      {loading && (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center shadow-xs space-y-3">
          <RefreshCw className="w-8 h-8 text-emerald-600 animate-spin mx-auto" />
          <h3 className="text-sm font-bold text-slate-800">Compiling Agricultural Intelligence</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Aggregating real database records across farm parcels, crop phenology, soil tests, water logs, and pathology scans...
          </p>
        </div>
      )}

      {/* 5. CATEGORY CONTENT VIEWS */}
      {!loading && reportData && (
        <div className="space-y-6">
          {/* =================================================================== */}
          {/* TAB 1: EXECUTIVE OVERVIEW                                          */}
          {/* =================================================================== */}
          {activeCategory === 'overview' && (
            <div className="space-y-6">
              {/* Executive KPI Cards Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
                  <div className="text-[11px] font-semibold text-slate-500 uppercase">Farms Owned</div>
                  <div className="text-2xl font-extrabold text-slate-900 mt-1">
                    {reportData.overview?.totalFarms || 0}
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">
                    {reportData.overview?.totalFarmAcreage || 0} Total Acres
                  </div>
                </div>

                <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
                  <div className="text-[11px] font-semibold text-slate-500 uppercase">Cultivated Area</div>
                  <div className="text-2xl font-extrabold text-emerald-700 mt-1">
                    {reportData.overview?.totalCultivatedArea || 0}
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">Acres Under Crop</div>
                </div>

                <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
                  <div className="text-[11px] font-semibold text-slate-500 uppercase">Active Crops</div>
                  <div className="text-2xl font-extrabold text-slate-900 mt-1">
                    {reportData.overview?.activeCropsCount || 0}
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">
                    {reportData.overview?.harvestedCropsCount || 0} Harvested
                  </div>
                </div>

                <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
                  <div className="text-[11px] font-semibold text-slate-500 uppercase">Soil Samples</div>
                  <div className="text-2xl font-extrabold text-slate-900 mt-1">
                    {reportData.overview?.totalSoilTests || 0}
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">
                    Avg pH: <strong className="text-slate-700">{reportData.overview?.avgPh || 'N/A'}</strong>
                  </div>
                </div>

                <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
                  <div className="text-[11px] font-semibold text-slate-500 uppercase">Water Usage</div>
                  <div className="text-2xl font-extrabold text-sky-700 mt-1">
                    {reportData.overview?.totalWaterVolumeM3 || 0}
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">
                    m³ ({Number(reportData.overview?.totalWaterVolumeLiters || 0).toLocaleString()} L)
                  </div>
                </div>

                <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
                  <div className="text-[11px] font-semibold text-slate-500 uppercase">AI Disease Scans</div>
                  <div className="text-2xl font-extrabold text-purple-700 mt-1">
                    {reportData.overview?.totalDiseaseScans || 0}
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">
                    {reportData.overview?.expertVerificationNeededCount || 0} Need Inspection
                  </div>
                </div>
              </div>

              {/* Yield Realization: Estimated vs Actual Harvest */}
              <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
                <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center justify-between">
                  <span>Harvest Yield Performance & Variance</span>
                  <span className="text-[11px] font-medium text-slate-500">
                    Calculated from registered sowing & harvest logs
                  </span>
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="p-3.5 bg-slate-50 rounded-lg border border-slate-200">
                    <span className="text-xs text-slate-500 block">Total Estimated Yield</span>
                    <span className="text-xl font-extrabold text-slate-800">
                      {reportData.overview?.estimatedYieldSum?.toLocaleString() || 0} kg
                    </span>
                    <span className="text-[10px] text-slate-400 block mt-0.5">
                      Based on expected yield per acre
                    </span>
                  </div>

                  <div className="p-3.5 bg-emerald-50 rounded-lg border border-emerald-200">
                    <span className="text-xs text-emerald-800 block">Actual Harvested Yield</span>
                    <span className="text-xl font-extrabold text-emerald-900">
                      {reportData.overview?.actualHarvestedYieldSum?.toLocaleString() || 0} kg
                    </span>
                    <span className="text-[10px] text-emerald-700 block mt-0.5">
                      {reportData.overview?.hasActualYieldData
                        ? 'Confirmed through completed harvest entries'
                        : 'No harvest records logged yet'}
                    </span>
                  </div>

                  <div className="p-3.5 bg-slate-50 rounded-lg border border-slate-200">
                    <span className="text-xs text-slate-500 block">Yield Variance</span>
                    <span className="text-xl font-extrabold text-slate-800">
                      {reportData.overview?.hasActualYieldData
                        ? `${(
                            reportData.overview.actualHarvestedYieldSum -
                            reportData.overview.estimatedYieldSum
                          ).toLocaleString()} kg`
                        : 'Pending Harvest'}
                    </span>
                    <span className="text-[10px] text-slate-400 block mt-0.5">
                      Difference between actual harvest & projection
                    </span>
                  </div>
                </div>
              </div>

              {/* Analytics Charts Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Crop Health Distribution */}
                <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
                  <h3 className="text-sm font-bold text-slate-900 mb-4">
                    Crop Health Status Breakdown
                  </h3>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={Object.entries(reportData.distributions?.cropHealth || {}).map(
                          ([status, count]) => ({ status, count })
                        )}
                      >
                        <XAxis dataKey="status" tick={{ fontSize: 11 }} />
                        <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                        <Tooltip />
                        <Bar dataKey="count" fill="#22c55e" radius={[4, 4, 0, 0]}>
                          {Object.entries(reportData.distributions?.cropHealth || {}).map(
                            ([status], idx) => (
                              <Cell
                                key={`cell-${idx}`}
                                fill={HEALTH_COLORS[status] || COLORS[idx % COLORS.length]}
                              />
                            )
                          )}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* AI Disease Scans Status Distribution */}
                <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
                  <h3 className="text-sm font-bold text-slate-900 mb-4">
                    AI Crop Pathology Diagnostics
                  </h3>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={Object.entries(reportData.distributions?.diseaseStatus || {})
                            .filter(([, count]) => count > 0)
                            .map(([name, value]) => ({ name, value }))}
                          cx="50%"
                          cy="50%"
                          outerRadius={80}
                          dataKey="value"
                          label={({ name, value }) => `${name}: ${value}`}
                        >
                          {Object.entries(reportData.distributions?.diseaseStatus || {}).map(
                            (_, idx) => (
                              <Cell key={`cell-${idx}`} fill={COLORS[idx % COLORS.length]} />
                            )
                          )}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              {/* Critical Alerts Banner List */}
              {reportData.criticalAlerts && reportData.criticalAlerts.length > 0 && (
                <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-3">
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-rose-600" />
                    <span>Active Agronomic Risk Alerts ({reportData.criticalAlerts.length})</span>
                  </h3>
                  <div className="space-y-2">
                    {reportData.criticalAlerts.map((alert, idx) => (
                      <div
                        key={idx}
                        className="p-3 bg-rose-50/70 border border-rose-200 rounded-lg text-xs flex items-start justify-between gap-3"
                      >
                        <div>
                          <div className="font-bold text-rose-900">
                            {alert.type} · <span className="font-semibold text-rose-700">{alert.target}</span> ({alert.farm})
                          </div>
                          <p className="text-rose-800 mt-0.5">{alert.message}</p>
                        </div>
                        <Badge variant="danger">{alert.severity}</Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* =================================================================== */}
          {/* TAB 2: FARM AUDIT REPORTS                                          */}
          {/* =================================================================== */}
          {activeCategory === 'farms' && (
            <div className="space-y-4">
              {Array.isArray(reportData) && reportData.length > 0 ? (
                <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
                  <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                    <div>
                      <h3 className="text-base font-bold text-slate-900">Farm Audit & Land Utilization</h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Detailed acreage, soil classifications, registered crops, and historical water consumption
                      </p>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-semibold">
                        <tr>
                          <th className="px-6 py-3">Farm Name & Location</th>
                          <th className="px-6 py-3">Total Area</th>
                          <th className="px-6 py-3">Cultivated Area</th>
                          <th className="px-6 py-3">Soil / Irrigation</th>
                          <th className="px-6 py-3">Crops Count</th>
                          <th className="px-6 py-3">Water Used</th>
                          <th className="px-6 py-3">Weather Observation</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {reportData.map((f) => (
                          <tr key={f.id} className="hover:bg-slate-50/70 transition-colors">
                            <td className="px-6 py-3.5">
                              <div className="font-bold text-slate-900">{f.name}</div>
                              <div className="text-[11px] text-slate-500">{f.location}</div>
                            </td>
                            <td className="px-6 py-3.5 font-bold text-slate-800">
                              {f.acreage} Acres
                            </td>
                            <td className="px-6 py-3.5">
                              <div className="font-semibold text-emerald-700">
                                {f.cultivatedArea} Acres
                              </div>
                              <div className="text-[10px] text-slate-400">
                                {f.unutilizedArea} Acres Unplanted
                              </div>
                            </td>
                            <td className="px-6 py-3.5 text-slate-600">
                              <div>{f.soilType} Soil</div>
                              <div className="text-[10px] text-slate-400">{f.irrigationType}</div>
                            </td>
                            <td className="px-6 py-3.5 text-slate-700">
                              <Badge variant="success">{f.cropsCount} Crops</Badge>
                            </td>
                            <td className="px-6 py-3.5 text-slate-700">
                              <div className="font-bold">{f.waterUsedM3} m³</div>
                              <div className="text-[10px] text-slate-400">
                                {Number(f.waterUsedLiters || 0).toLocaleString()} L
                              </div>
                            </td>
                            <td className="px-6 py-3.5">
                              {f.weatherSummary ? (
                                <div className="text-[11px] text-slate-600">
                                  <strong>{f.weatherSummary.temp}°C</strong> · {f.weatherSummary.condition}
                                </div>
                              ) : (
                                <span className="text-slate-400 italic text-[11px]">No GPS Station</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-500 text-xs shadow-xs">
                  No farm records matching the specified filters.
                </div>
              )}
            </div>
          )}

          {/* =================================================================== */}
          {/* TAB 3: CROP PERFORMANCE & YIELD REALIZATION                        */}
          {/* =================================================================== */}
          {activeCategory === 'crops' && (
            <div className="space-y-4">
              {Array.isArray(reportData) && reportData.length > 0 ? (
                <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
                  <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                    <div>
                      <h3 className="text-base font-bold text-slate-900">Crop Performance & Yield Realization</h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Cultivated area, lifecycle growth stages, estimated projections vs actual verified harvest
                      </p>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-semibold">
                        <tr>
                          <th className="px-6 py-3">Crop Species</th>
                          <th className="px-6 py-3">Farm Parcel</th>
                          <th className="px-6 py-3">Area & Season</th>
                          <th className="px-6 py-3">Growth Stage</th>
                          <th className="px-6 py-3">Health Status</th>
                          <th className="px-6 py-3">Estimated Yield</th>
                          <th className="px-6 py-3">Actual Harvested Yield</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {reportData.map((c) => (
                          <tr key={c.id} className="hover:bg-slate-50/70 transition-colors">
                            <td className="px-6 py-3.5">
                              <div className="font-bold text-slate-900">{c.name}</div>
                              <div className="text-[11px] text-slate-500">{c.variety || 'Standard'}</div>
                            </td>
                            <td className="px-6 py-3.5 font-medium text-slate-700">
                              {c.farm?.name}
                            </td>
                            <td className="px-6 py-3.5 text-slate-600">
                              <div>{c.cultivatedArea} Acres</div>
                              <div className="text-[10px] text-slate-400">{c.season || 'Annual'}</div>
                            </td>
                            <td className="px-6 py-3.5 font-semibold text-slate-800">
                              {c.growthStage}
                            </td>
                            <td className="px-6 py-3.5">
                              <Badge
                                variant={
                                  c.healthStatus === 'Healthy'
                                    ? 'success'
                                    : c.healthStatus === 'Critical'
                                    ? 'danger'
                                    : 'warning'
                                }
                              >
                                {c.healthStatus}
                              </Badge>
                            </td>
                            <td className="px-6 py-3.5 text-slate-600">
                              <div className="font-semibold">{c.yield.estimatedTotalYield || 'N/A'} kg</div>
                              <div className="text-[10px] text-slate-400">Estimated</div>
                            </td>
                            <td className="px-6 py-3.5">
                              {c.yield.hasActualYield ? (
                                <div>
                                  <div className="font-extrabold text-emerald-700">
                                    {c.yield.actualHarvestedYield} {c.yield.yieldUnit}
                                  </div>
                                  <div className="text-[10px] text-slate-500">
                                    {c.yield.qualityGrade} · {c.actualHarvestDate ? new Date(c.actualHarvestDate).toLocaleDateString() : 'Harvested'}
                                  </div>
                                </div>
                              ) : (
                                <span className="text-[11px] text-slate-400 italic">Pending Harvest</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-500 text-xs shadow-xs">
                  No crop performance records matching the specified filters.
                </div>
              )}
            </div>
          )}

          {/* =================================================================== */}
          {/* TAB 4: SOIL FERTILITY & HEALTH                                      */}
          {/* =================================================================== */}
          {activeCategory === 'soil' && (
            <div className="space-y-6">
              {/* NPK Distribution Chart */}
              {reportData.records && reportData.records.length > 0 && (
                <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
                  <h3 className="text-sm font-bold text-slate-900 mb-4">
                    Soil Macro-Nutrient Comparisons (N, P, K in kg/ha)
                  </h3>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={reportData.records}>
                        <XAxis dataKey="sampleId" tick={{ fontSize: 11 }} />
                        <YAxis tick={{ fontSize: 11 }} />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="nitrogen.value" name="Nitrogen (N)" fill="#22c55e" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="phosphorus.value" name="Phosphorus (P)" fill="#0ea5e9" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="potassium.value" name="Potassium (K)" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

              {/* Soil Records Table */}
              {reportData.records && reportData.records.length > 0 ? (
                <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
                  <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                    <div>
                      <h3 className="text-base font-bold text-slate-900">Soil Analysis Log</h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Laboratory pH, organic carbon, salinity (EC), and fertility classifications
                      </p>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-semibold">
                        <tr>
                          <th className="px-6 py-3">Sample ID & Farm</th>
                          <th className="px-6 py-3">Date Tested</th>
                          <th className="px-6 py-3">Soil pH</th>
                          <th className="px-6 py-3">N - P - K (kg/ha)</th>
                          <th className="px-6 py-3">Organic Carbon</th>
                          <th className="px-6 py-3">EC (dS/m)</th>
                          <th className="px-6 py-3">Health Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {reportData.records.map((s) => (
                          <tr key={s.id} className="hover:bg-slate-50/70 transition-colors">
                            <td className="px-6 py-3.5">
                              <div className="font-bold text-slate-900">{s.sampleId}</div>
                              <div className="text-[11px] text-slate-500">{s.farm?.name} ({s.soilType})</div>
                            </td>
                            <td className="px-6 py-3.5 text-slate-600">
                              {new Date(s.sampleDate).toLocaleDateString()}
                            </td>
                            <td className="px-6 py-3.5">
                              <div className="font-bold text-slate-900">{s.pH.value}</div>
                              <div className="text-[10px] text-slate-400">{s.pH.rating}</div>
                            </td>
                            <td className="px-6 py-3.5 text-slate-700 font-medium">
                              {s.nitrogen.value} - {s.phosphorus.value} - {s.potassium.value}
                            </td>
                            <td className="px-6 py-3.5 text-slate-600">
                              {s.organicCarbon.value}% ({s.organicCarbon.rating})
                            </td>
                            <td className="px-6 py-3.5 text-slate-600">
                              {s.electricalConductivity.value} ({s.electricalConductivity.rating})
                            </td>
                            <td className="px-6 py-3.5">
                              <Badge variant={s.overallHealth === 'Optimal' ? 'success' : 'warning'}>
                                {s.overallHealth}
                              </Badge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-500 text-xs shadow-xs">
                  No verified soil tests recorded for this selection.
                </div>
              )}
            </div>
          )}

          {/* =================================================================== */}
          {/* TAB 5: IRRIGATION & WATER USAGE                                     */}
          {/* =================================================================== */}
          {activeCategory === 'irrigation' && (
            <div className="space-y-6">
              {/* Water Consumption Timeline AreaChart */}
              {reportData.waterTimeline && reportData.waterTimeline.length > 0 && (
                <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
                  <h3 className="text-sm font-bold text-slate-900 mb-4">
                    Historical Water Consumption (m³ per Session)
                  </h3>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={reportData.waterTimeline}>
                        <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                        <YAxis tick={{ fontSize: 11 }} />
                        <Tooltip />
                        <Area
                          type="monotone"
                          dataKey="m3"
                          name="Water Consumed (m³)"
                          stroke="#0284c7"
                          fill="#38bdf8"
                          fillOpacity={0.3}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

              {/* Irrigation Schedules Table */}
              {reportData.schedules && reportData.schedules.length > 0 ? (
                <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
                  <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                    <div>
                      <h3 className="text-base font-bold text-slate-900">Irrigation Sessions & Water Deliveries</h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Total Volume: <strong>{reportData.summary?.totalWaterVolumeM3} m³</strong> ({Number(reportData.summary?.totalWaterVolumeLiters || 0).toLocaleString()} Liters)
                      </p>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-semibold">
                        <tr>
                          <th className="px-6 py-3">Session Title</th>
                          <th className="px-6 py-3">Farm & Crop</th>
                          <th className="px-6 py-3">Scheduled Date</th>
                          <th className="px-6 py-3">Method & Source</th>
                          <th className="px-6 py-3">Duration</th>
                          <th className="px-6 py-3">Water Used</th>
                          <th className="px-6 py-3">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {reportData.schedules.map((i) => (
                          <tr key={i.id} className="hover:bg-slate-50/70 transition-colors">
                            <td className="px-6 py-3.5 font-bold text-slate-900">{i.title}</td>
                            <td className="px-6 py-3.5">
                              <div className="font-semibold text-slate-800">{i.farm?.name}</div>
                              <div className="text-[11px] text-slate-500">{i.crop?.name}</div>
                            </td>
                            <td className="px-6 py-3.5 text-slate-600">
                              {new Date(i.scheduledDate).toLocaleDateString()}
                            </td>
                            <td className="px-6 py-3.5 text-slate-600">
                              <div>{i.method}</div>
                              <div className="text-[10px] text-slate-400">{i.waterSource}</div>
                            </td>
                            <td className="px-6 py-3.5 text-slate-700 font-medium">
                              {i.durationMinutes} Mins
                            </td>
                            <td className="px-6 py-3.5 font-bold text-sky-700">
                              {Number(i.waterUsedLiters || 0).toLocaleString()} L
                            </td>
                            <td className="px-6 py-3.5">
                              <Badge
                                variant={
                                  i.status === 'Completed'
                                    ? 'success'
                                    : i.status === 'In Progress'
                                    ? 'warning'
                                    : 'neutral'
                                }
                              >
                                {i.status}
                              </Badge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-500 text-xs shadow-xs">
                  No irrigation records logged for this filter scope.
                </div>
              )}
            </div>
          )}

          {/* =================================================================== */}
          {/* TAB 6: WEATHER ADVISORY & RISKS                                    */}
          {/* =================================================================== */}
          {activeCategory === 'weather' && (
            <div className="space-y-6">
              {Array.isArray(reportData) && reportData.length > 0 ? (
                reportData.map((wReport) => (
                  <div
                    key={wReport.farm.id}
                    className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-3 border-b border-slate-100 gap-2">
                      <div>
                        <h3 className="text-base font-bold text-slate-900">{wReport.farm.name}</h3>
                        <p className="text-xs text-slate-500">{wReport.farm.location} · Provider: {wReport.provider}</p>
                      </div>
                      {wReport.currentObservation && (
                        <div className="text-right">
                          <span className="text-xl font-extrabold text-slate-900">
                            {wReport.currentObservation.temp}°C
                          </span>
                          <span className="block text-xs text-slate-500">
                            {wReport.currentObservation.condition} · Humidity: {wReport.currentObservation.humidity}%
                          </span>
                        </div>
                      )}
                    </div>

                    {/* 5-Day Forecast Trends Chart */}
                    {wReport.forecastSummary && wReport.forecastSummary.length > 0 && (
                      <div>
                        <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                          5-Day Weather Forecast Trend (Not Historical Weather)
                        </h4>
                        <div className="h-48">
                          <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={wReport.forecastSummary}>
                              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                              <YAxis tick={{ fontSize: 11 }} />
                              <Tooltip />
                              <Legend />
                              <Line
                                type="monotone"
                                dataKey="tempMax"
                                name="Max Temp (°C)"
                                stroke="#f97316"
                                strokeWidth={2}
                              />
                              <Line
                                type="monotone"
                                dataKey="tempMin"
                                name="Min Temp (°C)"
                                stroke="#0ea5e9"
                                strokeWidth={2}
                              />
                            </LineChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                    )}

                    {/* Weather-Driven Agronomic Risks */}
                    {wReport.agronomicRisks && wReport.agronomicRisks.length > 0 && (
                      <div className="pt-2">
                        <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                          Evaluated Weather Risks
                        </h4>
                        <div className="space-y-2">
                          {wReport.agronomicRisks.map((risk, idx) => (
                            <div
                              key={idx}
                              className="p-3 bg-amber-50/70 border border-amber-200 rounded-lg text-xs"
                            >
                              <div className="font-bold text-amber-900">{risk.type}</div>
                              <p className="text-amber-800 mt-0.5">{risk.description}</p>
                              <div className="mt-1 text-[11px] text-amber-900 font-semibold">
                                Advisory: {risk.recommendation}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-500 text-xs shadow-xs">
                  No weather observations available.
                </div>
              )}
            </div>
          )}

          {/* =================================================================== */}
          {/* TAB 7: AI DISEASE DIAGNOSTICS                                      */}
          {/* =================================================================== */}
          {activeCategory === 'disease' && (
            <div className="space-y-4">
              {/* Disclaimer notice */}
              <div className="p-3.5 bg-slate-100 border border-slate-200 rounded-xl text-slate-600 text-xs">
                <strong>DISCLAIMER & LEGAL ADVISORY:</strong> {reportData.summary?.disclaimer}
              </div>

              {reportData.scans && reportData.scans.length > 0 ? (
                <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
                  <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                    <div>
                      <h3 className="text-base font-bold text-slate-900">AI Pathology Scan Records</h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Google Gemini ({reportData.scans[0]?.aiModel || 'gemini-2.5-flash-lite'}) Diagnostic History
                      </p>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-semibold">
                        <tr>
                          <th className="px-6 py-3">Timestamp</th>
                          <th className="px-6 py-3">Crop & Farm</th>
                          <th className="px-6 py-3">Diagnosis Assessment</th>
                          <th className="px-6 py-3">Diagnostic Status</th>
                          <th className="px-6 py-3">Physical Symptoms</th>
                          <th className="px-6 py-3">AI Model & Calibration</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {reportData.scans.map((d) => (
                          <tr key={d.id} className="hover:bg-slate-50/70 transition-colors">
                            <td className="px-6 py-3.5 text-slate-600">
                              {new Date(d.scanTimestamp).toLocaleDateString()}
                              <div className="text-[10px] text-slate-400">
                                {new Date(d.scanTimestamp).toLocaleTimeString([], {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </div>
                            </td>
                            <td className="px-6 py-3.5">
                              <div className="font-bold text-slate-900">{d.crop?.name}</div>
                              <div className="text-[11px] text-slate-500">{d.farm?.name}</div>
                            </td>
                            <td className="px-6 py-3.5 font-bold text-slate-900">
                              {d.possibleDisease}
                            </td>
                            <td className="px-6 py-3.5">
                              <Badge
                                variant={
                                  d.status === 'Healthy'
                                    ? 'success'
                                    : d.status === 'Diseased' || d.status === 'Pest Damage'
                                    ? 'danger'
                                    : 'neutral'
                                }
                              >
                                {d.status}
                              </Badge>
                            </td>
                            <td className="px-6 py-3.5 text-slate-600 max-w-xs truncate">
                              {(d.visibleSymptoms || []).join(', ') || 'No symptoms noted'}
                            </td>
                            <td className="px-6 py-3.5 text-slate-500 text-[11px]">
                              <div>{d.aiModel}</div>
                              <span className="text-[10px] text-slate-400">{d.confidenceNote}</span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-500 text-xs shadow-xs">
                  No disease scans recorded for this selection.
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
