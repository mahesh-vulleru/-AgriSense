import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Sprout,
  Activity,
  Droplets,
  CloudSun,
  ShieldCheck,
  Cpu,
  ArrowRight,
  Sparkles,
  Server,
  Layers,
  ScanEye,
  Menu,
  X,
  Phone,
  Mail,
  MapPin,
  CheckCircle2,
} from 'lucide-react';
import Button from '../components/common/Button.jsx';
import Badge from '../components/common/Badge.jsx';
import { useHealth } from '../hooks/useHealth.js';
import { useAuth } from '../hooks/useAuth.js';

export const LandingPage = () => {
  const { status } = useHealth();
  const { user, isAuthenticated } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeFeature, setActiveFeature] = useState(0);

  const featurePills = [
    {
      name: 'Crop Monitoring',
      icon: Sprout,
      desc: 'Real-time telemetry tracking crop vegetative indexes, growth phases, and canopy coverage.',
    },
    {
      name: 'Soil Analysis',
      icon: Layers,
      desc: 'Continuous measurement of soil moisture, temperature, pH balances, and NPK nutrient profiles.',
    },
    {
      name: 'Irrigation Guide',
      icon: Droplets,
      desc: 'Precision watering recommendations and dynamic scheduling based on evapo-transpiration.',
    },
    {
      name: 'Weather Alerts',
      icon: CloudSun,
      desc: 'Hyper-local agro-meteorology forecasts with early warnings for frost, heat waves, and storms.',
    },
    {
      name: 'Disease Detection',
      icon: ScanEye,
      desc: 'AI computer vision diagnostics for leaf symptom analysis, fungal rust, and pest identification.',
    },
  ];

  return (
    <div className="min-h-screen bg-[#F7F9F5] text-[#17251B] selection:bg-[#DCFCE7] selection:text-[#145A32]">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-50 w-full border-b border-slate-200/80 bg-white/95 backdrop-blur-md">
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          {/* Logo & Brand */}
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#166534] to-[#145A32] text-white shadow-xs group-hover:scale-105 transition-transform">
              <Sprout className="h-6 w-6 text-[#22C55E]" />
            </div>
            <span className="text-2xl font-black tracking-tight text-[#145A32]">
              Agri<span className="text-[#22C55E]">Sense</span>
            </span>
          </Link>

          {/* Desktop Nav Links */}
          <nav className="hidden md:flex items-center gap-8 text-sm font-semibold text-slate-700">
            <a href="#home" className="hover:text-[#166534] transition-colors">
              Home
            </a>
            <a href="#features" className="hover:text-[#166534] transition-colors">
              Features
            </a>
            <a href="#about" className="hover:text-[#166534] transition-colors">
              About
            </a>
            <a href="#contact" className="hover:text-[#166534] transition-colors">
              Contact
            </a>
          </nav>

          {/* Top Right Action Buttons */}
          <div className="hidden sm:flex items-center gap-3">
            {/* Backend Health Pill */}
            <div className="flex items-center gap-1.5 mr-1">
              <Badge
                size="sm"
                dot
                variant={status === 'connected' ? 'success' : status === 'loading' ? 'warning' : 'danger'}
                className="text-[11px]"
              >
                {status === 'connected' ? 'API Online' : status === 'loading' ? 'Connecting...' : 'API Offline'}
              </Badge>
            </div>

            {isAuthenticated ? (
              <div className="flex items-center gap-3">
                <span className="text-xs font-semibold text-slate-700 hidden lg:inline">
                  Hi, {user?.name}
                </span>
                <Link to="/dashboard">
                  <Button
                    variant="primary"
                    size="sm"
                    icon={ArrowRight}
                    className="!rounded-full px-5 py-2 font-semibold shadow-xs"
                  >
                    Dashboard
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <Link to="/login">
                  <button
                    type="button"
                    className="rounded-full border border-slate-300/80 bg-white px-5 py-2 text-xs font-bold text-slate-800 shadow-xs hover:bg-slate-50 hover:border-slate-400 transition-all cursor-pointer"
                  >
                    Login
                  </button>
                </Link>
                <Link to="/register">
                  <button
                    type="button"
                    className="rounded-full bg-[#166534] px-5 py-2 text-xs font-bold text-white shadow-sm hover:bg-[#145A32] transition-all cursor-pointer hover:shadow-md"
                  >
                    Get Started
                  </button>
                </Link>
              </div>
            )}
          </div>

          {/* Mobile menu trigger */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 md:hidden"
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>

        {/* Mobile dropdown menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-slate-200 bg-white px-4 py-4 space-y-3">
            <nav className="flex flex-col space-y-2 text-sm font-semibold text-slate-700">
              <a
                href="#home"
                onClick={() => setMobileMenuOpen(false)}
                className="py-1.5 hover:text-[#166534]"
              >
                Home
              </a>
              <a
                href="#features"
                onClick={() => setMobileMenuOpen(false)}
                className="py-1.5 hover:text-[#166534]"
              >
                Features
              </a>
              <a
                href="#about"
                onClick={() => setMobileMenuOpen(false)}
                className="py-1.5 hover:text-[#166534]"
              >
                About
              </a>
              <a
                href="#contact"
                onClick={() => setMobileMenuOpen(false)}
                className="py-1.5 hover:text-[#166534]"
              >
                Contact
              </a>
            </nav>
            <div className="pt-2 border-t border-slate-100 flex flex-col gap-2">
              {isAuthenticated ? (
                <Link to="/dashboard" onClick={() => setMobileMenuOpen(false)}>
                  <Button variant="primary" size="md" className="w-full justify-center !rounded-full">
                    Enter Dashboard
                  </Button>
                </Link>
              ) : (
                <>
                  <Link to="/login" onClick={() => setMobileMenuOpen(false)}>
                    <Button variant="outline" size="md" className="w-full justify-center !rounded-full">
                      Login
                    </Button>
                  </Link>
                  <Link to="/register" onClick={() => setMobileMenuOpen(false)}>
                    <Button variant="primary" size="md" className="w-full justify-center !rounded-full">
                      Get Started
                    </Button>
                  </Link>
                </>
              )}
            </div>
          </div>
        )}
      </header>

      {/* Hero Section Container (Matching Reference 01) */}
      <section id="home" className="relative px-3 sm:px-6 lg:px-8 pt-4 pb-12 sm:pt-6 sm:pb-16">
        <div className="mx-auto max-w-7xl">
          {/* Main Hero Card Container */}
          <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl border border-slate-200/80 shadow-xl bg-white min-h-[540px] sm:min-h-[580px] lg:min-h-[620px] flex flex-col justify-between">
            {/* Real Agricultural Background Image */}
            <div className="absolute inset-0 z-0">
              <img
                src="/images/agriculture-hero.jpg"
                alt="Farmer standing in green agricultural crop field using smart tablet"
                className="w-full h-full object-cover object-right md:object-center transform scale-[1.01] transition-transform duration-700 hover:scale-105"
              />
              {/* Refined gradient overlay for crystal clear text readability on left */}
              <div className="absolute inset-0 bg-gradient-to-r from-white via-white/85 to-transparent sm:via-white/80 md:w-3/4 lg:w-3/5" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent pointer-events-none" />
            </div>

            {/* Flying Drone Graphic Overlay (Inspired by Reference) */}
            <div className="absolute right-12 top-10 sm:right-24 sm:top-14 hidden md:flex flex-col items-center z-10 pointer-events-none select-none">
              <div className="relative animate-bounce duration-1000">
                <div className="w-24 h-12 relative flex items-center justify-center">
                  {/* Central Drone Body */}
                  <div className="w-8 h-4 bg-slate-900 rounded-lg shadow-lg border border-slate-700 relative z-10 flex items-center justify-center">
                    <span className="w-1.5 h-1.5 bg-[#22C55E] rounded-full animate-ping" />
                  </div>
                  {/* Drone Arms & Rotors */}
                  <div className="absolute w-20 h-0.5 bg-slate-800" />
                  <div className="absolute w-0.5 h-8 bg-slate-800 transform rotate-45" />
                  <div className="absolute -left-1 -top-1 w-6 h-1 bg-slate-600 rounded-full animate-pulse" />
                  <div className="absolute -right-1 -top-1 w-6 h-1 bg-slate-600 rounded-full animate-pulse" />
                  <div className="absolute -left-1 -bottom-1 w-6 h-1 bg-slate-600 rounded-full animate-pulse" />
                  <div className="absolute -right-1 -bottom-1 w-6 h-1 bg-slate-600 rounded-full animate-pulse" />
                </div>
                <div className="mt-1 px-2 py-0.5 rounded-full bg-slate-900/80 backdrop-blur-xs text-[9px] font-semibold text-emerald-300 border border-slate-700/60 shadow-xs">
                  Field Drone Active
                </div>
              </div>
            </div>

            {/* Hero Left Content */}
            <div className="relative z-10 px-6 py-10 sm:px-10 sm:py-14 lg:px-14 lg:py-16 max-w-xl lg:max-w-2xl">
              {/* Badge: AI-Powered Agriculture */}
              <div className="inline-flex items-center gap-2 rounded-full bg-[#DCFCE7] border border-[#22C55E]/30 px-3.5 py-1.5 text-xs font-bold text-[#145A32] mb-6 shadow-xs">
                <Sparkles className="h-4 w-4 text-[#166534]" />
                <span>AI-Powered Agriculture</span>
              </div>

              {/* Main Headline */}
              <h1 className="text-3xl sm:text-5xl lg:text-[56px] font-black tracking-tight text-[#145A32] leading-[1.12]">
                Smarter Farming <br />
                <span className="text-[#17251B]">Higher Yields</span>
              </h1>

              {/* Description */}
              <p className="mt-5 text-sm sm:text-base text-slate-700 font-medium leading-relaxed max-w-lg">
                Monitor crops, analyze soil, get irrigation recommendations, track
                weather, and detect crop diseases with AI.
              </p>

              {/* Action Buttons */}
              <div className="mt-8 flex flex-wrap items-center gap-3.5">
                <Link to={isAuthenticated ? '/dashboard' : '/register'}>
                  <button
                    type="button"
                    className="inline-flex items-center gap-2 rounded-full bg-[#166534] hover:bg-[#145A32] text-white px-6 py-3 text-sm font-bold shadow-md hover:shadow-lg transition-all transform hover:-translate-y-0.5 cursor-pointer"
                  >
                    <span>Get Started</span>
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </Link>

                <a href="#features">
                  <button
                    type="button"
                    className="inline-flex items-center rounded-full bg-white/95 hover:bg-white text-[#17251B] border border-slate-300/80 px-6 py-3 text-sm font-bold shadow-xs hover:shadow-sm transition-all cursor-pointer"
                  >
                    Learn More
                  </button>
                </a>
              </div>
            </div>

            {/* Bottom Floating Feature Dock / Strip (Matching Reference 01) */}
            <div className="relative z-10 w-full p-3 sm:p-5">
              <div className="rounded-xl sm:rounded-2xl bg-white/95 backdrop-blur-md border border-slate-200/90 shadow-lg p-2 sm:p-3">
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-3">
                  {featurePills.map((feature, idx) => {
                    const Icon = feature.icon;
                    const isActive = activeFeature === idx;

                    return (
                      <button
                        key={feature.name}
                        type="button"
                        onClick={() => setActiveFeature(idx)}
                        className={`group flex items-center justify-center gap-2.5 px-3 py-3 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                          isActive
                            ? 'bg-[#DCFCE7]/70 border-[#166534] text-[#145A32] shadow-xs'
                            : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-[#F7F9F5] text-slate-700'
                        }`}
                      >
                        <div
                          className={`flex h-7 w-7 items-center justify-center rounded-lg shrink-0 transition-colors ${
                            isActive
                              ? 'bg-[#166534] text-white'
                              : 'bg-emerald-50 text-[#166534] group-hover:bg-[#DCFCE7]'
                          }`}
                        >
                          <Icon className="h-4 w-4" />
                        </div>
                        <span className="truncate">{feature.name}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Active Feature Live Description Pill */}
                <div className="mt-2.5 pt-2 border-t border-slate-100 px-3 flex flex-col sm:flex-row sm:items-center justify-between text-xs text-slate-600 gap-1.5">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-[#145A32]">
                      {featurePills[activeFeature].name}:
                    </span>
                    <span className="text-slate-600">
                      {featurePills[activeFeature].desc}
                    </span>
                  </div>
                  <Link
                    to={isAuthenticated ? '/dashboard' : '/login'}
                    className="text-[#166534] font-semibold hover:underline shrink-0 flex items-center gap-1"
                  >
                    <span>View in Dashboard</span>
                    <ArrowRight className="h-3 w-3" />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Deep Dive Grid Section */}
      <section id="features" className="py-16 sm:py-24 bg-white border-y border-slate-200/80">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-14">
            <div className="inline-flex items-center gap-2 rounded-full bg-[#DCFCE7] px-3.5 py-1 text-xs font-bold text-[#145A32] mb-3">
              <Cpu className="h-3.5 w-3.5 text-[#166534]" />
              <span>Full-Stack Precision IoT Modules</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-[#17251B] tracking-tight">
              Built specifically for modern growers
            </h2>
            <p className="mt-3 text-base text-slate-600">
              From continuous soil root telemetry to predictive microclimate models,
              AgriSense delivers the end-to-end intelligence you need for optimal crop yields.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
            {/* Card 1 */}
            <div className="p-7 rounded-2xl border border-slate-200/90 bg-[#F7F9F5]/60 hover:bg-white hover:border-[#166534] hover:shadow-md transition-all group">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#DCFCE7] text-[#166534] mb-5 group-hover:scale-110 transition-transform">
                <Sprout className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-bold text-[#17251B]">Continuous Crop Monitoring</h3>
              <p className="mt-2 text-sm text-slate-600 leading-relaxed">
                Stream sensor telemetry 24/7 across multiple sectors. Track growth stages,
                soil moisture saturation, and thermal canopy metrics in real-time.
              </p>
            </div>

            {/* Card 2 */}
            <div className="p-7 rounded-2xl border border-slate-200/90 bg-[#F7F9F5]/60 hover:bg-white hover:border-[#166534] hover:shadow-md transition-all group">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 mb-5 group-hover:scale-110 transition-transform">
                <Layers className="h-6 w-6 text-[#166534]" />
              </div>
              <h3 className="text-lg font-bold text-[#17251B]">Deep Soil Chemistry & NPK</h3>
              <p className="mt-2 text-sm text-slate-600 leading-relaxed">
                Live monitoring of Nitrogen (N), Phosphorus (P), Potassium (K), and soil pH
                to calculate custom fertilization formulas and reduce chemical runoff.
              </p>
            </div>

            {/* Card 3 */}
            <div className="p-7 rounded-2xl border border-slate-200/90 bg-[#F7F9F5]/60 hover:bg-white hover:border-[#166534] hover:shadow-md transition-all group">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-sky-50 text-sky-600 mb-5 group-hover:scale-110 transition-transform">
                <Droplets className="h-6 w-6 text-sky-600" />
              </div>
              <h3 className="text-lg font-bold text-[#17251B]">Intelligent Irrigation Advisory</h3>
              <p className="mt-2 text-sm text-slate-600 leading-relaxed">
                Save up to 35% on water usage with AI-driven irrigation schedules tailored
                to real-time soil depletion, crop stage, and rainfall projections.
              </p>
            </div>

            {/* Card 4 */}
            <div className="p-7 rounded-2xl border border-slate-200/90 bg-[#F7F9F5]/60 hover:bg-white hover:border-[#166534] hover:shadow-md transition-all group">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-50 text-amber-600 mb-5 group-hover:scale-110 transition-transform">
                <CloudSun className="h-6 w-6 text-amber-600" />
              </div>
              <h3 className="text-lg font-bold text-[#17251B]">Micro-Climate Forecasting</h3>
              <p className="mt-2 text-sm text-slate-600 leading-relaxed">
                Hyper-local agro-meteorological station feeds. Receive automated SMS and
                in-app warnings for sudden frost, thermal shock, and high humidity spikes.
              </p>
            </div>

            {/* Card 5 */}
            <div className="p-7 rounded-2xl border border-slate-200/90 bg-[#F7F9F5]/60 hover:bg-white hover:border-[#166534] hover:shadow-md transition-all group">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-purple-50 text-purple-600 mb-5 group-hover:scale-110 transition-transform">
                <ScanEye className="h-6 w-6 text-purple-600" />
              </div>
              <h3 className="text-lg font-bold text-[#17251B]">AI Leaf Disease Diagnostics</h3>
              <p className="mt-2 text-sm text-slate-600 leading-relaxed">
                Early-stage computer vision scanning detects foliar blight, rust, fungal spots,
                and pest manifestations before they spread across acreage.
              </p>
            </div>

            {/* Card 6 */}
            <div className="p-7 rounded-2xl border border-slate-200/90 bg-[#F7F9F5]/60 hover:bg-white hover:border-[#166534] hover:shadow-md transition-all group">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-rose-50 text-rose-600 mb-5 group-hover:scale-110 transition-transform">
                <ShieldCheck className="h-6 w-6 text-rose-600" />
              </div>
              <h3 className="text-lg font-bold text-[#17251B]">Enterprise Role Security</h3>
              <p className="mt-2 text-sm text-slate-600 leading-relaxed">
                Strict Role-Based Access Control (RBAC) protecting sensor calibration,
                irrigation actuator controls, farm yield logs, and administrative records.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* About Section */}
      <section id="about" className="py-16 sm:py-24 bg-[#F7F9F5]">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-[#DCFCE7] px-3.5 py-1 text-xs font-bold text-[#145A32] mb-4">
                <Activity className="h-3.5 w-3.5 text-[#166534]" />
                <span>Our Agriculture Mission</span>
              </div>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-[#17251B] tracking-tight leading-tight">
                Empowering farmers with practical, high-impact data
              </h2>
              <p className="mt-4 text-base text-slate-600 leading-relaxed">
                Modern agriculture faces water scarcity, escalating fertilizer expenses,
                and erratic weather patterns. AgriSense bridges modern software engineering
                and field agronomy by turning IoT telemetry into daily actionable farming decisions.
              </p>

              <div className="mt-6 space-y-3">
                <div className="flex items-center gap-3 text-sm text-slate-700">
                  <CheckCircle2 className="h-5 w-5 text-[#166534] shrink-0" />
                  <span>Real-time sensor data streaming via robust REST API architecture</span>
                </div>
                <div className="flex items-center gap-3 text-sm text-slate-700">
                  <CheckCircle2 className="h-5 w-5 text-[#166534] shrink-0" />
                  <span>Automated alerts preventing crop dehydration and fungal outbreaks</span>
                </div>
                <div className="flex items-center gap-3 text-sm text-slate-700">
                  <CheckCircle2 className="h-5 w-5 text-[#166534] shrink-0" />
                  <span>Secure JWT authentication with Farmer, Expert, and Admin roles</span>
                </div>
              </div>

              <div className="mt-8 flex items-center gap-4">
                <Link to="/register">
                  <Button variant="primary" size="md" icon={ArrowRight} className="!rounded-full px-6">
                    Join AgriSense Free
                  </Button>
                </Link>
                <a
                  href="http://localhost:5000/api/health"
                  target="_blank"
                  rel="noreferrer"
                >
                  <Button variant="outline" size="md" icon={Server} className="!rounded-full">
                    API Status Check
                  </Button>
                </a>
              </div>
            </div>

            {/* Visual Callout Card */}
            <div className="relative rounded-2xl overflow-hidden border border-slate-200/80 shadow-lg bg-white p-8">
              <div className="flex items-center justify-between pb-6 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#DCFCE7] text-[#166534]">
                    <Sprout className="h-6 w-6" />
                  </div>
                  <div>
                    <h4 className="text-base font-bold text-[#17251B]">Live Field Telemetry</h4>
                    <p className="text-xs text-slate-500">Sector 4A &bull; High Yield Corn</p>
                  </div>
                </div>
                <Badge size="sm" variant="success" dot>
                  Sensors Active
                </Badge>
              </div>

              <div className="grid grid-cols-2 gap-4 py-6">
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80">
                  <span className="text-xs text-slate-500">Root Soil Moisture</span>
                  <p className="text-2xl font-bold text-[#145A32] mt-1">74.2%</p>
                  <span className="text-[11px] text-emerald-600 font-semibold">Optimal range</span>
                </div>
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80">
                  <span className="text-xs text-slate-500">Ambient Temp</span>
                  <p className="text-2xl font-bold text-[#145A32] mt-1">24.8°C</p>
                  <span className="text-[11px] text-emerald-600 font-semibold">Mild daylight</span>
                </div>
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80">
                  <span className="text-xs text-slate-500">Soil pH Balance</span>
                  <p className="text-2xl font-bold text-[#145A32] mt-1">6.5 pH</p>
                  <span className="text-[11px] text-emerald-600 font-semibold">Slightly acidic (Ideal)</span>
                </div>
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80">
                  <span className="text-xs text-slate-500">Irrigation Advice</span>
                  <p className="text-2xl font-bold text-[#145A32] mt-1">04:00 AM</p>
                  <span className="text-[11px] text-emerald-600 font-semibold">Scheduled 45 mins</span>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-[#DCFCE7]/40 border border-[#22C55E]/20 text-xs text-[#145A32] flex items-center justify-between">
                <span>Next AI telemetry synchronization in 4m 12s</span>
                <span className="font-bold">24/7 Monitored</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section id="contact" className="py-16 bg-white border-t border-slate-200/80">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="rounded-3xl bg-gradient-to-br from-[#145A32] to-[#0F3F22] p-8 sm:p-12 text-white flex flex-col md:flex-row items-center justify-between gap-8 shadow-xl">
            <div className="max-w-xl">
              <span className="text-xs font-bold text-emerald-300 uppercase tracking-wider">
                Get In Touch
              </span>
              <h3 className="text-2xl sm:text-3xl font-black mt-2">
                Ready to transform your agricultural operations?
              </h3>
              <p className="mt-3 text-sm text-emerald-100/90 leading-relaxed">
                Connect your farm sensors, invite your field experts, and start monitoring
                your crops today with precision cloud telemetry.
              </p>
              <div className="mt-6 flex flex-wrap gap-4 text-xs text-emerald-200">
                <div className="flex items-center gap-1.5">
                  <Mail className="h-4 w-4 text-[#22C55E]" />
                  <span>support@agrisense.io</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Phone className="h-4 w-4 text-[#22C55E]" />
                  <span>+1 (800) 555-AGRI</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <MapPin className="h-4 w-4 text-[#22C55E]" />
                  <span>Agro Innovation Hub, Sector 4</span>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 shrink-0">
              <Link to="/register">
                <Button variant="secondary" size="lg" icon={ArrowRight} className="!rounded-full px-6 font-bold shadow-md">
                  Create Account
                </Button>
              </Link>
              <Link to="/login">
                <button
                  type="button"
                  className="rounded-full bg-white/10 hover:bg-white/20 text-white border border-white/30 px-6 py-2.5 text-sm font-semibold transition-all cursor-pointer"
                >
                  Sign In
                </button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-8">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#166534] text-white">
              <Sprout className="h-5 w-5 text-[#22C55E]" />
            </div>
            <span className="text-base font-black text-[#145A32]">AgriSense</span>
            <span className="text-xs text-slate-400">&bull; Intelligent Precision Agriculture</span>
          </div>

          <p className="text-xs text-slate-500">
            &copy; {new Date().getFullYear()} AgriSense Platform. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
