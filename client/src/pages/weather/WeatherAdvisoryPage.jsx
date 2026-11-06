import { useState, useEffect, useId } from 'react';
import { Link } from 'react-router-dom';
import {
  CloudSun,
  Droplets,
  Wind,
  Gauge,
  Sunrise,
  Sunset,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  Compass,
  Sprout,
  Tractor,
  RefreshCw,
  MapPin,
  ShieldCheck,
  TrendingUp,
  Sparkles,
  ThermometerSun,
  CloudRain,
  Wheat,
  Activity,
  LocateFixed,
  Info,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import weatherService from '../../services/weatherService.js';
import Button from '../../components/common/Button.jsx';
import Badge from '../../components/common/Badge.jsx';

export const WeatherAdvisoryPage = () => {
  const farmSelectId = useId();
  // State variables
  const [farms, setFarms] = useState([]);
  const [selectedFarmId, setSelectedFarmId] = useState('');
  const [weatherData, setWeatherData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [errorCode, setErrorCode] = useState(null);
  const [coordinatesMissing, setCoordinatesMissing] = useState(false);
  const [missingFarmInfo, setMissingFarmInfo] = useState(null);

  // Coordinate form inputs
  const [manualLat, setManualLat] = useState('');
  const [manualLon, setManualLon] = useState('');
  const [updatingCoords, setUpdatingCoords] = useState(false);
  const [coordError, setCoordError] = useState(null);
  const [gpsLoading, setGpsLoading] = useState(false);

  // 1. Load Farmer's Farms on mount
  useEffect(() => {
    let isMounted = true;

    const loadFarms = async () => {
      try {
        setLoading(true);
        const data = await weatherService.getFarmsWeatherSummary();
        if (isMounted && data.success && data.farms) {
          setFarms(data.farms);
          if (data.farms.length > 0) {
            // Prefer a farm with coordinates already configured, or default to first
            const farmWithCoords = data.farms.find((f) => f.hasCoordinates) || data.farms[0];
            setSelectedFarmId(farmWithCoords.id);
          }
        }
      } catch (err) {
        if (isMounted) {
          setErrorCode(err.response?.data?.code || null);
          setError(
            err.response?.data?.message ||
              err.message ||
              'Unable to load your farm profiles. Please check backend connection.'
          );
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadFarms();

    return () => {
      isMounted = false;
    };
  }, []);

  // 2. Load Weather when selectedFarmId changes
  useEffect(() => {
    if (!selectedFarmId) return;

    let isMounted = true;
    const fetchWeather = async () => {
      try {
        setLoading(true);
        setError(null);
        setErrorCode(null);
        setCoordinatesMissing(false);

        const data = await weatherService.getFarmWeather(selectedFarmId);

        if (isMounted) {
          if (data.code === 'COORDINATES_MISSING') {
            setCoordinatesMissing(true);
            setMissingFarmInfo(data.farm);
            setManualLat(data.farm.coordinates?.latitude || '');
            setManualLon(data.farm.coordinates?.longitude || '');
            setWeatherData(null);
          } else if (data.success && data.weather) {
            setWeatherData(data.weather);
            setCoordinatesMissing(false);
          }
        }
      } catch (err) {
        if (isMounted) {
          setErrorCode(err.response?.data?.code || null);
          setError(
            err.response?.data?.message ||
              err.message ||
              'Failed to retrieve live meteorological data. Verify your weather provider setup.'
          );
        }
      } finally {
        if (isMounted) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    };

    fetchWeather();

    return () => {
      isMounted = false;
    };
  }, [selectedFarmId]);

  // Handle manual refresh
  const handleRefresh = async () => {
    if (!selectedFarmId || refreshing) return;
    setRefreshing(true);
    try {
      const data = await weatherService.getFarmWeather(selectedFarmId);
      if (data.success && data.weather) {
        setWeatherData(data.weather);
        setError(null);
        setErrorCode(null);
      }
    } catch (err) {
      setErrorCode(err.response?.data?.code || null);
      setError(err.response?.data?.message || err.message || 'Refresh failed');
    } finally {
      setRefreshing(false);
    }
  };

  // Browser Geolocation auto-detection
  const handleDetectGPS = () => {
    if (!navigator.geolocation) {
      setCoordError('Geolocation is not supported by your browser.');
      return;
    }
    setGpsLoading(true);
    setCoordError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setManualLat(pos.coords.latitude.toFixed(4));
        setManualLon(pos.coords.longitude.toFixed(4));
        setGpsLoading(false);
      },
      (err) => {
        setGpsLoading(false);
        setCoordError('GPS access denied or unavailable: ' + err.message);
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  // Save coordinates to MongoDB and immediately fetch weather
  const handleSaveCoordinates = async (e) => {
    e.preventDefault();
    const lat = Number(manualLat);
    const lon = Number(manualLon);

    if (isNaN(lat) || isNaN(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180) {
      setCoordError('Please enter valid coordinates: Latitude (-90 to 90) and Longitude (-180 to 180).');
      return;
    }

    try {
      setUpdatingCoords(true);
      setCoordError(null);
      const res = await weatherService.updateFarmCoordinates(selectedFarmId, lat, lon);

      if (res.success) {
        setCoordinatesMissing(false);
        if (res.weather) {
          setWeatherData(res.weather);
        }
        // Update local farms list
        setFarms((prev) =>
          prev.map((f) =>
            f.id === selectedFarmId
              ? { ...f, hasCoordinates: true, coordinates: { latitude: lat, longitude: lon } }
              : f
          )
        );
      }
    } catch (err) {
      setCoordError(err.response?.data?.message || err.message || 'Failed to update farm coordinates');
    } finally {
      setUpdatingCoords(false);
    }
  };

  const selectedFarm = farms.find((f) => f.id === selectedFarmId);

  // Format time (HH:MM AM/PM)
  const formatTime = (isoString) => {
    if (!isoString) return '--:--';
    try {
      const d = new Date(isoString);
      return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '--:--';
    }
  };

  // Prepare chart data from forecast
  const chartData =
    weatherData?.forecast?.map((day) => ({
      day: day.day,
      min: day.tempMin,
      max: day.tempMax,
      avg: Math.round(((day.tempMin + day.tempMax) / 2) * 10) / 10,
      rainProb: day.rainProbability,
    })) || [];

  return (
    <div className="space-y-6">
      {/* 1. Page Header & Farm Selector Bar */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-4 border-b border-slate-200/70">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Precision Agriculture
            </span>
            <span>&bull;</span>
            <Badge size="sm" variant="forest" className="font-semibold">
              Live Advisory
            </Badge>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-[#17251B] tracking-tight flex items-center gap-2">
            <CloudSun className="h-6 w-6 text-[#166534]" />
            <span>Agro-Meteorology &amp; Weather Advisory</span>
          </h1>
        </div>

        {/* Farm Selector Dropdown & Refresh Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          {farms.length > 0 && (
            <div className="flex items-center gap-2 bg-white rounded-xl border border-slate-200 p-1.5 shadow-2xs">
              <label htmlFor={farmSelectId} className="flex items-center gap-1.5 px-2 text-xs font-bold text-[#166534]">
                <Tractor className="h-4 w-4" />
                <span className="hidden sm:inline">Farm:</span>
              </label>
              <select
                id={farmSelectId}
                aria-label="Select Farm"
                value={selectedFarmId}
                onChange={(e) => setSelectedFarmId(e.target.value)}
                className="bg-transparent text-xs font-semibold text-[#17251B] focus:outline-none pr-3 py-1 cursor-pointer"
              >
                {farms.map((farm) => (
                  <option key={farm.id} value={farm.id}>
                    {farm.name} {farm.hasCoordinates ? '✓' : '(No GPS)'}
                  </option>
                ))}
              </select>
            </div>
          )}

          <Button
            variant="outline"
            size="sm"
            icon={RefreshCw}
            loading={refreshing}
            onClick={handleRefresh}
            className="bg-white shadow-2xs"
            title="Fetch latest satellite meteorological readings"
          >
            Refresh
          </Button>

          <Link to="/dashboard/farms">
            <Button variant="secondary" size="sm" icon={Tractor}>
              Manage Farms
            </Button>
          </Link>
        </div>
      </div>

      {/* Farm Details Ribbon */}
      {selectedFarm && (
        <div className="rounded-xl border border-emerald-900/10 bg-[#DCFCE7]/30 px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-1.5 font-bold text-[#145A32]">
              <MapPin className="h-4 w-4 text-[#166534]" />
              <span>{selectedFarm.name}</span>
              <span className="text-slate-400 font-normal">({selectedFarm.location})</span>
            </div>
            {selectedFarm.acreage && (
              <span className="text-slate-600">
                <strong>Area:</strong> {selectedFarm.acreage} ac
              </span>
            )}
            {selectedFarm.mainCrops?.length > 0 && (
              <span className="text-slate-600">
                <strong>Crops:</strong> {selectedFarm.mainCrops.join(', ')}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <span className="text-slate-500">Coordinates:</span>
            {selectedFarm.hasCoordinates ? (
              <Badge size="sm" variant="success" dot className="font-mono text-[11px]">
                {selectedFarm.coordinates.latitude.toFixed(4)}, {selectedFarm.coordinates.longitude.toFixed(4)}
              </Badge>
            ) : (
              <Badge size="sm" variant="warning" dot className="text-[11px]">
                Coordinates Missing
              </Badge>
            )}
          </div>
        </div>
      )}

      {/* 2. Zero Farms Empty State */}
      {!loading && farms.length === 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-xs max-w-lg mx-auto">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-[#166534] mx-auto mb-4">
            <Tractor className="h-7 w-7" />
          </div>
          <h2 className="text-base font-bold text-[#17251B]">No Farms Registered Yet</h2>
          <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
            Weather advisories provide hyper-local forecasts tailored to your specific field coordinates. Please register your first farm parcel to unlock precision weather analytics.
          </p>
          <div className="mt-5">
            <Link to="/dashboard/farms/new">
              <Button variant="primary" size="sm" icon={Sprout}>
                Register New Farm
              </Button>
            </Link>
          </div>
        </div>
      )}

      {/* 3. Error Banner / OpenWeather Configuration Card */}
      {error && !loading && (errorCode === 'OPENWEATHER_API_KEY_NOT_CONFIGURED' || errorCode === 'OPENWEATHER_AUTHENTICATION_FAILED' || error.includes('OpenWeather') || error.includes('OPENWEATHER_API_KEY')) ? (
        <div className="rounded-2xl border border-amber-300 bg-amber-50/90 p-6 shadow-xs">
          <div className="flex items-start gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-amber-100 text-amber-800">
              <Sparkles className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-2 mb-1.5">
                <Badge size="sm" variant="warning" className="font-bold">
                  OpenWeather Setup Required
                </Badge>
                <span className="text-xs font-semibold text-amber-900">
                  AgriSense Primary Weather Engine
                </span>
              </div>
              <h3 className="text-sm font-bold text-amber-950">
                OpenWeather API Key Configuration Needed
              </h3>
              <p className="text-xs text-amber-800 mt-1 leading-relaxed">
                {error}
              </p>

              <div className="mt-4 p-3.5 rounded-xl bg-white border border-amber-200 text-xs text-slate-700 space-y-2">
                <p className="font-bold text-[#166534]">How to configure your API key:</p>
                <ol className="list-decimal list-inside space-y-1.5 text-slate-600 pl-1 leading-relaxed">
                  <li>
                    Register or sign in at{' '}
                    <a
                      href="https://openweathermap.org/api"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 underline font-semibold hover:text-blue-800"
                    >
                      openweathermap.org/api
                    </a>{' '}
                    and generate a free API key.
                  </li>
                  <li>
                    In your backend configuration file (<code className="bg-slate-100 px-1.5 py-0.5 rounded font-mono text-slate-800">server/.env</code>), set:
                    <div className="mt-1 p-2 rounded bg-slate-900 text-emerald-400 font-mono text-[11px] overflow-x-auto">
                      WEATHER_PROVIDER=openweather<br />
                      OPENWEATHER_API_KEY=your_actual_api_key_here
                    </div>
                  </li>
                  <li>Restart the backend Node.js server.</li>
                </ol>
              </div>

              <div className="mt-4 flex items-center gap-3">
                <Button
                  variant="primary"
                  size="sm"
                  icon={RefreshCw}
                  loading={refreshing}
                  onClick={handleRefresh}
                >
                  Verify Key &amp; Reload Telemetry
                </Button>
              </div>
            </div>
          </div>
        </div>
      ) : error && !loading ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50/90 p-5 shadow-xs">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="text-xs font-bold text-rose-900">Meteorological Advisory Notice</h3>
              <p className="text-xs text-rose-700 mt-0.5">{error}</p>
            </div>
            <Button variant="outline" size="sm" icon={RefreshCw} onClick={handleRefresh}>
              Retry
            </Button>
          </div>
        </div>
      ) : null}

      {/* 4. Missing Coordinates Action Card */}
      {coordinatesMissing && missingFarmInfo && (
        <div className="rounded-2xl border border-amber-300 bg-amber-50/80 p-6 shadow-xs">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="max-w-xl">
              <div className="flex items-center gap-2 mb-1.5">
                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
                  <MapPin className="h-4 w-4" />
                </span>
                <h3 className="text-sm font-bold text-amber-900">
                  Coordinates Required for &quot;{missingFarmInfo.name}&quot;
                </h3>
              </div>
              <p className="text-xs text-amber-800 leading-relaxed">
                Hyper-local agro-meteorology, frost warnings, and spray suitability algorithms require precise latitude and longitude. Please enter the coordinates below or use your device GPS.
              </p>
            </div>

            {/* Quick GPS auto-detect button */}
            <Button
              variant="outline"
              size="sm"
              icon={LocateFixed}
              loading={gpsLoading}
              onClick={handleDetectGPS}
              className="bg-white border-amber-300 text-amber-900 hover:bg-amber-100/50 shadow-2xs shrink-0"
            >
              Detect My Device GPS
            </Button>
          </div>

          <form onSubmit={handleSaveCoordinates} className="mt-5 pt-4 border-t border-amber-200/80">
            {coordError && (
              <p className="text-xs text-rose-600 font-semibold mb-3">
                {coordError}
              </p>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                  Latitude (e.g. 16.5062)
                </label>
                <input
                  type="number"
                  step="any"
                  required
                  placeholder="16.5062"
                  value={manualLat}
                  onChange={(e) => setManualLat(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white py-2 px-3 text-xs font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#166534]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                  Longitude (e.g. 80.6480)
                </label>
                <input
                  type="number"
                  step="any"
                  required
                  placeholder="80.6480"
                  value={manualLon}
                  onChange={(e) => setManualLon(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white py-2 px-3 text-xs font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#166534]"
                />
              </div>

              <div className="flex items-end">
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  loading={updatingCoords}
                  icon={CheckCircle2}
                  className="w-full py-2.5"
                >
                  Save &amp; Fetch Weather
                </Button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* 5. Loading Skeleton */}
      {loading && !weatherData && (
        <div className="space-y-6 animate-pulse">
          <div className="h-56 bg-slate-200 rounded-2xl" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="h-32 bg-slate-200 rounded-xl" />
            <div className="h-32 bg-slate-200 rounded-xl" />
            <div className="h-32 bg-slate-200 rounded-xl" />
            <div className="h-32 bg-slate-200 rounded-xl" />
          </div>
          <div className="h-72 bg-slate-200 rounded-2xl" />
        </div>
      )}

      {/* ============================================================== */}
      {/* 6. MAIN WEATHER DASHBOARD WHEN DATA IS LOADED                   */}
      {/* ============================================================== */}
      {weatherData && !loading && (
        <div className="space-y-6">
          {/* ========================================================== */}
          {/* A. CURRENT WEATHER HERO BANNER                             */}
          {/* ========================================================== */}
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#166534] via-[#145A32] to-[#0f3d22] p-6 sm:p-8 text-white shadow-md">
            <div className="absolute top-0 right-0 -mr-16 -mt-16 h-72 w-72 rounded-full bg-emerald-400/10 blur-3xl pointer-events-none" />

            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 pb-6 border-b border-white/15">
              <div>
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <Badge size="sm" variant="forest" className="!bg-white/20 !text-white !border-white/30 text-xs">
                    Current Atmospheric State
                  </Badge>
                  {weatherData.coverage?.tier && (
                    <Badge size="sm" variant="neutral" className="!bg-emerald-950/50 !text-emerald-100 !border-white/20 text-[11px] font-semibold">
                      {weatherData.coverage.tier}
                    </Badge>
                  )}
                  <span className="text-xs text-emerald-200">
                    Source: {weatherData.provider}
                  </span>
                </div>
                <div className="flex items-baseline gap-3">
                  <span className="text-5xl sm:text-6xl font-black tracking-tighter">
                    {weatherData.current.temperature}°C
                  </span>
                  <div className="text-emerald-100">
                    <p className="text-lg font-bold leading-tight capitalize">
                      {weatherData.current.condition}
                    </p>
                    <p className="text-xs text-emerald-200/80">
                      Feels like {weatherData.current.feelsLike}°C
                    </p>
                  </div>
                </div>
              </div>

              {/* Sunrise / Sunset & Wind */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="rounded-xl bg-white/10 p-3 backdrop-blur-xs">
                  <div className="flex items-center gap-1.5 text-emerald-200 mb-1">
                    <Droplets className="h-3.5 w-3.5" />
                    <span>Humidity</span>
                  </div>
                  <p className="text-base font-bold">{weatherData.current.humidity}%</p>
                  <p className="text-[10px] text-emerald-300">Relative moisture</p>
                </div>

                <div className="rounded-xl bg-white/10 p-3 backdrop-blur-xs">
                  <div className="flex items-center gap-1.5 text-emerald-200 mb-1">
                    <Wind className="h-3.5 w-3.5" />
                    <span>Wind Velocity</span>
                  </div>
                  <p className="text-base font-bold">
                    {weatherData.current.windSpeed} km/h
                  </p>
                  <p className="text-[10px] text-emerald-300 flex items-center gap-1">
                    <Compass className="h-2.5 w-2.5" />
                    <span>{weatherData.current.windDirection} ({weatherData.current.windDirectionDeg}°)</span>
                  </p>
                </div>

                <div className="rounded-xl bg-white/10 p-3 backdrop-blur-xs">
                  <div className="flex items-center gap-1.5 text-emerald-200 mb-1">
                    <CloudRain className="h-3.5 w-3.5" />
                    <span>Rainfall</span>
                  </div>
                  <p className="text-base font-bold">{weatherData.current.rainfall} mm</p>
                  <p className="text-[10px] text-emerald-300">Current accumulation</p>
                </div>

                <div className="rounded-xl bg-white/10 p-3 backdrop-blur-xs">
                  <div className="flex items-center gap-1.5 text-emerald-200 mb-1">
                    <Gauge className="h-3.5 w-3.5" />
                    <span>Pressure</span>
                  </div>
                  <p className="text-base font-bold">{weatherData.current.pressure} hPa</p>
                  <p className="text-[10px] text-emerald-300">Surface atmospheric</p>
                </div>
              </div>
            </div>

            {/* Bottom ribbon: Sun timing & timestamp */}
            <div className="pt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs text-emerald-200/90">
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-1.5">
                  <Sunrise className="h-4 w-4 text-amber-300" />
                  <span>Sunrise: <strong>{formatTime(weatherData.current.sunrise)}</strong></span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Sunset className="h-4 w-4 text-amber-300" />
                  <span>Sunset: <strong>{formatTime(weatherData.current.sunset)}</strong></span>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3 text-[11px] text-emerald-200/80">
                {weatherData.current.observationFormatted && (
                  <div className="flex items-center gap-1">
                    <Sparkles className="h-3.5 w-3.5 text-emerald-300" />
                    <span>Observed: <strong>{weatherData.current.observationFormatted}</strong></span>
                  </div>
                )}
                <div className="flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5" />
                  <span>Synchronized: {new Date(weatherData.retrievedAt || weatherData.fetchedAt).toLocaleTimeString()}</span>
                  {weatherData.isCached && <span className="ml-0.5">(Cached 15m)</span>}
                </div>
              </div>
            </div>
          </div>

          {/* ========================================================== */}
          {/* C. AGRICULTURAL WEATHER ALERTS                             */}
          {/* ========================================================== */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-[#166534]" />
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Field Risk Alerts &amp; Advisories
                </h2>
              </div>
              <Badge size="sm" variant={weatherData.alerts?.length > 0 ? 'warning' : 'success'}>
                {weatherData.alerts?.length > 0
                  ? `${weatherData.alerts.length} Active Notice${weatherData.alerts.length === 1 ? '' : 's'}`
                  : 'Favorable Conditions'}
              </Badge>
            </div>

            {weatherData.alerts && weatherData.alerts.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {weatherData.alerts.map((alert) => (
                  <div
                    key={alert.id}
                    className={`rounded-2xl border p-4 shadow-2xs transition-all ${
                      alert.severity === 'danger'
                        ? 'border-rose-300 bg-rose-50/70'
                        : alert.severity === 'warning'
                        ? 'border-amber-300 bg-amber-50/70'
                        : 'border-blue-200 bg-blue-50/70'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl font-bold ${
                          alert.severity === 'danger'
                            ? 'bg-rose-100 text-rose-700'
                            : alert.severity === 'warning'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-blue-100 text-blue-700'
                        }`}
                      >
                        <AlertTriangle className="h-4 w-4" />
                      </div>
                      <div className="flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h4 className="text-xs font-bold text-[#17251B]">{alert.title || alert.event}</h4>
                          <span
                            className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${
                              alert.severity === 'danger'
                                ? 'bg-rose-200 text-rose-800'
                                : 'bg-amber-200 text-amber-900'
                            }`}
                          >
                            {alert.severity}
                          </span>
                          {alert.isOfficialAlert ? (
                            <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-rose-600 text-white">
                              Official Alert
                            </span>
                          ) : (
                            <span className="text-[9px] font-semibold uppercase px-1.5 py-0.5 rounded bg-emerald-100 text-[#166534]">
                              Agri Advisory
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                          {alert.message}
                        </p>
                        {alert.source && (
                          <p className="text-[10px] text-slate-400 mt-1 italic">
                            Source: {alert.source}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-2xl border border-emerald-900/10 bg-white p-4 shadow-2xs flex items-center gap-3">
                <CheckCircle2 className="h-5 w-5 text-[#166534] shrink-0" />
                <p className="text-xs text-slate-600">
                  No severe micro-climate hazards (storm, heatwave, frost, or flooding) detected for this farm over the upcoming 7 days. Normal cultivation routines can proceed safely.
                </p>
              </div>
            )}
          </div>

          {/* ========================================================== */}
          {/* D. ACTIONABLE FARMING RECOMMENDATIONS                      */}
          {/* ========================================================== */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-[#166534]" />
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Actionable Farming Recommendations (Weather-Driven)
                </h2>
              </div>
              <Badge size="sm" variant="forest">
                Real-Time Diagnostics
              </Badge>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
              {/* 1. Irrigation */}
              <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs flex flex-col justify-between hover:border-[#166534] transition-colors">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                      <Droplets className="h-4 w-4" />
                    </span>
                    <Badge size="sm" variant={weatherData.recommendations.irrigation.badgeVariant}>
                      {weatherData.recommendations.irrigation.status}
                    </Badge>
                  </div>
                  <h4 className="text-xs font-bold text-[#17251B]">
                    {weatherData.recommendations.irrigation.title}
                  </h4>
                  <p className="text-xs font-semibold text-[#166534] mt-1">
                    {weatherData.recommendations.irrigation.recommendation}
                  </p>
                </div>
                <p className="text-[11px] text-slate-500 mt-2.5 pt-2.5 border-t border-slate-100 leading-snug">
                  {weatherData.recommendations.irrigation.action}
                </p>
              </div>

              {/* 2. Fertilizer */}
              <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs flex flex-col justify-between hover:border-[#166534] transition-colors">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-50 text-[#166534]">
                      <Sprout className="h-4 w-4" />
                    </span>
                    <Badge size="sm" variant={weatherData.recommendations.fertilizer.badgeVariant}>
                      {weatherData.recommendations.fertilizer.status}
                    </Badge>
                  </div>
                  <h4 className="text-xs font-bold text-[#17251B]">
                    {weatherData.recommendations.fertilizer.title}
                  </h4>
                  <p className="text-xs font-semibold text-[#166534] mt-1">
                    {weatherData.recommendations.fertilizer.recommendation}
                  </p>
                </div>
                <p className="text-[11px] text-slate-500 mt-2.5 pt-2.5 border-t border-slate-100 leading-snug">
                  {weatherData.recommendations.fertilizer.action}
                </p>
              </div>

              {/* 3. Spraying */}
              <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs flex flex-col justify-between hover:border-[#166534] transition-colors">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-purple-50 text-purple-600">
                      <Wind className="h-4 w-4" />
                    </span>
                    <Badge size="sm" variant={weatherData.recommendations.spraying.badgeVariant}>
                      {weatherData.recommendations.spraying.status}
                    </Badge>
                  </div>
                  <h4 className="text-xs font-bold text-[#17251B]">
                    {weatherData.recommendations.spraying.title}
                  </h4>
                  <p className="text-xs font-semibold text-[#166534] mt-1">
                    {weatherData.recommendations.spraying.recommendation}
                  </p>
                </div>
                <p className="text-[11px] text-slate-500 mt-2.5 pt-2.5 border-t border-slate-100 leading-snug">
                  {weatherData.recommendations.spraying.action}
                </p>
              </div>

              {/* 4. Harvest */}
              <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs flex flex-col justify-between hover:border-[#166534] transition-colors">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                      <Wheat className="h-4 w-4" />
                    </span>
                    <Badge size="sm" variant={weatherData.recommendations.harvest.badgeVariant}>
                      {weatherData.recommendations.harvest.status}
                    </Badge>
                  </div>
                  <h4 className="text-xs font-bold text-[#17251B]">
                    {weatherData.recommendations.harvest.title}
                  </h4>
                  <p className="text-xs font-semibold text-[#166534] mt-1">
                    {weatherData.recommendations.harvest.recommendation}
                  </p>
                </div>
                <p className="text-[11px] text-slate-500 mt-2.5 pt-2.5 border-t border-slate-100 leading-snug">
                  {weatherData.recommendations.harvest.action}
                </p>
              </div>

              {/* 5. Crop Protection */}
              <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs flex flex-col justify-between hover:border-[#166534] transition-colors">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-teal-50 text-teal-700">
                      <ShieldCheck className="h-4 w-4" />
                    </span>
                    <Badge size="sm" variant={weatherData.recommendations.protection.badgeVariant}>
                      {weatherData.recommendations.protection.status}
                    </Badge>
                  </div>
                  <h4 className="text-xs font-bold text-[#17251B]">
                    {weatherData.recommendations.protection.title}
                  </h4>
                  <p className="text-xs font-semibold text-[#166534] mt-1">
                    {weatherData.recommendations.protection.recommendation}
                  </p>
                </div>
                <p className="text-[11px] text-slate-500 mt-2.5 pt-2.5 border-t border-slate-100 leading-snug">
                  {weatherData.recommendations.protection.action}
                </p>
              </div>
            </div>
          </div>

          {/* ========================================================== */}
          {/* B. AGRO-METEOROLOGICAL FORECAST                            */}
          {/* ========================================================== */}
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-[#166534]" />
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  {weatherData.coverage?.days || weatherData.forecast?.length || 5}-Day Agro-Meteorological Forecast
                </h2>
              </div>
              <div className="flex items-center gap-2">
                <Badge size="sm" variant="forest">
                  {weatherData.coverage?.days || weatherData.forecast?.length || 5}-Day Horizon
                </Badge>
                {weatherData.coverage?.tier && (
                  <span className="text-[11px] text-slate-500 font-medium">
                    {weatherData.coverage.tier}
                  </span>
                )}
              </div>
            </div>

            {weatherData.coverage?.limitations && (
              <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-[11px] text-slate-600">
                <Info className="h-4 w-4 text-[#166534] shrink-0" />
                <span>{weatherData.coverage.limitations}</span>
              </div>
            )}

            <div className={`grid grid-cols-2 sm:grid-cols-3 ${weatherData.forecast?.length === 5 ? 'lg:grid-cols-5' : 'lg:grid-cols-7'} gap-3`}>
              {weatherData.forecast?.map((day, idx) => (
                <div
                  key={day.date}
                  className={`rounded-2xl border p-3.5 flex flex-col justify-between transition-all ${
                    idx === 0
                      ? 'border-[#166534] bg-emerald-50/40 ring-1 ring-[#166534]/30 shadow-xs'
                      : 'border-slate-200/80 bg-white shadow-2xs hover:border-slate-300'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="font-bold text-[#17251B]">
                        {idx === 0 ? 'Today' : day.day}
                      </span>
                      <span className="text-[10px] text-slate-400">{day.formattedDate}</span>
                    </div>

                    <div className="my-2 text-center">
                      <CloudSun className="h-8 w-8 text-[#166534] mx-auto mb-1" />
                      <p className="text-[11px] font-semibold text-slate-700 capitalize truncate" title={day.condition}>
                        {day.condition}
                      </p>
                    </div>

                    {/* Temp Min / Max */}
                    <div className="flex items-center justify-center gap-2 text-xs font-mono my-2">
                      <span className="font-bold text-slate-900">{day.tempMax}°</span>
                      <span className="text-slate-400">/</span>
                      <span className="text-slate-500">{day.tempMin}°</span>
                    </div>
                  </div>

                  {/* Precipitation Probability & Wind */}
                  <div className="space-y-1.5 pt-2 border-t border-slate-100 text-[10px]">
                    <div>
                      <div className="flex justify-between text-slate-500 mb-0.5">
                        <span>Rain:</span>
                        <span className="font-semibold text-blue-600">{day.rainProbability}%</span>
                      </div>
                      <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-blue-500 rounded-full"
                          style={{ width: `${Math.min(day.rainProbability, 100)}%` }}
                        />
                      </div>
                    </div>

                    <div className="flex justify-between text-slate-500">
                      <span>Rainfall:</span>
                      <span className="font-bold text-slate-700">{day.expectedRainfall} mm</span>
                    </div>

                    <div className="flex justify-between text-slate-500">
                      <span>Wind:</span>
                      <span className="font-medium text-slate-700">{day.windSpeedMax} km/h</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ========================================================== */}
          {/* E. ADDITIONAL AGRICULTURAL INTELLIGENCE (Charts & Matrices) */}
          {/* ========================================================== */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* Temperature Trends Curve (Recharts) */}
            <div className="lg:col-span-8 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-[#166534]" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                    {weatherData.coverage?.days || weatherData.forecast?.length || 5}-Day Temperature Fluctuation Curve (°C)
                  </h3>
                </div>
                <div className="flex items-center gap-3 text-xs">
                  <div className="flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />
                    <span className="text-slate-500">Daytime Max</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-full bg-emerald-600" />
                    <span className="text-slate-500">Night Min</span>
                  </div>
                </div>
              </div>

              <div className="h-60 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="maxGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#F59E0B" stopOpacity={0.0} />
                      </linearGradient>
                      <linearGradient id="minGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#166534" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#166534" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                    <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#64748B' }} stroke="#CBD5E1" />
                    <YAxis tick={{ fontSize: 11, fill: '#64748B' }} stroke="#CBD5E1" domain={['dataMin - 3', 'dataMax + 3']} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#FFFFFF',
                        borderRadius: '12px',
                        border: '1px solid #E2E8F0',
                        fontSize: '11px',
                        boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                      }}
                    />
                    <Area type="monotone" dataKey="max" stroke="#F59E0B" strokeWidth={2.5} fillOpacity={1} fill="url(#maxGradient)" name="Max Temp (°C)" />
                    <Area type="monotone" dataKey="min" stroke="#166534" strokeWidth={2.5} fillOpacity={1} fill="url(#minGradient)" name="Min Temp (°C)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Weather Risk Indicators & Summary Cards */}
            <div className="lg:col-span-4 space-y-3.5">
              {/* Growing Degree Days (GDD) Card */}
              <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5">
                    <ThermometerSun className="h-4 w-4 text-[#166534]" />
                    <h4 className="text-xs font-bold text-slate-800">Growing Degree Days (GDD)</h4>
                  </div>
                  <Badge size="sm" variant="forest">
                    Base: {weatherData.gdd?.baseTemperature || 10}°C
                  </Badge>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-black text-[#145A32]">
                    {weatherData.gdd?.periodTotalGDD ?? weatherData.gdd?.totalGDD ?? weatherData.gdd?.sevenDayTotalGDD ?? 0}
                  </span>
                  <span className="text-xs text-slate-500 font-semibold">thermal heat units</span>
                </div>
                <p className="text-[10px] text-slate-400 font-medium mt-0.5">
                  Period: {weatherData.gdd?.calculationPeriod || `${weatherData.coverage?.days || weatherData.forecast?.length || 5}-Day Rolling Forecast Window`}
                  {weatherData.gdd?.accumulationStartDate ? ` (from ${weatherData.gdd.accumulationStartDate})` : ''}
                </p>
                <p className="text-[11px] text-slate-500 mt-1.5 leading-snug">
                  {weatherData.gdd?.explanation || 'Accumulated degree-days predict crop phenological progression (germination to maturity) and pest emergence windows.'}
                </p>
              </div>

              {/* Rainfall Summary */}
              <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5">
                    <Droplets className="h-4 w-4 text-blue-600" />
                    <h4 className="text-xs font-bold text-slate-800">
                      {weatherData.coverage?.days || weatherData.forecast?.length || 5}-Day Rainfall Total
                    </h4>
                  </div>
                  <Badge size="sm" variant="neutral">
                    Accumulation
                  </Badge>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-black text-blue-700">
                    {weatherData.rainfallSummary?.totalMm ?? weatherData.rainfallSummary?.totalRainfallMm ?? weatherData.rainfallSummary?.sevenDayTotalMm ?? 0} mm
                  </span>
                  <span className="text-xs text-slate-500 font-semibold">
                    across {weatherData.rainfallSummary?.rainyDaysCount || 0} rainy day{weatherData.rainfallSummary?.rainyDaysCount === 1 ? '' : 's'}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 mt-1 leading-snug">
                  Total anticipated precipitation to replenish field soil moisture vs atmospheric loss.
                </p>
              </div>

              {/* Crop Risk Gauges */}
              <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs">
                <div className="flex items-center gap-1.5 mb-2.5">
                  <Activity className="h-4 w-4 text-[#166534]" />
                  <h4 className="text-xs font-bold text-slate-800">Atmospheric Crop Risk Matrix</h4>
                </div>

                <div className="space-y-2 text-xs">
                  <div>
                    <div className="flex justify-between text-slate-600 mb-0.5">
                      <span>Fungal Disease Risk</span>
                      <span className="font-bold text-slate-900">{weatherData.cropRisks?.fungalRisk?.level}</span>
                    </div>
                    <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          weatherData.cropRisks?.fungalRisk?.score > 70
                            ? 'bg-rose-500'
                            : weatherData.cropRisks?.fungalRisk?.score > 40
                            ? 'bg-amber-500'
                            : 'bg-emerald-500'
                        }`}
                        style={{ width: `${weatherData.cropRisks?.fungalRisk?.score || 20}%` }}
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-slate-600 mb-0.5">
                      <span>Soil Evaporation Loss</span>
                      <span className="font-bold text-slate-900">{weatherData.cropRisks?.evaporationRisk?.level}</span>
                    </div>
                    <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          weatherData.cropRisks?.evaporationRisk?.score > 70
                            ? 'bg-rose-500'
                            : weatherData.cropRisks?.evaporationRisk?.score > 40
                            ? 'bg-amber-500'
                            : 'bg-emerald-500'
                        }`}
                        style={{ width: `${weatherData.cropRisks?.evaporationRisk?.score || 30}%` }}
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-slate-600 mb-0.5">
                      <span>Thermal Stress Index</span>
                      <span className="font-bold text-slate-900">{weatherData.cropRisks?.heatStress?.level}</span>
                    </div>
                    <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          weatherData.cropRisks?.heatStress?.score > 70
                            ? 'bg-rose-500'
                            : weatherData.cropRisks?.heatStress?.score > 40
                            ? 'bg-amber-500'
                            : 'bg-emerald-500'
                        }`}
                        style={{ width: `${weatherData.cropRisks?.heatStress?.score || 25}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ========================================================== */}
          {/* SPRAY SUITABILITY FORECAST TABLE                           */}
          {/* ========================================================== */}
          <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Wind className="h-4 w-4 text-[#166534]" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  {weatherData.coverage?.days || weatherData.forecast?.length || 5}-Day Foliar Spray &amp; Pesticide Suitability Matrix
                </h3>
              </div>
              <Badge size="sm" variant="forest">
                Canopy Adhesion
              </Badge>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400 font-bold uppercase text-[10px]">
                    <th className="py-2.5 px-3">Date</th>
                    <th className="py-2.5 px-3">Suitability Status</th>
                    <th className="py-2.5 px-3">Wind Speed</th>
                    <th className="py-2.5 px-3">Rain Probability</th>
                    <th className="py-2.5 px-3">Expected Rain</th>
                    <th className="py-2.5 px-3">Agro-Meteorological Criteria</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {weatherData.spraySuitability?.map((item) => (
                    <tr key={item.date} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-2.5 px-3 font-bold text-slate-900 whitespace-nowrap">
                        {item.day}, {item.formattedDate}
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <Badge size="sm" variant={item.badgeVariant}>
                          {item.status}
                        </Badge>
                      </td>
                      <td className="py-2.5 px-3 font-mono text-slate-700 whitespace-nowrap">
                        {item.windSpeed} km/h
                      </td>
                      <td className="py-2.5 px-3 font-mono text-slate-700 whitespace-nowrap">
                        {item.rainProbability}%
                      </td>
                      <td className="py-2.5 px-3 font-mono text-slate-700 whitespace-nowrap">
                        {item.expectedRainfall} mm
                      </td>
                      <td className="py-2.5 px-3 text-slate-600 text-[11px]">
                        {item.reason}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WeatherAdvisoryPage;
