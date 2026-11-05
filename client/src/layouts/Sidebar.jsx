import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Sprout,
  Activity,
  Droplets,
  CloudSun,
  ScanEye,
  BarChart3,
  Settings,
  X,
  Server,
  RefreshCw,
  Database,
  ExternalLink,
  LogOut,
  Tractor,
  Layers,
  Bell,
  MessageSquare,
  Users,
  User,
} from 'lucide-react';
import { useHealth } from '../hooks/useHealth.js';
import { useAuth } from '../hooks/useAuth.js';
import Badge from '../components/common/Badge.jsx';

export const Sidebar = ({ isOpen, onClose }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { status, latency, healthData, checkNow } = useHealth();
  const { user, logout } = useAuth();

  const handleLogout = () => {
    logout();
    if (onClose) onClose();
    navigate('/login', { replace: true });
  };

  const getInitials = (name) => {
    if (!name) return 'AG';
    const parts = name.trim().split(' ');
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  const role = user?.role || 'farmer';

  // Navigation Items customized per user role
  const farmerNavItems = [
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { name: 'My Farms', path: '/dashboard/farms', icon: Tractor, badge: 'Live' },
    { name: 'Crops', path: '/dashboard/crops', icon: Sprout },
    { name: 'Crop Monitoring', path: '/dashboard/monitoring', icon: Activity },
    { name: 'Soil Analysis', path: '/dashboard/soil-analysis', icon: Layers },
    { name: 'Smart Irrigation', path: '/dashboard/irrigation', icon: Droplets },
    { name: 'Weather Advisory', path: '/dashboard/weather', icon: CloudSun },
    { name: 'AI Disease Scan', path: '/dashboard/disease-detection', icon: ScanEye },
    { name: 'Reports', path: '/dashboard/reports', icon: BarChart3 },
    { name: 'Notifications', path: '/dashboard/notifications', icon: Bell },
    { name: 'Consultation', path: '/dashboard/consultation', icon: MessageSquare },
    { name: 'Settings', path: '/dashboard/settings', icon: Settings },
  ];

  const expertNavItems = [
    { name: 'Expert Dashboard', path: '/expert/dashboard', icon: LayoutDashboard },
    { name: 'Consultation Queue', path: '/expert/consultations', icon: MessageSquare, badge: 'Active' },
    { name: 'Expert Profile', path: '/expert/profile', icon: User },
  ];

  const adminNavItems = [
    { name: 'Admin Dashboard', path: '/admin/dashboard', icon: LayoutDashboard },
    { name: 'User Management', path: '/admin/users', icon: Users },
    { name: 'Farmers Directory', path: '/admin/farmers', icon: Tractor },
    { name: 'Experts Directory', path: '/admin/experts', icon: Users },
    { name: 'All Farms', path: '/admin/farms', icon: Tractor, badge: 'Live' },
    { name: 'Crop Oversight', path: '/admin/crops', icon: Sprout },
    { name: 'Disease Scans', path: '/admin/disease-detections', icon: ScanEye },
    { name: 'Consultations', path: '/admin/consultations', icon: MessageSquare },
    { name: 'Notifications', path: '/admin/notifications', icon: Bell },
    { name: 'Reports', path: '/admin/reports', icon: BarChart3 },
    { name: 'System Settings', path: '/admin/settings', icon: Settings },
  ];

  const activeNavItems =
    role === 'admin'
      ? adminNavItems
      : role === 'expert'
      ? expertNavItems
      : farmerNavItems;

  const brandHomeLink =
    role === 'admin'
      ? '/admin/dashboard'
      : role === 'expert'
      ? '/expert/dashboard'
      : '/dashboard';

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-xs md:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Sidebar Panel */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-72 flex-col bg-white border-r border-slate-200/80 transition-transform duration-300 ease-in-out md:static md:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div className="flex h-16 items-center justify-between px-6 border-b border-slate-100">
          <Link to={brandHomeLink} className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[#166534] to-[#145A32] text-white shadow-xs">
              <Sprout className="h-5 w-5 text-[#22C55E]" />
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5">
                <span className="text-lg font-black tracking-tight text-[#145A32] leading-none">
                  Agri<span className="text-[#22C55E]">Sense</span>
                </span>
                {role === 'admin' && (
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-rose-100 text-rose-700">
                    ADMIN
                  </span>
                )}
                {role === 'expert' && (
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-blue-100 text-blue-700">
                    EXPERT
                  </span>
                )}
              </div>
              <span className="text-[10px] font-semibold tracking-wider text-slate-400 uppercase mt-0.5">
                {role === 'admin'
                  ? 'Administration Suite'
                  : role === 'expert'
                  ? 'Agronomy Specialist'
                  : 'Precision Agriculture'}
              </span>
            </div>
          </Link>

          {/* Mobile close button */}
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 md:hidden"
            aria-label="Close sidebar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation Items */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-1">
          <div className="flex items-center justify-between px-3 pb-2 text-[11px] font-semibold tracking-wider text-slate-400 uppercase">
            <span>Navigation Menu</span>
            <span className="text-[10px] capitalize text-[#166534] font-bold">
              {role}
            </span>
          </div>

          {activeNavItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              location.pathname === item.path ||
              (item.path === '/dashboard/farms' && location.pathname.startsWith('/dashboard/farms')) ||
              (item.path !== '/dashboard' &&
                item.path !== '/expert/dashboard' &&
                item.path !== '/admin/dashboard' &&
                location.pathname.startsWith(item.path));

            return (
              <Link
                key={item.name}
                to={item.path}
                onClick={onClose}
                className={`group flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all duration-150 ${
                  isActive
                    ? 'bg-[#166534] text-white shadow-xs font-bold'
                    : 'text-slate-600 hover:bg-[#F7F9F5] hover:text-[#166534]'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon
                    className={`w-4 h-4 ${
                      isActive ? 'text-[#22C55E]' : 'text-slate-400 group-hover:text-[#166534]'
                    }`}
                  />
                  <span>{item.name}</span>
                </div>
                {item.badge && (
                  <Badge
                    size="sm"
                    variant={isActive ? 'forest' : 'neutral'}
                    className={
                      isActive
                        ? '!bg-white/20 !text-white !border-white/30 text-[10px]'
                        : 'text-[10px]'
                    }
                  >
                    {item.badge}
                  </Badge>
                )}
              </Link>
            );
          })}

          <div className="pt-4 px-3 pb-2 text-[11px] font-semibold tracking-wider text-slate-400 uppercase">
            Account &amp; Links
          </div>

          {/* User Card in Sidebar */}
          {user && (
            <div className="mx-1 mb-2 p-2.5 rounded-xl bg-slate-50 border border-slate-200/70 flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-lg bg-[#166534] text-white flex items-center justify-center font-bold text-xs shrink-0">
                {getInitials(user.name)}
              </div>
              <div className="overflow-hidden flex-1">
                <p className="text-xs font-semibold text-[#17251B] truncate">
                  {user.name}
                </p>
                <p className="text-[10px] text-slate-500 capitalize truncate">
                  {user.role} &bull; {user.email}
                </p>
              </div>
            </div>
          )}

          <Link
            to="/"
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-slate-600 hover:bg-[#F7F9F5] hover:text-[#166534]"
          >
            <ExternalLink className="w-4 h-4 text-slate-400" />
            <span>Landing Page</span>
          </Link>

          {/* User Sign Out action */}
          <button
            type="button"
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer text-left"
          >
            <LogOut className="w-4 h-4 text-rose-500" />
            <span>Sign Out</span>
          </button>
        </div>

        {/* Live Backend Connection Card */}
        <div className="p-4 border-t border-slate-100 bg-[#F7F9F5]/70">
          <div className="p-3.5 bg-white rounded-xl border border-slate-200/80 shadow-xs">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Server className="w-4 h-4 text-[#166534]" />
                <span className="text-xs font-semibold text-slate-800">Backend API</span>
              </div>
              <button
                type="button"
                onClick={checkNow}
                title="Refresh health check"
                className="text-slate-400 hover:text-[#166534] transition-colors p-1 rounded hover:bg-slate-100 cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${status === 'loading' ? 'animate-spin' : ''}`} />
              </button>
            </div>

            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="text-slate-500">Status:</span>
              <Badge
                size="sm"
                dot
                variant={status === 'connected' ? 'success' : status === 'loading' ? 'warning' : 'danger'}
              >
                {status === 'connected' ? 'Connected' : status === 'loading' ? 'Checking...' : 'Disconnected'}
              </Badge>
            </div>

            <div className="flex items-center justify-between text-[11px] text-slate-500">
              <div className="flex items-center gap-1">
                <Database className="w-3 h-3 text-slate-400" />
                <span>MongoDB:</span>
              </div>
              <span className="font-medium text-slate-700">
                {healthData?.database?.status === 'connected' ? 'agrisense' : 'Offline'}
              </span>
            </div>

            {latency !== null && (
              <div className="mt-2 pt-2 border-t border-slate-100 text-[10px] text-slate-400 flex justify-between items-center">
                <span>Latency: {latency}ms</span>
                <span>Port: 5000</span>
              </div>
            )}
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
