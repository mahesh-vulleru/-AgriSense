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
  Tractor,
  Layers,
  ArrowRight,
  Plus,
} from 'lucide-react';
import BackendStatusBanner from '../components/dashboard/BackendStatusBanner.jsx';
import MetricCard from '../components/dashboard/MetricCard.jsx';
import TelemetryChart from '../components/dashboard/TelemetryChart.jsx';
import FieldStatusCard from '../components/dashboard/FieldStatusCard.jsx';
import AlertsList from '../components/dashboard/AlertsList.jsx';
import QuickActions from '../components/dashboard/QuickActions.jsx';
import Button from '../components/common/Button.jsx';
import Badge from '../components/common/Badge.jsx';
import { useHealth } from '../hooks/useHealth.js';
import { useAuth } from '../hooks/useAuth.js';
import farmService from '../services/farmService.js';

export const FarmerDashboard = () => {
  const { checkNow, status } = useHealth();
  const { user } = useAuth();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [farmStats, setFarmStats] = useState({
    loading: true,
    totalFarms: 0,
    activeFarms: 0,
    totalAcreage: 0,
    farms: [],
  });

  useEffect(() => {
    let isMounted = true;
    const fetchFarms = async () => {
      try {
        const data = await farmService.getFarms({ limit: 5 });
        if (isMounted) {
          setFarmStats({
            loading: false,
            totalFarms: data.summary?.totalFarms ?? data.farms?.length ?? 0,
            activeFarms: data.summary?.activeFarms ?? 0,
            totalAcreage: data.summary?.totalAcreage ?? 0,
            farms: data.farms || [],
          });
        }
      } catch {
        if (isMounted) {
          setFarmStats((prev) => ({ ...prev, loading: false }));
        }
      }
    };
    fetchFarms();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    try {
      const [, data] = await Promise.all([
        checkNow(),
        farmService.getFarms({ limit: 5 }),
      ]);
      if (data) {
        setFarmStats({
          loading: false,
          totalFarms: data.summary?.totalFarms ?? data.farms?.length ?? 0,
          activeFarms: data.summary?.activeFarms ?? 0,
          totalAcreage: data.summary?.totalAcreage ?? 0,
          farms: data.farms || [],
        });
      }
    } catch {
      // Keep previous stats on error
    } finally {
      setTimeout(() => setIsRefreshing(false), 500);
    }
  };

  return (
    <div className="space-y-6">
      {/* Dashboard Top Header & Welcome Banner */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-2 border-b border-slate-200/60">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xl sm:text-2xl font-extrabold text-[#17251B] tracking-tight">
              Welcome back, {user?.name || 'Farmer'} 👋
            </span>
            <Badge size="sm" variant="forest" dot>
              {user?.role ? user.role.toUpperCase() : 'FARMER PORTAL'}
            </Badge>
          </div>
          <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500">
            <div className="flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-[#166534]" />
              <span>
                {user?.location || 'Verified Farmer'}
                {!farmStats.loading && ` • ${farmStats.totalAcreage} Total Acres across ${farmStats.totalFarms} Farm${farmStats.totalFarms === 1 ? '' : 's'}`}
              </span>
            </div>
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
            loading={isRefreshing || status === 'loading'}
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

      {/* Real MongoDB Farm Holdings Banner */}
      <div className="rounded-2xl border border-emerald-900/10 bg-white p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#166534] to-[#145A32] text-white shadow-xs">
              <Tractor className="h-5 w-5 text-[#22C55E]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-[#17251B]">My Farm Holdings</h2>
                <Badge size="sm" variant="success" dot>
                  Live MongoDB Data
                </Badge>
              </div>
              <p className="text-xs text-slate-500">
                Aggregated land boundaries, active acreage, and precision telemetry
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link to="/dashboard/farms">
              <Button variant="outline" size="sm" icon={ArrowRight} className="bg-white text-xs">
                Manage All Farms
              </Button>
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4">
          <div className="rounded-xl bg-slate-50/70 border border-slate-200/60 p-4">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              Registered Farms
            </div>
            <div className="text-2xl font-black text-[#17251B] mt-1">
              {farmStats.loading ? '...' : farmStats.totalFarms}
            </div>
            <p className="text-[11px] text-[#166534] font-medium mt-0.5">
              {farmStats.activeFarms} Active in database
            </p>
          </div>

          <div className="rounded-xl bg-slate-50/70 border border-slate-200/60 p-4">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              Total Acreage
            </div>
            <div className="text-2xl font-black text-[#17251B] mt-1">
              {farmStats.loading ? '...' : `${farmStats.totalAcreage} ac`}
            </div>
            <p className="text-[11px] text-slate-500 font-medium mt-0.5">
              Active cultivated land
            </p>
          </div>

          <div className="rounded-xl bg-slate-50/70 border border-slate-200/60 p-4 flex flex-col justify-between">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                Quick Action
              </div>
              <div className="text-xs font-bold text-[#17251B] mt-1">
                {farmStats.totalFarms === 0 ? 'No Farms Yet' : 'Expand Holdings'}
              </div>
            </div>
            <Link
              to="/dashboard/farms/new"
              className="text-xs font-bold text-[#166534] hover:underline flex items-center gap-1 mt-2"
            >
              <span>+ Register New Farm Parcel</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Top 4 Sensor KPI Cards */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="h-4 w-4 text-[#166534]" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              IoT Sensor Telemetry (Active Season)
            </h3>
          </div>
          <Badge size="sm" variant="neutral">
            Telemetry Model
          </Badge>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
          <MetricCard
            title="Average Soil Moisture"
            value="42"
            unit="%"
            icon={Droplets}
            trend="up"
            trendValue="+3.2% from 24h ago"
            status="success"
            statusText="Optimal Range (38-50%)"
          />

          <MetricCard
            title="Root Zone Temperature"
            value="24.5"
            unit="°C"
            icon={Thermometer}
            trend="neutral"
            trendValue="Stable (+0.4°C)"
            status="success"
            statusText="Favorable Growth"
          />

          <MetricCard
            title="Ambient Humidity"
            value="68"
            unit="%"
            icon={Wind}
            trend="down"
            trendValue="-5% afternoon dip"
            status="info"
            statusText="Moderate Risk"
          />

          <MetricCard
            title="Active Irrigation Pumps"
            value="2 / 4"
            unit="Active"
            icon={Gauge}
            status="warning"
            statusText="Cycle in 45 min"
            subtitle="Sector B scheduled"
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
