import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import {
  Sprout,
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  ShieldCheck,
  Activity,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth.js';
import Button from '../components/common/Button.jsx';
import Badge from '../components/common/Badge.jsx';

export const LoginPage = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    rememberMe: true,
  });

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});

  // Destination route after login
  const from = location.state?.from?.pathname || '/dashboard';
  const registeredEmail = location.state?.registeredEmail;

  const validate = () => {
    const errors = {};
    if (!formData.email.trim()) {
      errors.email = 'Email address is required';
    } else if (
      !/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(
        formData.email.trim()
      )
    ) {
      errors.email = 'Please provide a valid email address';
    }

    if (!formData.password) {
      errors.password = 'Password is required';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
    // Clear field-specific error upon typing
    if (fieldErrors[name]) {
      setFieldErrors((prev) => ({ ...prev, [name]: undefined }));
    }
    if (errorMessage) {
      setErrorMessage('');
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
      await login(
        formData.email.trim(),
        formData.password,
        formData.rememberMe
      );
      navigate(from, { replace: true });
    } catch (err) {
      setErrorMessage(
        err.message || 'Invalid email or password. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-[#F7F9F5]">
      {/* Left Branding / Split Screen Section */}
      <div className="relative lg:flex lg:w-1/2 flex-col justify-between overflow-hidden bg-gradient-to-br from-[#0F3F22] via-[#166534] to-[#145A32] p-8 sm:p-12 lg:p-16 text-white select-none">
        {/* Subtle Background Pattern & Glows */}
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:24px_24px] pointer-events-none" />
        <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full bg-[#22C55E]/20 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-96 h-96 rounded-full bg-[#15803D]/30 blur-3xl pointer-events-none" />

        {/* Top Header Logo */}
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
                Intelligent Precision Platform
              </p>
            </div>
          </Link>

          <Link
            to="/"
            className="text-xs text-emerald-100/80 hover:text-white underline-offset-4 hover:underline transition-colors hidden sm:block"
          >
            Back to Home
          </Link>
        </div>

        {/* Middle Feature Highlights */}
        <div className="relative z-10 my-10 lg:my-0 max-w-xl">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/10 backdrop-blur-md border border-white/15 px-3 py-1 text-xs font-semibold text-emerald-200 mb-6">
            <ShieldCheck className="h-4 w-4 text-[#22C55E]" />
            <span>Secure Role-Based Agricultural Cloud</span>
          </div>

          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-white leading-tight">
            Cultivate intelligence. <br />
            <span className="text-[#86EFAC]">Maximize every harvest.</span>
          </h2>

          <p className="mt-5 text-sm sm:text-base text-emerald-100/90 leading-relaxed font-normal">
            Sign in to access real-time IoT soil telemetry, precision irrigation
            prescriptions, micro-climate predictive metrics, and crop health
            analytics.
          </p>

          {/* Floating Telemetry Preview Cards */}
          <div className="mt-8 grid grid-cols-2 gap-4">
            <div className="rounded-xl bg-white/10 backdrop-blur-md border border-white/15 p-4 shadow-lg">
              <div className="flex items-center justify-between text-emerald-200 text-xs">
                <span>Soil Moisture</span>
                <Activity className="h-4 w-4 text-[#86EFAC]" />
              </div>
              <p className="mt-2 text-2xl font-bold text-white">74.2%</p>
              <span className="text-[11px] text-[#86EFAC] font-medium">
                Optimal Field Status
              </span>
            </div>

            <div className="rounded-xl bg-white/10 backdrop-blur-md border border-white/15 p-4 shadow-lg">
              <div className="flex items-center justify-between text-emerald-200 text-xs">
                <span>Active Telemetry</span>
                <span className="h-2 w-2 rounded-full bg-[#22C55E] animate-pulse" />
              </div>
              <p className="mt-2 text-2xl font-bold text-white">24/7</p>
              <span className="text-[11px] text-[#86EFAC] font-medium">
                Live Sensor Sync
              </span>
            </div>
          </div>
        </div>

        {/* Footer info */}
        <div className="relative z-10 hidden lg:flex items-center justify-between text-xs text-emerald-200/70 border-t border-white/10 pt-6">
          <span>&copy; {new Date().getFullYear()} AgriSense Platform</span>
          <span>Enterprise IoT Security</span>
        </div>
      </div>

      {/* Right Login Form Section */}
      <div className="flex flex-1 items-center justify-center p-6 sm:p-10 lg:p-16">
        <div className="w-full max-w-md">
          {/* Mobile Back Link */}
          <div className="mb-6 flex items-center justify-between lg:hidden">
            <Link
              to="/"
              className="text-xs font-semibold text-[#166534] hover:underline"
            >
              &larr; Back to Home
            </Link>
            <Badge size="sm" variant="forest">
              AgriSense
            </Badge>
          </div>

          {/* Form Header */}
          <div className="mb-8">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#17251B] tracking-tight">
              Welcome back
            </h1>
            <p className="mt-2 text-sm text-slate-500">
              Sign in with your email and password to access your farm dashboard.
            </p>
          </div>

          {/* Success Banner if redirected from registration */}
          {registeredEmail && (
            <div className="mb-6 flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-800 text-sm animate-fadeIn">
              <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-emerald-900">
                  Registration Successful!
                </p>
                <p className="text-xs text-emerald-700 mt-0.5">
                  Your account for {registeredEmail} is ready. Sign in below.
                </p>
              </div>
            </div>
          )}

          {/* Error Banner */}
          {errorMessage && (
            <div className="mb-6 flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-rose-800 text-sm animate-fadeIn">
              <AlertCircle className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-medium">{errorMessage}</p>
              </div>
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-5" noValidate>
            {/* Email Field */}
            <div>
              <label
                htmlFor="email"
                className="block text-xs font-semibold uppercase tracking-wider text-[#17251B] mb-1.5"
              >
                Email Address
              </label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                  <Mail className="h-4 w-4" />
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="farmer@agrisense.com"
                  className={`w-full rounded-xl border bg-white pl-10 pr-4 py-2.5 text-sm text-[#17251B] placeholder-slate-400 transition-colors focus:outline-none focus:ring-2 focus:ring-[#166534] focus:border-[#166534] ${
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

            {/* Password Field */}
            <div>
              <label
                htmlFor="password"
                className="block text-xs font-semibold uppercase tracking-wider text-[#17251B] mb-1.5"
              >
                Password
              </label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                  <Lock className="h-4 w-4" />
                </div>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="Enter your account password"
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
              {fieldErrors.password && (
                <p className="mt-1 text-xs text-rose-600 font-medium">
                  {fieldErrors.password}
                </p>
              )}
            </div>

            {/* Remember Me Checkbox */}
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  name="rememberMe"
                  checked={formData.rememberMe}
                  onChange={handleChange}
                  className="h-4 w-4 rounded border-slate-300 text-[#166534] focus:ring-[#166534] cursor-pointer"
                />
                <span className="text-xs text-slate-600 font-medium">
                  Remember me on this browser
                </span>
              </label>
            </div>

            {/* Submit Sign In Button */}
            <Button
              type="submit"
              variant="primary"
              size="lg"
              loading={loading}
              icon={ArrowRight}
              className="w-full justify-center !py-3 text-sm font-semibold shadow-md"
            >
              Sign In
            </Button>
          </form>

          {/* Bottom Divider & Create Account Button */}
          <div className="mt-8 border-t border-slate-200 pt-6 text-center">
            <p className="text-xs text-slate-500 mb-3">
              Don't have an AgriSense account yet?
            </p>
            <Link to="/register">
              <Button
                variant="outline"
                size="md"
                className="w-full justify-center !py-2.5 font-semibold text-[#166534] border-[#166534]/30 hover:bg-[#DCFCE7]/40"
              >
                Create Account
              </Button>
            </Link>
          </div>

          {/* Quick Notice for Role Access */}
          <div className="mt-6 p-3 rounded-xl bg-slate-100/70 border border-slate-200/80 text-[11px] text-slate-500 leading-relaxed text-center">
            Authorized roles: <strong className="text-slate-700">Farmers</strong>,{' '}
            <strong className="text-slate-700">Agricultural Experts</strong>, and{' '}
            <strong className="text-slate-700">Administrators</strong>.
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;

