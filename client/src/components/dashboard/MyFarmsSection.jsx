import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Tractor,
  MapPin,
  Sprout,
  Search,
  Filter,
  ArrowUpDown,
  LayoutGrid,
  List as ListIcon,
  ExternalLink,
  Edit,
  Plus,
  RefreshCw,
  Calendar,
  Archive,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Button from '../common/Button.jsx';
import Badge from '../common/Badge.jsx';

export const MyFarmsSection = ({
  farms = [],
  statistics = {},
  loading = false,
  error = null,
  onRefresh,
  isRefreshing = false,
}) => {

  // Search, filter, sort, and view states
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'Active' | 'Archived' | 'Inactive'
  const [sortOption, setSortOption] = useState('newest'); // 'newest' | 'name-asc' | 'name-desc' | 'acreage-desc' | 'acreage-asc'
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'list'

  // Computed summary statistics consistent with Phase 1
  const totalFarmsCount = statistics.totalFarms ?? farms.length;
  const activeFarmsCount =
    statistics.activeFarms ?? farms.filter((f) => f.status === 'Active').length;
  const archivedFarmsCount =
    statistics.archivedFarms ?? farms.filter((f) => f.status === 'Archived').length;
  const inactiveFarmsCount =
    statistics.inactiveFarms ?? farms.filter((f) => f.status === 'Inactive').length;
  const totalCultivatedAcreage =
    statistics.totalCultivatedAcreage ??
    Math.round(
      farms
        .filter((f) => f.status === 'Active')
        .reduce((sum, f) => sum + (Number(f.acreage) || 0), 0) * 10
    ) / 10;

  // Filter and sort farms client-side for zero-latency instant feedback
  const filteredFarms = useMemo(() => {
    if (!Array.isArray(farms)) return [];

    let result = [...farms];

    // 1. Status Filter
    if (statusFilter !== 'all') {
      result = result.filter((farm) => farm.status === statusFilter);
    }

    // 2. Search Filter (by farm name, location, village, district, state, crops, soil, irrigation)
    if (searchTerm.trim()) {
      const q = searchTerm.trim().toLowerCase();
      result = result.filter((farm) => {
        const nameMatch = farm.name?.toLowerCase().includes(q);
        const locMatch = farm.location?.toLowerCase().includes(q);
        const stateMatch = farm.state?.toLowerCase().includes(q);
        const distMatch = farm.district?.toLowerCase().includes(q);
        const villMatch = farm.village?.toLowerCase().includes(q);
        const cropsMatch =
          Array.isArray(farm.mainCrops) &&
          farm.mainCrops.some((c) => String(c).toLowerCase().includes(q));
        const soilMatch = farm.soilType?.toLowerCase().includes(q);
        const irrigationMatch = farm.irrigationType?.toLowerCase().includes(q);

        return (
          nameMatch ||
          locMatch ||
          stateMatch ||
          distMatch ||
          villMatch ||
          cropsMatch ||
          soilMatch ||
          irrigationMatch
        );
      });
    }

    // 3. Sorting
    result.sort((a, b) => {
      switch (sortOption) {
        case 'name-asc':
          return (a.name || '').localeCompare(b.name || '');
        case 'name-desc':
          return (b.name || '').localeCompare(a.name || '');
        case 'acreage-desc':
          return (Number(b.acreage) || 0) - (Number(a.acreage) || 0);
        case 'acreage-asc':
          return (Number(a.acreage) || 0) - (Number(b.acreage) || 0);
        case 'newest':
        default:
          return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
      }
    });

    return result;
  }, [farms, searchTerm, statusFilter, sortOption]);

  const handleResetFilters = () => {
    setSearchTerm('');
    setStatusFilter('all');
    setSortOption('newest');
  };

  const formatLocation = (farm) => {
    const parts = [farm.village, farm.district, farm.state].filter(Boolean);
    return parts.length > 0 ? parts.join(', ') : farm.location || 'Location specified';
  };

  const formatDate = (dateString) => {
    if (!dateString) return null;
    try {
      const d = new Date(dateString);
      return d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return null;
    }
  };

  return (
    <div className="rounded-2xl border border-emerald-900/10 bg-white p-5 sm:p-6 shadow-xs space-y-5">
      {/* 1. Header Bar with Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-[#166534] to-[#145A32] text-white shadow-xs">
            <Tractor className="h-6 w-6 text-[#22C55E]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-bold text-[#17251B]">
                My Farms Overview
              </h2>
              <Badge size="sm" variant="success" dot>
                Live MongoDB Data
              </Badge>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Comprehensive land holdings, cultivation status, and parcel operations
            </p>
          </div>
        </div>

        {/* Global Action Navigation Links */}
        <div className="flex items-center gap-2.5">
          {onRefresh && (
            <Button
              variant="outline"
              size="sm"
              icon={RefreshCw}
              loading={isRefreshing}
              onClick={onRefresh}
              title="Refresh farm data"
              className="bg-white text-xs shadow-2xs hover:bg-[#F7F9F5]"
            >
              Refresh
            </Button>
          )}

          <Link to="/dashboard/farms">
            <Button
              variant="outline"
              size="sm"
              icon={ArrowRight}
              className="bg-white text-xs shadow-2xs hover:bg-[#F7F9F5]"
            >
              Manage Farms
            </Button>
          </Link>

          <Link to="/dashboard/farms/new">
            <Button
              variant="primary"
              size="sm"
              icon={Plus}
              className="shadow-xs text-xs"
            >
              Add New Farm
            </Button>
          </Link>
        </div>
      </div>

      {/* 2. Error State with Retry */}
      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50/80 p-4 text-rose-800 flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
          {onRefresh && (
            <Button
              variant="outline"
              size="sm"
              onClick={onRefresh}
              className="!border-rose-300 !text-rose-800 bg-white hover:!bg-rose-100/50 text-xs py-1 px-3"
            >
              Retry
            </Button>
          )}
        </div>
      )}

      {/* 3. Farm Statistics Bar (Consistent with Phase 1) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Total Registered Farms */}
        <div className="rounded-xl bg-slate-50/70 border border-slate-200/60 p-4 transition-all hover:border-[#166534]/30">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              Total Registered Farms
            </span>
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#DCFCE7] text-[#166534]">
              <Tractor className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="text-2xl font-black text-[#17251B] mt-1.5">
            {loading && totalFarmsCount === 0 ? '...' : totalFarmsCount}
          </div>
          <p className="text-[11px] text-slate-500 font-medium mt-0.5">
            All registered land holdings
          </p>
        </div>

        {/* Active Farms */}
        <div className="rounded-xl bg-slate-50/70 border border-slate-200/60 p-4 transition-all hover:border-emerald-500/30">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              Active Farms
            </span>
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-100/70 text-[#166534]">
              <CheckCircle2 className="h-3.5 w-3.5 text-[#22C55E]" />
            </div>
          </div>
          <div className="text-2xl font-black text-[#166534] mt-1.5">
            {loading && totalFarmsCount === 0 ? '...' : activeFarmsCount}
          </div>
          <p className="text-[11px] text-[#166534] font-medium mt-0.5">
            Operational cultivation parcels
          </p>
        </div>

        {/* Archived Farms */}
        <div className="rounded-xl bg-slate-50/70 border border-slate-200/60 p-4 transition-all hover:border-amber-500/30">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              Archived Farms
            </span>
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-100/70 text-amber-700">
              <Archive className="h-3.5 w-3.5 text-amber-600" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-700 mt-1.5">
            {loading && totalFarmsCount === 0 ? '...' : archivedFarmsCount}
          </div>
          <p className="text-[11px] text-slate-500 font-medium mt-0.5">
            Excluded from active telemetry
          </p>
        </div>

        {/* Total Cultivated Acreage */}
        <div className="rounded-xl bg-slate-50/70 border border-slate-200/60 p-4 transition-all hover:border-[#145A32]/30">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              Cultivated Acreage
            </span>
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#DCFCE7] text-[#166534]">
              <Sprout className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="text-2xl font-black text-[#145A32] mt-1.5">
            {loading && totalFarmsCount === 0 ? '...' : `${totalCultivatedAcreage} ac`}
          </div>
          <p className="text-[11px] text-emerald-700 font-medium mt-0.5">
            Active cultivated acreage
          </p>
        </div>
      </div>

      {/* 4. Search, Filter, Sort and View Toolbar */}
      {totalFarmsCount > 0 && (
        <div className="rounded-xl border border-slate-200/80 bg-[#F7F9F5]/70 p-3 sm:p-3.5 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Search Input (by name, location, crops, village, etc.) */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by farm name, location, crop, soil..."
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

          {/* Controls: Filter by Status, Sort By, View Mode */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Status Filter */}
            <div className="flex items-center gap-1.5 text-xs">
              <Filter className="h-3.5 w-3.5 text-slate-500 shrink-0" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#166534] cursor-pointer"
              >
                <option value="all">All Farms ({totalFarmsCount})</option>
                <option value="Active">Active Only ({activeFarmsCount})</option>
                <option value="Archived">Archived Only ({archivedFarmsCount})</option>
                {inactiveFarmsCount > 0 && (
                  <option value="Inactive">Inactive ({inactiveFarmsCount})</option>
                )}
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
                <option value="newest">Recently Created</option>
                <option value="name-asc">Farm Name (A → Z)</option>
                <option value="name-desc">Farm Name (Z → A)</option>
                <option value="acreage-desc">Acreage (High → Low)</option>
                <option value="acreage-asc">Acreage (Low → High)</option>
              </select>
            </div>

            <div className="h-4 w-px bg-slate-200 hidden sm:block" />

            {/* Grid / List View Toggle */}
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

      {/* 5. Loading Skeleton */}
      {loading && farms.length === 0 && (
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
              <div className="h-14 bg-slate-50 rounded-xl" />
              <div className="h-8 bg-slate-100 rounded-xl" />
            </div>
          ))}
        </div>
      )}

      {/* 6. Empty State: No Farms In Account */}
      {!loading && totalFarmsCount === 0 && (
        <div className="rounded-2xl border border-dashed border-emerald-900/20 bg-[#F7F9F5]/80 p-8 sm:p-12 text-center max-w-2xl mx-auto shadow-xs">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-[#DCFCE7] to-emerald-100 text-[#166534] shadow-xs mb-4">
            <Tractor className="h-8 w-8 text-[#166534]" />
          </div>
          <h3 className="text-lg sm:text-xl font-bold text-[#17251B]">
            No Farms Registered Yet
          </h3>
          <p className="mt-2 text-xs sm:text-sm text-slate-500 max-w-md mx-auto leading-relaxed">
            Welcome to AgriSense! Register your first agricultural land parcel to begin
            monitoring crop health, soil composition, precision irrigation schedules,
            and real-time field telemetry.
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <Link to="/dashboard/farms/new">
              <Button
                variant="primary"
                size="md"
                icon={Plus}
                className="shadow-md !rounded-xl"
              >
                Add Your First Farm
              </Button>
            </Link>
          </div>
        </div>
      )}

      {/* 7. Empty State: No Search / Filter Matches */}
      {!loading && totalFarmsCount > 0 && filteredFarms.length === 0 && (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/50 p-8 text-center max-w-xl mx-auto">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-slate-500 mb-3">
            <Search className="h-6 w-6" />
          </div>
          <h3 className="text-sm font-bold text-[#17251B]">
            No farms match your search or filter
          </h3>
          <p className="mt-1 text-xs text-slate-500 max-w-md mx-auto">
            {searchTerm
              ? `No farms found matching "${searchTerm}" with status "${statusFilter}".`
              : `No farms found with status "${statusFilter}".`}
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

      {/* 8. Populated View: Grid Mode */}
      {viewMode === 'grid' && filteredFarms.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4.5 pt-1">
          <AnimatePresence>
            {filteredFarms.map((farm) => {
              const farmId = farm._id || farm.id;
              const createdDate = formatDate(farm.createdAt);

              return (
                <motion.div
                  key={farmId}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                  className={`rounded-2xl border p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between ${
                    farm.status === 'Archived'
                      ? 'border-amber-200/80 bg-amber-50/20'
                      : 'border-slate-200/80 bg-white hover:border-[#166534]/50'
                  }`}
                >
                  <div>
                    {/* Farm Name & Status Badge */}
                    <div className="flex items-start justify-between gap-3 mb-1.5">
                      <h3
                        className="text-base font-bold text-[#17251B] tracking-tight line-clamp-1"
                        title={farm.name}
                      >
                        {farm.name}
                      </h3>
                      <Badge
                        size="sm"
                        variant={
                          farm.status === 'Active'
                            ? 'success'
                            : farm.status === 'Archived'
                            ? 'warning'
                            : 'neutral'
                        }
                        dot
                      >
                        {farm.status}
                      </Badge>
                    </div>

                    {/* Location */}
                    <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-3.5">
                      <MapPin className="h-3.5 w-3.5 text-[#166534] shrink-0" />
                      <span className="truncate" title={formatLocation(farm)}>
                        {formatLocation(farm)}
                      </span>
                    </div>

                    {/* Key Attributes Pills: Acreage, Soil, Irrigation */}
                    <div className="grid grid-cols-3 gap-2 py-2.5 px-1 border-y border-slate-100 bg-[#F7F9F5]/60 rounded-xl text-center mb-3.5">
                      <div>
                        <span className="block text-[10px] uppercase font-bold text-slate-400">
                          Acreage
                        </span>
                        <span className="text-xs font-black text-[#145A32]">
                          {farm.acreage} ac
                        </span>
                      </div>

                      <div className="border-x border-slate-200/60 px-1">
                        <span className="block text-[10px] uppercase font-bold text-slate-400">
                          Soil
                        </span>
                        <span
                          className="text-xs font-bold text-slate-700 truncate block"
                          title={farm.soilType || 'Loamy'}
                        >
                          {farm.soilType || 'Loamy'}
                        </span>
                      </div>

                      <div>
                        <span className="block text-[10px] uppercase font-bold text-slate-400">
                          Irrigation
                        </span>
                        <span
                          className="text-xs font-bold text-slate-700 truncate block"
                          title={farm.irrigationType || 'Drip'}
                        >
                          {farm.irrigationType || 'Drip'}
                        </span>
                      </div>
                    </div>

                    {/* Main Crops Pills */}
                    <div className="mb-3.5">
                      <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-1.5">
                        Main Crops
                      </span>
                      {Array.isArray(farm.mainCrops) && farm.mainCrops.length > 0 ? (
                        <div className="flex flex-wrap gap-1.5">
                          {farm.mainCrops.slice(0, 3).map((crop) => (
                            <span
                              key={crop}
                              className="px-2 py-0.5 rounded-md bg-[#DCFCE7]/80 text-[#145A32] text-[11px] font-semibold border border-[#22C55E]/20"
                            >
                              {crop}
                            </span>
                          ))}
                          {farm.mainCrops.length > 3 && (
                            <span className="px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[10px] font-medium">
                              +{farm.mainCrops.length - 3} more
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400 italic">
                          No crops recorded
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Card Footer: Created Date & Action Buttons */}
                  <div className="pt-3 border-t border-slate-100">
                    {createdDate && (
                      <div className="flex items-center gap-1 text-[11px] text-slate-400 mb-2.5">
                        <Calendar className="h-3 w-3 text-slate-400 shrink-0" />
                        <span>Registered {createdDate}</span>
                      </div>
                    )}

                    <div className="flex items-center gap-2">
                      <Link to={`/dashboard/farms/${farmId}`} className="flex-1">
                        <Button
                          variant="outline"
                          size="sm"
                          icon={ExternalLink}
                          className="w-full justify-center !py-1.5 text-xs font-semibold bg-white hover:border-[#166534] hover:text-[#166534]"
                        >
                          View Farm
                        </Button>
                      </Link>

                      <Link to={`/dashboard/farms/${farmId}/edit`}>
                        <button
                          type="button"
                          title="Edit Farm Details"
                          className="p-1.5 rounded-lg text-slate-500 hover:text-[#166534] hover:bg-[#DCFCE7]/50 border border-slate-200 hover:border-[#166534]/30 transition-all cursor-pointer"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                      </Link>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      {/* 9. Populated View: List Mode */}
      {viewMode === 'list' && filteredFarms.length > 0 && (
        <div className="rounded-xl border border-slate-200/90 bg-white overflow-hidden shadow-2xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F7F9F5] border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold">
                <tr>
                  <th className="px-4 py-3">Farm Name</th>
                  <th className="px-4 py-3">Location</th>
                  <th className="px-3 py-3">Acreage</th>
                  <th className="px-3 py-3">Soil</th>
                  <th className="px-3 py-3">Irrigation</th>
                  <th className="px-4 py-3">Main Crops</th>
                  <th className="px-3 py-3">Status</th>
                  <th className="px-3 py-3">Created</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {filteredFarms.map((farm) => {
                  const farmId = farm._id || farm.id;
                  const createdDate = formatDate(farm.createdAt);

                  return (
                    <tr
                      key={farmId}
                      className="hover:bg-[#F7F9F5]/70 transition-colors"
                    >
                      <td className="px-4 py-3 font-bold text-[#17251B]">
                        <div className="flex items-center gap-2">
                          <Sprout className="h-4 w-4 text-[#166534] shrink-0" />
                          <span className="truncate max-w-[160px]">{farm.name}</span>
                        </div>
                      </td>

                      <td className="px-4 py-3 text-slate-500">
                        <span className="truncate max-w-[180px] block">
                          {formatLocation(farm)}
                        </span>
                      </td>

                      <td className="px-3 py-3 font-extrabold text-[#145A32]">
                        {farm.acreage} ac
                      </td>

                      <td className="px-3 py-3 text-slate-600">
                        {farm.soilType || 'Loamy'}
                      </td>

                      <td className="px-3 py-3 text-slate-600">
                        {farm.irrigationType || 'Drip'}
                      </td>

                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1 max-w-[200px]">
                          {Array.isArray(farm.mainCrops) && farm.mainCrops.length > 0 ? (
                            farm.mainCrops.slice(0, 2).map((c) => (
                              <span
                                key={c}
                                className="px-1.5 py-0.5 rounded bg-emerald-50 text-[#145A32] text-[10px] font-semibold"
                              >
                                {c}
                              </span>
                            ))
                          ) : (
                            <span className="text-slate-400 text-[10px]">None</span>
                          )}
                          {farm.mainCrops?.length > 2 && (
                            <span className="text-[10px] text-slate-400">
                              +{farm.mainCrops.length - 2}
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="px-3 py-3">
                        <Badge
                          size="sm"
                          variant={
                            farm.status === 'Active'
                              ? 'success'
                              : farm.status === 'Archived'
                              ? 'warning'
                              : 'neutral'
                          }
                          dot
                        >
                          {farm.status}
                        </Badge>
                      </td>

                      <td className="px-3 py-3 text-slate-400 text-[11px] whitespace-nowrap">
                        {createdDate || '—'}
                      </td>

                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Link to={`/dashboard/farms/${farmId}`}>
                            <button
                              type="button"
                              className="px-2.5 py-1 rounded-md text-xs font-semibold text-[#166534] hover:bg-[#DCFCE7] transition-colors cursor-pointer"
                            >
                              View
                            </button>
                          </Link>
                          <Link to={`/dashboard/farms/${farmId}/edit`}>
                            <button
                              type="button"
                              title="Edit Farm"
                              className="p-1 rounded-md text-slate-400 hover:text-[#166534] hover:bg-[#DCFCE7] transition-colors cursor-pointer"
                            >
                              <Edit className="h-3.5 w-3.5" />
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

      {/* 10. Bottom Footer Link to Manage All Farms */}
      {totalFarmsCount > 0 && (
        <div className="flex items-center justify-between pt-3 border-t border-slate-100 text-xs text-slate-500">
          <span>
            Showing {filteredFarms.length} of {totalFarmsCount} registered farm parcel
            {totalFarmsCount === 1 ? '' : 's'}
          </span>
          <Link
            to="/dashboard/farms"
            className="font-bold text-[#166534] hover:underline flex items-center gap-1"
          >
            <span>Manage All Farms in Full Catalog</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      )}
    </div>
  );
};

export default MyFarmsSection;
