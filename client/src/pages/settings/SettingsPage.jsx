import { useState, useEffect } from 'react';
import {
  Lock,
  Sliders,
  Bell,
  ShieldAlert,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  Tractor,
  KeyRound,
  LogOut,
  Trash2,
  ShieldCheck,
  Clock,
  Gauge,
  Thermometer,
  Droplets,
  Save,
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth.js';
import { useNotifications } from '../../hooks/useNotifications.js';
import userService from '../../services/userService.js';
import farmService from '../../services/farmService.js';
import Modal from '../../components/common/Modal.jsx';

export default function SettingsPage() {
  const { user, logout, updateUser } = useAuth();
  const { preferences: notifPrefs, updatePreferences: updateNotifPrefs } = useNotifications();

  const [activeTab, setActiveTab] = useState('security');
  const [toast, setToast] = useState(null);

  // Security Form State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  // Farm Preferences State
  const [farms, setFarms] = useState([]);
  const [selectedFarmId, setSelectedFarmId] = useState('');
  const [areaUnit, setAreaUnit] = useState('acres');
  const [tempUnit, setTempUnit] = useState('celsius');
  const [waterUnit, setWaterUnit] = useState('liters');
  const [theme, setTheme] = useState('light');
  const [timezone, setTimezone] = useState('Asia/Kolkata');
  const [savingPrefs, setSavingPrefs] = useState(false);
  const [savingNotifs, setSavingNotifs] = useState(false);

  // Notification Preferences State (Reused from Phase 11 NotificationContext)
  const activeNotifs = notifPrefs || {
    weatherAlerts: true,
    cropAlerts: true,
    soilAlerts: true,
    irrigationAlerts: true,
    diseaseAlerts: true,
    consultationAlerts: true,
    criticalOnly: false,
  };

  // Deletion Modal State
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteReason, setDeleteReason] = useState('');
  const [submittingDelete, setSubmittingDelete] = useState(false);

  const showToast = (type, text) => {
    setToast({ type, text });
    setTimeout(() => setToast(null), 4000);
  };

  // 1. Load Initial Data (Farms, User Preferences)
  useEffect(() => {
    let ignore = false;
    const loadInitialData = async () => {
      try {
        const [prefsRes, farmsRes] = await Promise.all([
          userService.getPreferences(),
          farmService.getFarms({ limit: 50 }).catch(() => ({ data: { farms: [] } })),
        ]);

        if (ignore) return;

        // User Preferences
        if (prefsRes?.success) {
          const p = prefsRes.preferences || {};
          if (p.areaUnit) setAreaUnit(p.areaUnit);
          if (p.tempUnit) setTempUnit(p.tempUnit);
          if (p.waterUnit) setWaterUnit(p.waterUnit);
          if (p.theme) setTheme(p.theme);
          if (p.timezone) setTimezone(p.timezone);
          if (prefsRes.defaultFarm) {
            setSelectedFarmId(prefsRes.defaultFarm._id || prefsRes.defaultFarm.id || prefsRes.defaultFarm);
          }
        }

        // Farms List
        const farmList = farmsRes?.data?.farms || farmsRes?.farms || [];
        setFarms(farmList);
      } catch (err) {
        if (!ignore) {
          console.error('[LOAD_SETTINGS_ERROR]', err);
        }
      }
    };

    loadInitialData();
    return () => {
      ignore = true;
    };
  }, []);

  // Password Strength Calculator
  const passwordStrength = (() => {
    if (!newPassword) return 0;
    let score = 0;
    if (newPassword.length >= 6) score += 1;
    if (newPassword.length >= 10) score += 1;
    if (/[A-Z]/.test(newPassword) && /[a-z]/.test(newPassword)) score += 1;
    if (/[0-9]/.test(newPassword) || /[^A-Za-z0-9]/.test(newPassword)) score += 1;
    return score;
  })();

  const strengthLabel = ['', 'Weak', 'Fair', 'Good', 'Strong'][passwordStrength] || 'Weak';
  const strengthColor = [
    'bg-slate-200',
    'bg-rose-500',
    'bg-amber-500',
    'bg-blue-500',
    'bg-[#166534]',
  ][passwordStrength];

  // Handle Password Change
  const handleChangePassword = async (e) => {
    e.preventDefault();

    if (!currentPassword || !newPassword || !confirmPassword) {
      showToast('error', 'All password fields are required.');
      return;
    }

    if (newPassword !== confirmPassword) {
      showToast('error', 'New password and confirmation do not match.');
      return;
    }

    if (newPassword.length < 6) {
      showToast('error', 'New password must be at least 6 characters.');
      return;
    }

    setSavingPassword(true);
    try {
      const res = await userService.changePassword({
        currentPassword,
        newPassword,
        confirmPassword,
      });

      if (res?.success) {
        showToast('success', 'Account password changed successfully.');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      }
    } catch (err) {
      showToast('error', err.response?.data?.message || err.message || 'Failed to change password.');
    } finally {
      setSavingPassword(false);
    }
  };

  // Handle Farm Preferences Save
  const handleSaveFarmPrefs = async (e) => {
    e.preventDefault();
    setSavingPrefs(true);
    try {
      const res = await userService.updatePreferences({
        defaultFarmId: selectedFarmId || null,
        areaUnit,
        tempUnit,
        waterUnit,
        theme,
        timezone,
      });

      if (res?.success) {
        if (res.user) updateUser(res.user);
        showToast('success', 'Farm & measurement preferences updated.');
      }
    } catch (err) {
      showToast('error', err.response?.data?.message || err.message || 'Failed to save preferences.');
    } finally {
      setSavingPrefs(false);
    }
  };

  // Handle Notification Preference Toggle (Reusing Phase 11)
  const handleToggleNotif = async (key) => {
    setSavingNotifs(true);
    try {
      await updateNotifPrefs({ [key]: !activeNotifs[key] });
      showToast('success', 'Notification preferences updated.');
    } catch (err) {
      showToast('error', err.message || 'Failed to update notifications.');
    } finally {
      setSavingNotifs(false);
    }
  };

  // Handle Account Deletion Request
  const handleSubmitDeleteRequest = async (e) => {
    e.preventDefault();
    if (!deletePassword) {
      showToast('error', 'Password is required to request deletion.');
      return;
    }

    setSubmittingDelete(true);
    try {
      const res = await userService.requestAccountDeletion({
        password: deletePassword,
        reason: deleteReason.trim(),
      });

      if (res?.success) {
        setIsDeleteModalOpen(false);
        showToast('info', 'Account deletion request submitted for compliance review.');
        setDeletePassword('');
        setDeleteReason('');
      }
    } catch (err) {
      showToast('error', err.response?.data?.message || err.message || 'Verification failed.');
    } finally {
      setSubmittingDelete(false);
    }
  };

  return (
    <div className="space-y-6 pb-12 max-w-5xl mx-auto">
      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-xs font-bold transition-all ${
            toast.type === 'error'
              ? 'bg-rose-600 text-white'
              : toast.type === 'info'
              ? 'bg-slate-800 text-white'
              : 'bg-[#166534] text-white'
          }`}
        >
          {toast.type === 'error' ? (
            <AlertCircle className="w-4 h-4 shrink-0" />
          ) : (
            <CheckCircle2 className="w-4 h-4 shrink-0" />
          )}
          <span>{toast.text}</span>
        </div>
      )}

      {/* Settings Header */}
      <div className="pb-2 border-b border-slate-200/80">
        <h1 className="text-xl sm:text-2xl font-extrabold text-[#17251B] tracking-tight">
          Account Settings &amp; Preferences
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Manage your account credentials, default farm parcels, regional telemetry units, and security safeguards.
        </p>
      </div>

      {/* Tabs Bar */}
      <div className="flex border-b border-slate-200 gap-1 overflow-x-auto">
        {[
          { id: 'security', label: 'Security & Password', icon: Lock },
          { id: 'preferences', label: 'Farm & Regional Units', icon: Sliders },
          { id: 'notifications', label: 'Alert Preferences', icon: Bell },
          { id: 'privacy', label: 'Account & Privacy', icon: ShieldAlert },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 text-xs sm:text-sm font-bold border-b-2 whitespace-nowrap transition-all cursor-pointer ${
                isActive
                  ? 'border-[#166534] text-[#166534]'
                  : 'border-transparent text-slate-500 hover:text-slate-900'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* ======================================================== */}
      {/* TAB 1: Security & Password Management                   */}
      {/* ======================================================== */}
      {activeTab === 'security' && (
        <div className="space-y-6">
          <form
            onSubmit={handleChangePassword}
            className="rounded-2xl border border-slate-200/80 bg-white p-5 sm:p-6 shadow-xs space-y-4 max-w-xl"
          >
            <div className="border-b border-slate-100 pb-3">
              <h2 className="text-sm font-bold text-[#17251B] flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-[#166534]" />
                <span>Change Account Password</span>
              </h2>
              <p className="text-[11px] text-slate-500">
                Ensure your AgriSense account uses a strong, unique password to safeguard your farm telemetry data.
              </p>
            </div>

            {/* Current Password */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Current Password *
              </label>
              <div className="relative">
                <input
                  type={showCurrentPass ? 'text' : 'password'}
                  required
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Enter current password"
                  className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#166534]"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPass(!showCurrentPass)}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                >
                  {showCurrentPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* New Password */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                New Password *
              </label>
              <div className="relative">
                <input
                  type={showNewPass ? 'text' : 'password'}
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new strong password"
                  className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#166534]"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPass(!showNewPass)}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                >
                  {showNewPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {/* Password Strength Indicator */}
              {newPassword && (
                <div className="mt-2 space-y-1">
                  <div className="flex items-center justify-between text-[10px] font-bold text-slate-500">
                    <span>Password Strength:</span>
                    <span className="font-extrabold uppercase">{strengthLabel}</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                    <div
                      className={`h-1.5 rounded-full transition-all duration-300 ${strengthColor}`}
                      style={{ width: `${(passwordStrength / 4) * 100}%` }}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Confirm New Password */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Confirm New Password *
              </label>
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter new password"
                className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#166534]"
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={savingPassword}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#166534] hover:bg-[#14532d] text-white text-xs font-bold transition-all shadow-xs cursor-pointer disabled:opacity-50"
              >
                {savingPassword ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Updating Password...</span>
                  </>
                ) : (
                  <>
                    <Lock className="w-3.5 h-3.5" />
                    <span>Update Password</span>
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Security Best Practices Banner */}
          <div className="rounded-2xl border border-slate-200/80 bg-slate-50 p-5 text-xs text-slate-600 space-y-2 max-w-xl">
            <h4 className="font-bold text-slate-900 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Authentication &amp; Session Safeguards</span>
            </h4>
            <p className="text-[11px] leading-relaxed">
              AgriSense hashes passwords with 12-round bcrypt salt encryption. Sessions are secured with signed JSON Web Tokens (JWT). Changing your password preserves your registered farms, telemetry records, and advisory history.
            </p>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 2: Farm & Regional Measurement Preferences          */}
      {/* ======================================================== */}
      {activeTab === 'preferences' && (
        <form
          onSubmit={handleSaveFarmPrefs}
          className="rounded-2xl border border-slate-200/80 bg-white p-5 sm:p-6 shadow-xs space-y-5 max-w-2xl"
        >
          <div className="border-b border-slate-100 pb-3">
            <h2 className="text-sm font-bold text-[#17251B] flex items-center gap-2">
              <Sliders className="w-4 h-4 text-[#166534]" />
              <span>Farm Telemetry &amp; Unit Preferences</span>
            </h2>
            <p className="text-[11px] text-slate-500">
              Customize default parcel loading and display units across Soil Analysis, Smart Irrigation, and Reports.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Default Farm Selection */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Default Farm Parcel
              </label>
              <div className="relative">
                <Tractor className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <select
                  value={selectedFarmId}
                  onChange={(e) => setSelectedFarmId(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#166534] font-medium"
                >
                  <option value="">No Default (Ask every time)</option>
                  {farms.map((f) => (
                    <option key={f._id || f.id} value={f._id || f.id}>
                      {f.name} ({f.acreage || f.totalAcreage || 0} Acres) &bull; {f.location}
                    </option>
                  ))}
                </select>
              </div>
              <p className="text-[10px] text-slate-400 mt-1">
                Auto-selected when you open Soil Analysis, Crop Monitoring, and Smart Irrigation.
              </p>
            </div>

            {/* Land Area Unit */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Land Area Measurement
              </label>
              <div className="relative">
                <Gauge className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <select
                  value={areaUnit}
                  onChange={(e) => setAreaUnit(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#166534] font-medium"
                >
                  <option value="acres">Acres (ac)</option>
                  <option value="hectares">Hectares (ha)</option>
                </select>
              </div>
            </div>

            {/* Temperature Unit */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Temperature Unit
              </label>
              <div className="relative">
                <Thermometer className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <select
                  value={tempUnit}
                  onChange={(e) => setTempUnit(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#166534] font-medium"
                >
                  <option value="celsius">Celsius (°C)</option>
                  <option value="fahrenheit">Fahrenheit (°F)</option>
                </select>
              </div>
            </div>

            {/* Water Volume Unit */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Water Volume Unit
              </label>
              <div className="relative">
                <Droplets className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <select
                  value={waterUnit}
                  onChange={(e) => setWaterUnit(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#166534] font-medium"
                >
                  <option value="liters">Liters (L)</option>
                  <option value="gallons">Gallons (gal)</option>
                </select>
              </div>
            </div>

            {/* Regional Timezone */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Regional Timezone
              </label>
              <div className="relative">
                <Clock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <select
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#166534] font-medium"
                >
                  <option value="Asia/Kolkata">India Standard Time (IST &bull; Asia/Kolkata)</option>
                </select>
              </div>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100 flex justify-end">
            <button
              type="submit"
              disabled={savingPrefs}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[#166534] hover:bg-[#14532d] text-white text-xs font-bold transition-all shadow-xs cursor-pointer disabled:opacity-50"
            >
              {savingPrefs ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Saving Preferences...</span>
                </>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5" />
                  <span>Save Preferences</span>
                </>
              )}
            </button>
          </div>
        </form>
      )}

      {/* ======================================================== */}
      {/* TAB 3: Notification Preferences (Reusing Phase 11)      */}
      {/* ======================================================== */}
      {activeTab === 'notifications' && (
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 sm:p-6 shadow-xs space-y-5 max-w-2xl">
          <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-[#17251B] flex items-center gap-2">
                <Bell className="w-4 h-4 text-[#166534]" />
                <span>Agricultural Alert Channels</span>
              </h2>
              <p className="text-[11px] text-slate-500">
                Choose which agronomic telemetry triggers dispatch real-time in-app notifications.
              </p>
            </div>
            {savingNotifs && (
              <span className="text-[10px] text-emerald-700 font-semibold animate-pulse">
                Saving preferences...
              </span>
            )}
          </div>

          <div className="divide-y divide-slate-100">
            {[
              {
                key: 'weatherAlerts',
                title: 'Weather Advisories & Extreme Warnings',
                desc: 'Rainfall forecasts, heat stress alerts, and sudden weather shifts.',
              },
              {
                key: 'cropAlerts',
                title: 'Crop Health & Phenological Reminders',
                desc: 'Transition to flowering/fruiting and overdue harvest alerts.',
              },
              {
                key: 'irrigationAlerts',
                title: 'Smart Irrigation & Water Cycle Schedules',
                desc: 'Soil moisture depletion reminders and pending irrigation runs.',
              },
              {
                key: 'diseaseAlerts',
                title: 'AI Crop Disease Detection Notifications',
                desc: 'High-severity pathogen alerts and multimodal diagnostic results.',
              },
              {
                key: 'consultationAlerts',
                title: 'Specialist Consultation Updates',
                desc: 'Agronomist advice submissions, case acceptances, and live messages.',
              },
              {
                key: 'criticalOnly',
                title: 'Critical Alerts Only Mode',
                desc: 'Mute routine reminders and only trigger alerts for urgent/severe farm conditions.',
              },
            ].map((item) => (
              <div key={item.key} className="py-3.5 flex items-center justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <h4 className="text-xs font-bold text-slate-900">{item.title}</h4>
                  <p className="text-[11px] text-slate-500">{item.desc}</p>
                </div>

                <button
                  type="button"
                  onClick={() => handleToggleNotif(item.key)}
                  className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors cursor-pointer shrink-0 ${
                    activeNotifs[item.key] ? 'bg-[#166534]' : 'bg-slate-200'
                  }`}
                >
                  <div
                    className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                      activeNotifs[item.key] ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 4: Account Details, Sessions & Privacy Danger Zone   */}
      {/* ======================================================== */}
      {activeTab === 'privacy' && (
        <div className="space-y-6 max-w-2xl">
          {/* Account Metadata Card */}
          <div className="rounded-2xl border border-slate-200/80 bg-white p-5 sm:p-6 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>AgriSense Account Telemetry</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                <span className="text-[10px] text-slate-400 font-semibold block uppercase">
                  Account ID
                </span>
                <span className="font-mono text-slate-700 text-[11px] truncate block">
                  {user?._id || user?.id}
                </span>
              </div>

              <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                <span className="text-[10px] text-slate-400 font-semibold block uppercase">
                  System Role
                </span>
                <span className="font-bold text-[#166534] capitalize block">
                  {user?.role || 'Farmer'} Account
                </span>
              </div>

              <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                <span className="text-[10px] text-slate-400 font-semibold block uppercase">
                  Account Status
                </span>
                <span className="font-bold text-emerald-700 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Active &amp; Verified
                </span>
              </div>

              <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                <span className="text-[10px] text-slate-400 font-semibold block uppercase">
                  Current Session
                </span>
                <span className="text-slate-700 font-medium">
                  Signed in on Web Client (JWT Protected)
                </span>
              </div>
            </div>

            <div className="pt-2 flex items-center justify-between">
              <span className="text-[11px] text-slate-500">
                Need to switch accounts or secure this device?
              </span>
              <button
                type="button"
                onClick={logout}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-slate-200 hover:bg-slate-100 text-xs font-bold text-slate-700 transition-all cursor-pointer shadow-2xs"
              >
                <LogOut className="w-3.5 h-3.5 text-slate-500" />
                <span>Sign Out of AgriSense</span>
              </button>
            </div>
          </div>

          {/* Danger Zone: Account Deletion */}
          <div className="rounded-2xl border-2 border-rose-200 bg-rose-50/40 p-5 sm:p-6 shadow-xs space-y-3">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-rose-600" />
              <h3 className="text-sm font-bold text-rose-950">Danger Zone: Account Deletion</h3>
            </div>
            <p className="text-xs text-rose-800 leading-relaxed">
              Submitting an account deletion request will initiate an administrative review. To protect agricultural integrity and prevent accidental data loss, deletions require password verification and manual confirmation.
            </p>

            <div className="pt-2">
              <button
                type="button"
                onClick={() => setIsDeleteModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Request Account Deletion</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Request Account Deletion Confirmation */}
      {isDeleteModalOpen && (
        <Modal
          isOpen={true}
          onClose={() => setIsDeleteModalOpen(false)}
          title="Confirm Account Deletion Request"
          size="md"
        >
          <form onSubmit={handleSubmitDeleteRequest} className="space-y-4">
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-900 flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
              <span>
                Please confirm your password to request deletion of account <strong>{user?.email}</strong>.
              </span>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Account Password *
              </label>
              <input
                type="password"
                required
                value={deletePassword}
                onChange={(e) => setDeletePassword(e.target.value)}
                placeholder="Enter your current password"
                className="w-full rounded-xl border border-slate-200 p-3 text-xs text-slate-900 focus:outline-none focus:border-rose-600"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Reason for Leaving (Optional)
              </label>
              <textarea
                rows={3}
                value={deleteReason}
                onChange={(e) => setDeleteReason(e.target.value)}
                placeholder="Help us improve AgriSense..."
                className="w-full rounded-xl border border-slate-200 p-3 text-xs text-slate-900 focus:outline-none focus:border-slate-400"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsDeleteModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
              >
                Keep Account
              </button>
              <button
                type="submit"
                disabled={submittingDelete || !deletePassword}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold disabled:opacity-40 shadow-xs cursor-pointer"
              >
                {submittingDelete ? 'Submitting...' : 'Confirm Request'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
