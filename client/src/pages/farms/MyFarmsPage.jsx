import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Sprout,
  Plus,
  Search,
  Filter,
  ArrowUpDown,
  LayoutGrid,
  List as ListIcon,
  MapPin,
  Droplets,
  Tractor,
  RefreshCw,
  AlertCircle,
  ExternalLink,
  Edit,
} from 'lucide-react';
import farmService from '../../services/farmService.js';
import Button from '../../components/common/Button.jsx';
import Badge from '../../components/common/Badge.jsx';

export const MyFarmsPage = () => {
  const navigate = useNavigate();

  const [farms, setFarms] = useState([]);
  const [summary, setSummary] = useState({
    totalFarms: 0,
    activeFarms: 0,
    totalAcreage: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filter & Toolbar States
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortOption, setSortOption] = useState('newest');
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'list'
  const [refreshIndex, setRefreshIndex] = useState(0);

  useEffect(() => {
    let isMounted = true;

    const timer = setTimeout(async () => {
      try {
        let sortBy = 'createdAt';
        let sortOrder = 'desc';

        if (sortOption === 'name-asc') {
          sortBy = 'name';
          sortOrder = 'asc';
        } else if (sortOption === 'name-desc') {
          sortBy = 'name';
          sortOrder = 'desc';
        } else if (sortOption === 'acreage-desc') {
          sortBy = 'acreage';
          sortOrder = 'desc';
        } else if (sortOption === 'acreage-asc') {
          sortBy = 'acreage';
          sortOrder = 'asc';
        }

        const params = {
          search: searchTerm.trim() || undefined,
          status: statusFilter !== 'all' ? statusFilter : undefined,
          sortBy,
          sortOrder,
        };

        const data = await farmService.getFarms(params);
        if (isMounted && data?.success) {
          setFarms(data.farms || []);
          if (data.summary) {
            setSummary(data.summary);
          }
        }
      } catch (err) {
        if (isMounted) {
          setError(err.message || 'Failed to load farms. Please try again.');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }, 200);

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [searchTerm, statusFilter, sortOption, refreshIndex]);

  const fetchFarms = () => {
    setLoading(true);
    setRefreshIndex((prev) => prev + 1);
  };

  return (
    <div className="space-y-6">
      {/* Page Title & Top Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-200/70">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#166534] to-[#145A32] text-white shadow-xs">
              <Tractor className="h-5 w-5 text-[#22C55E]" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-[#17251B] tracking-tight">
                My Farms
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                Manage registered agricultural holdings, acreage, and irrigation infrastructure.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchFarms}
            title="Refresh farms list"
            icon={RefreshCw}
            loading={loading}
          >
            Refresh
          </Button>

          <Link to="/dashboard/farms/new">
            <Button
              variant="primary"
              size="sm"
              icon={Plus}
              className="!rounded-xl shadow-xs"
            >
              Add New Farm
            </Button>
          </Link>
        </div>
      </div>

      {/* Summary KPI Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Total Farms */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs hover:border-[#166534]/40 transition-all">
          <div className="flex items-center justify-between text-xs text-slate-500 font-semibold uppercase tracking-wider">
            <span>Total Farms</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#DCFCE7] text-[#166534]">
              <Tractor className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-3 text-3xl font-black text-[#17251B] tracking-tight">
            {summary.totalFarms}
          </p>
          <span className="text-xs text-slate-500 mt-1 block">
            Registered agricultural plots
          </span>
        </div>

        {/* Total Acreage */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs hover:border-[#166534]/40 transition-all">
          <div className="flex items-center justify-between text-xs text-slate-500 font-semibold uppercase tracking-wider">
            <span>Total Acreage</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
              <Sprout className="h-4 w-4 text-[#166534]" />
            </div>
          </div>
          <p className="mt-3 text-3xl font-black text-[#145A32] tracking-tight">
            {summary.totalAcreage}{' '}
            <span className="text-base font-semibold text-slate-500">Acres</span>
          </p>
          <span className="text-xs text-emerald-700 font-medium mt-1 block">
            Under active cultivation
          </span>
        </div>

        {/* Active Farms */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs hover:border-[#166534]/40 transition-all">
          <div className="flex items-center justify-between text-xs text-slate-500 font-semibold uppercase tracking-wider">
            <span>Active Farms</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-50 text-sky-600">
              <Droplets className="h-4 w-4 text-sky-600" />
            </div>
          </div>
          <p className="mt-3 text-3xl font-black text-[#17251B] tracking-tight">
            {summary.activeFarms}
          </p>
          <span className="text-xs text-slate-500 mt-1 block">
            Live telemetry operational
          </span>
        </div>
      </div>

      {/* Toolbar: Search, Filters, Sorting & View Toggle */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        {/* Search input */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by farm name, location, crops, village..."
            className="w-full rounded-xl border border-slate-200 bg-slate-50/70 pl-10 pr-3.5 py-2 text-xs text-[#17251B] placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#166534] transition-all"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-2.5 text-xs text-slate-400 hover:text-slate-600"
            >
              Clear
            </button>
          )}
        </div>

        {/* Filter controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Status Filter */}
          <div className="flex items-center gap-1.5 text-xs">
            <Filter className="h-3.5 w-3.5 text-slate-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#166534]"
            >
              <option value="all">All Status</option>
              <option value="Active">Active Only</option>
              <option value="Archived">Archived Only</option>
              <option value="Inactive">Inactive</option>
            </select>
          </div>

          {/* Sort By */}
          <div className="flex items-center gap-1.5 text-xs">
            <ArrowUpDown className="h-3.5 w-3.5 text-slate-400" />
            <select
              value={sortOption}
              onChange={(e) => setSortOption(e.target.value)}
              className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#166534]"
            >
              <option value="newest">Newest First</option>
              <option value="name-asc">Name (A &rarr; Z)</option>
              <option value="name-desc">Name (Z &rarr; A)</option>
              <option value="acreage-desc">Acreage (High &rarr; Low)</option>
              <option value="acreage-asc">Acreage (Low &rarr; High)</option>
            </select>
          </div>

          <div className="h-5 w-px bg-slate-200 hidden sm:block" />

          {/* Grid / List View Toggle */}
          <div className="flex items-center rounded-lg border border-slate-200 p-0.5 bg-slate-50">
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-md transition-all cursor-pointer ${
                viewMode === 'grid'
                  ? 'bg-white shadow-xs text-[#166534]'
                  : 'text-slate-400 hover:text-slate-600'
              }`}
              title="Grid View"
              aria-label="Grid View"
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-md transition-all cursor-pointer ${
                viewMode === 'list'
                  ? 'bg-white shadow-xs text-[#166534]'
                  : 'text-slate-400 hover:text-slate-600'
              }`}
              title="List View"
              aria-label="List View"
            >
              <ListIcon className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-rose-800 text-sm flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="h-5 w-5 text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
          <Button variant="danger" size="sm" onClick={fetchFarms}>
            Try Again
          </Button>
        </div>
      )}

      {/* Loading Skeleton */}
      {loading && farms.length === 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2, 3].map((n) => (
            <div
              key={n}
              className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs animate-pulse space-y-4"
            >
              <div className="h-5 bg-slate-200 rounded w-2/3" />
              <div className="h-4 bg-slate-100 rounded w-1/2" />
              <div className="h-16 bg-slate-50 rounded" />
              <div className="h-8 bg-slate-100 rounded" />
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!loading && farms.length === 0 && (
        <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-12 text-center max-w-2xl mx-auto shadow-xs">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#DCFCE7] text-[#166534] mx-auto mb-4">
            <Sprout className="h-8 w-8 text-[#22C55E]" />
          </div>

          {searchTerm || statusFilter !== 'all' ? (
            <>
              <h3 className="text-lg font-bold text-[#17251B]">
                No farms match your search filters
              </h3>
              <p className="mt-1.5 text-xs text-slate-500">
                Try adjusting your search query or reset status filters to view all holdings.
              </p>
              <div className="mt-5">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSearchTerm('');
                    setStatusFilter('all');
                  }}
                >
                  Clear Filters
                </Button>
              </div>
            </>
          ) : (
            <>
              <h3 className="text-xl font-bold text-[#17251B]">
                No farms registered yet
              </h3>
              <p className="mt-2 text-sm text-slate-500 max-w-md mx-auto">
                Get started by registering your first farm plot to configure soil telemetry,
                irrigation schedules, and micro-climate advisories.
              </p>
              <div className="mt-6">
                <Link to="/dashboard/farms/new">
                  <Button variant="primary" size="md" icon={Plus} className="!rounded-xl shadow-md">
                    Register Your First Farm
                  </Button>
                </Link>
              </div>
            </>
          )}
        </div>
      )}

      {/* Grid View */}
      {viewMode === 'grid' && farms.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {farms.map((farm) => (
            <div
              key={farm.id}
              className={`rounded-2xl border bg-white p-6 shadow-xs hover:shadow-md transition-all flex flex-col justify-between ${
                farm.status === 'Archived'
                  ? 'border-slate-200/70 bg-slate-50/50 opacity-80'
                  : 'border-slate-200/90 hover:border-[#166534]/50'
              }`}
            >
              <div>
                {/* Card Top: Name and Status Badge */}
                <div className="flex items-start justify-between gap-3 mb-2">
                  <h3 className="text-lg font-bold text-[#17251B] tracking-tight line-clamp-1">
                    {farm.name}
                  </h3>
                  <Badge
                    size="sm"
                    dot
                    variant={farm.status === 'Active' ? 'success' : 'warning'}
                  >
                    {farm.status}
                  </Badge>
                </div>

                {/* Location */}
                <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-4">
                  <MapPin className="h-3.5 w-3.5 text-[#166534] shrink-0" />
                  <span className="truncate">
                    {[farm.village, farm.district, farm.state]
                      .filter(Boolean)
                      .join(', ') || farm.location}
                  </span>
                </div>

                {/* Key Attributes Pills */}
                <div className="grid grid-cols-3 gap-2 py-3 border-y border-slate-100 text-center mb-4">
                  <div className="p-2 rounded-lg bg-slate-50 border border-slate-100">
                    <span className="block text-[10px] uppercase font-bold text-slate-400">
                      Acreage
                    </span>
                    <span className="text-xs font-extrabold text-[#145A32]">
                      {farm.acreage} ac
                    </span>
                  </div>

                  <div className="p-2 rounded-lg bg-slate-50 border border-slate-100">
                    <span className="block text-[10px] uppercase font-bold text-slate-400">
                      Soil
                    </span>
                    <span className="text-xs font-extrabold text-slate-700 truncate block">
                      {farm.soilType}
                    </span>
                  </div>

                  <div className="p-2 rounded-lg bg-slate-50 border border-slate-100">
                    <span className="block text-[10px] uppercase font-bold text-slate-400">
                      Irrigation
                    </span>
                    <span className="text-xs font-extrabold text-slate-700 truncate block">
                      {farm.irrigationType}
                    </span>
                  </div>
                </div>

                {/* Main Crops Tags */}
                {farm.mainCrops && farm.mainCrops.length > 0 && (
                  <div className="mb-4">
                    <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-1.5">
                      Main Crops
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {farm.mainCrops.slice(0, 4).map((crop) => (
                        <span
                          key={crop}
                          className="px-2 py-0.5 rounded-md bg-[#DCFCE7]/70 text-[#145A32] text-[11px] font-semibold border border-[#22C55E]/20"
                        >
                          {crop}
                        </span>
                      ))}
                      {farm.mainCrops.length > 4 && (
                        <span className="px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[10px] font-medium">
                          +{farm.mainCrops.length - 4} more
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Card Footer Actions */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                <Link
                  to={`/dashboard/farms/${farm.id}`}
                  className="flex-1"
                >
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full justify-center !rounded-xl !py-2 text-xs font-semibold hover:border-[#166534] hover:text-[#166534]"
                  >
                    <span>View Details</span>
                    <ExternalLink className="h-3.5 w-3.5 ml-1" />
                  </Button>
                </Link>

                <Link to={`/dashboard/farms/${farm.id}/edit`}>
                  <button
                    type="button"
                    title="Edit Farm"
                    className="p-2 rounded-xl text-slate-400 hover:text-[#166534] hover:bg-[#DCFCE7]/40 border border-transparent hover:border-[#22C55E]/30 transition-all cursor-pointer"
                  >
                    <Edit className="h-4 w-4" />
                  </button>
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* List View */}
      {viewMode === 'list' && farms.length > 0 && (
        <div className="rounded-2xl border border-slate-200/90 bg-white overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F7F9F5] border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold">
                <tr>
                  <th className="px-5 py-3.5">Farm Name</th>
                  <th className="px-4 py-3.5">Location</th>
                  <th className="px-4 py-3.5">Acreage</th>
                  <th className="px-4 py-3.5">Soil Type</th>
                  <th className="px-4 py-3.5">Irrigation</th>
                  <th className="px-4 py-3.5">Main Crops</th>
                  <th className="px-4 py-3.5">Status</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {farms.map((farm) => (
                  <tr
                    key={farm.id}
                    className="hover:bg-[#F7F9F5]/70 transition-colors cursor-pointer"
                    onClick={() => navigate(`/dashboard/farms/${farm.id}`)}
                  >
                    <td className="px-5 py-3.5 font-bold text-[#17251B] flex items-center gap-2">
                      <Sprout className="h-4 w-4 text-[#166534] shrink-0" />
                      <span>{farm.name}</span>
                    </td>
                    <td className="px-4 py-3.5 text-slate-500">
                      {[farm.village, farm.district, farm.state]
                        .filter(Boolean)
                        .join(', ') || farm.location}
                    </td>
                    <td className="px-4 py-3.5 font-bold text-[#145A32]">
                      {farm.acreage} ac
                    </td>
                    <td className="px-4 py-3.5">{farm.soilType}</td>
                    <td className="px-4 py-3.5">{farm.irrigationType}</td>
                    <td className="px-4 py-3.5">
                      <div className="flex flex-wrap gap-1">
                        {farm.mainCrops.slice(0, 2).map((c) => (
                          <span
                            key={c}
                            className="px-1.5 py-0.5 rounded bg-[#DCFCE7]/60 text-[#145A32] text-[10px]"
                          >
                            {c}
                          </span>
                        ))}
                        {farm.mainCrops.length > 2 && (
                          <span className="text-[10px] text-slate-400">
                            +{farm.mainCrops.length - 2}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <Badge
                        size="sm"
                        dot
                        variant={farm.status === 'Active' ? 'success' : 'warning'}
                      >
                        {farm.status}
                      </Badge>
                    </td>
                    <td
                      className="px-5 py-3.5 text-right space-x-2"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Link
                        to={`/dashboard/farms/${farm.id}`}
                        className="inline-block p-1 text-slate-400 hover:text-[#166534]"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Link>
                      <Link
                        to={`/dashboard/farms/${farm.id}/edit`}
                        className="inline-block p-1 text-slate-400 hover:text-[#166534]"
                      >
                        <Edit className="h-4 w-4" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default MyFarmsPage;
