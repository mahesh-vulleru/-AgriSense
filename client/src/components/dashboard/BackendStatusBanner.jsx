import { CheckCircle2, AlertTriangle, RefreshCw, Server } from 'lucide-react';
import { useHealth } from '../../hooks/useHealth.js';
import Button from '../common/Button.jsx';
import Badge from '../common/Badge.jsx';

export const BackendStatusBanner = () => {
  const { status, healthData, error, latency, lastChecked, checkNow } = useHealth();

  if (status === 'connected') {
    return (
      <div className="mb-6 rounded-xl border border-emerald-200 bg-emerald-50/60 p-4 shadow-2xs">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#166534] text-white">
              <CheckCircle2 className="h-5 w-5 text-[#22C55E]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-[#145A32]">
                  AgriSense API & MongoDB Connected
                </span>
                <Badge size="sm" variant="forest" dot>
                  Live
                </Badge>
              </div>
              <p className="text-xs text-emerald-800/80 mt-0.5">
                {healthData?.message || 'AgriSense API is running'} &bull; Database:{' '}
                <span className="font-semibold">{healthData?.database?.name || 'agrisense'}</span> &bull; Latency: {latency}ms
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 self-end sm:self-auto">
            <span className="text-[11px] text-slate-500 hidden md:inline">
              Checked: {lastChecked ? lastChecked.toLocaleTimeString() : 'Just now'}
            </span>
            <Button
              variant="outline"
              size="sm"
              icon={RefreshCw}
              onClick={checkNow}
              className="!border-emerald-300 !text-[#145A32] hover:!bg-emerald-100/60"
            >
              Ping API
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (status === 'loading') {
    return (
      <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50/70 p-4 shadow-2xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-500 text-white animate-pulse">
              <Server className="h-5 w-5" />
            </div>
            <div>
              <span className="text-sm font-semibold text-amber-900">
                Verifying Backend Connection...
              </span>
              <p className="text-xs text-amber-700 mt-0.5">
                Pinging GET /api/health to confirm backend and database readiness.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mb-6 rounded-xl border border-rose-200 bg-rose-50/80 p-4 shadow-2xs">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-rose-600 text-white">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-rose-900">
                Backend API Disconnected
              </span>
              <Badge size="sm" variant="danger" dot>
                Offline
              </Badge>
            </div>
            <p className="text-xs text-rose-700 mt-0.5">
              {error || 'Unable to reach AgriSense backend server at http://localhost:5000/api/health'}
            </p>
          </div>
        </div>
        <Button
          variant="danger"
          size="sm"
          icon={RefreshCw}
          onClick={checkNow}
          className="self-end sm:self-auto cursor-pointer"
        >
          Retry Connection
        </Button>
      </div>
    </div>
  );
};

export default BackendStatusBanner;
