import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Sprout,
  Calendar,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Tractor,
  Layers,
  ArrowRight,
  Plus,
  ExternalLink,
  Search,
  Filter,
  ArrowUpDown,
  LayoutGrid,
  List as ListIcon,
  PieChart as PieChartIcon,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
} from 'recharts';
import Button from '../common/Button.jsx';
import Badge from '../common/Badge.jsx';

/**
 * Stage mapping for phenological growth stages:
 * Defines sequence order (1-9), progress percentage, and UI accent styling.
 */
const GROWTH_STAGE_CONFIG = {
  'Land Preparation': { step: 1, percent: 9, color: '#64748B', badgeVariant: 'neutral' },
  'Sowing / Planting': { step: 2, percent: 18, color: '#D97706', badgeVariant: 'warning' },
  'Sowing': { step: 2, percent: 18, color: '#D97706', badgeVariant: 'warning' },
  'Germination': { step: 3, percent: 27, color: '#84CC16', badgeVariant: 'success' },
  'Seedling': { step: 4, percent: 36, color: '#22C55E', badgeVariant: 'success' },
  'Vegetative Growth': { step: 5, percent: 45, color: '#166534', badgeVariant: 'forest' },
  'Tillering / Branching': { step: 6, percent: 55, color: '#0D9488', badgeVariant: 'forest' },
  'Flowering': { step: 7, percent: 64, color: '#8B5CF6', badgeVariant: 'info' },
  'Fruiting / Grain Formation': { step: 8, percent: 73, color: '#EA580C', badgeVariant: 'warning' },
  'Fruiting': { step: 8, percent: 73, color: '#EA580C', badgeVariant: 'warning' },
  'Maturity': { step: 9, percent: 82, color: '#D97706', badgeVariant: 'warning' },
  'Harvesting': { step: 10, percent: 91, color: '#F59E0B', badgeVariant: 'warning' },
  'Harvested': { step: 11, percent: 100, color: '#0284C7', badgeVariant: 'info' },
};

