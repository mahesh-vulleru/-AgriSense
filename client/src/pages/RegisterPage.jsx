import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Sprout,
  Mail,
  Lock,
  User,
  Phone,
  MapPin,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle2,
  Tractor,
  GraduationCap,
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth.js';
import Button from '../components/common/Button.jsx';

export const RegisterPage = () => {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    location: '',
    role: 'farmer',
    password: '',
    confirmPassword: '',
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});

  // Compute password strength score (0 to 4)
  const calculatePasswordStrength = (pwd) => {
    if (!pwd) return { score: 0, label: '', color: 'bg-slate-200' };
    let score = 0;
    if (pwd.length >= 8) score += 1;
    if (/[A-Z]/.test(pwd) && /[a-z]/.test(pwd)) score += 1;
    if (/[0-9]/.test(pwd)) score += 1;
    if (/[^A-Za-z0-9]/.test(pwd)) score += 1;

    switch (score) {
      case 1:
        return { score: 1, label: 'Weak', color: 'bg-rose-500', textColor: 'text-rose-600', width: 'w-1/4' };
      case 2:
        return { score: 2, label: 'Fair', color: 'bg-amber-500', textColor: 'text-amber-600', width: 'w-2/4' };
      case 3:
        return { score: 3, label: 'Good', color: 'bg-emerald-500', textColor: 'text-emerald-600', width: 'w-3/4' };
      case 4:
        return { score: 4, label: 'Strong', color: 'bg-[#166534]', textColor: 'text-[#166534]', width: 'w-full' };
      default:
        return { score: 0, label: 'Too Short', color: 'bg-rose-400', textColor: 'text-rose-500', width: 'w-12' };
    }
  };

  const strength = calculatePasswordStrength(formData.password);

  const validate = () => {
    const errors = {};

    if (!formData.name.trim()) {
      errors.name = 'Full name is required';
    } else if (formData.name.trim().length < 2) {
      errors.name = 'Full name must be at least 2 characters';
    }

    if (!formData.email.trim()) {
      errors.email = 'Email address is required';
    } else if (
      !/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(
        formData.email.trim()
      )
    ) {
      errors.email = 'Please provide a valid email address';
    }

    if (formData.phone && formData.phone.trim().length > 0) {
      if (!/^[+]?[(]?[0-9]{1,4}[)]?[-\s./0-9]{6,15}$/.test(formData.phone.trim())) {
        errors.phone = 'Please enter a valid phone number format';
      }
    }

    if (!formData.password) {
      errors.password = 'Password is required';
    } else if (formData.password.length < 8) {
      errors.password = 'Password must be at least 8 characters long';
    } else if (
      !/[A-Za-z]/.test(formData.password) ||
      !/[0-9]/.test(formData.password)
    ) {
      errors.password = 'Password must contain at least one letter and one number';
    }

    if (!formData.confirmPassword) {
      errors.confirmPassword = 'Please confirm your password';
    } else if (formData.password !== formData.confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
    }

    // Role check: strictly enforce farmer or expert
    if (!['farmer', 'expert'].includes(formData.role)) {
      errors.role = 'Please select a valid role (Farmer or Expert)';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (fieldErrors[name]) {
      setFieldErrors((prev) => ({ ...prev, [name]: undefined }));
    }
    if (errorMessage) {
      setErrorMessage('');
    }
  };

  const handleRoleSelect = (selectedRole) => {
    if (selectedRole === 'farmer' || selectedRole === 'expert') {
      setFormData((prev) => ({ ...prev, role: selectedRole }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    if (!validate()) {
      return;
    }

    setLoading(true);

    try {
      await register({
        name: formData.name.trim(),
        email: formData.email.trim(),
        password: formData.password,
        phone: formData.phone.trim(),
        location: formData.location.trim(),
        role: formData.role,
      });

      // Redirect to dashboard upon successful registration
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setErrorMessage(
        err.message || 'Registration failed. Please check your information.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F7F9F5] p-4 sm:p-6 lg:p-8">
      {/* Centered Split-Screen Card (Matching Reference Design System) */}
      <div className="w-full max-w-4xl bg-white rounded-2xl sm:rounded-3xl shadow-xl border border-slate-200/90 overflow-hidden flex flex-col md:flex-row min-h-[640px]">
        {/* Left Side: Real Agriculture Seedling Growth Image */}
        <div className="relative md:w-5/12 min-h-[220px] md:min-h-full overflow-hidden bg-slate-900">
          <img
            src="/images/agriculture-register.jpg"
            alt="Young green seedling crop sprout growing in fertile agricultural soil"
            className="w-full h-full object-cover object-center transform transition-transform duration-700 hover:scale-105"
          />
          {/* Subtle gradient vignette */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent md:bg-gradient-to-r md:from-transparent md:to-black/15 pointer-events-none" />

          {/* Floating badge */}
          <div className="absolute bottom-4 left-4 z-10 hidden sm:flex items-center gap-2 rounded-full bg-white/20 backdrop-blur-md border border-white/30 px-3 py-1 text-xs font-semibold text-white">
            <Sprout className="h-4 w-4 text-[#86EFAC]" />
            <span>Join 1,200+ Smart Farmers</span>
          </div>
        </div>

        {/* Right Side: Clean White Registration Form */}
        <div className="flex flex-1 flex-col justify-center p-6 sm:p-8 lg:p-10 overflow-y-auto">
          {/* Top Brand Logo */}
          <div className="flex items-center gap-2.5 mb-5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[#166534] to-[#145A32] text-white shadow-xs">
              <Sprout className="h-5 w-5 text-[#22C55E]" />
            </div>
            <span className="text-2xl font-black tracking-tight text-[#145A32]">
              Agri<span className="text-[#22C55E]">Sense</span>
            </span>
          </div>

          {/* Heading */}
          <div className="mb-5">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#17251B] tracking-tight">
              Create Account
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Sign up to start smart farming
            </p>
          </div>

          {/* Error Banner */}
          {errorMessage && (
            <div className="mb-4 flex items-start gap-2.5 rounded-xl border border-rose-200 bg-rose-50 p-3 text-rose-800 text-xs sm:text-sm animate-fadeIn">
              <AlertCircle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-semibold">{errorMessage}</p>
                {errorMessage.includes('already exists') && (
                  <p className="text-xs text-rose-700 mt-1">
                    Already registered?{' '}
                    <Link to="/login" className="font-bold underline hover:text-rose-900">
                      Login here &rarr;
                    </Link>
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-3.5" noValidate>
            {/* Account Role Selector */}
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Account Role
              </label>
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => handleRoleSelect('farmer')}
                  className={`flex items-center gap-2.5 p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                    formData.role === 'farmer'
                      ? 'border-[#166534] bg-[#DCFCE7]/40 ring-2 ring-[#166534]/20'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <div
                    className={`flex h-7 w-7 items-center justify-center rounded-lg shrink-0 ${
                      formData.role === 'farmer'
                        ? 'bg-[#166534] text-white'
                        : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    <Tractor className="h-4 w-4" />
                  </div>
                  <div>
                    <span className="block text-xs font-bold text-[#17251B]">
                      Farmer
                    </span>
                    <span className="block text-[10px] text-slate-500 leading-none">
                      Grower / Owner
                    </span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => handleRoleSelect('expert')}
                  className={`flex items-center gap-2.5 p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                    formData.role === 'expert'
                      ? 'border-[#166534] bg-[#DCFCE7]/40 ring-2 ring-[#166534]/20'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <div
                    className={`flex h-7 w-7 items-center justify-center rounded-lg shrink-0 ${
                      formData.role === 'expert'
                        ? 'bg-[#166534] text-white'
                        : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    <GraduationCap className="h-4 w-4" />
                  </div>
                  <div>
                    <span className="block text-xs font-bold text-[#17251B]">
                      Expert
                    </span>
                    <span className="block text-[10px] text-slate-500 leading-none">
                      Agronomist
                    </span>
                  </div>
                </button>
              </div>
            </div>

            {/* Name & Email 2-column on sm */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Name */}
              <div>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-[#166534]">
                    <User className="h-4 w-4 text-[#166534]" />
                  </div>
                  <input
                    id="name"
                    name="name"
                    type="text"
                    autoComplete="name"
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="Full name"
                    className={`w-full rounded-xl border bg-white pl-9 pr-3 py-2.5 text-xs sm:text-sm text-[#17251B] placeholder-slate-400 transition-colors focus:outline-none focus:ring-2 focus:ring-[#166534] focus:border-[#166534] ${
                      fieldErrors.name ? 'border-rose-400 ring-rose-200' : 'border-slate-200 hover:border-slate-300'
                    }`}
                  />
                </div>
                {fieldErrors.name && (
                  <p className="mt-1 text-[11px] text-rose-600 font-medium">
                    {fieldErrors.name}
                  </p>
                )}
              </div>

              {/* Email */}
              <div>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-[#166534]">
                    <Mail className="h-4 w-4 text-[#166534]" />
                  </div>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="Email address"
                    className={`w-full rounded-xl border bg-white pl-9 pr-3 py-2.5 text-xs sm:text-sm text-[#17251B] placeholder-slate-400 transition-colors focus:outline-none focus:ring-2 focus:ring-[#166534] focus:border-[#166534] ${
                      fieldErrors.email ? 'border-rose-400 ring-rose-200' : 'border-slate-200 hover:border-slate-300'
                    }`}
                  />
                </div>
                {fieldErrors.email && (
                  <p className="mt-1 text-[11px] text-rose-600 font-medium">
                    {fieldErrors.email}
                  </p>
                )}
              </div>
            </div>

            {/* Phone & Location */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Phone */}
              <div>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-[#166534]">
                    <Phone className="h-4 w-4 text-[#166534]" />
                  </div>
                  <input
                    id="phone"
                    name="phone"
                    type="tel"
                    autoComplete="tel"
                    value={formData.phone}
                    onChange={handleChange}
                    placeholder="Phone number"
                    className="w-full rounded-xl border border-slate-200 hover:border-slate-300 bg-white pl-9 pr-3 py-2.5 text-xs sm:text-sm text-[#17251B] placeholder-slate-400 transition-colors focus:outline-none focus:ring-2 focus:ring-[#166534] focus:border-[#166534]"
                  />
                </div>
              </div>

              {/* Location */}
              <div>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-[#166534]">
                    <MapPin className="h-4 w-4 text-[#166534]" />
                  </div>
                  <input
                    id="location"
                    name="location"
                    type="text"
                    value={formData.location}
                    onChange={handleChange}
                    placeholder="Farm location / region"
                    className="w-full rounded-xl border border-slate-200 hover:border-slate-300 bg-white pl-9 pr-3 py-2.5 text-xs sm:text-sm text-[#17251B] placeholder-slate-400 transition-colors focus:outline-none focus:ring-2 focus:ring-[#166534] focus:border-[#166534]"
                  />
                </div>
              </div>
            </div>

            {/* Password */}
            <div>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-[#166534]">
                  <Lock className="h-4 w-4 text-[#166534]" />
                </div>
                <input
                  id="reg-password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="Password (min 8 chars, letter & number)"
                  className={`w-full rounded-xl border bg-white pl-9 pr-10 py-2.5 text-xs sm:text-sm text-[#17251B] placeholder-slate-400 transition-colors focus:outline-none focus:ring-2 focus:ring-[#166534] focus:border-[#166534] ${
                    fieldErrors.password ? 'border-rose-400 ring-rose-200' : 'border-slate-200 hover:border-slate-300'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600 cursor-pointer focus:outline-none"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>

              {/* Password Strength Meter */}
              {formData.password && (
                <div className="mt-1.5 space-y-1">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-500 font-medium">Strength:</span>
                    <span className={`font-bold ${strength.textColor}`}>{strength.label}</span>
                  </div>
                  <div className="h-1 w-full bg-slate-200 rounded-full overflow-hidden">
                    <div className={`h-full transition-all duration-300 ${strength.color} ${strength.width}`} />
                  </div>
                </div>
              )}

              {fieldErrors.password && (
                <p className="mt-1 text-[11px] text-rose-600 font-medium">
                  {fieldErrors.password}
                </p>
              )}
            </div>

            {/* Confirm Password */}
            <div>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-[#166534]">
                  <Lock className="h-4 w-4 text-[#166534]" />
                </div>
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  placeholder="Confirm password"
                  className={`w-full rounded-xl border bg-white pl-9 pr-10 py-2.5 text-xs sm:text-sm text-[#17251B] placeholder-slate-400 transition-colors focus:outline-none focus:ring-2 focus:ring-[#166534] focus:border-[#166534] ${
                    fieldErrors.confirmPassword
                      ? 'border-rose-400 ring-rose-200'
                      : formData.confirmPassword && formData.password === formData.confirmPassword
                      ? 'border-emerald-500 ring-emerald-200'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword((prev) => !prev)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600 cursor-pointer focus:outline-none"
                  aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                >
                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>

              {formData.confirmPassword && (
                <div className="mt-1 flex items-center gap-1.5 text-[11px]">
                  {formData.password === formData.confirmPassword ? (
                    <span className="text-emerald-600 flex items-center gap-1 font-medium">
                      <CheckCircle2 className="h-3 w-3" /> Passwords match
                    </span>
                  ) : (
                    <span className="text-rose-500 flex items-center gap-1 font-medium">
                      <AlertCircle className="h-3 w-3" /> Passwords do not match
                    </span>
                  )}
                </div>
              )}

              {fieldErrors.confirmPassword && (
                <p className="mt-1 text-[11px] text-rose-600 font-medium">
                  {fieldErrors.confirmPassword}
                </p>
              )}
            </div>

            {/* Submit Button */}
            <div className="pt-1.5">
              <Button
                type="submit"
                variant="primary"
                size="lg"
                loading={loading}
                className="w-full justify-center !py-3 text-sm font-bold !rounded-xl bg-[#166534] hover:bg-[#145A32] shadow-md transition-all cursor-pointer"
              >
                Register
              </Button>
            </div>
          </form>

          {/* Link back to login */}
          <div className="mt-5 text-center text-xs text-slate-500">
            <span>Already have an account? </span>
            <Link to="/login" className="font-bold text-[#166534] hover:text-[#145A32] hover:underline">
              Login
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;
