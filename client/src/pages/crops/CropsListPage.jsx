import { useState, useEffect, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Sprout,
  Plus,
  RefreshCw,
  Search,
  ArrowUpDown,
  LayoutGrid,
  List as ListIcon,
  Tractor,
  Calendar,
  Clock,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  Edit,
  X,
  Layers,
} from 'lucide-react';
import cropService from '../../services/cropService.js';
import farmService from '../../services/farmService.js';
import Button from '../../components/common/Button.jsx';
import Badge from '../../components/common/Badge.jsx';
import {
  GROWTH_STAGES,
  STAGE_CONFIG,
  CROP_CATEGORIES,
  CROP_SEASONS,
} from '../../constants/cropConstants.js';

export default function CropsListPage() {
  const [crops, setCrops] = useState([]);
  const [farms, setFarms] = useState([]);
  const [summary, setSummary] = useState({
    totalCrops: 0,
    activeCrops: 0,
    harvestedCrops: 0,
    nearingHarvest: 0,
    totalCultivatedArea: 0,
    cropVarietiesCount: 0,
    cropsByFarm: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters & Controls
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFarm, setSelectedFarm] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedStage, setSelectedStage] = useState('all');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedSeason, setSelectedSeason] = useState('All');
  const [sortOption, setSortOption] = useState('newest');
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'list'
  const [groupByFarm, setGroupByFarm] = useState(false);

  // Quick Stage Update Modal state
  const [stageModalCrop, setStageModalCrop] = useState(null);
  const [newStage, setNewStage] = useState('');
  const [stageNotes, setStageNotes] = useState('');
  const [updatingStage, setUpdatingStage] = useState(false);

  // Load Crops and Farms
  const loadCropsAndFarms = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [cropsRes, farmsRes] = await Promise.allSettled([
        cropService.getCrops(),
        farmService.getFarms(),
      ]);

      if (cropsRes.status === 'fulfilled' && cropsRes.value.success) {
        setCrops(cropsRes.value.crops || []);
        if (cropsRes.value.summary) {
          setSummary(cropsRes.value.summary);
        }
      } else if (cropsRes.status === 'rejected') {
        throw new Error(cropsRes.reason?.response?.data?.message || 'Failed to load crops');
      }

      if (farmsRes.status === 'fulfilled' && farmsRes.value.success) {
        setFarms(farmsRes.value.farms || []);
      }
    } catch (err) {
      console.error('[CROPS_PAGE_FETCH_ERROR]', err);
      setError(err.message || 'Error connecting to crops API');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    const fetchInitial = async () => {
      try {
        const [cropsRes, farmsRes] = await Promise.allSettled([
          cropService.getCrops(),
          farmService.getFarms(),
        ]);

        if (!active) return;

        if (cropsRes.status === 'fulfilled' && cropsRes.value.success) {
          setCrops(cropsRes.value.crops || []);
          if (cropsRes.value.summary) {
            setSummary(cropsRes.value.summary);
          }
        } else if (cropsRes.status === 'rejected') {
          setError(cropsRes.reason?.response?.data?.message || 'Failed to load crops');
        }

        if (farmsRes.status === 'fulfilled' && farmsRes.value.success) {
          setFarms(farmsRes.value.farms || []);
        }
      } catch (err) {
        if (active) setError(err.message || 'Error connecting to crops API');
      } finally {
        if (active) setLoading(false);
      }
    };

    fetchInitial();

    return () => {
      active = false;
    };
  }, []);

  // Client-side filtering & sorting
  const filteredCrops = useMemo(() => {
    let result = [...crops];

    if (selectedFarm !== 'all') {
      result = result.filter(
        (c) => (c.farm?._id || c.farm?.id || c.farm) === selectedFarm
      );
    }

    if (selectedStatus !== 'all') {
      result = result.filter((c) => c.status === selectedStatus);
    }

    if (selectedStage !== 'all') {
      result = result.filter((c) => c.growthStage === selectedStage);
    }

    if (selectedCategory !== 'All') {
      result = result.filter((c) => c.category === selectedCategory);
    }

    if (selectedSeason !== 'All') {
      result = result.filter((c) => c.season === selectedSeason);
    }

    if (searchTerm.trim()) {
      const q = searchTerm.trim().toLowerCase();
      result = result.filter((c) => {
        const nameMatch = c.name?.toLowerCase().includes(q);
        const varietyMatch = c.variety?.toLowerCase().includes(q);
        const farmMatch = c.farm?.name?.toLowerCase().includes(q);
        const stageMatch = c.growthStage?.toLowerCase().includes(q);
        const notesMatch = c.notes?.toLowerCase().includes(q);
        return nameMatch || varietyMatch || farmMatch || stageMatch || notesMatch;
      });
    }

    result.sort((a, b) => {
      switch (sortOption) {
        case 'name-asc':
          return (a.name || '').localeCompare(b.name || '');
        case 'harvest-soonest': {
          const tA = a.expectedHarvestDate ? new Date(a.expectedHarvestDate).getTime() : Infinity;
          const tB = b.expectedHarvestDate ? new Date(b.expectedHarvestDate).getTime() : Infinity;
          return tA - tB;
        }
        case 'area-desc':
          return (Number(b.cultivatedArea) || 0) - (Number(a.cultivatedArea) || 0);
        case 'newest':
        default:
          return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
      }
    });

    return result;
  }, [
    crops,
    selectedFarm,
    selectedStatus,
    selectedStage,
    selectedCategory,
    selectedSeason,
    searchTerm,
    sortOption,
  ]);

  // Grouped by Farm
  const groupedCrops = useMemo(() => {
    if (!groupByFarm) return null;
    const groups = {};
    filteredCrops.forEach((crop) => {
      const farmName = crop.farm?.name || 'Unassigned Farm';
      if (!groups[farmName]) {
        groups[farmName] = {
          farm: crop.farm,
          crops: [],
          totalArea: 0,
        };
      }
      groups[farmName].crops.push(crop);
      groups[farmName].totalArea += Number(crop.cultivatedArea) || 0;
    });
    return Object.entries(groups).map(([farmName, data]) => ({
      farmName,
      ...data,
      totalArea: Number(data.totalArea.toFixed(2)),
    }));
  }, [filteredCrops, groupByFarm]);

  const handleResetFilters = () => {
    setSearchTerm('');
    setSelectedFarm('all');
    setSelectedStatus('all');
    setSelectedStage('all');
    setSelectedCategory('All');
    setSelectedSeason('All');
    setSortOption('newest');
  };

  // Open Stage Modal
  const openStageModal = (crop) => {
    setStageModalCrop(crop);
    setNewStage(crop.growthStage || 'Vegetative Growth');
    setStageNotes('');
  };

  // Submit Stage Update
  const handleStageUpdateSubmit = async (e) => {
    e.preventDefault();
    if (!stageModalCrop || !newStage) return;

    try {
      setUpdatingStage(true);
      const cropId = stageModalCrop._id || stageModalCrop.id;
      const res = await cropService.updateCropStage(cropId, {
        stage: newStage,
        notes: stageNotes,
      });

      if (res.success) {
        setCrops((prev) =>
          prev.map((c) =>
            (c._id || c.id) === cropId ? { ...c, ...res.crop } : c
          )
        );
        setStageModalCrop(null);
        loadCropsAndFarms(); // refresh summary counts
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update growth stage');
    } finally {
      setUpdatingStage(false);
    }
  };

  const formatDate = (dateVal) => {
    if (!dateVal) return null;
    try {
      const d = new Date(dateVal);
      if (isNaN(d.getTime())) return null;
      return d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return null;
    }
  };

  const getHarvestTimeline = (expectedHarvestDate, growthStage) => {
    if (growthStage === 'Harvested') {
      return { text: 'Harvest Completed', isOverdue: false, isCompleted: true, days: 0 };
    }
    if (!expectedHarvestDate) {
      return { text: 'Target harvest date not set', isOverdue: false, isCompleted: false, days: null };
    }
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const target = new Date(expectedHarvestDate);
    target.setHours(0, 0, 0, 0);
    const diffDays = Math.ceil((target - today) / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return {
        text: `Overdue by ${Math.abs(diffDays)} day${Math.abs(diffDays) === 1 ? '' : 's'}`,
        isOverdue: true,
        isCompleted: false,
        days: diffDays,
      };
    }
    if (diffDays === 0) {
      return { text: 'Harvest due today', isOverdue: false, isCompleted: false, days: 0 };
    }
    return {
      text: `${diffDays} day${diffDays === 1 ? '' : 's'} until harvest`,
      isOverdue: false,
      isCompleted: false,
      days: diffDays,
    };
  };

  return (
    <div className="space-y-6">
      {/* 1. Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-[#166534] to-[#145A32] text-white shadow-sm">
            <Sprout className="h-6 w-6 text-[#22C55E]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-bold text-[#17251B] tracking-tight">
                Crop Management & Lifecycle
              </h1>
              <Badge size="sm" variant="forest" dot>
                11-Stage Tracking
              </Badge>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              Track phenological growth stages, harvest schedules, and parcel crop distribution
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            icon={RefreshCw}
            onClick={loadCropsAndFarms}
            disabled={loading}
            className="bg-white text-xs hover:bg-[#F7F9F5]"
          >
            Refresh
          </Button>

          <Link to="/dashboard/crops/new">
            <Button
              variant="primary"
              size="sm"
              icon={Plus}
              className="shadow-sm text-xs"
            >
              Add Crop
            </Button>
          </Link>
        </div>
      </div>

      {/* 2. Error Alert */}
      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50/80 p-4 text-rose-800 flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
          <Button variant="outline" size="sm" onClick={loadCropsAndFarms} className="text-xs bg-white">
            Retry
          </Button>
        </div>
      )}

      {/* 3. Summary Statistics Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        {/* Total Crops */}
        <div className="rounded-xl bg-white border border-slate-200/80 p-4 shadow-2xs hover:border-[#166534]/40 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              Total Crops
            </span>
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#DCFCE7] text-[#166534]">
              <Sprout className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="text-2xl font-black text-[#17251B] mt-1.5">
            {loading ? '...' : summary.totalCrops}
          </div>
          <p className="text-[11px] text-slate-500 font-medium mt-0.5">
            Registered plantings
          </p>
        </div>

        {/* Active Crops */}
        <div className="rounded-xl bg-white border border-slate-200/80 p-4 shadow-2xs hover:border-emerald-500/40 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              Active Growing
            </span>
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-100/70 text-[#166534]">
              <CheckCircle2 className="h-3.5 w-3.5 text-[#22C55E]" />
            </div>
          </div>
          <div className="text-2xl font-black text-[#166534] mt-1.5">
            {loading ? '...' : summary.activeCrops}
          </div>
          <p className="text-[11px] text-emerald-700 font-medium mt-0.5">
            In field lifecycle
          </p>
        </div>

        {/* Nearing Harvest */}
        <div className="rounded-xl bg-white border border-slate-200/80 p-4 shadow-2xs hover:border-amber-500/40 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              Nearing Harvest
            </span>
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-100/70 text-amber-700">
              <Clock className="h-3.5 w-3.5 text-amber-600" />
            </div>
          </div>
          <div className="text-2xl font-black text-amber-700 mt-1.5">
            {loading ? '...' : summary.nearingHarvest}
          </div>
          <p className="text-[11px] text-amber-800 font-medium mt-0.5">
            Due within 14 days
          </p>
        </div>

        {/* Harvested Crops */}
        <div className="rounded-xl bg-white border border-slate-200/80 p-4 shadow-2xs hover:border-sky-500/40 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              Harvested
            </span>
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-sky-100/70 text-sky-700">
              <Calendar className="h-3.5 w-3.5 text-sky-600" />
            </div>
          </div>
          <div className="text-2xl font-black text-sky-800 mt-1.5">
            {loading ? '...' : summary.harvestedCrops}
          </div>
          <p className="text-[11px] text-sky-700 font-medium mt-0.5">
            Completed harvests
          </p>
        </div>

        {/* Total Cultivated Area */}
        <div className="rounded-xl bg-white border border-slate-200/80 p-4 shadow-2xs hover:border-[#145A32]/40 transition-all col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              Total Cultivated
            </span>
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#DCFCE7] text-[#145A32]">
              <Layers className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="text-2xl font-black text-[#145A32] mt-1.5">
            {loading ? '...' : summary.totalCultivatedArea} <span className="text-sm font-bold text-slate-500">ac</span>
          </div>
          <p className="text-[11px] text-slate-500 font-medium mt-0.5">
            Active crop acreage
          </p>
        </div>
      </div>

      {/* 4. Filter & Search Toolbar */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-2xs space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by crop, variety, parcel, stage, notes..."
              className="w-full rounded-xl border border-slate-200 bg-[#F7F9F5] pl-10 pr-9 py-2 text-xs text-[#17251B] placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#166534] focus:bg-white transition-all"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-2.5 text-xs text-slate-400 hover:text-slate-600 font-semibold"
              >
                ✕
              </button>
            )}
          </div>

          {/* Quick Controls */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Farm Filter */}
            <select
              value={selectedFarm}
              onChange={(e) => setSelectedFarm(e.target.value)}
              className="rounded-xl border border-slate-200 bg-[#F7F9F5] px-3 py-1.5 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#166534] cursor-pointer"
            >
              <option value="all">All Farms ({farms.length})</option>
              {farms.map((f) => (
                <option key={f._id || f.id} value={f._id || f.id}>
                  {f.name}
                </option>
              ))}
            </select>

            {/* Status Filter */}
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="rounded-xl border border-slate-200 bg-[#F7F9F5] px-3 py-1.5 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#166534] cursor-pointer"
            >
              <option value="all">All Status</option>
              <option value="Active">Active</option>
              <option value="Harvested">Harvested</option>
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

            {/* Season Filter */}
            <select
              value={selectedSeason}
              onChange={(e) => setSelectedSeason(e.target.value)}
              className="rounded-xl border border-slate-200 bg-[#F7F9F5] px-3 py-1.5 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#166534] cursor-pointer"
            >
              {CROP_SEASONS.map((season) => (
                <option key={season} value={season}>
                  Season: {season}
                </option>
              ))}
            </select>

            {/* Category Filter */}
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="rounded-xl border border-slate-200 bg-[#F7F9F5] px-3 py-1.5 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#166534] cursor-pointer"
            >
              {CROP_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  Category: {cat}
                </option>
              ))}
            </select>

            {/* Sort Dropdown */}
            <div className="flex items-center gap-1">
              <ArrowUpDown className="h-3.5 w-3.5 text-slate-400" />
              <select
                value={sortOption}
                onChange={(e) => setSortOption(e.target.value)}
                className="rounded-xl border border-slate-200 bg-[#F7F9F5] px-2.5 py-1.5 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#166534] cursor-pointer"
              >
                <option value="newest">Recently Planted</option>
                <option value="name-asc">Crop Name (A → Z)</option>
                <option value="harvest-soonest">Harvest (Soonest)</option>
                <option value="area-desc">Area (High → Low)</option>
              </select>
            </div>

            {/* Group By Farm Toggle */}
            <button
              type="button"
              onClick={() => setGroupByFarm(!groupByFarm)}
              className={`px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                groupByFarm
                  ? 'bg-[#166534] text-white border-[#166534] shadow-xs'
                  : 'bg-[#F7F9F5] text-slate-600 border-slate-200 hover:bg-slate-100'
              }`}
            >
              Group by Farm
            </button>

            {/* View Mode Toggle */}
            <div className="flex items-center rounded-xl border border-slate-200 p-0.5 bg-[#F7F9F5]">
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                  viewMode === 'grid'
                    ? 'bg-[#166534] text-white shadow-xs'
                    : 'text-slate-400 hover:text-slate-700'
                }`}
                title="Grid View"
              >
                <LayoutGrid className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode('list')}
                className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                  viewMode === 'list'
                    ? 'bg-[#166534] text-white shadow-xs'
                    : 'text-slate-400 hover:text-slate-700'
                }`}
                title="Table View"
              >
                <ListIcon className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Active Filter Pills */}
        {(searchTerm ||
          selectedFarm !== 'all' ||
          selectedStatus !== 'all' ||
          selectedStage !== 'all' ||
          selectedCategory !== 'All' ||
          selectedSeason !== 'All') && (
          <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-slate-400">Filters:</span>
              {selectedFarm !== 'all' && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-100 rounded-md text-slate-700">
                  Farm: {farms.find((f) => (f._id || f.id) === selectedFarm)?.name || 'Selected'}
                  <button onClick={() => setSelectedFarm('all')} className="hover:text-rose-500">
                    ✕
                  </button>
                </span>
              )}
              {selectedStatus !== 'all' && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-100 rounded-md text-slate-700">
                  Status: {selectedStatus}
                  <button onClick={() => setSelectedStatus('all')} className="hover:text-rose-500">
                    ✕
                  </button>
                </span>
              )}
              {selectedStage !== 'all' && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-100 rounded-md text-slate-700">
                  Stage: {selectedStage}
                  <button onClick={() => setSelectedStage('all')} className="hover:text-rose-500">
                    ✕
                  </button>
                </span>
              )}
              {selectedCategory !== 'All' && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-100 rounded-md text-slate-700">
                  Category: {selectedCategory}
                  <button onClick={() => setSelectedCategory('All')} className="hover:text-rose-500">
                    ✕
                  </button>
                </span>
              )}
              {selectedSeason !== 'All' && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-100 rounded-md text-slate-700">
                  Season: {selectedSeason}
                  <button onClick={() => setSelectedSeason('All')} className="hover:text-rose-500">
                    ✕
                  </button>
                </span>
              )}
            </div>
            <button
              onClick={handleResetFilters}
              className="text-xs text-[#166534] font-semibold hover:underline"
            >
              Reset All
            </button>
          </div>
        )}
      </div>

      {/* 5. Loading State */}
      {loading && crops.length === 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <div
              key={n}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs animate-pulse space-y-4"
            >
              <div className="flex justify-between items-start">
                <div className="h-5 bg-slate-200 rounded w-1/2" />
                <div className="h-5 bg-slate-200 rounded w-16" />
              </div>
              <div className="h-4 bg-slate-100 rounded w-3/4" />
              <div className="h-12 bg-slate-50 rounded-xl" />
              <div className="h-8 bg-slate-100 rounded-xl" />
            </div>
          ))}
        </div>
      )}

      {/* 6. Empty State: No Crops Registered Yet */}
      {!loading && crops.length === 0 && (
        <div className="rounded-3xl border border-dashed border-emerald-900/20 bg-[#F7F9F5] p-12 text-center max-w-2xl mx-auto shadow-xs">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-[#DCFCE7] to-emerald-100 text-[#166534] shadow-xs mb-4">
            <Sprout className="h-8 w-8 text-[#166534]" />
          </div>
          <h3 className="text-xl font-bold text-[#17251B]">No Crops Registered Yet</h3>
          <p className="mt-2 text-xs sm:text-sm text-slate-500 max-w-md mx-auto leading-relaxed">
            Record plantings across your registered farms to monitor phenological growth stages,
            calculate expected harvest timelines, and maintain a historical transition log.
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <Link to="/dashboard/crops/new">
              <Button variant="primary" size="md" icon={Plus} className="shadow-md !rounded-xl">
                Register Your First Crop
              </Button>
            </Link>
            <Link to="/dashboard/farms">
              <Button variant="outline" size="md" icon={Tractor} className="bg-white">
                View My Farms
              </Button>
            </Link>
          </div>
        </div>
      )}

      {/* 7. Empty State: Filter Returned No Crops */}
      {!loading && crops.length > 0 && filteredCrops.length === 0 && (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/50 p-8 text-center max-w-xl mx-auto">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-slate-500 mb-3">
            <Search className="h-6 w-6" />
          </div>
          <h3 className="text-sm font-bold text-[#17251B]">No crops match your filter criteria</h3>
          <p className="mt-1 text-xs text-slate-500">
            Try adjusting your search query, status, growth stage, season, or category.
          </p>
          <div className="mt-4">
            <Button variant="outline" size="sm" onClick={handleResetFilters} className="text-xs bg-white">
              Reset Filters
            </Button>
          </div>
        </div>
      )}

      {/* 8. Grouped By Farm View */}
      {groupByFarm && groupedCrops && (
        <div className="space-y-6">
          {groupedCrops.map((group) => (
            <div
              key={group.farmName}
              className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-2xs space-y-4"
            >
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#DCFCE7] text-[#166534]">
                    <Tractor className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-[#17251B]">{group.farmName}</h3>
                    <p className="text-xs text-slate-500">
                      {group.crops.length} crop{group.crops.length === 1 ? '' : 's'} planted • {group.totalArea} cultivated acres
                    </p>
                  </div>
                </div>
                <Link to={group.farm?._id ? `/dashboard/farms/${group.farm._id}` : '#'}>
                  <Button variant="outline" size="sm" icon={ExternalLink} className="text-xs bg-white">
                    View Parcel
                  </Button>
                </Link>
              </div>

              {renderCropGrid(group.crops, openStageModal, formatDate, getHarvestTimeline)}
            </div>
          ))}
        </div>
      )}

      {/* 9. Standard View: Grid Mode */}
      {!groupByFarm && viewMode === 'grid' && filteredCrops.length > 0 && (
        renderCropGrid(filteredCrops, openStageModal, formatDate, getHarvestTimeline)
      )}

      {/* 10. Standard View: List / Table Mode */}
      {!groupByFarm && viewMode === 'list' && filteredCrops.length > 0 && (
        <div className="rounded-2xl border border-slate-200/90 bg-white overflow-hidden shadow-2xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F7F9F5] border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold">
                <tr>
                  <th className="px-4 py-3">Crop Name & Variety</th>
                  <th className="px-3 py-3">Farm Parcel</th>
                  <th className="px-3 py-3">Area</th>
                  <th className="px-3 py-3">Category & Season</th>
                  <th className="px-3 py-3">Growth Stage</th>
                  <th className="px-3 py-3">Harvest Target</th>
                  <th className="px-3 py-3">Est. Yield</th>
                  <th className="px-3 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {filteredCrops.map((crop) => {
                  const cropId = crop._id || crop.id;
                  const stageConfig = STAGE_CONFIG[crop.growthStage] || {
                    step: 5,
                    percent: 45,
                    badgeVariant: 'neutral',
                  };
                  const timeline = getHarvestTimeline(crop.expectedHarvestDate, crop.growthStage);

                  return (
                    <tr key={cropId} className="hover:bg-[#F7F9F5]/70 transition-colors">
                      <td className="px-4 py-3 font-bold text-[#17251B]">
                        <div className="flex items-center gap-2">
                          <Sprout className="h-4 w-4 text-[#166534] shrink-0" />
                          <div>
                            <span className="block">{crop.name}</span>
                            {crop.variety && (
                              <span className="text-[11px] font-normal text-slate-500">
                                {crop.variety}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3 text-slate-600">
                        {crop.farm?.name || 'General Parcel'}
                      </td>
                      <td className="px-3 py-3 font-black text-[#145A32]">
                        {crop.cultivatedArea} ac
                      </td>
                      <td className="px-3 py-3">
                        <span className="inline-block px-2 py-0.5 bg-slate-100 rounded text-slate-600 text-[11px]">
                          {crop.category || 'Cereal'} • {crop.season || 'Kharif'}
                        </span>
                      </td>
                      <td className="px-3 py-3">
                        <Badge size="sm" variant={stageConfig.badgeVariant}>
                          {crop.growthStage} ({stageConfig.step}/11)
                        </Badge>
                      </td>
                      <td
                        className={`px-3 py-3 font-semibold ${
                          timeline.isOverdue ? 'text-rose-600' : 'text-slate-600'
                        }`}
                      >
                        {timeline.text}
                      </td>
                      <td className="px-3 py-3 text-slate-700">
                        {crop.estimatedTotalYield ? (
                          <span>
                            {crop.estimatedTotalYield.toLocaleString()} {crop.yieldUnit || 'kg'}
                          </span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="px-3 py-3">
                        <Badge
                          size="sm"
                          variant={
                            crop.status === 'Active'
                              ? 'success'
                              : crop.status === 'Harvested'
                              ? 'info'
                              : 'neutral'
                          }
                          dot
                        >
                          {crop.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => openStageModal(crop)}
                            className="px-2 py-1 text-[11px] font-semibold text-[#166534] bg-emerald-50 hover:bg-emerald-100 rounded-md transition-colors"
                          >
                            Update Stage
                          </button>
                          <Link to={`/dashboard/crops/${cropId}`}>
                            <button
                              type="button"
                              className="p-1 text-slate-500 hover:text-[#166534] transition-colors"
                              title="View Details"
                            >
                              <ExternalLink className="h-4 w-4" />
                            </button>
                          </Link>
                          <Link to={`/dashboard/crops/${cropId}/edit`}>
                            <button
                              type="button"
                              className="p-1 text-slate-500 hover:text-[#166534] transition-colors"
                              title="Edit Crop"
                            >
                              <Edit className="h-4 w-4" />
                            </button>
                          </Link>
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

      {/* 11. Quick Stage Update Modal */}
      {stageModalCrop && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#DCFCE7] text-[#166534]">
                  <Sprout className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#17251B]">
                    Update Crop Growth Stage
                  </h3>
                  <p className="text-xs text-slate-500">
                    {stageModalCrop.name} ({stageModalCrop.variety || 'Standard'})
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setStageModalCrop(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleStageUpdateSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Select New Growth Stage (11 Lifecycle Stages)
                </label>
                <select
                  value={newStage}
                  onChange={(e) => setNewStage(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#166534]"
                  required
                >
                  {GROWTH_STAGES.map((stage, idx) => (
                    <option key={stage} value={stage}>
                      Stage {idx + 1}: {stage}
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-slate-400 mt-1">
                  Transitioning to &quot;Harvested&quot; will automatically update crop status to Harvested.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Agronomic Transition Notes / Observations (Optional)
                </label>
                <textarea
                  value={stageNotes}
                  onChange={(e) => setStageNotes(e.target.value)}
                  placeholder="e.g. 80% canopy coverage achieved, healthy green leaf index, no pest infestations observed..."
                  rows={3}
                  className="w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#166534]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setStageModalCrop(null)}
                  disabled={updatingStage}
                  className="text-xs bg-white"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  disabled={updatingStage}
                  className="text-xs shadow-xs"
                >
                  {updatingStage ? 'Saving...' : 'Record Stage Transition'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Grid rendering sub-component helper
 */
function renderCropGrid(cropsList, onOpenStageModal, formatDate, getHarvestTimeline) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4.5">
      {cropsList.map((crop) => {
        const cropId = crop._id || crop.id;
        const stageConfig = STAGE_CONFIG[crop.growthStage] || {
          step: 5,
          percent: 45,
          color: '#166534',
          badgeVariant: 'neutral',
        };
        const timeline = getHarvestTimeline(crop.expectedHarvestDate, crop.growthStage);
        const plantingFormatted = formatDate(crop.plantingDate);
        const harvestFormatted = formatDate(crop.expectedHarvestDate);

        return (
          <div
            key={cropId}
            className={`rounded-2xl border p-5 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between ${
              crop.status === 'Harvested'
                ? 'border-sky-200/80 bg-sky-50/20'
                : 'border-slate-200/80 bg-white hover:border-[#166534]/50'
            }`}
          >
            <div>
              {/* Header */}
              <div className="flex items-start justify-between gap-3 mb-1">
                <div>
                  <h3 className="text-base font-bold text-[#17251B] tracking-tight">
                    {crop.name}
                  </h3>
                  {crop.variety && (
                    <p className="text-xs font-medium text-emerald-800/80">
                      Variety: <span className="font-semibold text-[#145A32]">{crop.variety}</span>
                    </p>
                  )}
                </div>
                <Badge
                  size="sm"
                  variant={
                    crop.status === 'Active'
                      ? 'success'
                      : crop.status === 'Harvested'
                      ? 'info'
                      : 'neutral'
                  }
                  dot
                >
                  {crop.status}
                </Badge>
              </div>

              {/* Farm & Cultivated Area */}
              <div className="flex items-center justify-between text-xs text-slate-500 mb-3 pt-1">
                <div className="flex items-center gap-1.5 truncate max-w-[200px]">
                  <Tractor className="h-3.5 w-3.5 text-[#166534] shrink-0" />
                  <span className="truncate font-medium text-slate-700">
                    {crop.farm?.name || 'General Parcel'}
                  </span>
                </div>
                <span className="font-extrabold text-[#145A32] bg-[#DCFCE7]/70 px-2 py-0.5 rounded-md border border-[#22C55E]/20 text-[11px]">
                  {crop.cultivatedArea} ac
                </span>
              </div>

              {/* Category & Season Pill */}
              <div className="flex items-center gap-2 mb-3 text-[11px] text-slate-600">
                <span className="bg-slate-100 px-2 py-0.5 rounded-md font-medium">
                  {crop.category || 'Cereal'}
                </span>
                <span className="bg-slate-100 px-2 py-0.5 rounded-md font-medium">
                  Season: {crop.season || 'Kharif'}
                </span>
              </div>

              {/* 11-Stage Progress Bar */}
              <div className="p-3 bg-[#F7F9F5] rounded-xl border border-slate-100 mb-3.5 space-y-1.5">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-semibold text-slate-600">
                    Growth Stage ({stageConfig.step}/11)
                  </span>
                  <Badge size="sm" variant={stageConfig.badgeVariant}>
                    {crop.growthStage}
                  </Badge>
                </div>

                {/* Progress bar */}
                <div className="w-full bg-slate-200/80 rounded-full h-2 overflow-hidden">
                  <div
                    className="h-2 rounded-full transition-all duration-500"
                    style={{
                      width: `${stageConfig.percent}%`,
                      backgroundColor: stageConfig.color,
                    }}
                  />
                </div>
                <div className="flex justify-between text-[10px] text-slate-400">
                  <span>Land Prep</span>
                  <span>Flowering</span>
                  <span>Harvested</span>
                </div>
              </div>

              {/* Dates & Yield Estimates */}
              <div className="space-y-1.5 text-xs text-slate-600 mb-3.5">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 flex items-center gap-1">
                    <Calendar className="h-3 w-3 text-slate-400" />
                    Planting:
                  </span>
                  <span className="font-medium text-slate-700">
                    {plantingFormatted || 'Not recorded'}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-slate-400 flex items-center gap-1">
                    <Calendar className="h-3 w-3 text-slate-400" />
                    Target Harvest:
                  </span>
                  <span className="font-medium text-slate-700">
                    {harvestFormatted || 'Not scheduled'}
                  </span>
                </div>

                {crop.estimatedTotalYield && (
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Est. Yield:</span>
                    <span className="font-bold text-[#145A32]">
                      {crop.estimatedTotalYield.toLocaleString()} {crop.yieldUnit || 'kg'}
                    </span>
                  </div>
                )}

                {/* Harvest Alert */}
                <div
                  className={`flex items-center justify-between pt-1 font-semibold text-[11px] ${
                    timeline.isOverdue
                      ? 'text-rose-600'
                      : timeline.isCompleted
                      ? 'text-sky-700'
                      : 'text-emerald-700'
                  }`}
                >
                  <span className="flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" />
                    Timeline:
                  </span>
                  <span>{timeline.text}</span>
                </div>
              </div>
            </div>

            {/* Card Footer Actions */}
            <div className="pt-3 border-t border-slate-100 flex items-center gap-2">
              <Link to={`/dashboard/crops/${cropId}`} className="flex-1">
                <Button
                  variant="outline"
                  size="sm"
                  icon={ExternalLink}
                  className="w-full justify-center !py-1.5 text-xs font-semibold bg-white hover:border-[#166534] hover:text-[#166534]"
                >
                  View Details
                </Button>
              </Link>

              <Button
                variant="outline"
                size="sm"
                onClick={() => onOpenStageModal(crop)}
                className="text-xs bg-[#DCFCE7] text-[#145A32] border-[#22C55E]/30 hover:bg-[#bbf7d0]"
                title="Update Stage"
              >
                Stage
              </Button>

              <Link to={`/dashboard/crops/${cropId}/edit`}>
                <Button
                  variant="outline"
                  size="sm"
                  icon={Edit}
                  className="text-xs bg-white text-slate-600 hover:text-[#166534]"
                  title="Edit Crop"
                />
              </Link>
            </div>
          </div>
        );
      })}
    </div>
  );
}
