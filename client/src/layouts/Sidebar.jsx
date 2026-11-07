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
  Plus,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react';
import { useHealth } from '../hooks/useHealth.js';
import { useAuth } from '../hooks/useAuth.js';
import { useNotifications } from '../hooks/useNotifications.js';
import Badge from '../components/common/Badge.jsx';

export const Sidebar = ({
  isOpen,
  onClose,
  isCollapsed = false,
  onToggleCollapse,
}) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { status, latency, healthData, checkNow } = useHealth();
  const { user, logout } = useAuth();
  const { unreadCount } = useNotifications();

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

  // Navigation Groups structured per user role
  const farmerNavGroups = [
    {
      group: 'OVERVIEW',
      items: [
        { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
      ],
    },
    {
      group: 'FARM MANAGEMENT',
      items: [
        { name: 'My Farms', path: '/dashboard/farms', icon: Tractor },
        { name: 'Crops', path: '/dashboard/crops', icon: Sprout },
        { name: 'Crop Monitoring', path: '/dashboard/monitoring', icon: Activity },
      ],
    },
    {
      group: 'PRECISION AGRICULTURE',
      items: [
        { name: 'Soil Analysis', path: '/dashboard/soil-analysis', icon: Layers },
        { name: 'Weather Advisory', path: '/dashboard/weather', icon: CloudSun },
        { name: 'Smart Irrigation', path: '/dashboard/irrigation', icon: Droplets },
        { name: 'AI Disease Scan', path: '/dashboard/disease-detection', icon: ScanEye },
      ],
    },
    {
      group: 'ACTIVITY & SUPPORT',
      items: [
        { name: 'Reports', path: '/dashboard/reports', icon: BarChart3 },
        {
          name: 'Notifications',
          path: '/dashboard/notifications',
          icon: Bell,
          badge: unreadCount > 0 ? (unreadCount > 99 ? '99+' : String(unreadCount)) : undefined,
        },
        { name: 'Consultation', path: '/dashboard/consultation', icon: MessageSquare },
      ],
    },
    {
      group: 'ACCOUNT',
      items: [
        { name: 'Settings', path: '/dashboard/settings', icon: Settings },
        { name: 'Profile', path: '/dashboard/profile', icon: User },
      ],
    },
  ];

  const expertNavGroups = [
    {
      group: 'OVERVIEW',
      items: [
        { name: 'Expert Dashboard', path: '/expert/dashboard', icon: LayoutDashboard },
      ],
    },
    {
      group: 'CONSULTATION',
      items: [
        {
          name: 'Consultation Queue',
          path: '/expert/consultations',
          icon: MessageSquare,
          badge: 'Active',
        },
      ],
    },
    {
      group: 'ACCOUNT',
      items: [
        { name: 'Expert Profile', path: '/expert/profile', icon: User },
      ],
    },
  ];

  const adminNavGroups = [
    {
      group: 'OVERVIEW',
      items: [
        { name: 'Admin Dashboard', path: '/admin/dashboard', icon: LayoutDashboard },
      ],
    },
    {
      group: 'USER MANAGEMENT',
      items: [
        { name: 'User Management', path: '/admin/users', icon: Users },
        { name: 'Farmers Directory', path: '/admin/farmers', icon: Tractor },
        { name: 'Experts Directory', path: '/admin/experts', icon: Users },
      ],
    },
    {
      group: 'FARM & CROP OVERSIGHT',
      items: [
        { name: 'All Farms', path: '/admin/farms', icon: Tractor },
        { name: 'Crop Oversight', path: '/admin/crops', icon: Sprout },
        { name: 'Disease Scans', path: '/admin/disease-detections', icon: ScanEye },
      ],
    },
    {
      group: 'PLATFORM ACTIVITY',
      items: [
        { name: 'Consultations', path: '/admin/consultations', icon: MessageSquare },
        { name: 'Notifications', path: '/admin/notifications', icon: Bell },
        { name: 'Reports', path: '/admin/reports', icon: BarChart3 },
      ],
    },
    {
      group: 'ACCOUNT',
      items: [
        { name: 'System Settings', path: '/admin/settings', icon: Settings },
      ],
    },
  ];

  const activeNavGroups =
    role === 'admin'
      ? adminNavGroups
      : role === 'expert'
      ? expertNavGroups
      : farmerNavGroups;

  const brandHomeLink =
    role === 'admin'
      ? '/admin/dashboard'
      : role === 'expert'
      ? '/expert/dashboard'
      : '/dashboard';

  const isItemActive = (path) => {
    if (path === '/dashboard') return location.pathname === '/dashboard';
    if (path === '/expert/dashboard') return location.pathname === '/expert/dashboard';
    if (path === '/admin/dashboard') return location.pathname === '/admin/dashboard';
    if (path === '/dashboard/farms') return location.pathname.startsWith('/dashboard/farms');
    if (path === '/dashboard/crops') return location.pathname.startsWith('/dashboard/crops');
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

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
        className={`fixed inset-y-0 left-0 z-50 flex flex-col bg-white border-r border-slate-200/80 transition-all duration-300 ease-in-out md:static ${
          isOpen ? 'translate-x-0 w-72' : '-translate-x-full md:translate-x-0'
        } ${isCollapsed ? 'md:w-20' : 'md:w-72'}`}
      >
        {/* Brand Header */}
        <div
          className={`flex h-16 items-center border-b border-slate-100 ${
            isCollapsed ? 'justify-center px-2' : 'justify-between px-5'
          }`}
        >
          <Link
            to={brandHomeLink}
            className={`flex items-center gap-2.5 ${
              isCollapsed ? 'justify-center' : ''
            }`}
            title="AgriSense Precision Agriculture"
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#166534] to-[#145A32] text-white shadow-xs">
              <Sprout className="h-5 w-5 text-[#22C55E]" />
            </div>
            {!isCollapsed && (
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
            )}
          </Link>

          {/* Desktop Collapse Toggle */}
          {onToggleCollapse && (
            <button
              type="button"
              onClick={onToggleCollapse}
              className={`hidden md:flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors cursor-pointer ${
                isCollapsed ? 'mt-0' : ''
              }`}
              title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {isCollapsed ? (
                <PanelLeftOpen className="h-4 w-4" />
              ) : (
                <PanelLeftClose className="h-4 w-4" />
              )}
            </button>
          )}

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

        {/* Quick Action Button Section */}
        <div
          className={`border-b border-slate-100 bg-[#F7F9F5]/40 ${
            isCollapsed ? 'p-2 flex justify-center' : 'px-4 py-3'
          }`}
        >
          {role === 'expert' ? (
            <Link
              to="/expert/consultations"
              onClick={onClose}
              title="Open Consultation Queue"
              className={`flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#166534] to-[#145A32] hover:from-[#145A32] hover:to-[#0f3d22] text-white font-bold shadow-xs transition-all group cursor-pointer ${
                isCollapsed ? 'h-10 w-10 p-0' : 'w-full py-2.5 px-4 text-xs'
              }`}
            >
              <MessageSquare className="w-4 h-4 text-[#22C55E]" />
              {!isCollapsed && <span>Consultation Queue</span>}
            </Link>
          ) : isCollapsed ? (
            <Link
              to={role === 'admin' ? '/admin/farms' : '/dashboard/farms/new'}
              onClick={onClose}
              title="Add New Farm"
              className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-r from-[#166534] to-[#145A32] hover:from-[#145A32] hover:to-[#0f3d22] text-white shadow-xs transition-all group cursor-pointer"
            >
              <Plus className="w-5 h-5 text-[#22C55E] group-hover:rotate-90 transition-transform duration-200" />
            </Link>
          ) : (
            <>
              <Link
                to={role === 'admin' ? '/admin/farms' : '/dashboard/farms/new'}
                onClick={onClose}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-gradient-to-r from-[#166534] to-[#145A32] hover:from-[#145A32] hover:to-[#0f3d22] text-white text-xs font-bold shadow-xs hover:shadow transition-all group cursor-pointer"
                title="Register a new farm"
              >
                <Plus className="w-4 h-4 text-[#22C55E] group-hover:rotate-90 transition-transform duration-200" />
                <span>Add New Farm</span>
              </Link>
              <div className="grid grid-cols-2 gap-2 mt-2">
                <Link
                  to={role === 'admin' ? '/admin/crops' : '/dashboard/crops/new'}
                  onClick={onClose}
                  className="flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg border border-emerald-800/15 bg-[#DCFCE7]/60 hover:bg-[#DCFCE7] text-[#145A32] text-[11px] font-semibold transition-colors cursor-pointer"
                  title="Add a new crop"
                >
                  <Sprout className="w-3.5 h-3.5 text-[#166534]" />
                  <span>+ Add Crop</span>
                </Link>
                <Link
                  to="/dashboard/disease-detection"
                  onClick={onClose}
                  className="flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-[11px] font-semibold transition-colors cursor-pointer"
                  title="Run AI Disease Scan"
                >
                  <ScanEye className="w-3.5 h-3.5 text-slate-500" />
                  <span>AI Scan</span>
                </Link>
              </div>
            </>
          )}
        </div>

        {/* Grouped Navigation Items */}
        <div
          className={`flex-1 overflow-y-auto space-y-3 ${
            isCollapsed ? 'px-2 py-3' : 'px-3 py-3'
          }`}
        >
          {activeNavGroups.map((group) => (
            <div key={group.group} className="space-y-1">
              {!isCollapsed ? (
                <div className="px-3 pt-2 pb-1 text-[10px] font-bold tracking-wider text-slate-400 uppercase">
                  {group.group}
                </div>
              ) : (
                <div className="my-2 border-t border-slate-100" />
              )}

              {group.items.map((item) => {
                const Icon = item.icon;
                const isActive = isItemActive(item.path);

                if (isCollapsed) {
                  return (
                    <Link
                      key={item.name}
                      to={item.path}
                      onClick={onClose}
                      title={item.name}
                      className={`group flex items-center justify-center h-10 w-full rounded-xl transition-all duration-150 ${
                        isActive
                          ? 'bg-[#166534] text-white shadow-xs'
                          : 'text-slate-600 hover:bg-[#F7F9F5] hover:text-[#166534]'
                      }`}
                    >
                      <div className="relative flex items-center justify-center">
                        <Icon
                          className={`w-5 h-5 shrink-0 ${
                            isActive ? 'text-[#22C55E]' : 'text-slate-400 group-hover:text-[#166534]'
                          }`}
                        />
                        {item.badge && (
                          <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500 ring-2 ring-white" />
                          </span>
                        )}
                      </div>
                    </Link>
                  );
                }

                return (
                  <Link
                    key={item.name}
                    to={item.path}
                    onClick={onClose}
                    className={`group flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all duration-150 ${
                      isActive
                        ? 'bg-[#166534] text-white shadow-xs font-bold'
                        : 'text-slate-600 hover:bg-[#F7F9F5] hover:text-[#166534]'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <Icon
                        className={`w-4 h-4 shrink-0 ${
                          isActive ? 'text-[#22C55E]' : 'text-slate-400 group-hover:text-[#166534]'
                        }`}
                      />
                      <span className="truncate">{item.name}</span>
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
            </div>
          ))}

          {/* Secondary Account Links */}
          <div className="pt-2">
            {!isCollapsed ? (
              <div className="px-3 pt-2 pb-1 text-[10px] font-bold tracking-wider text-slate-400 uppercase">
                Links &amp; Session
              </div>
            ) : (
              <div className="my-2 border-t border-slate-100" />
            )}

            <Link
              to="/"
              title="Landing Page"
              className={`flex items-center rounded-xl text-slate-600 hover:bg-[#F7F9F5] hover:text-[#166534] transition-colors ${
                isCollapsed
                  ? 'justify-center h-10 w-full'
                  : 'gap-3 px-3 py-2 text-xs font-medium'
              }`}
            >
              <ExternalLink className="w-4 h-4 text-slate-400 shrink-0" />
              {!isCollapsed && <span>Landing Page</span>}
            </Link>

            <button
              type="button"
              onClick={handleLogout}
              title="Sign Out"
              className={`flex items-center text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer text-left rounded-xl ${
                isCollapsed
                  ? 'justify-center h-10 w-full'
                  : 'w-full gap-3 px-3 py-2 text-xs font-medium'
              }`}
            >
              <LogOut className="w-4 h-4 text-rose-500 shrink-0" />
              {!isCollapsed && <span>Sign Out</span>}
            </button>
          </div>
        </div>

        {/* Footer Area: User Profile Card & Live Backend Health */}
        <div
          className={`border-t border-slate-100 bg-[#F7F9F5]/70 ${
            isCollapsed ? 'p-2 space-y-2' : 'p-3 space-y-2.5'
          }`}
        >
          {/* User Card */}
          {user && (
            <div
              title={`${user.name} (${user.role}) - ${user.email}`}
              className={`rounded-xl bg-white border border-slate-200/80 flex items-center shadow-2xs ${
                isCollapsed ? 'p-2 justify-center' : 'p-2.5 gap-2.5'
              }`}
            >
              <div className="h-8 w-8 rounded-lg bg-[#166534] text-white flex items-center justify-center font-bold text-xs shrink-0">
                {getInitials(user.name)}
              </div>
              {!isCollapsed && (
                <div className="overflow-hidden flex-1 min-w-0">
                  <p className="text-xs font-bold text-[#17251B] truncate">
                    {user.name}
                  </p>
                  <p className="text-[10px] text-slate-500 capitalize truncate">
                    {user.role} &bull; {user.email}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Backend Connection Card */}
          {isCollapsed ? (
            <div
              onClick={checkNow}
              title={`API Health: ${status} (${latency !== null ? latency + 'ms' : 'N/A'}). Click to recheck.`}
              className="flex h-9 w-full items-center justify-center rounded-xl bg-white border border-slate-200/80 cursor-pointer hover:bg-slate-50 transition-colors shadow-2xs"
            >
              <Server
                className={`w-4 h-4 ${
                  status === 'connected'
                    ? 'text-emerald-600'
                    : status === 'loading'
                    ? 'text-amber-500 animate-spin'
                    : 'text-rose-500'
                }`}
              />
            </div>
          ) : (
            <div className="p-3 bg-white rounded-xl border border-slate-200/80 shadow-2xs">
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <Server className="w-3.5 h-3.5 text-[#166534]" />
                  <span className="text-[11px] font-bold text-slate-800">API Health</span>
                </div>
                <button
                  type="button"
                  onClick={checkNow}
                  title="Refresh health check"
                  className="text-slate-400 hover:text-[#166534] transition-colors p-0.5 rounded hover:bg-slate-100 cursor-pointer"
                >
                  <RefreshCw
                    className={`w-3 h-3 ${status === 'loading' ? 'animate-spin' : ''}`}
                  />
                </button>
              </div>

              <div className="flex items-center justify-between text-[11px] mb-1">
                <span className="text-slate-500">Service:</span>
                <Badge
                  size="sm"
                  dot
                  variant={
                    status === 'connected'
                      ? 'success'
                      : status === 'loading'
                      ? 'warning'
                      : 'danger'
                  }
                  className="text-[10px] py-0 px-1.5"
                >
                  {status === 'connected'
                    ? 'Online'
                    : status === 'loading'
                    ? 'Checking...'
                    : 'Offline'}
                </Badge>
              </div>

              <div className="flex items-center justify-between text-[10px] text-slate-500">
                <div className="flex items-center gap-1">
                  <Database className="w-2.5 h-2.5 text-slate-400" />
                  <span>MongoDB:</span>
                </div>
                <span className="font-semibold text-slate-700">
                  {healthData?.database?.status === 'connected' ? 'agrisense' : 'Fallback'}
                </span>
              </div>

              {latency !== null && (
                <div className="mt-1.5 pt-1.5 border-t border-slate-100 text-[9px] text-slate-400 flex justify-between items-center">
                  <span>Latency: {latency}ms</span>
                  <span>Port: 5000</span>
                </div>
              )}
            </div>
          )}
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
