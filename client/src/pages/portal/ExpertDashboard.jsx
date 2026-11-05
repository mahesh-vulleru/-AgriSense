import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  MessageSquare,
  Users,
  CheckCircle2,
  Clock,
  Sparkles,
  Send,
  Search,
} from 'lucide-react';
import Button from '../../components/common/Button.jsx';
import Badge from '../../components/common/Badge.jsx';
import { useAuth } from '../../hooks/useAuth.js';

export const ExpertDashboard = () => {
  const { user } = useAuth();
  const [selectedTab, setSelectedTab] = useState('pending');

  const pendingQuestions = [
    {
      id: 'Q-1042',
      farmer: 'Ramesh Patel',
      farm: 'Surat Organic Fields (14.2 Acres)',
      crop: 'Cotton (Bt-II)',
      issue: 'Leaf curl virus symptoms observed after sudden temperature rise',
      urgency: 'High',
      submittedAt: '2 hours ago',
      images: 2,
    },
    {
      id: 'Q-1043',
      farmer: 'Sunita Sharma',
      farm: 'Punjab Wheat Estate (32.0 Acres)',
      crop: 'Wheat (HD-2967)',
      issue: 'Yellow rust spotting detected on lower foliage in Sector C',
      urgency: 'Medium',
      submittedAt: '4 hours ago',
      images: 3,
    },
    {
      id: 'Q-1044',
      farmer: 'Anand Kumar',
      farm: 'Cauvery Delta Rice Fields (8.5 Acres)',
      crop: 'Paddy (BPT 5204)',
      issue: 'Nitrogen deficiency vs blast disease clarification needed before fertilizer cycle',
      urgency: 'Low',
      submittedAt: 'Yesterday',
      images: 1,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Expert Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-3 border-b border-slate-200/70">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xl sm:text-2xl font-extrabold text-[#17251B] tracking-tight">
              Expert Advisory Hub &bull; {user?.name || 'Dr. Agronomist'}
            </span>
            <Badge size="sm" variant="forest" dot>
              AGRONOMY SPECIALIST
            </Badge>
          </div>
          <p className="text-xs text-slate-500">
            Review incoming farmer diagnostic requests, verify AI disease scans, and provide precision advisories.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Link to="/expert/consultations">
            <Button variant="primary" size="sm" icon={MessageSquare}>
              Open Consultations Queue
            </Button>
          </Link>
        </div>
      </div>

      {/* KPI Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold mb-2">
            <span>Pending Inquiries</span>
            <div className="h-8 w-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <Clock className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-[#17251B]">3</div>
          <p className="text-[11px] text-amber-600 mt-1 font-medium">Requires agronomist response</p>
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold mb-2">
            <span>Resolved Advisories</span>
            <div className="h-8 w-8 rounded-lg bg-emerald-50 text-[#166534] flex items-center justify-center">
              <CheckCircle2 className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-[#17251B]">48</div>
          <p className="text-[11px] text-emerald-600 mt-1 font-medium">98.4% satisfaction rating</p>
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold mb-2">
            <span>Assigned Farmers</span>
            <div className="h-8 w-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <Users className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-[#17251B]">19</div>
          <p className="text-[11px] text-slate-500 mt-1 font-medium">Across 4 agro-climatic zones</p>
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold mb-2">
            <span>AI Scans Reviewed</span>
            <div className="h-8 w-8 rounded-lg bg-emerald-50 text-[#166534] flex items-center justify-center">
              <Sparkles className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-[#17251B]">64</div>
          <p className="text-[11px] text-emerald-600 mt-1 font-medium">AI model verified</p>
        </div>
      </div>

      {/* Advisory Queue Section */}
      <div className="rounded-2xl border border-slate-200/80 bg-white overflow-hidden shadow-xs">
        <div className="px-6 py-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-bold text-[#17251B]">Farmer Consultation Queue</h2>
            <Badge size="sm" variant="forest">3 Action Required</Badge>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setSelectedTab('pending')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                selectedTab === 'pending'
                  ? 'bg-[#166534] text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Pending Inquiries
            </button>
            <button
              type="button"
              onClick={() => setSelectedTab('history')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                selectedTab === 'history'
                  ? 'bg-[#166534] text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Consultation History
            </button>
          </div>
        </div>

        <div className="divide-y divide-slate-100">
          {pendingQuestions.map((q) => (
            <div key={q.id} className="p-5 hover:bg-slate-50/70 transition-colors">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-bold text-[#166534] bg-emerald-50 px-2 py-0.5 rounded">
                    {q.id}
                  </span>
                  <span className="text-xs font-bold text-[#17251B]">{q.farmer}</span>
                  <span className="text-xs text-slate-400">&bull; {q.farm}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge
                    size="sm"
                    variant={q.urgency === 'High' ? 'danger' : q.urgency === 'Medium' ? 'warning' : 'neutral'}
                  >
                    {q.urgency} Urgency
                  </Badge>
                  <span className="text-[11px] text-slate-400">{q.submittedAt}</span>
                </div>
              </div>

              <div className="text-xs font-medium text-slate-700 mb-3 bg-slate-50 p-3 rounded-xl border border-slate-200/60">
                <div className="text-[11px] font-bold text-slate-400 uppercase mb-1">
                  Crop: {q.crop} &bull; Attached Photos: {q.images}
                </div>
                {q.issue}
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <Sparkles className="h-3.5 w-3.5 text-[#166534]" />
                  <span>AI Pre-diagnosis: Potential Leaf Rust (Confidence: 89%)</span>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    icon={Search}
                    onClick={() => alert(`Reviewing diagnostics for case ${q.id}`)}
                  >
                    Inspect Telemetry
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    icon={Send}
                    onClick={() => alert(`Opening advisory response draft for ${q.farmer}`)}
                  >
                    Provide Guidance
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ExpertDashboard;
