import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import {
  Sprout,
  Mail,
  Lock,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle2,
  Info,
  X,
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth.js';
import Button from '../components/common/Button.jsx';

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
  const [showForgotModal, setShowForgotModal] = useState(false);

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
    <div className="min-h-screen flex items-center justify-center bg-[#F7F9F5] p-4 sm:p-6 lg:p-8">
      {/* Centered Split-Screen Card (Matching Reference 02) */}
      <div className="w-full max-w-4xl bg-white rounded-2xl sm:rounded-3xl shadow-xl border border-slate-200/90 overflow-hidden flex flex-col md:flex-row min-h-[580px]">
        {/* Left Side: Macro Plant Leaves with Water Droplets Image */}
        <div className="relative md:w-1/2 min-h-[220px] md:min-h-full overflow-hidden bg-slate-900">
          <img
            src="/images/agriculture-login.jpg"
            alt="Fresh green leaves with water droplets close-up macro photography"
            className="w-full h-full object-cover object-center transform transition-transform duration-700 hover:scale-105"
          />
          {/* Subtle gradient vignette to blend beautifully */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent md:bg-gradient-to-r md:from-transparent md:to-black/10 pointer-events-none" />

          {/* Floating badge for agriculture branding */}
          <div className="absolute bottom-4 left-4 z-10 hidden sm:flex items-center gap-2 rounded-full bg-white/20 backdrop-blur-md border border-white/30 px-3 py-1 text-xs font-semibold text-white">
            <Sprout className="h-4 w-4 text-[#86EFAC]" />
            <span>Precision Ag Cloud</span>
          </div>
        </div>

        {/* Right Side: Clean White Login Form */}
        <div className="flex flex-1 flex-col justify-center p-6 sm:p-10 lg:p-12">
          {/* Top Brand Logo */}
          <div className="flex items-center gap-2.5 mb-6">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[#166534] to-[#145A32] text-white shadow-xs">
              <Sprout className="h-5 w-5 text-[#22C55E]" />
            </div>
            <span className="text-2xl font-black tracking-tight text-[#145A32]">
              Agri<span className="text-[#22C55E]">Sense</span>
            </span>
          </div>

          {/* Welcome Heading */}
          <div className="mb-6">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#17251B] tracking-tight">
              Welcome Back
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Login to your account
            </p>
          </div>

          {/* Success Banner if redirected from registration */}
          {registeredEmail && (
            <div className="mb-5 flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-3.5 text-emerald-800 text-xs sm:text-sm animate-fadeIn">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Registration Successful!</p>
                <p className="text-xs text-emerald-700 mt-0.5">
                  Sign in with your email: {registeredEmail}
                </p>
              </div>
            </div>
          )}

          {/* Error Banner */}
          {errorMessage && (
            <div className="mb-5 flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 p-3.5 text-rose-800 text-xs sm:text-sm animate-fadeIn">
              <AlertCircle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
              <p className="font-medium flex-1">{errorMessage}</p>
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            {/* Email Field */}
            <div>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-[#166534]">
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
                  className={`w-full rounded-xl border bg-white pl-10 pr-4 py-3 text-sm text-[#17251B] placeholder-slate-400 transition-colors focus:outline-none focus:ring-2 focus:ring-[#166534] focus:border-[#166534] ${
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
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-[#166534]">
                  <Lock className="h-4 w-4 text-[#166534]" />
                </div>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="Password"
                  className={`w-full rounded-xl border bg-white pl-10 pr-11 py-3 text-sm text-[#17251B] placeholder-slate-400 transition-colors focus:outline-none focus:ring-2 focus:ring-[#166534] focus:border-[#166534] ${
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

            {/* Remember Me & Forgot Password Row */}
            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  name="rememberMe"
                  checked={formData.rememberMe}
                  onChange={handleChange}
                  className="h-4 w-4 rounded border-slate-300 text-[#166534] focus:ring-[#166534] cursor-pointer"
                />
                <span className="text-xs text-slate-600 font-medium">
                  Remember me
                </span>
              </label>

              <button
                type="button"
                onClick={() => setShowForgotModal(true)}
                className="text-xs font-semibold text-[#166534] hover:text-[#145A32] hover:underline cursor-pointer"
              >
                Forgot password?
              </button>
            </div>

            {/* Solid Green Login Button */}
            <div className="pt-2">
              <Button
                type="submit"
                variant="primary"
                size="lg"
                loading={loading}
                className="w-full justify-center !py-3 text-sm font-bold !rounded-xl bg-[#166534] hover:bg-[#145A32] shadow-md transition-all cursor-pointer"
              >
                Login
              </Button>
            </div>
          </form>

          {/* Bottom Footer: Register Link */}
          <div className="mt-6 text-center text-xs text-slate-500">
            <span>Don't have an account? </span>
            <Link
              to="/register"
              className="font-bold text-[#166534] hover:text-[#145A32] hover:underline"
            >
              Register
            </Link>
          </div>
        </div>
      </div>

      {/* Functional Forgot Password Modal */}
      {showForgotModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl border border-slate-200 animate-fadeIn">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2 text-[#145A32] font-bold text-sm">
                <Info className="h-4 w-4 text-[#166534]" />
                <span>Password Recovery</span>
              </div>
              <button
                type="button"
                onClick={() => setShowForgotModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="py-4 text-xs text-slate-600 leading-relaxed">
              <p>
                For security reasons in the current AgriSense phase, password resets
                are administered directly by your farm organization manager or via the secure CLI command.
              </p>
              <div className="mt-3 p-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-700">
                Please contact your farm administrator or email{' '}
                <strong className="text-[#166534]">support@agrisense.io</strong> to request a temporary reset token.
              </div>
            </div>
            <div className="pt-2">
              <Button
                variant="primary"
                size="sm"
                onClick={() => setShowForgotModal(false)}
                className="w-full justify-center !rounded-xl"
              >
                Got it
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LoginPage;
