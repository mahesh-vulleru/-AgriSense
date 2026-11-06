import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  CloudSun,
  Droplets,
  Wind,
  CloudRain,
  ArrowRight,
  MapPin,
  AlertTriangle,
} from 'lucide-react';
import weatherService from '../../services/weatherService.js';
import Badge from '../common/Badge.jsx';

export const WeatherSummaryCard = ({ farms = [] }) => {
  const [weather, setWeather] = useState(null);
  const [loading, setLoading] = useState(false);

  const activeFarm = farms?.find((f) => f.coordinates?.latitude && f.coordinates?.longitude) || farms?.[0] || null;

  useEffect(() => {
    let isMounted = true;

    if (!activeFarm || !activeFarm.coordinates?.latitude || !activeFarm.coordinates?.longitude) {
      return;
    }

    const loadWeather = async () => {
      try {
        setLoading(true);
        const res = await weatherService.getFarmWeather(activeFarm._id || activeFarm.id);
        if (isMounted && res.success && res.weather) {
          setWeather(res.weather);
        }
      } catch {
        // Fail silently for dashboard preview
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadWeather();

    return () => {
      isMounted = false;
    };
  }, [activeFarm]);

  if (!farms || farms.length === 0) return null;

  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[#166534] to-[#145A32] text-white shadow-2xs">
            <CloudSun className="h-5 w-5 text-[#22C55E]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                Farm Micro-Climate &amp; Weather
              </h3>
              <Badge size="sm" variant={weather ? 'forest' : 'neutral'}>
                {weather ? 'Live Telemetry' : 'Coordinates Pending'}
              </Badge>
            </div>
            {activeFarm && (
              <p className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                <MapPin className="h-3 w-3 text-[#166534]" />
                <span>{activeFarm.name} ({activeFarm.location})</span>
              </p>
            )}
          </div>
        </div>

        <Link
          to="/dashboard/weather"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-[#166534] hover:text-[#145A32] transition-colors self-start sm:self-center"
        >
          <span>7-Day Weather Advisory</span>
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      {loading ? (
        <div className="py-4 flex items-center justify-center text-xs text-slate-400 animate-pulse">
          Retrieving live satellite weather data...
        </div>
      ) : weather ? (
        <div className="pt-3.5 grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-2.5 rounded-xl bg-[#F7F9F5]">
            <span className="text-[10px] font-bold text-slate-400 uppercase">Temperature</span>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <span className="text-2xl font-black text-[#17251B]">
                {weather.current.temperature}°C
              </span>
              <span className="text-[11px] text-slate-500 capitalize truncate">
                {weather.current.condition}
              </span>
            </div>
          </div>

          <div className="p-2.5 rounded-xl bg-[#F7F9F5]">
            <span className="text-[10px] font-bold text-slate-400 uppercase">Humidity</span>
            <div className="flex items-baseline gap-1 mt-0.5">
              <Droplets className="h-4 w-4 text-blue-500" />
              <span className="text-2xl font-black text-slate-800">
                {weather.current.humidity}%
              </span>
            </div>
          </div>

          <div className="p-2.5 rounded-xl bg-[#F7F9F5]">
            <span className="text-[10px] font-bold text-slate-400 uppercase">Wind Velocity</span>
            <div className="flex items-baseline gap-1 mt-0.5">
              <Wind className="h-4 w-4 text-emerald-600" />
              <span className="text-2xl font-black text-slate-800">
                {weather.current.windSpeed}
              </span>
              <span className="text-[10px] text-slate-400">km/h</span>
            </div>
          </div>

          <div className="p-2.5 rounded-xl bg-[#F7F9F5]">
            <span className="text-[10px] font-bold text-slate-400 uppercase">7-Day Rain</span>
            <div className="flex items-baseline gap-1 mt-0.5">
              <CloudRain className="h-4 w-4 text-blue-600" />
              <span className="text-2xl font-black text-blue-700">
                {weather.rainfallSummary?.sevenDayTotalMm || 0}
              </span>
              <span className="text-[10px] text-slate-400">mm</span>
            </div>
          </div>
        </div>
      ) : (
        <div className="pt-3 flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />
            <span>Farm GPS coordinates required to compute hyper-local agro-meteorology.</span>
          </div>
          <Link
            to="/dashboard/weather"
            className="text-xs font-bold text-[#166534] hover:underline"
          >
            Configure GPS Coordinates &rarr;
          </Link>
        </div>
      )}
    </div>
  );
};

export default WeatherSummaryCard;
