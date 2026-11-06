import { useState } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import Card, { CardHeader } from '../common/Card.jsx';
import Badge from '../common/Badge.jsx';

// Sample demonstration dataset representing a 24-hour sensor cycle
const telemetryData = [
  { time: '00:00', moisture: 44, temp: 21, humidity: 75 },
  { time: '03:00', moisture: 43, temp: 19, humidity: 78 },
  { time: '06:00', moisture: 42, temp: 20, humidity: 82 },
  { time: '09:00', moisture: 40, temp: 25, humidity: 65 },
  { time: '12:00', moisture: 38, temp: 29, humidity: 54 },
  { time: '15:00', moisture: 42, temp: 28, humidity: 56 },
  { time: '18:00', moisture: 45, temp: 24, humidity: 66 },
  { time: '21:00', moisture: 44, temp: 22, humidity: 72 },
];

export const TelemetryChart = () => {
  const [activeMetric, setActiveMetric] = useState('moisture');

  const metricConfigs = {
    moisture: {
      label: 'Soil Moisture',
      unit: '%',
      color: '#166534',
      gradientId: 'moistureGrad',
      domain: [20, 60],
    },
    temp: {
      label: 'Soil Temperature',
      unit: '°C',
      color: '#EA580C',
      gradientId: 'tempGrad',
      domain: [15, 35],
    },
    humidity: {
      label: 'Ambient Humidity',
      unit: '%',
      color: '#0284C7',
      gradientId: 'humidityGrad',
      domain: [40, 100],
    },
  };

  const current = metricConfigs[activeMetric];

  return (
    <Card className="col-span-12 lg:col-span-8">
      <CardHeader
        title="24-Hour Field Telemetry Trends"
        subtitle="Simulated 24-hour cycle preview across Field Sector A"
        action={
          <div className="flex items-center gap-2">
            <Badge size="sm" variant="warning">
              DEMO / SIMULATED
            </Badge>
          </div>
        }
      />

      {/* Metric Selector Buttons */}
      <div className="flex flex-wrap items-center gap-2 mb-6">
        <button
          type="button"
          onClick={() => setActiveMetric('moisture')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
            activeMetric === 'moisture'
              ? 'bg-[#166534] text-white shadow-xs'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          Soil Moisture (%)
        </button>
        <button
          type="button"
          onClick={() => setActiveMetric('temp')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
            activeMetric === 'temp'
              ? 'bg-[#EA580C] text-white shadow-xs'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          Temperature (°C)
        </button>
        <button
          type="button"
          onClick={() => setActiveMetric('humidity')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
            activeMetric === 'humidity'
              ? 'bg-[#0284C7] text-white shadow-xs'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          Humidity (%)
        </button>
      </div>

      {/* Chart Canvas */}
      <div className="h-64 sm:h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={telemetryData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="moistureGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#166534" stopOpacity={0.35} />
                <stop offset="95%" stopColor="#166534" stopOpacity={0.0} />
              </linearGradient>
              <linearGradient id="tempGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#EA580C" stopOpacity={0.35} />
                <stop offset="95%" stopColor="#EA580C" stopOpacity={0.0} />
              </linearGradient>
              <linearGradient id="humidityGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#0284C7" stopOpacity={0.35} />
                <stop offset="95%" stopColor="#0284C7" stopOpacity={0.0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
            <XAxis
              dataKey="time"
              stroke="#94A3B8"
              fontSize={11}
              tickLine={false}
              axisLine={{ stroke: '#E2E8F0' }}
            />
            <YAxis
              domain={current.domain}
              stroke="#94A3B8"
              fontSize={11}
              tickLine={false}
              axisLine={false}
              unit={current.unit}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#FFFFFF',
                borderRadius: '8px',
                border: '1px solid #E2E8F0',
                boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                fontSize: '12px',
              }}
              formatter={(val) => [`${val}${current.unit}`, current.label]}
              labelFormatter={(label) => `Timestamp: ${label}`}
            />
            <Area
              type="monotone"
              dataKey={activeMetric}
              stroke={current.color}
              strokeWidth={2.5}
              fillOpacity={1}
              fill={`url(#${current.gradientId})`}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
};

export default TelemetryChart;

