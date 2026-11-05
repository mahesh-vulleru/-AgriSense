import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import Card from '../common/Card.jsx';
import Badge from '../common/Badge.jsx';

export const MetricCard = ({
  title,
  value,
  unit,
  icon: Icon,
  trend,
  trendValue,
  status = 'neutral',
  statusText,
  subtitle,
}) => {
  return (
    <Card hover padding="p-5" className="relative overflow-hidden">
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            {title}
          </p>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl sm:text-3xl font-extrabold text-[#17251B] tracking-tight">
              {value}
            </span>
            {unit && <span className="text-sm font-semibold text-slate-500">{unit}</span>}
          </div>
        </div>

        {Icon && (
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#DCFCE7] text-[#166534] shadow-xs">
            <Icon className="h-5 w-5" />
          </div>
        )}
      </div>

      <div className="mt-4 flex items-center justify-between pt-3 border-t border-slate-100 text-xs">
        {statusText && (
          <Badge size="sm" variant={status} dot>
            {statusText}
          </Badge>
        )}

        {trend && (
          <div
            className={`flex items-center gap-1 font-medium ${
              trend === 'up'
                ? 'text-emerald-600'
                : trend === 'down'
                ? 'text-rose-600'
                : 'text-slate-500'
            }`}
          >
            {trend === 'up' && <TrendingUp className="h-3.5 w-3.5" />}
            {trend === 'down' && <TrendingDown className="h-3.5 w-3.5" />}
            {trend === 'neutral' && <Minus className="h-3.5 w-3.5" />}
            <span>{trendValue}</span>
          </div>
        )}

        {subtitle && !trend && <span className="text-slate-400">{subtitle}</span>}
      </div>
    </Card>
  );
};

export default MetricCard;

