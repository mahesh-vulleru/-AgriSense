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
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Tractor,
  GraduationCap,
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth.js';
import Button from '../components/common/Button.jsx';
import Badge from '../components/common/Badge.jsx';

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

      // Redirect to dashboard upon successful registration & login
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
    <div className="min-h-screen flex flex-col lg:flex-row bg-[#F7F9F5]">
      {/* Left Branding Showcase */}
      <div className="relative lg:flex lg:w-5/12 flex-col justify-between overflow-hidden bg-gradient-to-br from-[#0F3F22] via-[#166534] to-[#145A32] p-8 sm:p-12 lg:p-14 text-white select-none">
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:24px_24px] pointer-events-none" />
        <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full bg-[#22C55E]/20 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-96 h-96 rounded-full bg-[#15803D]/30 blur-3xl pointer-events-none" />

        {/* Brand Top Header */}
        <div className="relative z-10 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3 group">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/10 backdrop-blur-md border border-white/20 shadow-sm group-hover:bg-white/20 transition-all">
              <Sprout className="h-6 w-6 text-[#22C55E]" />
            </div>
            <div>
              <span className="text-2xl font-black tracking-tight text-white">
                Agri<span className="text-[#22C55E]">Sense</span>
              </span>
              <p className="text-[10px] tracking-wider text-emerald-200/80 uppercase font-semibold">
                Smart Agriculture Cloud
              </p>
            </div>
          </Link>

          <Link
            to="/login"
            className="text-xs text-emerald-100/80 hover:text-white underline-offset-4 hover:underline transition-colors hidden sm:block"
          >
            Already a member? Sign in
          </Link>
        </div>

        {/* Showcase Information */}
        <div className="relative z-10 my-8 lg:my-0">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/10 backdrop-blur-md border border-white/15 px-3 py-1 text-xs font-semibold text-emerald-200 mb-6">
            <ShieldCheck className="h-4 w-4 text-[#22C55E]" />
            <span>Join the Precision Farming Community</span>
          </div>

          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white leading-tight">
            Start optimizing your crops with{' '}
            <span className="text-[#86EFAC]">data-driven accuracy.</span>
          </h2>

          <p className="mt-4 text-sm text-emerald-100/90 leading-relaxed font-normal">
            Create an account to gain automated irrigation recommendations,
            microclimate weather alerts, and soil nutrient health monitoring.
          </p>

          <div className="mt-8 space-y-3.5">
            <div className="flex items-start gap-3 text-xs text-emerald-100/90">
              <CheckCircle2 className="h-4 w-4 text-[#86EFAC] shrink-0 mt-0.5" />
              <span>Real-time IoT soil sensor telemetry streaming</span>
            </div>
            <div className="flex items-start gap-3 text-xs text-emerald-100/90">
              <CheckCircle2 className="h-4 w-4 text-[#86EFAC] shrink-0 mt-0.5" />
              <span>Precision irrigation and dynamic watering schedules</span>
            </div>
            <div className="flex items-start gap-3 text-xs text-emerald-100/90">
              <CheckCircle2 className="h-4 w-4 text-[#86EFAC] shrink-0 mt-0.5" />
              <span>Tailored crop health and disease prevention alerts</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="relative z-10 hidden lg:flex items-center justify-between text-xs text-emerald-200/70 border-t border-white/10 pt-6">
          <span>&copy; {new Date().getFullYear()} AgriSense Platform</span>
          <span>Enterprise Role-Based Cloud</span>
        </div>
      </div>

      {/* Right Registration Form */}
      <div className="flex flex-1 items-center justify-center p-6 sm:p-10 lg:p-14 overflow-y-auto">
        <div className="w-full max-w-xl">
          {/* Mobile Back Link */}
          <div className="mb-6 flex items-center justify-between lg:hidden">
            <Link
              to="/login"
              className="text-xs font-semibold text-[#166534] hover:underline"
            >
              &larr; Sign In
            </Link>
            <Badge size="sm" variant="forest">
              New Account
            </Badge>
          </div>

          {/* Form Header */}
          <div className="mb-6">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#17251B] tracking-tight">
              Create your AgriSense account
            </h1>
            <p className="mt-1.5 text-sm text-slate-500">
              Fill in your details below to activate your precision agriculture portal.
            </p>
          </div>

          {/* Error Banner */}
          {errorMessage && (
            <div className="mb-6 flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-rose-800 text-sm animate-fadeIn">
              <AlertCircle className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-semibold">{errorMessage}</p>
                {errorMessage.includes('already exists') && (
                  <p className="text-xs text-rose-700 mt-1">
                    Try logging in instead with this email address.{' '}
                    <Link
                      to="/login"
                      className="font-bold underline hover:text-rose-900"
                    >
                      Go to Login &rarr;
                    </Link>
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Registration Form */}
          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            {/* Account Role Selector */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#17251B] mb-2">
                Account Role
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => handleRoleSelect('farmer')}
                  className={`flex items-start gap-3 p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                    formData.role === 'farmer'
                      ? 'border-[#166534] bg-[#DCFCE7]/30 ring-2 ring-[#166534]/20'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <div
                    className={`flex h-9 w-9 items-center justify-center rounded-lg shrink-0 ${
                      formData.role === 'farmer'
                        ? 'bg-[#166534] text-white'
                        : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    <Tractor className="h-5 w-5" />
                  </div>
                  <div>
                    <span className="block text-xs font-bold text-[#17251B]">
                      Farmer
                    </span>
                    <span className="block text-[11px] text-slate-500 mt-0.5 leading-snug">
                      Farm owner or field manager
                    </span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => handleRoleSelect('expert')}
                  className={`flex items-start gap-3 p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                    formData.role === 'expert'
                      ? 'border-[#166534] bg-[#DCFCE7]/30 ring-2 ring-[#166534]/20'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <div
                    className={`flex h-9 w-9 items-center justify-center rounded-lg shrink-0 ${
                      formData.role === 'expert'
                        ? 'bg-[#166534] text-white'
                        : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    <GraduationCap className="h-5 w-5" />
                  </div>
                  <div>
                    <span className="block text-xs font-bold text-[#17251B]">
                      Expert / Agronomist
                    </span>
                    <span className="block text-[11px] text-slate-500 mt-0.5 leading-snug">
                      Soil or crop health specialist
                    </span>
                  </div>
                </button>
              </div>
            </div>

            {/* Name and Email 2-column on larger screens */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Full Name */}
              <div>
                <label
                  htmlFor="name"
                  className="block text-xs font-semibold uppercase tracking-wider text-[#17251B] mb-1.5"
                >
                  Full Name <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                    <User className="h-4 w-4" />
                  </div>
                  <input
                    id="name"
                    name="name"
                    type="text"
                    autoComplete="name"
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="e.g. John Doe"
                    className={`w-full rounded-xl border bg-white pl-10 pr-3 py-2.5 text-sm text-[#17251B] placeholder-slate-400 transition-colors focus:outline-none focus:ring-2 focus:ring-[#166534] focus:border-[#166534] ${
                      fieldErrors.name
                        ? 'border-rose-400 ring-rose-200'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  />
                </div>
                {fieldErrors.name && (
                  <p className="mt-1 text-xs text-rose-600 font-medium">
                    {fieldErrors.name}
                  </p>
                )}
              </div>

              {/* Email Address */}
              <div>
                <label
                  htmlFor="reg-email"
                  className="block text-xs font-semibold uppercase tracking-wider text-[#17251B] mb-1.5"
                >
                  Email Address <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                    <Mail className="h-4 w-4" />
                  </div>
                  <input
                    id="reg-email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="farmer@example.com"
                    className={`w-full rounded-xl border bg-white pl-10 pr-3 py-2.5 text-sm text-[#17251B] placeholder-slate-400 transition-colors focus:outline-none focus:ring-2 focus:ring-[#166534] focus:border-[#166534] ${
                      fieldErrors.email
                        ? 'border-rose-400 ring-rose-200'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  />
                </div>
                {fieldErrors.email && (
                  <p className="mt-1 text-xs text-rose-600 font-medium">
                    {fieldErrors.email}
                  </p>
                )}
              </div>
            </div>

            {/* Phone & Location 2-column */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Phone */}
              <div>
                <label
                  htmlFor="phone"
                  className="block text-xs font-semibold uppercase tracking-wider text-[#17251B] mb-1.5"
                >
                  Phone Number
                </label>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                    <Phone className="h-4 w-4" />
                  </div>
                  <input
                    id="phone"
                    name="phone"
                    type="tel"
                    autoComplete="tel"
                    value={formData.phone}
                    onChange={handleChange}
                    placeholder="+1 555-0199"
                    className={`w-full rounded-xl border bg-white pl-10 pr-3 py-2.5 text-sm text-[#17251B] placeholder-slate-400 transition-colors focus:outline-none focus:ring-2 focus:ring-[#166534] focus:border-[#166534] ${
                      fieldErrors.phone
                        ? 'border-rose-400 ring-rose-200'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  />
                </div>
                {fieldErrors.phone && (
                  <p className="mt-1 text-xs text-rose-600 font-medium">
                    {fieldErrors.phone}
                  </p>
                )}
              </div>

              {/* Location */}
              <div>
                <label
                  htmlFor="location"
                  className="block text-xs font-semibold uppercase tracking-wider text-[#17251B] mb-1.5"
                >
                  Farm / Region Location
                </label>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                    <MapPin className="h-4 w-4" />
                  </div>
                  <input
                    id="location"
                    name="location"
                    type="text"
                    value={formData.location}
                    onChange={handleChange}
                    placeholder="e.g. Green Valley, Sector A"
                    className="w-full rounded-xl border border-slate-200 hover:border-slate-300 bg-white pl-10 pr-3 py-2.5 text-sm text-[#17251B] placeholder-slate-400 transition-colors focus:outline-none focus:ring-2 focus:ring-[#166534] focus:border-[#166534]"
                  />
                </div>
              </div>
            </div>

            {/* Password */}
            <div>
              <label
                htmlFor="reg-password"
                className="block text-xs font-semibold uppercase tracking-wider text-[#17251B] mb-1.5"
              >
                Password <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                  <Lock className="h-4 w-4" />
                </div>
                <input
                  id="reg-password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="Minimum 8 chars with letter & number"
                  className={`w-full rounded-xl border bg-white pl-10 pr-11 py-2.5 text-sm text-[#17251B] placeholder-slate-400 transition-colors focus:outline-none focus:ring-2 focus:ring-[#166534] focus:border-[#166534] ${
                    fieldErrors.password
                      ? 'border-rose-400 ring-rose-200'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-slate-400 hover:text-slate-600 cursor-pointer focus:outline-none"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>

              {/* Password Strength Meter */}
              {formData.password && (
                <div className="mt-2 space-y-1.5 animate-fadeIn">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500 font-medium">Strength:</span>
                    <span className={`font-semibold ${strength.textColor}`}>
                      {strength.label}
                    </span>
                  </div>
                  <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-300 ${strength.color} ${strength.width}`}
                    />
                  </div>
                </div>
              )}

              {fieldErrors.password && (
                <p className="mt-1 text-xs text-rose-600 font-medium">
                  {fieldErrors.password}
                </p>
              )}
            </div>

            {/* Confirm Password */}
            <div>
              <label
                htmlFor="confirmPassword"
                className="block text-xs font-semibold uppercase tracking-wider text-[#17251B] mb-1.5"
              >
                Confirm Password <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                  <Lock className="h-4 w-4" />
                </div>
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  placeholder="Re-type your password"
                  className={`w-full rounded-xl border bg-white pl-10 pr-11 py-2.5 text-sm text-[#17251B] placeholder-slate-400 transition-colors focus:outline-none focus:ring-2 focus:ring-[#166534] focus:border-[#166534] ${
                    fieldErrors.confirmPassword
                      ? 'border-rose-400 ring-rose-200'
                      : formData.confirmPassword &&
                        formData.password === formData.confirmPassword
                      ? 'border-emerald-500 ring-emerald-200'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword((prev) => !prev)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-slate-400 hover:text-slate-600 cursor-pointer focus:outline-none"
                  aria-label={
                    showConfirmPassword ? 'Hide password' : 'Show password'
                  }
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>

              {/* Password Match Confirmation Status */}
              {formData.confirmPassword && (
                <div className="mt-1 flex items-center gap-1.5 text-xs">
                  {formData.password === formData.confirmPassword ? (
                    <span className="text-emerald-600 flex items-center gap-1 font-medium">
                      <CheckCircle2 className="h-3.5 w-3.5" /> Passwords match
                    </span>
                  ) : (
                    <span className="text-rose-500 flex items-center gap-1 font-medium">
                      <AlertCircle className="h-3.5 w-3.5" /> Passwords do not match
                    </span>
                  )}
                </div>
              )}

              {fieldErrors.confirmPassword && (
                <p className="mt-1 text-xs text-rose-600 font-medium">
                  {fieldErrors.confirmPassword}
                </p>
              )}
            </div>

            {/* Submit Register Button */}
            <div className="pt-2">
              <Button
                type="submit"
                variant="primary"
                size="lg"
                loading={loading}
                icon={ArrowRight}
                className="w-full justify-center !py-3 text-sm font-semibold shadow-md"
              >
                Create Account
              </Button>
            </div>
          </form>

          {/* Link back to login */}
          <div className="mt-6 border-t border-slate-200 pt-5 text-center">
            <p className="text-xs text-slate-500">
              Already have an account?{' '}
              <Link
                to="/login"
                className="font-bold text-[#166534] hover:underline"
              >
                Sign in here
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;
