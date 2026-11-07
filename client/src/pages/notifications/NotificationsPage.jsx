import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Bell,
  CheckCircle2,
  AlertTriangle,
  AlertOctagon,
  RefreshCw,
  Search,
  Filter,
  Trash2,
  ExternalLink,
  Settings,
  CloudSun,
  Sprout,
  Droplets,
  ScanEye,
  Layers,
  Radio,
  Clock,
  MapPin,
  ShieldAlert,
  X,
  CheckCheck,
} from 'lucide-react';
import { useNotifications } from '../../hooks/useNotifications.js';
import Modal from '../../components/common/Modal.jsx';
import Badge from '../../components/common/Badge.jsx';

// Format timestamp into Asia/Kolkata friendly format
function formatKolkataTime(isoString) {
  if (!isoString) return '';
  const d = new Date(isoString);
  return d.toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

// Relative time helper
function formatRelativeTime(isoString) {
  if (!isoString) return '';
  const diffMs = Date.now() - new Date(isoString).getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 60) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHour < 24) return `${diffHour}h ago`;
  if (diffDay === 1) return 'Yesterday';
  return `${diffDay}d ago`;
}

// Category icons and colors
const CATEGORY_CONFIG = {
  weather: {
    label: 'Weather Advisory',
    icon: CloudSun,
    color: 'text-sky-600 bg-sky-50 border-sky-200',
    badgeVariant: 'neutral',
  },
  crop: {
    label: 'Crop Health',
    icon: Sprout,
    color: 'text-emerald-600 bg-emerald-50 border-emerald-200',
    badgeVariant: 'success',
  },
  soil: {
    label: 'Soil Health',
    icon: Layers,
    color: 'text-amber-700 bg-amber-50 border-amber-200',
    badgeVariant: 'warning',
  },
  irrigation: {
    label: 'Smart Irrigation',
    icon: Droplets,
    color: 'text-blue-600 bg-blue-50 border-blue-200',
    badgeVariant: 'neutral',
  },
  disease: {
    label: 'AI Disease Scan',
    icon: ScanEye,
    color: 'text-rose-600 bg-rose-50 border-rose-200',
    badgeVariant: 'danger',
  },
  system: {
    label: 'System & Platform',
    icon: Bell,
    color: 'text-slate-600 bg-slate-100 border-slate-200',
    badgeVariant: 'neutral',
  },
};

