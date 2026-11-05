import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Users,
  Tractor,
  Layers,
  Server,
  Settings,
  Database,
  ArrowRight,
  UserCheck,
} from 'lucide-react';
import Button from '../../components/common/Button.jsx';
import Badge from '../../components/common/Badge.jsx';
import { useAuth } from '../../hooks/useAuth.js';
import { useHealth } from '../../hooks/useHealth.js';
import farmService from '../../services/farmService.js';

export const AdminDashboard = () => {
  const { user } = useAuth();
  const { status, latency } = useHealth();
  const [platformStats, setPlatformStats] = useState({
    totalFarms: 0,
    totalAcreage: 0,
    activeFarms: 0,
    loading: true,
  });

  useEffect(() => {
    let isMounted = true;
    const fetchAdminStats = async () => {
      try {
        const data = await farmService.getFarms({ all: 'true' });
        if (isMounted) {
          setPlatformStats({
            totalFarms: data.summary?.totalFarms || data.farms?.length || 0,
            totalAcreage: data.summary?.totalAcreage || 0,
            activeFarms: data.summary?.activeFarms || 0,
            loading: false,
          });
        }
      } catch {
        if (isMounted) {
          setPlatformStats((prev) => ({ ...prev, loading: false }));
        }
      }
    };
    fetchAdminStats();
    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <div className="space-y-6">
      {/* Admin Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-3 border-b border-slate-200/70">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xl sm:text-2xl font-black text-[#17251B] tracking-tight">
              Admin Platform Control &bull; {user?.name || 'Administrator'}
            </span>
            <Badge size="sm" variant="danger" dot>
              ROOT ACCESS
            </Badge>
          </div>
          <p className="text-xs text-slate-500">
            System administration, cross-tenant farm surveillance, user account provisioning, and platform health telemetry.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Link to="/admin/users">
            <Button variant="primary" size="sm" icon={Users}>
              Manage Accounts
            </Button>
          </Link>
          <Link to="/admin/settings">
            <Button variant="outline" size="sm" icon={Settings} className="bg-white shadow-2xs">
              System Settings
            </Button>
          </Link>
        </div>
      </div>

      {/* Global Metrics Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold mb-2">
            <span>Total Managed Farms</span>
            <div className="h-8 w-8 rounded-lg bg-emerald-50 text-[#166534] flex items-center justify-center">
              <Tractor className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-[#17251B]">
            {platformStats.loading ? '...' : platformStats.totalFarms}
          </div>
          <p className="text-[11px] text-emerald-600 mt-1 font-medium">
            {platformStats.activeFarms} Active farms in MongoDB
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold mb-2">
            <span>Cumulative Acreage</span>
            <div className="h-8 w-8 rounded-lg bg-emerald-50 text-[#166534] flex items-center justify-center">
              <Layers className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-[#17251B]">
            {platformStats.loading ? '...' : `${platformStats.totalAcreage} ac`}
          </div>
          <p className="text-[11px] text-slate-500 mt-1 font-medium">Aggregated across all registered users</p>
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold mb-2">
            <span>Registered Accounts</span>
            <div className="h-8 w-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <Users className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-[#17251B]">Active</div>
          <p className="text-[11px] text-blue-600 mt-1 font-medium">Farmers, Experts &amp; Administrators</p>
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold mb-2">
            <span>Cluster Health</span>
            <div className="h-8 w-8 rounded-lg bg-emerald-50 text-[#166534] flex items-center justify-center">
              <Server className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-[#17251B]">
            {status === 'connected' ? 'Healthy' : 'Degraded'}
          </div>
          <p className="text-[11px] text-emerald-600 mt-1 font-medium">
            {latency ? `${latency}ms latency` : 'Database linked'}
          </p>
        </div>
      </div>

      {/* Admin Fast Navigation & Governance Tiles */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <UserCheck className="h-5 w-5 text-[#166534]" />
              <h3 className="text-sm font-bold text-[#17251B]">User &amp; Role Management</h3>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed mb-4">
              Audit farmer credentials, approve agricultural specialists, manage administrative privileges, and toggle account states.
            </p>
          </div>
          <Link
            to="/admin/users"
            className="flex items-center justify-between text-xs font-bold text-[#166534] hover:underline"
          >
            <span>Launch User Governance</span>
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Tractor className="h-5 w-5 text-[#166534]" />
              <h3 className="text-sm font-bold text-[#17251B]">Global Farms Directory</h3>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed mb-4">
              Inspect land records across all regional districts, monitor soil distribution, irrigation types, and crop diversity.
            </p>
          </div>
          <Link
            to="/admin/farms"
            className="flex items-center justify-between text-xs font-bold text-[#166534] hover:underline"
          >
            <span>View All Registered Farms</span>
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Database className="h-5 w-5 text-[#166534]" />
              <h3 className="text-sm font-bold text-[#17251B]">Infrastructure &amp; Audit Logs</h3>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed mb-4">
              Inspect MongoDB Atlas connection pools, JWT token expiration parameters, API rate limiter stats, and service uptime.
            </p>
          </div>
          <Link
            to="/admin/settings"
            className="flex items-center justify-between text-xs font-bold text-[#166534] hover:underline"
          >
            <span>Review Infrastructure</span>
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
