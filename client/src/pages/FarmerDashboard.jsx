import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Droplets,
  Thermometer,
  Wind,
  Gauge,
  RefreshCw,
  Calendar,
  MapPin,
  Layers,
  Plus,
  WifiOff,
  AlertTriangle,
  Sprout,
} from 'lucide-react';
import BackendStatusBanner from '../components/dashboard/BackendStatusBanner.jsx';
import MetricCard from '../components/dashboard/MetricCard.jsx';
import TelemetryChart from '../components/dashboard/TelemetryChart.jsx';
import FieldStatusCard from '../components/dashboard/FieldStatusCard.jsx';
import AlertsList from '../components/dashboard/AlertsList.jsx';
import QuickActions from '../components/dashboard/QuickActions.jsx';
import Button from '../components/common/Button.jsx';
import Badge from '../components/common/Badge.jsx';
import MyFarmsSection from '../components/dashboard/MyFarmsSection.jsx';
import MyCropsSection from '../components/dashboard/MyCropsSection.jsx';
import { useHealth } from '../hooks/useHealth.js';
import { useAuth } from '../hooks/useAuth.js';
import dashboardService from '../services/dashboardService.js';

export const FarmerDashboard = () => {
  const { checkNow, status: healthStatus } = useHealth();
  const { user } = useAuth();

  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshIndex, setRefreshIndex] = useState(0);

  useEffect(() => {
    let isMounted = true;
    const controller = new AbortController();

    const loadData = async () => {
      try {
        const response = await dashboardService.getFarmerStats({
          signal: controller.signal,
        });

        if (isMounted && response?.success && response.data) {
          setDashboardData(response.data);
          setError(null);
        } else if (isMounted) {
          setError(response?.message || 'Failed to load dashboard data');
        }
      } catch (err) {
        if (!isMounted || err.name === 'CanceledError' || err.name === 'AbortError') {
          return;
        }
        const errMsg =
          err.response?.data?.message ||
          err.message ||
          'Unable to connect to dashboard service. Please verify backend status.';
        setError(errMsg);
      } finally {
        if (isMounted) {
          setLoading(false);
          setIsRefreshing(false);
        }
      }
    };

    loadData();

    return () => {
      isMounted = false;
      controller.abort();
    };
  }, [refreshIndex]);

  const handleManualRefresh = async () => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    try {
      checkNow();
    } finally {
      setRefreshIndex((prev) => prev + 1);
    }
  };

  const handleRetry = () => {
    setLoading(true);
    setRefreshIndex((prev) => prev + 1);
  };

  const statistics = dashboardData?.statistics || {
    totalFarms: 0,
    activeFarms: 0,
    inactiveFarms: 0,
    archivedFarms: 0,
    totalCultivatedAcreage: 0,
    activeCropsCount: 0,
    uniqueCrops: [],
    pendingNotifications: 0,
  };

  const farmer = dashboardData?.farmer || user;

  return (
    <div className="space-y-6">
      {/* Dashboard Top Header & Welcome Banner */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-2 border-b border-slate-200/60">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xl sm:text-2xl font-extrabold text-[#17251B] tracking-tight">
              Welcome back, {farmer?.fullName || farmer?.name || user?.name || 'Farmer'} 👋
            </span>
            <Badge size="sm" variant="forest" dot>
              {farmer?.role ? farmer.role.toUpperCase() : 'FARMER PORTAL'}
            </Badge>
          </div>
          <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500">
            <div className="flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-[#166534]" />
              <span>
                {farmer?.location || user?.location || 'Verified Farmer'}
                {!loading &&
                  ` • ${statistics.totalCultivatedAcreage} Total Cultivated Acres across ${statistics.totalFarms} Farm${statistics.totalFarms === 1 ? '' : 's'}`}
              </span>
            </div>
            {statistics.activeCropsCount > 0 && (
              <div className="flex items-center gap-1.5 text-[#166534] font-medium">
                <Sprout className="w-3.5 h-3.5" />
                <span>
                  {statistics.activeCropsCount} Active Crop
                  {statistics.activeCropsCount === 1 ? '' : 's'}:{' '}
                  {statistics.uniqueCrops.slice(0, 3).join(', ')}
                  {statistics.uniqueCrops.length > 3 ? '...' : ''}
                </span>
              </div>
            )}
            <div className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <span>
                {new Date().toLocaleDateString('en-US', {
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            icon={RefreshCw}
            loading={isRefreshing || healthStatus === 'loading'}
            onClick={handleManualRefresh}
            className="bg-white shadow-2xs hover:bg-[#F7F9F5]"
          >
            Refresh Data
          </Button>
          <Link to="/dashboard/farms/new">
            <Button variant="primary" size="sm" icon={Plus}>
              Add Farm
            </Button>
          </Link>
        </div>
      </div>

      {/* Backend & MongoDB Live Connection Banner */}
      <BackendStatusBanner />

      {/* Error State with Retry Button */}
      {error && !loading && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50/80 p-5 shadow-xs">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-100 text-rose-600">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-rose-900">
                  Unable to load dashboard data
                </h3>
                <p className="text-xs text-rose-700 mt-0.5 max-w-xl">
                  {error}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                icon={RefreshCw}
                loading={isRefreshing}
                onClick={handleRetry}
                className="!border-rose-300 !text-rose-800 bg-white hover:!bg-rose-100/50 text-xs"
              >
                Retry Request
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Loading Skeleton */}
      {loading && !dashboardData && (
        <div className="space-y-6 animate-pulse">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-4">
            <div className="h-5 w-48 bg-slate-200 rounded" />
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
              <div className="h-24 bg-slate-100 rounded-xl" />
              <div className="h-24 bg-slate-100 rounded-xl" />
              <div className="h-24 bg-slate-100 rounded-xl" />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="h-28 bg-white border border-slate-200 rounded-xl p-4" />
            <div className="h-28 bg-white border border-slate-200 rounded-xl p-4" />
            <div className="h-28 bg-white border border-slate-200 rounded-xl p-4" />
            <div className="h-28 bg-white border border-slate-200 rounded-xl p-4" />
          </div>
        </div>
      )}

      {/* My Farms Overview Section (Phase 2) */}
      <MyFarmsSection
        farms={dashboardData?.farms || dashboardData?.recentFarms || []}
        statistics={statistics}
        loading={loading}
        error={error}
        onRefresh={handleManualRefresh}
        isRefreshing={isRefreshing}
      />

      {/* My Crops Overview Section (Phase 3) */}
      <MyCropsSection
        crops={dashboardData?.cropsData?.crops || []}
        statistics={dashboardData?.cropsData?.statistics || {}}
        loading={loading}
        error={error}
      />

      {/* Hardware / IoT Sensor Notice Banner */}
      <div className="rounded-xl border border-amber-200/90 bg-amber-50/80 p-4 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start sm:items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-500/20 text-amber-800">
              <WifiOff className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-amber-900">
                  Hardware Sensor Status
                </span>
                <Badge size="sm" variant="warning" dot>
                  OFFLINE / UNCONNECTED
                </Badge>
              </div>
              <p className="text-xs text-amber-800/90 mt-0.5">
                {dashboardData?.sensorStatus?.message ||
                  'Sensor data unavailable – connect a device to view live readings.'}
              </p>
            </div>
          </div>
          <Badge
            size="sm"
            variant="neutral"
            className="self-start sm:self-auto font-mono text-[10px] uppercase tracking-wider"
          >
            DEMO / SIMULATED PREVIEW
          </Badge>
        </div>
      </div>

      {/* Top 4 Sensor KPI Cards (Clearly labeled as DEMO / SIMULATED) */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="h-4 w-4 text-[#166534]" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              IoT Sensor Telemetry (Demonstration Preview)
            </h3>
          </div>
          <Badge size="sm" variant="warning">
            DEMO / SIMULATED
          </Badge>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
          <MetricCard
            title="Soil Moisture"
            value="42"
            unit="%"
            icon={Droplets}
            trend="up"
            trendValue="+3.2% (Simulated)"
            status="success"
            statusText="Optimal (Demo)"
          />

          <MetricCard
            title="Root Temperature"
            value="24.5"
            unit="°C"
            icon={Thermometer}
            trend="neutral"
            trendValue="Stable (Simulated)"
            status="success"
            statusText="Favorable (Demo)"
          />

          <MetricCard
            title="Ambient Humidity"
            value="68"
            unit="%"
            icon={Wind}
            trend="down"
            trendValue="-5% (Simulated)"
            status="info"
            statusText="Moderate (Demo)"
          />

          <MetricCard
            title="Irrigation Pumps"
            value="2 / 4"
            unit="Active"
            icon={Gauge}
            status="warning"
            statusText="Cycle in 45m"
            subtitle="Simulated preview"
          />
        </div>
      </div>

      {/* Sensor Telemetry Chart & Field Sector Overview */}
      <div className="grid grid-cols-12 gap-5">
        <TelemetryChart />
        <FieldStatusCard />
      </div>

      {/* Recent Alerts & Quick Operations */}
      <div className="grid grid-cols-12 gap-5">
        <AlertsList />
        <QuickActions />
      </div>
    </div>
  );
};

export default FarmerDashboard;
