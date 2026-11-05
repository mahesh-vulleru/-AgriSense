import { Menu, Bell, Search } from 'lucide-react';
import { useHealth } from '../hooks/useHealth.js';
import Badge from '../components/common/Badge.jsx';

export const TopNavbar = ({ onOpenSidebar }) => {
  const { status, checkNow, lastChecked } = useHealth();

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-slate-200/80 bg-white/95 px-4 backdrop-blur-md sm:px-6">
      {/* Left: Mobile hamburger & breadcrumb/title */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onOpenSidebar}
          className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 md:hidden"
          aria-label="Open sidebar"
        >
          <Menu className="h-5 w-5" />
        </button>

        <div className="hidden sm:block">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span>Farms</span>
            <span>/</span>
            <span className="font-medium text-[#166534]">Green Valley Sector A-B</span>
          </div>
          <h1 className="text-base font-bold text-[#17251B] leading-tight">
            Smart Agriculture Dashboard
          </h1>
        </div>
      </div>

      {/* Middle: Search input (hidden on small mobile) */}
      <div className="hidden lg:flex items-center flex-1 max-w-xs mx-6">
        <div className="relative w-full">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search sensors, crops, zones..."
            className="w-full rounded-lg border border-slate-200 bg-slate-50/80 py-1.5 pl-9 pr-3 text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#166534]"
          />
        </div>
      </div>

      {/* Right: Backend Status Pill, Notifications, User Profile */}
      <div className="flex items-center gap-3">
        {/* Backend Status Live Pill */}
        <div
          onClick={checkNow}
          title={`Click to recheck health. Last checked: ${lastChecked ? lastChecked.toLocaleTimeString() : 'never'}`}
          className="flex items-center gap-2 cursor-pointer rounded-full bg-[#F7F9F5] border border-slate-200/80 px-3 py-1 hover:border-slate-300 transition-colors"
        >
          <span className="text-[11px] font-medium text-slate-600 hidden sm:inline">
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
        <button
          type="button"
          className="relative rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors"
          aria-label="View notifications"
        >
          <Bell className="h-5 w-5" />
          <span className="absolute top-1.5 right-1.5 flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#22C55E] opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-[#166534]" />
          </span>
        </button>

        <div className="h-6 w-px bg-slate-200" />

        {/* User Profile */}
        <div className="flex items-center gap-2.5">
          <div className="h-9 w-9 rounded-full bg-[#166534] text-white flex items-center justify-center font-semibold text-xs ring-2 ring-[#DCFCE7] shadow-xs">
            MV
          </div>
          <div className="hidden md:block text-left">
            <p className="text-xs font-semibold text-[#17251B] leading-none">Mahesh V.</p>
            <p className="text-[10px] text-slate-400 font-medium mt-0.5">Farm Manager</p>
          </div>
        </div>
      </div>
    </header>
  );
};

export default TopNavbar;
