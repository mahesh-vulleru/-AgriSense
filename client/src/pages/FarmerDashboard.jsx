import { useState } from 'react';
import {
  Droplets,
  Thermometer,
  Wind,
  Gauge,
  RefreshCw,
  Calendar,
  MapPin,
  Sparkles,
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

export const FarmerDashboard = () => {
  const { checkNow, status } = useHealth();
  const { user } = useAuth();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    await checkNow();
    setTimeout(() => setIsRefreshing(false), 600);
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
              {user?.role ? user.role.toUpperCase() : 'ACTIVE SEASON'}
            </Badge>
          </div>
          <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500">
            <div className="flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-[#166534]" />
              <span>{user?.location || 'Green Valley Farm • 28.5 Total Acres'}</span>
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
            <Badge size="sm" variant="neutral">
              Sample Demonstration Data
            </Badge>
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
            Refresh Telemetry
          </Button>
          <Button
            variant="primary"
            size="sm"
            icon={Sparkles}
            onClick={() => alert('AI Diagnostic Scanner ready for Module Phase')}
          >
            AI Crop Advisory
          </Button>
        </div>
      </div>

      {/* Backend & MongoDB Live Connection Banner */}
      <BackendStatusBanner />

      {/* Top 4 Sensor KPI Cards */}
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
