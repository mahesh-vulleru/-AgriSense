import { AlertCircle, CheckCircle, Info } from 'lucide-react';
import Card, { CardHeader } from '../common/Card.jsx';
import Badge from '../common/Badge.jsx';

const sampleAlerts = [
  {
    id: 1,
    title: 'Automated Irrigation Cycle Scheduled',
    message: 'Sector B moisture dipped to 33%. Drip irrigation will activate at 16:30.',
    type: 'warning',
    time: '12 min ago',
    icon: AlertCircle,
  },
  {
    id: 2,
    title: 'Optimal Foliar Spray Window',
    message: 'Low wind speed and ideal 22°C ambient temperature predicted tomorrow morning.',
    type: 'info',
    time: '45 min ago',
    icon: Info,
  },
  {
    id: 3,
    title: 'Sensor Node #04 Self-Check Passed',
    message: 'Battery level 94%, signal RSSI -58 dBm, calibration verified.',
    type: 'success',
    time: '2 hours ago',
    icon: CheckCircle,
  },
];

export const AlertsList = () => {
  return (
    <Card className="col-span-12 lg:col-span-6">
      <CardHeader
        title="Field Alerts & Advisory"
        subtitle="Intelligent agro-climatic advisories"
        action={
          <div className="flex items-center gap-2">
            <Badge size="sm" variant="neutral">
              Sample Data
            </Badge>
          </div>
        }
      />

      <div className="space-y-3">
        {sampleAlerts.map((alert) => {
          const Icon = alert.icon;
          const bgColors = {
            warning: 'bg-amber-50 border-amber-200 text-amber-800',
            info: 'bg-sky-50 border-sky-200 text-sky-800',
            success: 'bg-emerald-50 border-emerald-200 text-emerald-800',
          };
          const iconColors = {
            warning: 'text-amber-600',
            info: 'text-sky-600',
            success: 'text-emerald-600',
          };

          return (
            <div
              key={alert.id}
              className={`p-3.5 rounded-xl border flex items-start gap-3 transition-shadow hover:shadow-2xs ${
                bgColors[alert.type]
              }`}
            >
              <div className={`mt-0.5 shrink-0 ${iconColors[alert.type]}`}>
                <Icon className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline justify-between gap-2">
                  <h4 className="text-xs font-bold leading-tight truncate">{alert.title}</h4>
                  <span className="text-[10px] text-slate-400 shrink-0">{alert.time}</span>
                </div>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">{alert.message}</p>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
};

export default AlertsList;