export const MyCropsSection = ({
  crops = [],
  statistics = {},
  loading = false,
  error = null,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'Active' | 'Harvested' | 'Archived'
  const [stageFilter, setStageFilter] = useState('all');
  const [sortOption, setSortOption] = useState('newest'); // 'newest' | 'name-asc' | 'harvest-soonest' | 'area-desc'
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'list'
  const [showChart, setShowChart] = useState(false);

  // Summary statistics from real MongoDB aggregation
  const totalCropsCount = statistics.totalCrops ?? crops.length;
  const activeCropsCount =
    statistics.activeCrops ?? crops.filter((c) => c.status === 'Active').length;
  const harvestedCropsCount =
    statistics.harvestedCrops ?? crops.filter((c) => c.status === 'Harvested').length;
  const cropVarietiesCount =
    statistics.cropVarietiesCount ??
    new Set(crops.map((c) => c.variety).filter(Boolean)).size;

  // Filter and sort crops client-side for zero-latency instant interaction
  const filteredCrops = useMemo(() => {
    if (!Array.isArray(crops)) return [];

    let result = [...crops];

    // Status filter
    if (statusFilter !== 'all') {
      result = result.filter((c) => c.status === statusFilter);
    }

    // Growth stage filter
    if (stageFilter !== 'all') {
      result = result.filter((c) => c.growthStage === stageFilter);
    }

    // Search filter across crop name, variety, farm name, growth stage
    if (searchTerm.trim()) {
      const q = searchTerm.trim().toLowerCase();
      result = result.filter((c) => {
        const nameMatch = c.name?.toLowerCase().includes(q);
        const varietyMatch = c.variety?.toLowerCase().includes(q);
        const farmMatch = c.farm?.name?.toLowerCase().includes(q);
        const stageMatch = c.growthStage?.toLowerCase().includes(q);
        return nameMatch || varietyMatch || farmMatch || stageMatch;
      });
    }

    // Sorting
    result.sort((a, b) => {
      switch (sortOption) {
        case 'name-asc':
          return (a.name || '').localeCompare(b.name || '');
        case 'area-desc':
          return (Number(b.cultivatedArea) || 0) - (Number(a.cultivatedArea) || 0);
        case 'harvest-soonest': {
          const timeA = a.expectedHarvestDate ? new Date(a.expectedHarvestDate).getTime() : Infinity;
          const timeB = b.expectedHarvestDate ? new Date(b.expectedHarvestDate).getTime() : Infinity;
          return timeA - timeB;
        }
        case 'newest':
        default:
          return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
      }
    });

    return result;
  }, [crops, searchTerm, statusFilter, stageFilter, sortOption]);

  const handleResetFilters = () => {
    setSearchTerm('');
    setStatusFilter('all');
    setStageFilter('all');
    setSortOption('newest');
  };

  const formatDate = (dateValue) => {
    if (!dateValue) return null;
    try {
      const d = new Date(dateValue);
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

  /**
   * Calculate remaining or overdue harvest timeline
   */
  const getHarvestTimeline = (expectedHarvestDate, growthStage) => {
    if (growthStage === 'Harvested') {
      return {
        text: 'Harvest Completed',
        isOverdue: false,
        isCompleted: true,
        days: 0,
      };
    }

    if (!expectedHarvestDate) {
      return {
        text: 'Target harvest date not set',
        isOverdue: false,
        isCompleted: false,
        days: null,
      };
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
      return {
        text: 'Harvest due today',
        isOverdue: false,
        isCompleted: false,
        days: 0,
      };
    }

    return {
      text: `${diffDays} day${diffDays === 1 ? '' : 's'} until harvest`,
      isOverdue: false,
      isCompleted: false,
      days: diffDays,
    };
  };

  // Distribution chart data
  const chartData = useMemo(() => {
    if (statistics.cropDistribution && statistics.cropDistribution.length > 0) {
      return statistics.cropDistribution;
    }
    const map = {};
    crops.forEach((c) => {
      map[c.name] = (map[c.name] || 0) + 1;
    });
    return Object.entries(map).map(([name, count]) => ({ name, count }));
  }, [statistics.cropDistribution, crops]);

  const CHART_COLORS = ['#166534', '#22C55E', '#145A32', '#0284C7', '#EAB308', '#F97316'];

  return (
    <div className="rounded-2xl border border-emerald-900/10 bg-white p-5 sm:p-6 shadow-xs space-y-5">
      {/* 1. Top Header & Navigation Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-[#166534] to-[#145A32] text-white shadow-xs">
            <Sprout className="h-6 w-6 text-[#22C55E]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-bold text-[#17251B]">
                My Crops Overview
              </h2>
              <Badge size="sm" variant="forest" dot>
                Live MongoDB Records
              </Badge>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Crop life-cycle stages, phenological growth timelines, and harvest projections
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          {totalCropsCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              icon={PieChartIcon}
              onClick={() => setShowChart(!showChart)}
              className="bg-white text-xs shadow-2xs hover:bg-[#F7F9F5]"
            >
              {showChart ? 'Hide Chart' : 'Crop Distribution'}
            </Button>
          )}

          <Link to="/dashboard/crops">
            <Button
              variant="outline"
              size="sm"
              icon={ArrowRight}
              className="bg-white text-xs shadow-2xs hover:bg-[#F7F9F5]"
            >
              Manage Crops
            </Button>
          </Link>

          <Link to="/dashboard/crops/new">
            <Button
              variant="primary"
              size="sm"
              icon={Plus}
              className="shadow-xs text-xs"
            >
              Add Crop
            </Button>
          </Link>
        </div>
      </div>

      {/* 2. Error State */}
      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50/80 p-4 text-rose-800 flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
        </div>
      )}

      {/* 3. Crop Statistics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Total Crops */}
        <div className="rounded-xl bg-slate-50/70 border border-slate-200/60 p-4 transition-all hover:border-[#166534]/30">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              Total Crops
            </span>
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#DCFCE7] text-[#166534]">
              <Sprout className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="text-2xl font-black text-[#17251B] mt-1.5">
            {loading && totalCropsCount === 0 ? '...' : totalCropsCount}
          </div>
          <p className="text-[11px] text-slate-500 font-medium mt-0.5">
            Planted across all farm parcels
          </p>
        </div>

        {/* Active Crops */}
        <div className="rounded-xl bg-slate-50/70 border border-slate-200/60 p-4 transition-all hover:border-emerald-500/30">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              Active Growing Crops
            </span>
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-100/70 text-[#166534]">
              <CheckCircle2 className="h-3.5 w-3.5 text-[#22C55E]" />
            </div>
          </div>
          <div className="text-2xl font-black text-[#166534] mt-1.5">
            {loading && totalCropsCount === 0 ? '...' : activeCropsCount}
          </div>
          <p className="text-[11px] text-[#166534] font-medium mt-0.5">
            Currently in growth stages
          </p>
        </div>

        {/* Harvested Crops */}
        <div className="rounded-xl bg-slate-50/70 border border-slate-200/60 p-4 transition-all hover:border-sky-500/30">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              Harvested Crops
            </span>
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-sky-100/70 text-sky-700">
              <Calendar className="h-3.5 w-3.5 text-sky-600" />
            </div>
          </div>
          <div className="text-2xl font-black text-sky-800 mt-1.5">
            {loading && totalCropsCount === 0 ? '...' : harvestedCropsCount}
          </div>
          <p className="text-[11px] text-slate-500 font-medium mt-0.5">
            Completed harvest cycles
          </p>
        </div>

        {/* Crop Varieties Count */}
        <div className="rounded-xl bg-slate-50/70 border border-slate-200/60 p-4 transition-all hover:border-[#145A32]/30">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              Crop Varieties Count
            </span>
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#DCFCE7] text-[#166534]">
              <Layers className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="text-2xl font-black text-[#145A32] mt-1.5">
            {loading && totalCropsCount === 0 ? '...' : cropVarietiesCount}
          </div>
          <p className="text-[11px] text-emerald-700 font-medium mt-0.5">
            Distinct cataloged varieties
          </p>
        </div>
      </div>

      {/* 4. Optional Distribution Chart (Recharts) */}
      {showChart && chartData.length > 0 && (
        <div className="p-4 rounded-xl border border-slate-200/80 bg-[#F7F9F5]/70">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
            Real Crop Distribution Across Parcels
          </h4>
          <div className="h-44 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <Tooltip
                  formatter={(val) => [`${val} parcels`, 'Count']}
                  contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', fontSize: '12px' }}
                />
                <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                  {chartData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={CHART_COLORS[index % CHART_COLORS.length]}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* 5. Toolbar: Search, Filters & Sorting */}
      {totalCropsCount > 0 && (
        <div className="rounded-xl border border-slate-200/80 bg-[#F7F9F5]/70 p-3 sm:p-3.5 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by crop name, variety, farm, stage..."
              className="w-full rounded-xl border border-slate-200 bg-white pl-10 pr-9 py-2 text-xs text-[#17251B] placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#166534] transition-all"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-2.5 text-xs text-slate-400 hover:text-slate-600 font-semibold"
                title="Clear search"
              >
                ✕
              </button>
            )}
          </div>

          {/* Filter & Sort Controls */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Status Filter */}
            <div className="flex items-center gap-1.5 text-xs">
              <Filter className="h-3.5 w-3.5 text-slate-500 shrink-0" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#166534] cursor-pointer"
              >
                <option value="all">All Status ({totalCropsCount})</option>
                <option value="Active">Active ({activeCropsCount})</option>
                <option value="Harvested">Harvested ({harvestedCropsCount})</option>
              </select>
            </div>

            {/* Growth Stage Filter */}
            <div className="flex items-center gap-1.5 text-xs">
              <select
                value={stageFilter}
                onChange={(e) => setStageFilter(e.target.value)}
                className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#166534] cursor-pointer"
              >
                <option value="all">All Stages</option>
                {Object.keys(GROWTH_STAGE_CONFIG).map((stage) => (
                  <option key={stage} value={stage}>
                    {stage}
                  </option>
                ))}
              </select>
            </div>

            {/* Sort Dropdown */}
            <div className="flex items-center gap-1.5 text-xs">
              <ArrowUpDown className="h-3.5 w-3.5 text-slate-500 shrink-0" />
              <select
                value={sortOption}
                onChange={(e) => setSortOption(e.target.value)}
                className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#166534] cursor-pointer"
              >
                <option value="newest">Recently Planted</option>
                <option value="name-asc">Crop Name (A → Z)</option>
                <option value="harvest-soonest">Harvest (Soonest First)</option>
                <option value="area-desc">Area (High → Low)</option>
              </select>
            </div>

            <div className="h-4 w-px bg-slate-200 hidden sm:block" />

            {/* View Mode Toggle */}
            <div className="flex items-center rounded-lg border border-slate-200 p-0.5 bg-white shadow-2xs">
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-md transition-all cursor-pointer ${
                  viewMode === 'grid'
                    ? 'bg-[#166534] text-white shadow-xs'
                    : 'text-slate-400 hover:text-slate-700'
                }`}
                title="Grid View"
                aria-label="Grid View"
              >
                <LayoutGrid className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode('list')}
                className={`p-1.5 rounded-md transition-all cursor-pointer ${
                  viewMode === 'list'
                    ? 'bg-[#166534] text-white shadow-xs'
                    : 'text-slate-400 hover:text-slate-700'
                }`}
                title="List View"
                aria-label="List View"
              >
                <ListIcon className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6. Loading Skeleton */}
      {loading && totalCropsCount === 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
          {[1, 2, 3].map((n) => (
            <div
              key={n}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs animate-pulse space-y-4"
            >
              <div className="flex justify-between items-start">
                <div className="h-5 bg-slate-200 rounded w-1/2" />
                <div className="h-5 bg-slate-200 rounded w-16" />
              </div>
              <div className="h-4 bg-slate-100 rounded w-3/4" />
              <div className="h-10 bg-slate-50 rounded-xl" />
              <div className="h-8 bg-slate-100 rounded-xl" />
            </div>
          ))}
        </div>
      )}

      {/* 7. Empty State: No Crops In Account */}
      {!loading && totalCropsCount === 0 && (
        <div className="rounded-2xl border border-dashed border-emerald-900/20 bg-[#F7F9F5]/80 p-8 sm:p-12 text-center max-w-2xl mx-auto shadow-xs">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-[#DCFCE7] to-emerald-100 text-[#166534] shadow-xs mb-4">
            <Sprout className="h-8 w-8 text-[#166534]" />
          </div>
          <h3 className="text-lg sm:text-xl font-bold text-[#17251B]">
            No Crops Cataloged Yet
          </h3>
          <p className="mt-2 text-xs sm:text-sm text-slate-500 max-w-md mx-auto leading-relaxed">
            Record crop plantings across your registered farms to track phenological growth
            stages (from land preparation to harvest), expected maturity dates, and yield estimates.
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <Link to="/dashboard/crops/new">
              <Button
                variant="primary"
                size="md"
                icon={Plus}
                className="shadow-md !rounded-xl"
              >
                Add Your First Crop
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

      {/* 8. Empty State: No Search / Filter Matches */}
      {!loading && totalCropsCount > 0 && filteredCrops.length === 0 && (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/50 p-8 text-center max-w-xl mx-auto">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-slate-500 mb-3">
            <Search className="h-6 w-6" />
          </div>
          <h3 className="text-sm font-bold text-[#17251B]">
            No crops match your search or filter
          </h3>
          <p className="mt-1 text-xs text-slate-500 max-w-md mx-auto">
            Try adjusting your search query, status, or growth stage filter.
          </p>
          <div className="mt-4">
            <Button
              variant="outline"
              size="sm"
              onClick={handleResetFilters}
              className="text-xs bg-white"
            >
              Reset Filters
            </Button>
          </div>
        </div>
      )}

      {/* 9. Populated View: Grid Mode */}
      {viewMode === 'grid' && filteredCrops.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4.5 pt-1">
          {filteredCrops.map((crop) => {
            const cropId = crop._id || crop.id;
            const stageConfig = GROWTH_STAGE_CONFIG[crop.growthStage] || {
              step: 5,
              percent: 50,
              color: '#166534',
              badgeVariant: 'neutral',
            };
            const timeline = getHarvestTimeline(crop.expectedHarvestDate, crop.growthStage);
            const plantingFormatted = formatDate(crop.plantingDate);
            const harvestFormatted = formatDate(crop.expectedHarvestDate);

            return (
              <div
                key={cropId}
                className={`rounded-2xl border p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between ${
                  crop.status === 'Harvested'
                    ? 'border-sky-200/80 bg-sky-50/20'
                    : 'border-slate-200/80 bg-white hover:border-[#166534]/50'
                }`}
              >
                <div>
                  {/* Card Header: Crop Name, Variety & Status */}
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

                  {/* Associated Farm Name & Cultivated Area */}
                  <div className="flex items-center justify-between text-xs text-slate-500 mb-3.5 pt-1">
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

                  {/* Growth-Stage Visualization Bar */}
                  <div className="p-3 bg-[#F7F9F5]/80 rounded-xl border border-slate-100 mb-3.5">
                    <div className="flex items-center justify-between text-[11px] mb-1.5">
                      <span className="font-semibold text-slate-500">
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
                    <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                      <span>Land Prep</span>
                      <span>Vegetative</span>
                      <span>Harvest</span>
                    </div>
                  </div>

                  {/* Crop Timeline Details */}
                  <div className="space-y-1.5 text-xs text-slate-600 mb-3.5">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 flex items-center gap-1">
                        <Calendar className="h-3 w-3 text-slate-400" />
                        Planting Date:
                      </span>
                      <span className="font-medium text-slate-700">
                        {plantingFormatted || 'Not recorded'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 flex items-center gap-1">
                        <Calendar className="h-3 w-3 text-slate-400" />
                        Expected Harvest:
                      </span>
                      <span className="font-medium text-slate-700">
                        {harvestFormatted || 'Not scheduled'}
                      </span>
                    </div>

                    {/* Timeline Harvest Alert / Status */}
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
                        Harvest Target:
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
                      View Crop
                    </Button>
                  </Link>

                  <Link to="/dashboard/crops">
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs bg-white text-slate-600 hover:text-[#166534]"
                      title="Manage Crops"
                    >
                      Manage
                    </Button>
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 10. Populated View: List Mode */}
      {viewMode === 'list' && filteredCrops.length > 0 && (
        <div className="rounded-xl border border-slate-200/90 bg-white overflow-hidden shadow-2xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F7F9F5] border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold">
                <tr>
                  <th className="px-4 py-3">Crop Name</th>
                  <th className="px-3 py-3">Variety</th>
                  <th className="px-3 py-3">Farm</th>
                  <th className="px-3 py-3">Area</th>
                  <th className="px-3 py-3">Stage</th>
                  <th className="px-3 py-3">Harvest Target</th>
                  <th className="px-3 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {filteredCrops.map((crop) => {
                  const cropId = crop._id || crop.id;
                  const stageConfig = GROWTH_STAGE_CONFIG[crop.growthStage] || {
                    step: 5,
                    percent: 50,
                    badgeVariant: 'neutral',
                  };
                  const timeline = getHarvestTimeline(crop.expectedHarvestDate, crop.growthStage);

                  return (
                    <tr key={cropId} className="hover:bg-[#F7F9F5]/70 transition-colors">
                      <td className="px-4 py-3 font-bold text-[#17251B]">
                        <div className="flex items-center gap-1.5">
                          <Sprout className="h-4 w-4 text-[#166534] shrink-0" />
                          <span>{crop.name}</span>
                        </div>
                      </td>
                      <td className="px-3 py-3 text-slate-600">{crop.variety || '—'}</td>
                      <td className="px-3 py-3 text-slate-600">{crop.farm?.name || '—'}</td>
                      <td className="px-3 py-3 font-black text-[#145A32]">{crop.cultivatedArea} ac</td>
                      <td className="px-3 py-3">
                        <Badge size="sm" variant={stageConfig.badgeVariant}>
                          {crop.growthStage}
                        </Badge>
                      </td>
                      <td
                        className={`px-3 py-3 font-semibold ${
                          timeline.isOverdue ? 'text-rose-600' : 'text-slate-600'
                        }`}
                      >
                        {timeline.text}
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
                        <Link to={`/dashboard/crops/${cropId}`}>
                          <button
                            type="button"
                            className="px-2.5 py-1 rounded-md text-xs font-semibold text-[#166534] hover:bg-[#DCFCE7] transition-colors cursor-pointer"
                          >
                            View
                          </button>
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 11. Footer Link */}
      {totalCropsCount > 0 && (
        <div className="flex items-center justify-between pt-3 border-t border-slate-100 text-xs text-slate-500">
          <span>
            Showing {filteredCrops.length} of {totalCropsCount} registered crop holding
            {totalCropsCount === 1 ? '' : 's'}
          </span>
          <Link
            to="/dashboard/crops"
            className="font-bold text-[#166534] hover:underline flex items-center gap-1"
          >
            <span>Manage All Crops & Sowing Calendars</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      )}
    </div>
  );
};

export default MyCropsSection;
