import {
  Menu,
  Bell,
  Search,
  LogOut,
  ChevronRight,
  ArrowLeft,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useHealth } from '../hooks/useHealth.js';
import { useAuth } from '../hooks/useAuth.js';
import Badge from '../components/common/Badge.jsx';

export const TopNavbar = ({ onOpenSidebar, isCollapsed = false, onToggleCollapse }) => {
  const { status, checkNow, lastChecked } = useHealth();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  const getInitials = (name) => {
    if (!name) return 'AG';
    const parts = name.trim().split(' ');
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  const formatRole = (role) => {
    switch (role) {
      case 'admin':
        return 'Administrator';
      case 'expert':
        return 'Agricultural Expert';
      case 'farmer':
      default:
        return 'Farmer';
    }
  };

  // Determine dynamic breadcrumbs, title, and back navigation based on location.pathname
  const getRouteInfo = (pathname) => {
    // 1. Farmer Overview & Dashboard
    if (pathname === '/dashboard') {
      return {
        group: 'Overview',
        page: 'Dashboard',
        title: 'Smart Agriculture Dashboard',
        canGoBack: false,
      };
    }

    // 2. Farm Management Subroutes
    if (pathname === '/dashboard/farms') {
      return {
        group: 'Farm Management',
        page: 'My Farms',
        title: 'My Farms Directory',
        canGoBack: false,
      };
    }
    if (pathname === '/dashboard/farms/new' || pathname === '/dashboard/farms/add') {
      return {
        group: 'Farm Management',
        parentPath: '/dashboard/farms',
        parentLabel: 'My Farms',
        page: 'Add Farm',
        title: 'Register New Farm Parcel',
        canGoBack: true,
      };
    }
    if (pathname.startsWith('/dashboard/farms/') && pathname.endsWith('/edit')) {
      return {
        group: 'Farm Management',
        parentPath: '/dashboard/farms',
        parentLabel: 'My Farms',
        page: 'Edit Farm',
        title: 'Edit Farm Parcel',
        canGoBack: true,
      };
    }
    if (pathname.startsWith('/dashboard/farms/') && pathname.split('/').length === 4) {
      return {
        group: 'Farm Management',
        parentPath: '/dashboard/farms',
        parentLabel: 'My Farms',
        page: 'Farm Details',
        title: 'Farm Parcel Overview',
        canGoBack: true,
      };
    }

    // 3. Crops & Crop Monitoring
    if (pathname === '/dashboard/crops') {
      return {
        group: 'Farm Management',
        page: 'Crops',
        title: 'Crop Management',
        canGoBack: false,
      };
    }
    if (pathname === '/dashboard/crops/new' || pathname === '/dashboard/crops/add') {
      return {
        group: 'Farm Management',
        parentPath: '/dashboard/crops',
        parentLabel: 'Crops',
        page: 'Add Crop',
        title: 'Add New Crop Record',
        canGoBack: true,
      };
    }
    if (pathname.startsWith('/dashboard/crops/') && pathname.endsWith('/edit')) {
      return {
        group: 'Farm Management',
        parentPath: '/dashboard/crops',
        parentLabel: 'Crops',
        page: 'Edit Crop',
        title: 'Edit Crop Profile',
        canGoBack: true,
      };
    }
    if (pathname.startsWith('/dashboard/crops/') && pathname.split('/').length === 4) {
      return {
        group: 'Farm Management',
        parentPath: '/dashboard/crops',
        parentLabel: 'Crops',
        page: 'Crop Details',
        title: 'Phenological Lifecycle & Crop Details',
        canGoBack: true,
      };
    }
    if (pathname === '/dashboard/monitoring') {
      return {
        group: 'Farm Management',
        page: 'Crop Monitoring',
        title: 'Precision Crop Health & Telemetry',
        canGoBack: false,
      };
    }

    // 4. Precision Agriculture
    if (pathname === '/dashboard/soil-analysis') {
      return {
        group: 'Precision Agriculture',
        page: 'Soil Analysis',
        title: 'Soil Health & NPK Diagnostics',
        canGoBack: false,
      };
    }
    if (pathname === '/dashboard/weather') {
      return {
        group: 'Precision Agriculture',
        page: 'Weather Advisory',
        title: 'Agro-Meteorology & Weather Alerts',
        canGoBack: false,
      };
    }
    if (pathname === '/dashboard/irrigation') {
      return {
        group: 'Precision Agriculture',
        page: 'Smart Irrigation',
        title: 'Smart Automated Irrigation',
        canGoBack: false,
      };
    }
    if (pathname === '/dashboard/disease-detection') {
      return {
        group: 'Precision Agriculture',
        page: 'AI Disease Scan',
        title: 'AI Crop Disease Scanner',
        canGoBack: false,
      };
    }

    // 5. Activity & Support
    if (pathname === '/dashboard/reports') {
      return {
        group: 'Activity & Support',
        page: 'Reports',
        title: 'Farm Analytics & Yield Reports',
        canGoBack: false,
      };
    }
    if (pathname === '/dashboard/notifications') {
      return {
        group: 'Activity & Support',
        page: 'Notifications',
        title: 'Notifications & Advisory Center',
        canGoBack: false,
      };
    }
    if (pathname === '/dashboard/consultation') {
      return {
        group: 'Activity & Support',
        page: 'Consultation',
        title: 'Expert Consultation Hub',
        canGoBack: false,
      };
    }

    // 6. Account
    if (pathname === '/dashboard/settings') {
      return {
        group: 'Account',
        page: 'Settings',
        title: 'System & Farm Configuration',
        canGoBack: false,
      };
    }
    if (pathname === '/dashboard/profile') {
      return {
        group: 'Account',
        page: 'Profile',
        title: 'Farmer Profile & Preferences',
        canGoBack: false,
      };
    }

    // 7. Expert Routes
    if (pathname === '/expert/dashboard') {
      return {
        group: 'Overview',
        page: 'Expert Dashboard',
        title: 'Agronomist Consultation Plane',
        canGoBack: false,
      };
    }
    if (pathname.startsWith('/expert/consultations')) {
      return {
        group: 'Consultation',
        page: 'Queue',
        title: 'Farmer Consultations Queue',
        canGoBack: pathname !== '/expert/consultations',
      };
    }
    if (pathname === '/expert/profile') {
      return {
        group: 'Account',
        page: 'Profile',
        title: 'Expert Agronomist Profile',
        canGoBack: false,
      };
    }

    // 8. Admin Routes
    if (pathname === '/admin/dashboard') {
      return {
        group: 'Overview',
        page: 'Admin Dashboard',
        title: 'Platform Administration Suite',
        canGoBack: false,
      };
    }
    if (pathname.startsWith('/admin/')) {
      const sub = pathname.replace('/admin/', '');
      const formatted = sub.charAt(0).toUpperCase() + sub.slice(1).replace('-', ' ');
      return {
        group: 'Administration',
        page: formatted,
        title: `Admin: ${formatted}`,
        canGoBack: false,
      };
    }

    // Fallback
    return {
      group: 'AgriSense',
      page: 'Dashboard',
      title: 'Precision Agriculture',
      canGoBack: false,
    };
  };

  const routeInfo = getRouteInfo(location.pathname);

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-slate-200/80 bg-white/95 px-4 backdrop-blur-md sm:px-6">
      {/* Left: Mobile hamburger / Desktop collapse toggle & dynamic breadcrumbs */}
      <div className="flex items-center gap-3 min-w-0">
        {/* Mobile Hamburger */}
        <button
          type="button"
          onClick={onOpenSidebar}
          className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 md:hidden cursor-pointer"
          aria-label="Open navigation drawer"
        >
          <Menu className="h-5 w-5" />
        </button>

        {/* Desktop Collapse Toggle */}
        {onToggleCollapse && (
          <button
            type="button"
            onClick={onToggleCollapse}
            className="hidden md:flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors cursor-pointer"
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

        {/* Back navigation button if applicable */}
        {routeInfo.canGoBack && (
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors shadow-2xs cursor-pointer shrink-0"
            title="Go back"
            aria-label="Go back to previous page"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
        )}

        {/* Breadcrumbs & Dynamic Heading */}
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 text-xs text-slate-500 truncate">
            <span className="font-medium text-slate-400">{routeInfo.group}</span>
            <ChevronRight className="h-3 w-3 text-slate-400 shrink-0" />
            {routeInfo.parentPath ? (
              <>
                <Link
                  to={routeInfo.parentPath}
                  className="font-medium text-slate-600 hover:text-[#166534] transition-colors"
                >
                  {routeInfo.parentLabel}
                </Link>
                <ChevronRight className="h-3 w-3 text-slate-400 shrink-0" />
              </>
            ) : null}
            <span className="font-semibold text-[#166534] truncate">
              {routeInfo.page}
            </span>
          </div>
          <h1 className="text-sm sm:text-base font-bold text-[#17251B] leading-tight truncate">
            {routeInfo.title}
          </h1>
        </div>
      </div>

      {/* Middle: Search input (hidden on small screens) */}
      <div className="hidden lg:flex items-center flex-1 max-w-xs mx-6">
        <div className="relative w-full">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search farms, crops, advisory..."
            className="w-full rounded-lg border border-slate-200 bg-slate-50/80 py-1.5 pl-9 pr-3 text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#166534]"
          />
        </div>
      </div>

      {/* Right: API Health Status, Notifications, User Profile & Sign Out */}
      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        {/* Backend Status Live Pill */}
        <div
          onClick={checkNow}
          title={`Click to recheck API. Last checked: ${
            lastChecked ? lastChecked.toLocaleTimeString() : 'just now'
          }`}
          className="flex items-center gap-2 cursor-pointer rounded-full bg-[#F7F9F5] border border-slate-200/80 px-2.5 py-1 hover:border-slate-300 transition-colors shadow-2xs"
        >
          <span className="text-[11px] font-medium text-slate-600 hidden md:inline">
            API Health:
          </span>
          {status === 'connected' ? (
            <Badge size="sm" variant="success" dot className="text-[11px] font-semibold">
              Online
            </Badge>
          ) : status === 'loading' ? (
            <Badge size="sm" variant="warning" dot className="text-[11px] font-semibold">
              Connecting...
            </Badge>
          ) : (
            <Badge size="sm" variant="danger" dot className="text-[11px] font-semibold">
              Offline
            </Badge>
          )}
        </div>

        {/* Notifications */}
        <Link
          to="/dashboard/notifications"
          className="relative rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors"
          aria-label="View notifications"
          title="Notifications"
        >
          <Bell className="h-4 w-4 sm:h-5 sm:w-5" />
          <span className="absolute top-1.5 right-1.5 flex h-2 w-2">
            <span className="relative inline-flex rounded-full h-2 w-2 bg-[#22C55E] ring-2 ring-white" />
          </span>
        </Link>

        <div className="h-6 w-px bg-slate-200 hidden sm:block" />

        {/* User Profile */}
        <div className="flex items-center gap-2 sm:gap-2.5">
          <div
            title={`${user?.name || 'User'} (${user?.role || 'farmer'}) - ${user?.email || ''}`}
            className="h-8 w-8 sm:h-9 sm:w-9 rounded-full bg-[#166534] text-white flex items-center justify-center font-bold text-xs ring-2 ring-[#DCFCE7] shadow-xs cursor-default shrink-0"
          >
            {getInitials(user?.name)}
          </div>
          <div className="hidden xl:block text-left">
            <p className="text-xs font-semibold text-[#17251B] leading-none truncate max-w-[120px]">
              {user?.name || 'Authorized User'}
            </p>
            <p className="text-[10px] text-slate-400 font-medium mt-0.5">
              {formatRole(user?.role)}
            </p>
          </div>
        </div>

        {/* Sign Out Button */}
        <button
          type="button"
          onClick={handleLogout}
          title="Sign Out"
          className="flex items-center gap-1.5 rounded-lg px-2 sm:px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-rose-50 hover:text-rose-600 transition-colors cursor-pointer border border-transparent hover:border-rose-200"
          aria-label="Sign out"
        >
          <LogOut className="h-4 w-4" />
          <span className="hidden sm:inline">Sign Out</span>
        </button>
      </div>
    </header>
  );
};

export default TopNavbar;
