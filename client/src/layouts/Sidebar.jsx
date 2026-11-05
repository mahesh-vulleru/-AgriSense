import { Link, useLocation } from 'react-router-dom';
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
} from 'lucide-react';
import { useHealth } from '../hooks/useHealth.js';
import Badge from '../components/common/Badge.jsx';

const navItems = [
  { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
  { name: 'Field Telemetry', path: '/dashboard#fields', icon: Sprout, badge: 'Live' },
  { name: 'Soil Health', path: '/dashboard#soil', icon: Activity },
  { name: 'Smart Irrigation', path: '/dashboard#irrigation', icon: Droplets },
  { name: 'Weather Advisory', path: '/dashboard#weather', icon: CloudSun },
  { name: 'AI Disease Scan', path: '/dashboard#ai', icon: ScanEye, badge: 'Module' },
  { name: 'Analytics', path: '/dashboard#analytics', icon: BarChart3 },
  { name: 'System Settings', path: '/dashboard#settings', icon: Settings },
];

export const Sidebar = ({ isOpen, onClose }) => {
  const location = useLocation();
  const { status, latency, healthData, checkNow } = useHealth();

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
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#166534] to-[#145A32] flex items-center justify-center text-white shadow-sm shadow-[#166534]/20">
              <Sprout className="w-6 h-6 text-[#22C55E]" />
            </div>
            <div>
              <span className="text-xl font-bold tracking-tight text-[#145A32]">
                Agri<span className="text-[#22C55E]">Sense</span>
              </span>
              <p className="text-[10px] uppercase tracking-wider text-slate-400 font-medium">
                Intelligent Farming
              </p>
            </div>
          </Link>
          <button
            type="button"
            onClick={onClose}
            className="md:hidden p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Links */}
        <div className="flex-1 overflow-y-auto px-4 py-5 space-y-1">
          <div className="px-3 pb-2 text-[11px] font-semibold tracking-wider text-slate-400 uppercase">
            Farm Management
          </div>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path || (item.path.startsWith('/dashboard') && location.pathname === '/dashboard');

            return (
              <Link
                key={item.name}
                to={item.path}
                onClick={() => {
                  if (window.innerWidth < 768 && onClose) onClose();
                }}
                className={`flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-[#166534] text-white shadow-xs'
                    : 'text-slate-700 hover:bg-[#F7F9F5] hover:text-[#166534]'
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
                    className={isActive ? '!bg-white/20 !text-white !border-white/30 text-[10px]' : 'text-[10px]'}
                  >
                    {item.badge}
                  </Badge>
                )}
              </Link>
            );
          })}

          <div className="pt-4 px-3 pb-2 text-[11px] font-semibold tracking-wider text-slate-400 uppercase">
            Quick Links
          </div>
          <Link
            to="/"
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-slate-600 hover:bg-[#F7F9F5] hover:text-[#166534]"
          >
            <ExternalLink className="w-4 h-4 text-slate-400" />
            <span>Landing Page</span>
          </Link>
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
