import { Link } from 'react-router-dom';
import {
  Sprout,
  Activity,
  Droplets,
  CloudSun,
  ShieldCheck,
  Cpu,
  ArrowRight,
  Server,
  LogIn,
  UserPlus,
} from 'lucide-react';
import Button from '../components/common/Button.jsx';
import Badge from '../components/common/Badge.jsx';
import { useHealth } from '../hooks/useHealth.js';
import { useAuth } from '../hooks/useAuth.js';

export const LandingPage = () => {
  const { status } = useHealth();
  const { user, isAuthenticated } = useAuth();

  return (
    <div className="min-h-screen bg-[#F7F9F5] text-[#17251B]">
      {/* Top Navigation */}
      <header className="sticky top-0 z-40 w-full border-b border-slate-200/80 bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#166534] to-[#145A32] text-white shadow-xs">
              <Sprout className="h-6 w-6 text-[#22C55E]" />
            </div>
            <span className="text-xl font-bold tracking-tight text-[#145A32]">
              Agri<span className="text-[#22C55E]">Sense</span>
            </span>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 mr-2">
              <span className="text-xs text-slate-500">API Health:</span>
              <Badge
                size="sm"
                dot
                variant={status === 'connected' ? 'success' : status === 'loading' ? 'warning' : 'danger'}
              >
                {status === 'connected' ? 'Online' : status === 'loading' ? 'Checking...' : 'Offline'}
              </Badge>
            </div>

            {isAuthenticated ? (
              <div className="flex items-center gap-3">
                <span className="text-xs font-semibold text-slate-700 hidden md:inline">
                  Hi, {user?.name}
                </span>
                <Link to="/dashboard">
                  <Button variant="primary" size="sm" icon={ArrowRight}>
                    Enter Dashboard
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link to="/login">
                  <Button variant="outline" size="sm" icon={LogIn}>
                    Sign In
                  </Button>
                </Link>
                <Link to="/register">
                  <Button variant="primary" size="sm" icon={UserPlus}>
                    Register
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-12 pb-20 sm:pt-20 sm:pb-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <div className="inline-flex items-center gap-2 rounded-full bg-[#DCFCE7] px-3.5 py-1 text-xs font-semibold text-[#145A32] mb-6">
              <Sprout className="h-4 w-4 text-[#166534]" />
              <span>Full-Stack Precision Agriculture Cloud</span>
            </div>

            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-[#17251B] leading-tight">
              Intelligent Agriculture for <span className="text-[#166534]">Sustainable High Yields</span>
            </h1>

            <p className="mt-6 text-base sm:text-lg text-slate-600 leading-relaxed">
              Empowering farmers and agronomists with real-time IoT soil telemetry, precision irrigation advisory, micro-climate forecasts, and AI-powered crop analytics.
            </p>

            <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
              {isAuthenticated ? (
                <Link to="/dashboard">
                  <Button variant="primary" size="lg" icon={ArrowRight}>
                    Launch Farmer Dashboard
                  </Button>
                </Link>
              ) : (
                <>
                  <Link to="/register">
                    <Button variant="primary" size="lg" icon={ArrowRight}>
                      Create Farmer Account
                    </Button>
                  </Link>
                  <Link to="/login">
                    <Button variant="outline" size="lg" icon={LogIn}>
                      Sign In to Platform
                    </Button>
                  </Link>
                </>
              )}
              <a
                href="http://localhost:5000/api/health"
                target="_blank"
                rel="noreferrer"
              >
                <Button variant="outline" size="lg" icon={Server}>
                  Test GET /api/health
                </Button>
              </a>
            </div>

            {/* Live Stack Badge */}
            <div className="mt-12 inline-flex flex-wrap items-center justify-center gap-3 p-2 rounded-xl bg-white border border-slate-200/80 shadow-xs text-xs text-slate-600">
              <span className="font-semibold text-slate-900 px-2">Stack Foundation:</span>
              <span className="px-2.5 py-1 rounded-md bg-slate-100 font-medium text-slate-700">React 19 &bull; Vite</span>
              <span className="px-2.5 py-1 rounded-md bg-slate-100 font-medium text-slate-700">JWT &amp; bcrypt Auth</span>
              <span className="px-2.5 py-1 rounded-md bg-slate-100 font-medium text-slate-700">Node.js Express</span>
              <span className="px-2.5 py-1 rounded-md bg-[#DCFCE7] font-semibold text-[#145A32]">MongoDB (Atlas)</span>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Highlights Grid */}
      <section className="bg-white py-16 border-y border-slate-200/80">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold text-[#17251B]">
              Integrated Agro-Technology Modules
            </h2>
            <p className="mt-2 text-sm text-slate-500">
              Built on a decoupled, modular full-stack architecture ready for next-phase expansion.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="p-6 rounded-xl border border-slate-200/80 bg-[#F7F9F5]/50 hover:bg-white hover:border-[#166534] transition-all">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#DCFCE7] text-[#166534] mb-4">
                <Activity className="h-6 w-6" />
              </div>
              <h3 className="text-base font-bold text-[#17251B]">Real-Time IoT Telemetry</h3>
              <p className="mt-2 text-xs sm:text-sm text-slate-600 leading-relaxed">
                24/7 root zone soil moisture, temperature, and electrical conductivity monitoring streamed from edge sensors.
              </p>
            </div>

            <div className="p-6 rounded-xl border border-slate-200/80 bg-[#F7F9F5]/50 hover:bg-white hover:border-[#166534] transition-all">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 mb-4">
                <Droplets className="h-6 w-6" />
              </div>
              <h3 className="text-base font-bold text-[#17251B]">Precision Irrigation</h3>
              <p className="mt-2 text-xs sm:text-sm text-slate-600 leading-relaxed">
                Dynamic automated water scheduling tailored to crop water requirements, evapo-transpiration and rain forecasts.
              </p>
            </div>

            <div className="p-6 rounded-xl border border-slate-200/80 bg-[#F7F9F5]/50 hover:bg-white hover:border-[#166534] transition-all">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-sky-50 text-sky-600 mb-4">
                <CloudSun className="h-6 w-6" />
              </div>
              <h3 className="text-base font-bold text-[#17251B]">Micro-Climate Intelligence</h3>
              <p className="mt-2 text-xs sm:text-sm text-slate-600 leading-relaxed">
                Hyper-local agro-meteorology data to anticipate frost warnings, heat waves, and humidity-driven pest outbreaks.
              </p>
            </div>

            <div className="p-6 rounded-xl border border-slate-200/80 bg-[#F7F9F5]/50 hover:bg-white hover:border-[#166534] transition-all">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-50 text-amber-600 mb-4">
                <Sprout className="h-6 w-6" />
              </div>
              <h3 className="text-base font-bold text-[#17251B]">Soil Chemistry & NPK</h3>
              <p className="mt-2 text-xs sm:text-sm text-slate-600 leading-relaxed">
                Precision tracking of Nitrogen, Phosphorus, Potassium and pH balances to optimize organic or synthetic fertilization.
              </p>
            </div>

            <div className="p-6 rounded-xl border border-slate-200/80 bg-[#F7F9F5]/50 hover:bg-white hover:border-[#166534] transition-all">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-purple-50 text-purple-600 mb-4">
                <Cpu className="h-6 w-6" />
              </div>
              <h3 className="text-base font-bold text-[#17251B]">AI Disease Diagnostics</h3>
              <p className="mt-2 text-xs sm:text-sm text-slate-600 leading-relaxed">
                Computer vision leaf symptom scanning for early detection of blight, rust, and insect infestations.
              </p>
            </div>

            <div className="p-6 rounded-xl border border-slate-200/80 bg-[#F7F9F5]/50 hover:bg-white hover:border-[#166534] transition-all">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-rose-50 text-rose-600 mb-4">
                <ShieldCheck className="h-6 w-6" />
              </div>
              <h3 className="text-base font-bold text-[#17251B]">Centralized Farm Security</h3>
              <p className="mt-2 text-xs sm:text-sm text-slate-600 leading-relaxed">
                Role-based access control protecting telemetry data, irrigation actuators, and historical crop yields.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-8">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#166534] text-white">
              <Sprout className="h-4 w-4 text-[#22C55E]" />
            </div>
            <span className="text-sm font-bold text-[#145A32]">AgriSense</span>
            <span className="text-xs text-slate-400">&bull; Intelligent Agriculture Platform</span>
          </div>
          <p className="text-xs text-slate-500">
            &copy; {new Date().getFullYear()} AgriSense. Authentication &amp; RBAC module operational.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
