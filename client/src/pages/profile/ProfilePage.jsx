import { useState, useEffect, useRef } from 'react';
import {
  User,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Camera,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Save,
  RotateCcw,
  ShieldCheck,
  Globe,
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth.js';
import userService from '../../services/userService.js';
import Badge from '../../components/common/Badge.jsx';

const INDIAN_STATES = [
  'Andhra Pradesh',
  'Telangana',
  'Karnataka',
  'Tamil Nadu',
  'Maharashtra',
  'Punjab',
  'Haryana',
  'Gujarat',
  'Uttar Pradesh',
  'Madhya Pradesh',
  'Rajasthan',
  'West Bengal',
  'Bihar',
  'Odisha',
  'Kerala',
  'Assam',
  'Chhattisgarh',
  'Jharkhand',
  'Himachal Pradesh',
  'Uttarakhand',
  'Goa',
  'Other',
];

const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'te', label: 'Telugu (తెలుగు)' },
  { code: 'hi', label: 'Hindi (हिन्दी)' },
];

function formatJoinDate(isoDate) {
  if (!isoDate) return 'Active Member';
  const d = new Date(isoDate);
  return d.toLocaleDateString('en-IN', {
    month: 'long',
    year: 'numeric',
  });
}

export default function ProfilePage({ isExpertView = false }) {
  const { user, updateUser } = useAuth();
  const fileInputRef = useRef(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [toast, setToast] = useState(null);

  // Editable Form State
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    village: '',
    mandal: '',
    district: '',
    state: 'Telangana',
    pincode: '',
    language: 'en',
    avatar: '',
  });

  const [initialData, setInitialData] = useState({});

  const showToast = (type, text) => {
    setToast({ type, text });
    setTimeout(() => setToast(null), 4000);
  };

  // 1. Load Profile
  useEffect(() => {
    let ignore = false;
    const fetchProfile = async () => {
      try {
        const res = await userService.getProfile();
        if (!ignore && res?.success && res.user) {
          const u = res.user;
          const loaded = {
            name: u.name || '',
            email: u.email || '',
            phone: u.phone || '',
            address: u.address || '',
            village: u.village || '',
            mandal: u.mandal || '',
            district: u.district || '',
            state: u.state || 'Telangana',
            pincode: u.pincode || '',
            language: u.language || 'en',
            avatar: u.avatar || '',
          };
          setFormData(loaded);
          setInitialData(loaded);
          updateUser(u);
        }
      } catch (err) {
        if (!ignore) {
          console.error('[LOAD_PROFILE_ERROR]', err);
          showToast('error', 'Failed to load profile details.');
        }
      } finally {
        if (!ignore) setLoading(false);
      }
    };

    fetchProfile();
    return () => {
      ignore = true;
    };
  }, [updateUser]);

  // Handle Input Changes
  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  // Reset Changes
  const handleReset = () => {
    setFormData(initialData);
    showToast('info', 'Reverted unsaved profile edits.');
  };

  // Profile Completeness Calculation
  const completeness = (() => {
    const fields = [
      formData.name,
      formData.phone,
      formData.address,
      formData.village,
      formData.mandal,
      formData.district,
      formData.state,
      formData.pincode,
      formData.avatar,
    ];
    const filled = fields.filter(Boolean).length;
    return Math.round((filled / fields.length) * 100);
  })();

  // Handle Avatar Upload
  const handleAvatarFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      showToast('error', 'Profile photograph must be smaller than 5MB.');
      return;
    }

    setUploadingAvatar(true);
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const res = await userService.uploadAvatar(reader.result, file.name);
        if (res?.success && res.avatar) {
          setFormData((prev) => ({ ...prev, avatar: res.avatar }));
          setInitialData((prev) => ({ ...prev, avatar: res.avatar }));
          updateUser({ avatar: res.avatar });
          showToast('success', 'Profile photograph updated successfully.');
        }
      } catch (err) {
        showToast('error', err.response?.data?.message || err.message || 'Failed to upload photo.');
      } finally {
        setUploadingAvatar(false);
      }
    };
    reader.readAsDataURL(file);
  };

  // Handle Avatar Removal
  const handleRemoveAvatar = async () => {
    if (!formData.avatar) return;
    if (!window.confirm('Remove your profile photograph?')) return;

    setUploadingAvatar(true);
    try {
      const res = await userService.removeAvatar();
      if (res?.success) {
        setFormData((prev) => ({ ...prev, avatar: '' }));
        setInitialData((prev) => ({ ...prev, avatar: '' }));
        updateUser({ avatar: '' });
        showToast('success', 'Profile photograph removed.');
      }
    } catch (err) {
      showToast('error', err.message || 'Failed to remove photograph.');
    } finally {
      setUploadingAvatar(false);
    }
  };

  // Handle Profile Save
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.name.trim() || formData.name.trim().length < 2) {
      showToast('error', 'Full Name must be at least 2 characters.');
      return;
    }

    if (formData.phone && !/^\+?[0-9\s-]{10,15}$/.test(formData.phone.trim())) {
      showToast('error', 'Please enter a valid 10-digit mobile number.');
      return;
    }

    if (formData.pincode && !/^[1-9][0-9]{5}$/.test(formData.pincode.trim())) {
      showToast('error', 'Please enter a valid 6-digit PIN code.');
      return;
    }

    setSaving(true);
    try {
      const res = await userService.updateProfile({
        name: formData.name.trim(),
        phone: formData.phone.trim(),
        address: formData.address.trim(),
        village: formData.village.trim(),
        mandal: formData.mandal.trim(),
        district: formData.district.trim(),
        state: formData.state.trim(),
        pincode: formData.pincode.trim(),
        language: formData.language,
      });

      if (res?.success && res.user) {
        setInitialData(formData);
        updateUser(res.user);
        showToast('success', 'Profile details saved successfully.');
      }
    } catch (err) {
      showToast('error', err.response?.data?.message || err.message || 'Failed to save profile.');
    } finally {
      setSaving(false);
    }
  };

  const getInitials = (name) => {
    if (!name) return 'AG';
    const parts = name.trim().split(' ');
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-3">
        <div className="w-10 h-10 border-4 border-[#166534] border-t-transparent rounded-full animate-spin" />
        <p className="text-xs font-semibold text-slate-500">Loading farmer profile details...</p>
      </div>
    );
  }

  const hasChanges = JSON.stringify(formData) !== JSON.stringify(initialData);

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

      {/* Profile Header Card */}
      <div className="rounded-3xl border border-slate-200/80 bg-white p-6 sm:p-8 shadow-xs relative overflow-hidden">
        {/* Subtle decorative background gradient */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-50 rounded-full blur-3xl -z-10 pointer-events-none opacity-60" />

        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
          {/* Avatar Upload Container */}
          <div className="relative group shrink-0">
            <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl overflow-hidden border-2 border-emerald-500/80 bg-emerald-50 flex items-center justify-center shadow-sm">
              {formData.avatar ? (
                <img
                  src={formData.avatar}
                  alt={formData.name || 'Farmer Avatar'}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-3xl font-extrabold text-[#166534]">
                  {getInitials(formData.name)}
                </span>
              )}
            </div>

            {/* Hidden File Input */}
            <input
              type="file"
              ref={fileInputRef}
              accept="image/jpeg,image/png,image/webp"
              onChange={handleAvatarFile}
              className="hidden"
            />

            {/* Camera / Edit button badge */}
            <button
              type="button"
              disabled={uploadingAvatar}
              onClick={() => fileInputRef.current?.click()}
              className="absolute -bottom-1 -right-1 p-2 rounded-xl bg-[#166534] hover:bg-[#14532d] text-white shadow-md transition-all cursor-pointer disabled:opacity-50"
              title="Upload new profile photograph"
            >
              <Camera className="w-4 h-4" />
            </button>

            {/* Remove button badge if avatar exists */}
            {formData.avatar && (
              <button
                type="button"
                disabled={uploadingAvatar}
                onClick={handleRemoveAvatar}
                className="absolute -top-1 -right-1 p-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white shadow-sm transition-all cursor-pointer disabled:opacity-50"
                title="Remove profile photograph"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Profile Overview Details */}
          <div className="min-w-0 flex-1 text-center sm:text-left space-y-2">
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
              <h1 className="text-xl sm:text-2xl font-extrabold text-[#17251B] tracking-tight">
                {formData.name || 'Farmer Profile'}
              </h1>
              <Badge variant="forest" size="sm" dot>
                {isExpertView || user?.role === 'expert'
                  ? 'VERIFIED SPECIALIST'
                  : 'VERIFIED FARMER'}
              </Badge>
            </div>

            <p className="text-xs text-slate-500 flex flex-wrap items-center justify-center sm:justify-start gap-3">
              <span className="flex items-center gap-1">
                <Mail className="w-3.5 h-3.5 text-slate-400" />
                <span>{formData.email}</span>
              </span>
              <span>&bull;</span>
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <span>Joined {formatJoinDate(user?.createdAt)}</span>
              </span>
              <span>&bull;</span>
              <span className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-slate-400" />
                <span>
                  {formData.district ? `${formData.district}, ${formData.state}` : formData.state}
                </span>
              </span>
            </p>

            {/* Completeness Bar */}
            <div className="pt-2 max-w-md">
              <div className="flex items-center justify-between text-[11px] font-bold text-slate-600 mb-1">
                <span>Profile Completeness</span>
                <span className="text-[#166534]">{completeness}%</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-[#166534] h-2 rounded-full transition-all duration-500"
                  style={{ width: `${completeness}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Profile Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Section 1: Basic Identity & Contact Information */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 sm:p-6 shadow-xs space-y-4">
          <div className="border-b border-slate-100 pb-3">
            <h2 className="text-sm font-bold text-[#17251B] flex items-center gap-2">
              <User className="w-4 h-4 text-[#166534]" />
              <span>Personal & Contact Information</span>
            </h2>
            <p className="text-[11px] text-slate-500">
              Basic identification details used across farm telemetry and expert advisory reports.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Full Name */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Full Legal Name *
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => handleChange('name', e.target.value)}
                placeholder="e.g. Ramesh Patel"
                className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#166534] font-medium"
              />
            </div>

            {/* Mobile Number */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Mobile Number
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => handleChange('phone', e.target.value)}
                  placeholder="e.g. 9876543210"
                  className="w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#166534] font-medium"
                />
              </div>
            </div>

            {/* Email Address (Protected) */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-bold text-slate-700">
                  Email Address
                </label>
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                  Verified
                </span>
              </div>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="email"
                  disabled
                  value={formData.email}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3.5 py-2.5 text-xs text-slate-500 font-medium cursor-not-allowed"
                />
              </div>
              <p className="text-[10px] text-slate-400 mt-1">
                Primary identity email linked with Google &amp; AgriSense authentication.
              </p>
            </div>

            {/* Preferred Language */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Preferred Advisory Language
              </label>
              <div className="relative">
                <Globe className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <select
                  value={formData.language}
                  onChange={(e) => handleChange('language', e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#166534] font-medium"
                >
                  {LANGUAGES.map((lang) => (
                    <option key={lang.code} value={lang.code}>
                      {lang.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Section 2: Farm Location & Regional Postal Address */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 sm:p-6 shadow-xs space-y-4">
          <div className="border-b border-slate-100 pb-3">
            <h2 className="text-sm font-bold text-[#17251B] flex items-center gap-2">
              <MapPin className="w-4 h-4 text-[#166534]" />
              <span>Residential &amp; Field Location Details</span>
            </h2>
            <p className="text-[11px] text-slate-500">
              Used for micro-climate agro-climatic zoning, weather precision, and local specialist allocation.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {/* Street / Landmark Address */}
            <div className="sm:col-span-2 md:col-span-3">
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Street Address / Landmark
              </label>
              <input
                type="text"
                value={formData.address}
                onChange={(e) => handleChange('address', e.target.value)}
                placeholder="House No., Street, Landmark"
                className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#166534]"
              />
            </div>

            {/* Village / Town */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Village / Town
              </label>
              <input
                type="text"
                value={formData.village}
                onChange={(e) => handleChange('village', e.target.value)}
                placeholder="e.g. Miryalguda"
                className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#166534]"
              />
            </div>

            {/* Mandal / Tehsil */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Mandal / Tehsil
              </label>
              <input
                type="text"
                value={formData.mandal}
                onChange={(e) => handleChange('mandal', e.target.value)}
                placeholder="e.g. Miryalguda Mandal"
                className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#166534]"
              />
            </div>

            {/* District */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                District
              </label>
              <input
                type="text"
                value={formData.district}
                onChange={(e) => handleChange('district', e.target.value)}
                placeholder="e.g. Nalgonda"
                className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#166534]"
              />
            </div>

            {/* State */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                State *
              </label>
              <select
                value={formData.state}
                onChange={(e) => handleChange('state', e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#166534]"
              >
                {INDIAN_STATES.map((st) => (
                  <option key={st} value={st}>
                    {st}
                  </option>
                ))}
              </select>
            </div>

            {/* PIN Code */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Postal PIN Code
              </label>
              <input
                type="text"
                maxLength={6}
                value={formData.pincode}
                onChange={(e) => handleChange('pincode', e.target.value)}
                placeholder="e.g. 508207"
                className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#166534]"
              />
            </div>
          </div>
        </div>

        {/* Section 3: Expert Credentials (Visible only if user is an accredited specialist) */}
        {(isExpertView || user?.role === 'expert') && user?.expertProfile && (
          <div className="rounded-2xl border border-blue-200/80 bg-blue-50/40 p-5 sm:p-6 shadow-xs space-y-4">
            <div className="border-b border-blue-200/60 pb-3 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-blue-950 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-blue-600" />
                  <span>Accredited Agricultural Specialist Credentials</span>
                </h2>
                <p className="text-[11px] text-blue-800">
                  Verified institutional credentials displayed on consultation advisories.
                </p>
              </div>
              <Badge variant="blue" size="sm">
                ACCREDITED
              </Badge>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              <div className="bg-white p-3 rounded-xl border border-blue-100">
                <span className="text-slate-400 font-medium block text-[10px]">Specialization</span>
                <strong className="text-slate-900 font-bold">
                  {user.expertProfile.specialization}
                </strong>
              </div>
              <div className="bg-white p-3 rounded-xl border border-blue-100">
                <span className="text-slate-400 font-medium block text-[10px]">Qualification</span>
                <strong className="text-slate-900 font-bold">
                  {user.expertProfile.qualification}
                </strong>
              </div>
              <div className="bg-white p-3 rounded-xl border border-blue-100">
                <span className="text-slate-400 font-medium block text-[10px]">Institution</span>
                <strong className="text-slate-900 font-bold truncate block">
                  {user.expertProfile.institution}
                </strong>
              </div>
            </div>
          </div>
        )}

        {/* Form Actions Footer */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            disabled={!hasChanges || saving}
            onClick={handleReset}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-100 transition-all cursor-pointer disabled:opacity-40"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Edits</span>
          </button>

          <button
            type="submit"
            disabled={!hasChanges || saving}
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[#166534] hover:bg-[#14532d] text-white text-xs font-bold transition-all shadow-xs cursor-pointer disabled:opacity-40"
          >
            {saving ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Saving Profile...</span>
              </>
            ) : (
              <>
                <Save className="w-3.5 h-3.5" />
                <span>Save Profile Changes</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
