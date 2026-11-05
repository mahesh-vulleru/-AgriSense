import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Calendar,
  Layers,
  Sparkles,
  Tractor,
  LayoutDashboard,
  ShieldCheck,
} from 'lucide-react';
import Button from './Button.jsx';
import Badge from './Badge.jsx';

export const ModulePlaceholder = ({
  title,
  subtitle,
  category = 'Precision Farming',
  phase = 'Upcoming Module',
  icon: Icon = Layers,
  features = [],
  primaryAction,
  returnPath = '/dashboard',
  returnLabel = 'Return to Dashboard',
}) => {
  const navigate = useNavigate();

  return (
    <div className="space-y-6">
      {/* Top Navigation & Breadcrumb */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200/70">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors cursor-pointer"
            aria-label="Go back"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                {category}
              </span>
              <span>&bull;</span>
              <Badge size="sm" variant="forest" className="font-semibold">
                {phase}
              </Badge>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-[#17251B] tracking-tight">
              {title}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            icon={LayoutDashboard}
            onClick={() => navigate(returnPath)}
            className="bg-white shadow-2xs"
          >
            {returnLabel}
          </Button>
          <Link to="/dashboard/farms">
            <Button variant="secondary" size="sm" icon={Tractor}>
              My Farms
            </Button>
          </Link>
        </div>
      </div>

      {/* Main Architecture & Roadmap Showcase Card */}
      <div className="relative overflow-hidden rounded-2xl border border-emerald-900/10 bg-white p-6 sm:p-8 shadow-xs">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 h-64 w-64 rounded-full bg-emerald-500/5 blur-3xl pointer-events-none" />

        <div className="flex flex-col md:flex-row items-start md:items-center gap-6 pb-6 border-b border-slate-100">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-[#166534] to-[#145A32] text-white shadow-md shrink-0">
            <Icon className="h-8 w-8 text-[#22C55E]" />
          </div>

          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-lg font-bold text-[#145A32]">
                Architectural Specification Ready
              </span>
              <Badge size="sm" variant="success" dot>
                Roadmap Active
              </Badge>
            </div>
            <p className="text-sm text-slate-600 max-w-2xl leading-relaxed">
              {subtitle ||
                'This module is architected in the application workflow and will connect live telemetry, MongoDB entities, and responsive UI components in the next phase.'}
            </p>
          </div>
        </div>

        {/* Feature Roadmap Matrix */}
        {features && features.length > 0 && (
          <div className="mt-6">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3 flex items-center gap-2">
              <Sparkles className="h-3.5 w-3.5 text-[#166534]" />
              Engineered Capabilities in this Module
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {features.map((feature) => (
                <div
                  key={feature.title || feature}
                  className="rounded-xl border border-slate-200/80 bg-slate-50/60 p-3.5 hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-start gap-2.5">
                    <ShieldCheck className="h-4 w-4 text-[#166534] shrink-0 mt-0.5" />
                    <div>
                      <h3 className="text-xs font-bold text-[#17251B]">
                        {feature.title || feature}
                      </h3>
                      {feature.desc && (
                        <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                          {feature.desc}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Action Callout */}
        <div className="mt-8 pt-6 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <Calendar className="h-4 w-4 text-slate-400" />
            <span>Phased rollout adheres to the 15-screen AgriSense UI specification</span>
          </div>

          {primaryAction && (
            <Button
              variant="primary"
              size="sm"
              icon={primaryAction.icon || Sparkles}
              onClick={primaryAction.onClick}
            >
              {primaryAction.label}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ModulePlaceholder;

