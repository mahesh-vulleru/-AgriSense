import { Droplets, FileText, Wrench, ShieldAlert, Tractor } from 'lucide-react';
import { Link } from 'react-router-dom';
import Card, { CardHeader } from '../common/Card.jsx';
import Badge from '../common/Badge.jsx';

export const QuickActions = () => {
  return (
    <Card className="col-span-12 lg:col-span-6">
      <CardHeader
        title="Quick Field Operations"
        subtitle="One-click actions and field controls"
        action={
          <Badge size="sm" variant="forest">
            Operations
          </Badge>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Link
          to="/dashboard/farms"
          className="flex items-center gap-3 p-3.5 rounded-xl border border-slate-200/80 bg-white hover:bg-[#F7F9F5] hover:border-[#166534] text-left transition-all group cursor-pointer"
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-[#166534] group-hover:bg-[#166534] group-hover:text-white transition-colors">
            <Tractor className="h-5 w-5" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-[#17251B]">Manage My Farms</h4>
            <p className="text-[11px] text-slate-500 mt-0.5">View &amp; register farm plots</p>
          </div>
        </Link>

        <button
          type="button"
          onClick={() => alert('Demo action: Irrigation trigger signal sent')}
          className="flex items-center gap-3 p-3.5 rounded-xl border border-slate-200/80 bg-white hover:bg-[#F7F9F5] hover:border-[#22C55E] text-left transition-all group cursor-pointer"
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-[#166534] group-hover:bg-[#166534] group-hover:text-white transition-colors">
            <Droplets className="h-5 w-5" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-[#17251B]">Activate Drip Cycle</h4>
            <p className="text-[11px] text-slate-500 mt-0.5">Start 20m pulse in Sector B</p>
          </div>
        </button>

        <button
          type="button"
          onClick={() => alert('Demo action: Inspection report dialog')}
          className="flex items-center gap-3 p-3.5 rounded-xl border border-slate-200/80 bg-white hover:bg-[#F7F9F5] hover:border-[#166534] text-left transition-all group cursor-pointer"
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-700 group-hover:bg-[#166534] group-hover:text-white transition-colors">
            <FileText className="h-5 w-5" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-[#17251B]">Log Field Inspection</h4>
            <p className="text-[11px] text-slate-500 mt-0.5">Record notes and crop photos</p>
          </div>
        </button>

        <button
          type="button"
          onClick={() => alert('Demo action: Calibration routine triggered')}
          className="flex items-center gap-3 p-3.5 rounded-xl border border-slate-200/80 bg-white hover:bg-[#F7F9F5] hover:border-[#166534] text-left transition-all group cursor-pointer"
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-700 group-hover:bg-[#166534] group-hover:text-white transition-colors">
            <Wrench className="h-5 w-5" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-[#17251B]">Sensor Calibration</h4>
            <p className="text-[11px] text-slate-500 mt-0.5">Zero-point soil probe sync</p>
          </div>
        </button>

        <button
          type="button"
          onClick={() => alert('Demo action: Emergency stop')}
          className="flex items-center gap-3 p-3.5 rounded-xl border border-rose-200 bg-rose-50/40 hover:bg-rose-50 text-left transition-all group cursor-pointer"
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-rose-100 text-rose-700 group-hover:bg-rose-600 group-hover:text-white transition-colors">
            <ShieldAlert className="h-5 w-5" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-rose-900">Emergency Stop</h4>
            <p className="text-[11px] text-rose-600/80 mt-0.5">Halt all valves & pumps</p>
          </div>
        </button>
      </div>
    </Card>
  );
};

export default QuickActions;
