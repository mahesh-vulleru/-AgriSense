import { useState, useEffect } from 'react';
import { useParams, Link, useLocation } from 'react-router-dom';
import {
  Sprout,
  ArrowLeft,
  MapPin,
  Layers,
  Droplets,
  Edit,
  Archive,
  Calendar,
  AlertCircle,
  CheckCircle2,
  Tractor,
  CloudSun,
  Activity,
  Clock,
  X,
  Compass,
} from 'lucide-react';
import farmService from '../../services/farmService.js';
import Button from '../../components/common/Button.jsx';
import Badge from '../../components/common/Badge.jsx';

export const FarmDetailsPage = () => {
  const { id } = useParams();
  const location = useLocation();

  const [farm, setFarm] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');

  // Archive modal states
  const [showArchiveModal, setShowArchiveModal] = useState(false);
  const [archiving, setArchiving] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState(
    location.state?.successMessage || null
  );

  useEffect(() => {
    let isMounted = true;

    const load = async () => {
      try {
        const data = await farmService.getFarmById(id);
        if (isMounted && data?.success && data?.farm) {
          setFarm(data.farm);
        } else if (isMounted) {
          throw new Error('Farm details not found.');
        }
      } catch (err) {
        if (isMounted) {
          setError(err.message || 'Failed to retrieve farm details.');
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

  const handleArchiveToggle = async () => {
    setArchiving(true);
    try {
      const isCurrentlyArchived = farm.status === 'Archived';
      const data = await farmService.archiveFarm(id, {
        restore: isCurrentlyArchived,
      });

      if (data?.success && data?.farm) {
        setFarm(data.farm);
        setShowArchiveModal(false);
        setFeedbackMessage(
          isCurrentlyArchived
            ? 'Farm successfully restored to Active status!'
            : 'Farm successfully archived. It can be restored anytime.'
        );
      }
    } catch (err) {
      setError(err.message || 'Failed to update farm status.');
    } finally {
      setArchiving(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-6 bg-slate-200 rounded w-48 animate-pulse" />
        <div className="h-28 bg-white border border-slate-200 rounded-2xl animate-pulse" />
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((n) => (
            <div key={n} className="h-24 bg-white border border-slate-200 rounded-2xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (error || !farm) {
    return (
      <div className="max-w-2xl mx-auto rounded-3xl border border-rose-200 bg-rose-50 p-8 text-center space-y-4">
        <AlertCircle className="h-10 w-10 text-rose-600 mx-auto" />
        <h2 className="text-xl font-bold text-rose-900">Farm Not Found</h2>
        <p className="text-sm text-rose-700">
          {error || 'The requested farm could not be found or you do not have permission to view it.'}
        </p>
        <div className="pt-2">
          <Link to="/dashboard/farms">
            <Button variant="primary" size="sm">
              Return to My Farms
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: 'overview', name: 'Overview', icon: Sprout },
    { id: 'crops', name: 'Crops', icon: Tractor, badge: 'Phase 5' },
    { id: 'soil', name: 'Soil Analysis', icon: Activity, badge: 'Coming Next' },
    { id: 'irrigation', name: 'Irrigation', icon: Droplets, badge: 'Coming Next' },
    { id: 'weather', name: 'Weather', icon: CloudSun, badge: 'Coming Next' },
  ];

  return (
    <div className="space-y-6">
      {/* Back Link */}
      <div>
        <Link
          to="/dashboard/farms"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#166534] hover:underline"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Back to My Farms</span>
        </Link>
      </div>

      {/* Feedback Banner */}
      {feedbackMessage && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-800 text-sm flex items-center justify-between animate-fadeIn">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
            <span className="font-semibold">{feedbackMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedbackMessage(null)}
            className="text-emerald-600 hover:text-emerald-800 p-1 rounded"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Header Banner */}
      <div className="rounded-2xl sm:rounded-3xl border border-slate-200/90 bg-white p-6 sm:p-8 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#17251B] tracking-tight">
              {farm.name}
            </h1>
            <Badge
              size="md"
              dot
              variant={farm.status === 'Active' ? 'success' : 'warning'}
            >
              {farm.status}
            </Badge>
          </div>

          <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500">
            <div className="flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5 text-[#166534]" />
              <span>
                {[farm.village, farm.district, farm.state]
                  .filter(Boolean)
                  .join(', ') || farm.location}
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5 text-slate-400" />
              <span>
                Registered:{' '}
                {new Date(farm.createdAt).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3 shrink-0">
          <Link to={`/dashboard/farms/${farm.id}/edit`}>
            <Button variant="outline" size="md" icon={Edit} className="!rounded-xl shadow-xs">
              Edit Farm
            </Button>
          </Link>

          <Button
            variant={farm.status === 'Archived' ? 'secondary' : 'danger'}
            size="md"
            icon={Archive}
            onClick={() => setShowArchiveModal(true)}
            className="!rounded-xl shadow-xs"
          >
            {farm.status === 'Archived' ? 'Restore Farm' : 'Archive Farm'}
          </Button>
        </div>
      </div>

      {/* Key Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Acreage */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-400 font-bold uppercase tracking-wider">
            <span>Total Acreage</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#DCFCE7] text-[#166534]">
              <Sprout className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-3 text-2xl sm:text-3xl font-black text-[#145A32]">
            {farm.acreage}{' '}
            <span className="text-xs font-semibold text-slate-400">Acres</span>
          </p>
        </div>

        {/* Soil Type */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-400 font-bold uppercase tracking-wider">
            <span>Soil Type</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 text-amber-700">
              <Layers className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-3 text-xl sm:text-2xl font-black text-slate-800 truncate">
            {farm.soilType}
          </p>
        </div>

        {/* Irrigation System */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-400 font-bold uppercase tracking-wider">
            <span>Irrigation Method</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-50 text-sky-600">
              <Droplets className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-3 text-xl sm:text-2xl font-black text-slate-800 truncate">
            {farm.irrigationType}
          </p>
        </div>

        {/* Main Crops Count */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-400 font-bold uppercase tracking-wider">
            <span>Active Crops</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
              <Tractor className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-3 text-2xl sm:text-3xl font-black text-slate-800">
            {farm.mainCrops?.length || 0}
          </p>
        </div>
      </div>

      {/* Tabs Navigation Bar */}
      <div className="border-b border-slate-200/80 flex items-center gap-2 overflow-x-auto pb-1">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 border-b-2 text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                isActive
                  ? 'border-[#166534] text-[#166534]'
                  : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
              }`}
            >
              <Icon className="h-4 w-4" />
              <span>{tab.name}</span>
              {tab.badge && (
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                    isActive
                      ? 'bg-[#DCFCE7] text-[#145A32]'
                      : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Tab 1: Overview Content */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Geographic & Address Breakdown */}
          <div className="lg:col-span-2 space-y-6">
            {/* Geographic Information */}
            <div className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-xs space-y-4">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-600 flex items-center gap-2">
                <MapPin className="h-4 w-4 text-[#166534]" />
                <span>Geographic Location &amp; Address</span>
              </h3>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 py-2 border-y border-slate-100 text-xs">
                <div>
                  <span className="text-slate-400 block font-semibold">Village</span>
                  <span className="font-bold text-slate-800 mt-0.5 block">
                    {farm.village || 'N/A'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block font-semibold">District</span>
                  <span className="font-bold text-slate-800 mt-0.5 block">
                    {farm.district || 'N/A'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block font-semibold">State</span>
                  <span className="font-bold text-slate-800 mt-0.5 block">
                    {farm.state || 'N/A'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block font-semibold">Postal Pincode</span>
                  <span className="font-bold text-slate-800 mt-0.5 block">
                    {farm.pincode || 'N/A'}
                  </span>
                </div>
              </div>

              <div>
                <span className="text-xs text-slate-400 font-semibold block mb-1">
                  Primary Location Address
                </span>
                <p className="text-sm text-slate-800 font-medium">
                  {farm.location}
                </p>
              </div>

              {/* Coordinates if available */}
              {farm.coordinates && (farm.coordinates.latitude || farm.coordinates.longitude) && (
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center gap-3 text-xs text-slate-700">
                  <Compass className="h-4 w-4 text-[#166534] shrink-0" />
                  <span>
                    GPS Coordinates:{' '}
                    <strong>
                      {farm.coordinates.latitude ?? 'N/A'},{' '}
                      {farm.coordinates.longitude ?? 'N/A'}
                    </strong>
                  </span>
                </div>
              )}
            </div>

            {/* Farm Description & Agronomic Notes */}
            <div className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-xs space-y-3">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-600">
                Farm Description &amp; Topography
              </h3>
              <p className="text-sm text-slate-700 leading-relaxed font-normal">
                {farm.description ||
                  'No detailed agronomic description provided for this holding.'}
              </p>
            </div>
          </div>

          {/* Right Column: Main Crops & System Audit */}
          <div className="space-y-6">
            {/* Cultivated Crops */}
            <div className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-xs space-y-4">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-600 flex items-center gap-2">
                <Tractor className="h-4 w-4 text-[#166534]" />
                <span>Cultivated Crop Portfolio</span>
              </h3>

              {farm.mainCrops && farm.mainCrops.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {farm.mainCrops.map((crop) => (
                    <span
                      key={crop}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#DCFCE7] text-[#145A32] text-xs font-bold border border-[#22C55E]/20"
                    >
                      <Sprout className="h-3.5 w-3.5 text-[#166534]" />
                      <span>{crop}</span>
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-400">
                  No crops assigned yet. Edit this farm to configure main crops.
                </p>
              )}
            </div>

            {/* Farm Meta Audit */}
            <div className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-xs space-y-3 text-xs">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-600 flex items-center gap-2">
                <Clock className="h-4 w-4 text-slate-400" />
                <span>System Record Audit</span>
              </h3>
              <div className="space-y-2 pt-1 border-t border-slate-100 text-slate-600">
                <div className="flex justify-between">
                  <span className="text-slate-400">Farm ID:</span>
                  <span className="font-mono text-[11px] text-slate-700 truncate max-w-[150px]">
                    {farm.id}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Created:</span>
                  <span>{new Date(farm.createdAt).toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Last Modified:</span>
                  <span>{new Date(farm.updatedAt).toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Owner Role:</span>
                  <span className="capitalize">{farm.owner?.role || 'Farmer'}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tabs 2-5: Roadmap Placeholders (Honest & Informative, No Fake Data) */}
      {activeTab === 'crops' && (
        <div className="rounded-3xl border border-slate-200 bg-white p-12 text-center max-w-2xl mx-auto shadow-xs space-y-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#DCFCE7] text-[#166534] mx-auto">
            <Tractor className="h-8 w-8 text-[#22C55E]" />
          </div>
          <Badge size="md" variant="forest">
            Phase 5: Crop Management Module
          </Badge>
          <h3 className="text-xl font-bold text-[#17251B]">
            Crop Lifecycle &amp; Variety Tracking
          </h3>
          <p className="text-xs sm:text-sm text-slate-600 max-w-md mx-auto leading-relaxed">
            Phase 5 introduces individual crop cycle logging, sowing-to-harvest timelines,
            expected yield calculations, and growth stage monitoring for each plot.
          </p>
          <div className="pt-2">
            <Link to={`/dashboard/farms/${farm.id}/edit`}>
              <Button variant="outline" size="sm">
                Manage Main Crops in Farm Profile
              </Button>
            </Link>
          </div>
        </div>
      )}

      {activeTab === 'soil' && (
        <div className="rounded-3xl border border-slate-200 bg-white p-12 text-center max-w-2xl mx-auto shadow-xs space-y-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 mx-auto">
            <Activity className="h-8 w-8 text-[#166534]" />
          </div>
          <Badge size="md" variant="forest">
            Coming Next in IoT Telemetry Roadmap
          </Badge>
          <h3 className="text-xl font-bold text-[#17251B]">
            IoT Soil Sensor &amp; NPK Telemetry
          </h3>
          <p className="text-xs sm:text-sm text-slate-600 max-w-md mx-auto leading-relaxed">
            Live sensor node synchronization measuring real-time root moisture,
            soil temperature, electrical conductivity, and nitrogen-phosphorus-potassium balance.
          </p>
          <div className="pt-2">
            <Link to="/dashboard">
              <Button variant="outline" size="sm">
                View Global Platform Dashboard
              </Button>
            </Link>
          </div>
        </div>
      )}

      {activeTab === 'irrigation' && (
        <div className="rounded-3xl border border-slate-200 bg-white p-12 text-center max-w-2xl mx-auto shadow-xs space-y-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-sky-50 text-sky-600 mx-auto">
            <Droplets className="h-8 w-8 text-sky-600" />
          </div>
          <Badge size="md" variant="forest">
            Coming Next in IoT Telemetry Roadmap
          </Badge>
          <h3 className="text-xl font-bold text-[#17251B]">
            Smart Precision Irrigation Scheduling
          </h3>
          <p className="text-xs sm:text-sm text-slate-600 max-w-md mx-auto leading-relaxed">
            Automated water dispensation formulas tailored to {farm.soilType} soil
            absorption rates, evapotranspiration indices, and weather forecasts.
          </p>
        </div>
      )}

      {activeTab === 'weather' && (
        <div className="rounded-3xl border border-slate-200 bg-white p-12 text-center max-w-2xl mx-auto shadow-xs space-y-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 mx-auto">
            <CloudSun className="h-8 w-8 text-amber-600" />
          </div>
          <Badge size="md" variant="forest">
            Coming Next in AI Advisory Roadmap
          </Badge>
          <h3 className="text-xl font-bold text-[#17251B]">
            Hyper-Local Microclimate Advisory
          </h3>
          <p className="text-xs sm:text-sm text-slate-600 max-w-md mx-auto leading-relaxed">
            Localized agro-meteorological forecasting for {farm.location}, delivering early
            frost alerts, heat stress indicators, and rain window forecasts.
          </p>
        </div>
      )}

      {/* Archive / Restore Confirmation Modal */}
      {showArchiveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 sm:p-8 shadow-2xl border border-slate-200 animate-fadeIn space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-[#17251B] flex items-center gap-2">
                <Archive className="h-5 w-5 text-amber-600" />
                <span>
                  {farm.status === 'Archived' ? 'Restore Farm' : 'Archive Farm'}
                </span>
              </h3>
              <button
                type="button"
                onClick={() => setShowArchiveModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              {farm.status === 'Archived' ? (
                <p>
                  Restoring <strong className="text-slate-900">{farm.name}</strong> will return
                  its status to <strong className="text-emerald-700">Active</strong> and reinstate
                  its operational telemetry calculations in your farm overview.
                </p>
              ) : (
                <p>
                  Are you sure you want to archive <strong className="text-slate-900">{farm.name}</strong>?
                  Archived farms remain safe in your records but are excluded from active
                  telemetry averages. You can restore it at any time.
                </p>
              )}
            </div>

            <div className="pt-3 flex items-center justify-end gap-3 border-t border-slate-100">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowArchiveModal(false)}
                disabled={archiving}
              >
                Cancel
              </Button>

              <Button
                variant={farm.status === 'Archived' ? 'primary' : 'danger'}
                size="sm"
                loading={archiving}
                onClick={handleArchiveToggle}
                className="!rounded-xl px-5"
              >
                {farm.status === 'Archived' ? 'Confirm Restore' : 'Confirm Archive'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FarmDetailsPage;