export default function NotificationsPage() {
  const {
    notifications,
    summary,
    loading,
    syncing,
    socketStatus,
    latestLiveAlert,
    dismissLiveAlert,
    fetchNotifications,
    syncAlerts,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearReadNotifications,
    preferences,
    updatePreferences,
  } = useNotifications();

  // Local UI filters
  const [statusFilter, setStatusFilter] = useState('all'); // all, unread, read, critical
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFarm, setSelectedFarm] = useState('all');

  // Modals & feedback
  const [isPreferencesOpen, setIsPreferencesOpen] = useState(false);
  const [localPrefs, setLocalPrefs] = useState(() => preferences || {});
  const [savingPrefs, setSavingPrefs] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);

  // Sync initial notifications on mount
  useEffect(() => {
    fetchNotifications({
      status: statusFilter,
      category: categoryFilter,
      search: searchQuery,
    });
  }, [fetchNotifications, statusFilter, categoryFilter, searchQuery]);

  const handleOpenPreferences = () => {
    setLocalPrefs(preferences || {});
    setIsPreferencesOpen(true);
  };

  // Extract unique farms from notifications for filter dropdown
  const uniqueFarms = useMemo(() => {
    const map = new Map();
    notifications.forEach((n) => {
      if (n.farm) {
        const id = n.farm._id || n.farm.id;
        const name = n.farm.name || 'Farm Parcel';
        if (id && !map.has(id)) {
          map.set(id, name);
        }
      }
    });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [notifications]);

  // Filtered notifications list
  const filteredNotifications = useMemo(() => {
    return notifications.filter((notif) => {
      // Status
      if (statusFilter === 'unread' && notif.isRead) return false;
      if (statusFilter === 'read' && !notif.isRead) return false;
      if (statusFilter === 'critical' && notif.severity !== 'critical') return false;

      // Category
      if (categoryFilter !== 'all' && notif.category !== categoryFilter) return false;

      // Farm
      if (selectedFarm !== 'all') {
        const fId = notif.farm?._id || notif.farm?.id;
        if (fId !== selectedFarm) return false;
      }

      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const inTitle = notif.title?.toLowerCase().includes(q);
        const inMsg = notif.message?.toLowerCase().includes(q);
        const inFarm = notif.farm?.name?.toLowerCase().includes(q);
        const inCrop = (notif.crop?.cropName || notif.crop?.name)?.toLowerCase().includes(q);
        if (!inTitle && !inMsg && !inFarm && !inCrop) return false;
      }

      return true;
    });
  }, [notifications, statusFilter, categoryFilter, selectedFarm, searchQuery]);

  // Handle Sync Alerts
  const handleSyncAlerts = async () => {
    try {
      const res = await syncAlerts();
      setToastMessage({
        type: 'success',
        text: `Sync complete: Created ${res?.createdCount || 0} active agricultural alert(s).`,
      });
      setTimeout(() => setToastMessage(null), 4000);
    } catch (err) {
      setToastMessage({
        type: 'error',
        text: err.message || 'Failed to sync agricultural alerts.',
      });
      setTimeout(() => setToastMessage(null), 4000);
    }
  };

  // Handle Save Preferences
  const handleSavePreferences = async (e) => {
    e.preventDefault();
    setSavingPrefs(true);
    try {
      await updatePreferences(localPrefs);
      setIsPreferencesOpen(false);
      setToastMessage({
        type: 'success',
        text: 'Notification preferences updated successfully.',
      });
      setTimeout(() => setToastMessage(null), 4000);
    } catch (err) {
      setToastMessage({
        type: 'error',
        text: err.message || 'Failed to update preferences.',
      });
      setTimeout(() => setToastMessage(null), 4000);
    } finally {
      setSavingPrefs(false);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Toast Notification Alert */}
      {toastMessage && (
        <div
          role="alert"
          className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg border text-sm font-semibold transition-all ${
            toastMessage.type === 'error'
              ? 'bg-rose-50 text-rose-800 border-rose-200'
              : 'bg-emerald-50 text-emerald-800 border-emerald-200'
          }`}
        >
          {toastMessage.type === 'error' ? (
            <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
          ) : (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          )}
          <span>{toastMessage.text}</span>
          <button
            type="button"
            onClick={() => setToastMessage(null)}
            className="ml-2 text-slate-400 hover:text-slate-600"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Live Socket Real-Time Alert Banner */}
      {latestLiveAlert && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50/90 p-4 shadow-sm animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-xl bg-rose-600 text-white shrink-0 mt-0.5 animate-pulse">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-rose-700">
                    Live Real-Time Alert Received
                  </span>
                  <span className="inline-block w-2 h-2 rounded-full bg-rose-500 animate-ping" />
                </div>
                <h3 className="text-sm font-bold text-slate-900 mt-0.5">
                  {latestLiveAlert.title}
                </h3>
                <p className="text-xs text-slate-700 mt-1">{latestLiveAlert.message}</p>
                {latestLiveAlert.actionUrl && (
                  <Link
                    to={latestLiveAlert.actionUrl}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-rose-700 hover:text-rose-900 mt-2 underline"
                  >
                    <span>{latestLiveAlert.actionLabel || 'Take Immediate Action'}</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </Link>
                )}
              </div>
            </div>
            <button
              type="button"
              onClick={dismissLiveAlert}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-rose-100"
              title="Dismiss alert"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#166534] text-white shadow-xs">
              <Bell className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#17251B]">
                Notifications &amp; Alert Management
              </h1>
              <p className="text-xs sm:text-sm text-slate-600">
                Real-time agronomic telemetry, weather advisories, irrigation reminders, and crop health notifications.
              </p>
            </div>
          </div>
        </div>

        {/* Live Engine Status & Global Actions */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Socket.IO Live Status Pill */}
          <div
            title={`Socket.IO Gateway: ${socketStatus}`}
            className="flex items-center gap-2 rounded-xl bg-white border border-slate-200 px-3 py-1.5 shadow-2xs text-xs font-semibold text-slate-700"
          >
            <Radio
              className={`w-4 h-4 ${
                socketStatus === 'connected'
                  ? 'text-emerald-500 animate-pulse'
                  : 'text-amber-500'
              }`}
            />
            <span className="hidden sm:inline">Stream:</span>
            <span
              className={`font-bold ${
                socketStatus === 'connected' ? 'text-emerald-700' : 'text-amber-600'
              }`}
            >
              {socketStatus === 'connected' ? 'Live WebSocket' : 'Connecting...'}
            </span>
          </div>

          {/* Sync Alerts Button */}
          <button
            type="button"
            onClick={handleSyncAlerts}
            disabled={syncing}
            className="flex items-center gap-1.5 rounded-xl bg-white border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-colors shadow-2xs disabled:opacity-50 cursor-pointer"
            title="Scan active database records for overdue activities, extreme weather, and crop stress"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-[#166534] ${syncing ? 'animate-spin' : ''}`} />
            <span>{syncing ? 'Evaluating DB...' : 'Sync Active Alerts'}</span>
          </button>

          {/* Preferences Button */}
          <button
            type="button"
            onClick={handleOpenPreferences}
            className="flex items-center gap-1.5 rounded-xl bg-white border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-colors shadow-2xs cursor-pointer"
            title="Configure category alert preferences"
          >
            <Settings className="w-3.5 h-3.5 text-slate-500" />
            <span className="hidden md:inline">Preferences</span>
          </button>

          {/* Mark All as Read Button */}
          {summary.unread > 0 && (
            <button
              type="button"
              onClick={() => markAllAsRead('all')}
              className="flex items-center gap-1.5 rounded-xl bg-[#166534] hover:bg-[#145A32] text-white px-3 py-1.5 text-xs font-bold transition-colors shadow-2xs cursor-pointer"
            >
              <CheckCheck className="w-3.5 h-3.5" />
              <span>Mark All Read</span>
            </button>
          )}

          {/* Clear Read Button */}
          {summary.read > 0 && (
            <button
              type="button"
              onClick={clearReadNotifications}
              className="flex items-center gap-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 px-3 py-1.5 text-xs font-semibold transition-colors cursor-pointer"
              title="Delete all read notifications"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Clear Read</span>
            </button>
          )}
        </div>
      </div>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {/* Card 1: Total Notifications */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold tracking-wider text-slate-400 uppercase">
              Total Notifications
            </span>
            <div className="rounded-xl bg-slate-100 p-2 text-slate-600">
              <Bell className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">{summary.total}</span>
            <span className="text-[11px] text-slate-500 font-medium">all time logs</span>
          </div>
        </div>

        {/* Card 2: Unread Alerts */}
        <div className="rounded-2xl border border-amber-200/80 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold tracking-wider text-amber-700 uppercase">
              Unread Alerts
            </span>
            <div className="rounded-xl bg-amber-50 p-2 text-amber-600">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-amber-700">{summary.unread}</span>
            <span className="text-[11px] text-amber-600 font-medium">require attention</span>
          </div>
        </div>

        {/* Card 3: Critical Alerts */}
        <div className="rounded-2xl border border-rose-200/80 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold tracking-wider text-rose-700 uppercase">
              Critical Alerts
            </span>
            <div className="rounded-xl bg-rose-50 p-2 text-rose-600">
              <AlertOctagon className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-rose-700">{summary.critical}</span>
            <span className="text-[11px] text-rose-600 font-medium">high priority</span>
          </div>
        </div>

        {/* Card 4: Resolved / Read */}
        <div className="rounded-2xl border border-emerald-200/80 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold tracking-wider text-emerald-700 uppercase">
              Resolved / Read
            </span>
            <div className="rounded-xl bg-emerald-50 p-2 text-emerald-600">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-emerald-700">{summary.read}</span>
            <span className="text-[11px] text-emerald-600 font-medium">acknowledged</span>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar Section */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs space-y-3">
        {/* Top Filter Row: Status Tabs & Farm Dropdown */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          {/* Status Tabs */}
          <div className="flex flex-wrap items-center gap-1.5 p-1 rounded-xl bg-slate-100/80">
            {[
              { id: 'all', label: 'All', count: summary.total },
              { id: 'unread', label: 'Unread', count: summary.unread },
              { id: 'critical', label: 'Critical', count: summary.critical },
              { id: 'read', label: 'Read', count: summary.read },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setStatusFilter(tab.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  statusFilter === tab.id
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                    statusFilter === tab.id
                      ? 'bg-slate-900 text-white'
                      : 'bg-slate-200/80 text-slate-600'
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            ))}
          </div>

          {/* Farm Filter Dropdown & Search */}
          <div className="flex items-center gap-2">
            {uniqueFarms.length > 0 && (
              <select
                value={selectedFarm}
                onChange={(e) => setSelectedFarm(e.target.value)}
                className="rounded-xl border border-slate-200 bg-slate-50/80 px-3 py-1.5 text-xs font-semibold text-slate-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#166534]"
              >
                <option value="all">All Farm Parcels</option>
                {uniqueFarms.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
              </select>
            )}

            {/* Search Box */}
            <div className="relative flex-1 sm:w-56">
              <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search alerts..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50/80 py-1.5 pl-8 pr-3 text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#166534]"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Category Chips Filter */}
        <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-slate-100">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mr-1 flex items-center gap-1">
            <Filter className="w-3 h-3" /> Category:
          </span>
          {[
            { id: 'all', label: 'All Categories', count: summary.total },
            { id: 'weather', label: 'Weather', count: summary.byCategory?.weather || 0, icon: CloudSun },
            { id: 'crop', label: 'Crop Health', count: summary.byCategory?.crop || 0, icon: Sprout },
            { id: 'soil', label: 'Soil Analysis', count: summary.byCategory?.soil || 0, icon: Layers },
            { id: 'irrigation', label: 'Smart Irrigation', count: summary.byCategory?.irrigation || 0, icon: Droplets },
            { id: 'disease', label: 'AI Disease', count: summary.byCategory?.disease || 0, icon: ScanEye },
            { id: 'system', label: 'System', count: summary.byCategory?.system || 0, icon: Bell },
          ].map((cat) => {
            const Icon = cat.icon;
            const isSelected = categoryFilter === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setCategoryFilter(cat.id)}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-[#166534] text-white shadow-2xs font-bold'
                    : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200/60'
                }`}
              >
                {Icon && <Icon className="w-3 h-3 shrink-0" />}
                <span>{cat.label}</span>
                {cat.count > 0 && (
                  <span
                    className={`text-[10px] font-bold px-1 rounded ${
                      isSelected ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
                    }`}
                  >
                    {cat.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Notifications List Section */}
      <div className="space-y-3">
        {loading && notifications.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-xs">
            <RefreshCw className="w-8 h-8 text-[#166534] animate-spin mx-auto mb-3" />
            <h3 className="text-sm font-bold text-slate-800">Loading notifications...</h3>
            <p className="text-xs text-slate-500 mt-1">Connecting to real-time notification stream</p>
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center shadow-xs">
            <div className="h-12 w-12 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto text-slate-400 mb-3">
              <Bell className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-slate-800">No notifications found</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
              {statusFilter !== 'all' || categoryFilter !== 'all' || searchQuery
                ? 'Try clearing your filters or search keywords to view all notifications.'
                : 'Your platform telemetry is clear. You can trigger an automatic scan to evaluate irrigation and crop risks.'}
            </p>
            <div className="mt-4 flex items-center justify-center gap-2">
              {(statusFilter !== 'all' || categoryFilter !== 'all' || searchQuery) && (
                <button
                  type="button"
                  onClick={() => {
                    setStatusFilter('all');
                    setCategoryFilter('all');
                    setSearchQuery('');
                    setSelectedFarm('all');
                  }}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer shadow-2xs"
                >
                  Clear Filters
                </button>
              )}
              <button
                type="button"
                onClick={handleSyncAlerts}
                disabled={syncing}
                className="flex items-center gap-1.5 rounded-xl bg-[#166534] hover:bg-[#145A32] text-white px-4 py-1.5 text-xs font-bold transition-colors cursor-pointer shadow-2xs"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
                <span>Evaluate DB Records</span>
              </button>
            </div>
          </div>
        ) : (
          filteredNotifications.map((notification) => {
            const notifId = notification._id || notification.id;
            const categoryConfig =
              CATEGORY_CONFIG[notification.category] || CATEGORY_CONFIG.system;
            const CategoryIcon = categoryConfig.icon;
            const isUnread = !notification.isRead;
            const isCritical = notification.severity === 'critical';
            const isWarning = notification.severity === 'warning';

            return (
              <div
                key={notifId}
                className={`group relative rounded-2xl border transition-all duration-150 p-4 sm:p-5 shadow-xs ${
                  isUnread
                    ? isCritical
                      ? 'bg-rose-50/50 border-rose-300 ring-1 ring-rose-300'
                      : isWarning
                      ? 'bg-amber-50/40 border-amber-300'
                      : 'bg-[#F7F9F5] border-[#166534]/30'
                    : 'bg-white border-slate-200/80 hover:border-slate-300'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  {/* Left Column: Icon + Content */}
                  <div className="flex items-start gap-3.5 min-w-0 flex-1">
                    {/* Category Icon Badge */}
                    <div
                      className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 border ${categoryConfig.color}`}
                    >
                      <CategoryIcon className="w-5 h-5" />
                    </div>

                    {/* Main Content Area */}
                    <div className="min-w-0 flex-1 space-y-1">
                      {/* Top Badges Row */}
                      <div className="flex flex-wrap items-center gap-2">
                        {/* Unread indicator dot */}
                        {isUnread && (
                          <span
                            className="inline-block w-2 h-2 rounded-full bg-rose-500"
                            title="Unread alert"
                          />
                        )}

                        {/* Severity Badge */}
                        {isCritical ? (
                          <Badge variant="danger" size="sm" className="font-extrabold text-[10px]">
                            CRITICAL
                          </Badge>
                        ) : isWarning ? (
                          <Badge variant="warning" size="sm" className="font-bold text-[10px]">
                            WARNING
                          </Badge>
                        ) : (
                          <Badge variant="neutral" size="sm" className="font-semibold text-[10px]">
                            {notification.severity?.toUpperCase() || 'INFO'}
                          </Badge>
                        )}

                        {/* Category Name */}
                        <span className="text-[11px] font-bold text-slate-500">
                          {categoryConfig.label}
                        </span>

                        {/* Farm Parcel Badge */}
                        {notification.farm?.name && (
                          <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-700">
                            <MapPin className="w-2.5 h-2.5 text-slate-400" />
                            <span>{notification.farm.name}</span>
                          </span>
                        )}

                        {/* Crop Badge */}
                        {(notification.crop?.cropName || notification.crop?.name) && (
                          <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 text-[10px] font-semibold">
                            <Sprout className="w-2.5 h-2.5 text-emerald-600" />
                            <span>{notification.crop.cropName || notification.crop.name}</span>
                          </span>
                        )}

                        {/* Timestamp in Asia/Kolkata */}
                        <span
                          className="ml-auto text-[11px] text-slate-400 flex items-center gap-1"
                          title={formatKolkataTime(notification.createdAt)}
                        >
                          <Clock className="w-3 h-3" />
                          <span>{formatRelativeTime(notification.createdAt)}</span>
                        </span>
                      </div>

                      {/* Notification Title */}
                      <h3
                        className={`text-sm sm:text-base font-bold leading-snug ${
                          isUnread ? 'text-slate-900' : 'text-slate-800'
                        }`}
                      >
                        {notification.title}
                      </h3>

                      {/* Notification Message */}
                      <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                        {notification.message}
                      </p>

                      {/* Timestamp tooltip display for precision */}
                      <div className="pt-1 text-[11px] text-slate-400">
                        Recorded on: {formatKolkataTime(notification.createdAt)}
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Actions (Direct link, Read toggle, Delete) */}
                  <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-start gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                    {/* Action Navigation Link */}
                    {notification.actionUrl && (
                      <Link
                        to={notification.actionUrl}
                        className="flex items-center gap-1 rounded-xl bg-slate-100 hover:bg-[#166534] text-slate-700 hover:text-white px-3 py-1.5 text-xs font-bold transition-all shadow-2xs"
                      >
                        <span>{notification.actionLabel || 'View Record'}</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </Link>
                    )}

                    <div className="flex items-center gap-1">
                      {/* Mark as Read / Unread toggle */}
                      {isUnread ? (
                        <button
                          type="button"
                          onClick={() => markAsRead(notifId)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-[#166534] hover:bg-slate-100 transition-colors"
                          title="Mark as read"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                        </button>
                      ) : (
                        <span
                          className="text-[10px] text-slate-400 font-medium px-2 py-0.5 rounded bg-slate-50"
                          title={formatKolkataTime(notification.readAt)}
                        >
                          Read
                        </span>
                      )}

                      {/* Delete button */}
                      <button
                        type="button"
                        onClick={() => deleteNotification(notifId)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                        title="Delete notification"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Notification Delivery Preferences Modal */}
      <Modal
        isOpen={isPreferencesOpen}
        onClose={() => setIsPreferencesOpen(false)}
        title="Notification Delivery Preferences"
        subtitle="Manage alerts, reminders, and delivery frequency for agricultural platform events."
        maxWidth="max-w-xl"
      >
        <form onSubmit={handleSavePreferences} className="space-y-4">
          <div className="rounded-xl bg-slate-50 p-3 text-xs text-slate-600 border border-slate-200/80">
            Customize which platform notifications you want to receive. Critical health and severe storm alerts will always be delivered to safeguard your crops.
          </div>

          <div className="space-y-3 divide-y divide-slate-100">
            {/* Preference: Weather Alerts */}
            <div className="flex items-center justify-between pt-2">
              <div className="space-y-0.5">
                <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <CloudSun className="w-4 h-4 text-sky-600" />
                  Weather &amp; Microclimate Advisories
                </span>
                <p className="text-[11px] text-slate-500">
                  Heatwaves, high fungal risk humidity, storms, and rainfall forecasts.
                </p>
              </div>
              <input
                type="checkbox"
                checked={localPrefs?.weatherAlerts ?? true}
                onChange={(e) =>
                  setLocalPrefs((prev) => ({ ...prev, weatherAlerts: e.target.checked }))
                }
                className="h-4 w-4 rounded text-[#166534] focus:ring-[#166534]"
              />
            </div>

            {/* Preference: Crop Health Alerts */}
            <div className="flex items-center justify-between pt-3">
              <div className="space-y-0.5">
                <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Sprout className="w-4 h-4 text-emerald-600" />
                  Crop Health &amp; Stress Alerts
                </span>
                <p className="text-[11px] text-slate-500">
                  Telemetry updates when crops transition to At Risk or Critical status.
                </p>
              </div>
              <input
                type="checkbox"
                checked={localPrefs?.cropAlerts ?? true}
                onChange={(e) =>
                  setLocalPrefs((prev) => ({ ...prev, cropAlerts: e.target.checked }))
                }
                className="h-4 w-4 rounded text-[#166534] focus:ring-[#166534]"
              />
            </div>

            {/* Preference: Soil Health Alerts */}
            <div className="flex items-center justify-between pt-3">
              <div className="space-y-0.5">
                <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-amber-600" />
                  Soil Health &amp; Nutrient Deficiencies
                </span>
                <p className="text-[11px] text-slate-500">
                  Soil pH imbalances (acidity/alkalinity) and nitrogen deficiencies.
                </p>
              </div>
              <input
                type="checkbox"
                checked={localPrefs?.soilAlerts ?? true}
                onChange={(e) =>
                  setLocalPrefs((prev) => ({ ...prev, soilAlerts: e.target.checked }))
                }
                className="h-4 w-4 rounded text-[#166534] focus:ring-[#166534]"
              />
            </div>

            {/* Preference: Smart Irrigation Reminders */}
            <div className="flex items-center justify-between pt-3">
              <div className="space-y-0.5">
                <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Droplets className="w-4 h-4 text-blue-600" />
                  Smart Irrigation Reminders
                </span>
                <p className="text-[11px] text-slate-500">
                  Upcoming scheduled irrigation runs and overdue watering sessions.
                </p>
              </div>
              <input
                type="checkbox"
                checked={localPrefs?.irrigationAlerts ?? true}
                onChange={(e) =>
                  setLocalPrefs((prev) => ({ ...prev, irrigationAlerts: e.target.checked }))
                }
                className="h-4 w-4 rounded text-[#166534] focus:ring-[#166534]"
              />
            </div>

            {/* Preference: AI Disease Detection Alerts */}
            <div className="flex items-center justify-between pt-3">
              <div className="space-y-0.5">
                <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <ScanEye className="w-4 h-4 text-rose-600" />
                  AI Crop Disease Detection Alerts
                </span>
                <p className="text-[11px] text-slate-500">
                  Photographic diagnoses identifying crop blights, fungal rusts, and pests.
                </p>
              </div>
              <input
                type="checkbox"
                checked={localPrefs?.diseaseAlerts ?? true}
                onChange={(e) =>
                  setLocalPrefs((prev) => ({ ...prev, diseaseAlerts: e.target.checked }))
                }
                className="h-4 w-4 rounded text-[#166534] focus:ring-[#166534]"
              />
            </div>

            {/* Preference: System & Farm Updates */}
            <div className="flex items-center justify-between pt-3">
              <div className="space-y-0.5">
                <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Bell className="w-4 h-4 text-slate-600" />
                  Farm &amp; System Platform Updates
                </span>
                <p className="text-[11px] text-slate-500">
                  Parcel registrations, seasonal milestone transitions, and notices.
                </p>
              </div>
              <input
                type="checkbox"
                checked={localPrefs?.systemAlerts ?? true}
                onChange={(e) =>
                  setLocalPrefs((prev) => ({ ...prev, systemAlerts: e.target.checked }))
                }
                className="h-4 w-4 rounded text-[#166534] focus:ring-[#166534]"
              />
            </div>

            {/* Preference: Critical Only Mode */}
            <div className="flex items-center justify-between pt-3 border-t-2 border-slate-200">
              <div className="space-y-0.5">
                <span className="text-xs font-bold text-rose-700 flex items-center gap-1.5">
                  <AlertOctagon className="w-4 h-4 text-rose-600" />
                  Critical Only Mode
                </span>
                <p className="text-[11px] text-slate-500">
                  Only dispatch high-priority critical alerts; suppress non-critical notices.
                </p>
              </div>
              <input
                type="checkbox"
                checked={localPrefs?.criticalOnly ?? false}
                onChange={(e) =>
                  setLocalPrefs((prev) => ({ ...prev, criticalOnly: e.target.checked }))
                }
                className="h-4 w-4 rounded text-rose-600 focus:ring-rose-500"
              />
            </div>
          </div>

          {/* Modal Actions */}
          <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={() => setIsPreferencesOpen(false)}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer shadow-2xs"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={savingPrefs}
              className="rounded-xl bg-[#166534] hover:bg-[#145A32] px-5 py-2 text-xs font-bold text-white transition-colors cursor-pointer shadow-xs disabled:opacity-50"
            >
              {savingPrefs ? 'Saving Preferences...' : 'Save Preferences'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
