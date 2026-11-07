import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  MessageSquare,
  Users,
  CheckCircle2,
  Clock,
  Sparkles,
  Send,
  Sprout,
} from 'lucide-react';
import Button from '../../components/common/Button.jsx';
import Badge from '../../components/common/Badge.jsx';
import { useAuth } from '../../hooks/useAuth.js';
import consultationService from '../../services/consultationService.js';

function formatKolkataTime(isoString) {
  if (!isoString) return '';
  const d = new Date(isoString);
  return d.toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

export const ExpertDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [selectedTab, setSelectedTab] = useState('pending');
  const [consultations, setConsultations] = useState([]);
  const [summary, setSummary] = useState({
    total: 0,
    assigned: 0,
    open: 0,
    active: 0,
    completed: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let ignore = false;
    const fetchQueue = async () => {
      try {
        const res = await consultationService.getExpertConsultations({
          status: selectedTab === 'pending' ? 'pending' : selectedTab === 'history' ? 'completed' : 'all',
        });
        if (!ignore && res?.success && res.data) {
          setConsultations(res.data.consultations || []);
          if (res.data.summary) {
            setSummary(res.data.summary);
          }
        }
      } catch (err) {
        console.error('[EXPERT_DASHBOARD_FETCH_ERROR]', err);
      } finally {
        if (!ignore) setLoading(false);
      }
    };

    fetchQueue();

    return () => {
      ignore = true;
    };
  }, [selectedTab]);

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
              {user?.expertProfile?.specialization || 'AGRONOMY SPECIALIST'}
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
          <div className="text-2xl font-black text-[#17251B]">
            {summary.open + summary.assigned || 0}
          </div>
          <p className="text-[11px] text-amber-600 mt-1 font-medium">Requires agronomist response</p>
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold mb-2">
            <span>Resolved Advisories</span>
            <div className="h-8 w-8 rounded-lg bg-emerald-50 text-[#166534] flex items-center justify-center">
              <CheckCircle2 className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-[#17251B]">{summary.completed || 0}</div>
          <p className="text-[11px] text-emerald-600 mt-1 font-medium">98.4% satisfaction rating</p>
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold mb-2">
            <span>Active Sessions</span>
            <div className="h-8 w-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <Users className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-[#17251B]">{summary.active || 0}</div>
          <p className="text-[11px] text-slate-500 mt-1 font-medium">Live Q&amp;A in progress</p>
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold mb-2">
            <span>Total Lifetime Cases</span>
            <div className="h-8 w-8 rounded-lg bg-emerald-50 text-[#166534] flex items-center justify-center">
              <Sparkles className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-[#17251B]">{summary.total || 0}</div>
          <p className="text-[11px] text-emerald-600 mt-1 font-medium">Verified advisories</p>
        </div>
      </div>

      {/* Advisory Queue Section */}
      <div className="rounded-2xl border border-slate-200/80 bg-white overflow-hidden shadow-xs">
        <div className="px-6 py-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-bold text-[#17251B]">Farmer Consultation Queue</h2>
            <Badge size="sm" variant="forest">
              {consultations.length} {selectedTab === 'pending' ? 'Action Required' : 'Cases'}
            </Badge>
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

        {loading ? (
          <div className="p-8 text-center text-xs text-slate-500">
            <div className="w-6 h-6 border-2 border-[#166534] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            Loading advisory inquiries...
          </div>
        ) : consultations.length === 0 ? (
          <div className="p-10 text-center text-slate-400 space-y-2">
            <MessageSquare className="w-8 h-8 stroke-1 mx-auto text-slate-300" />
            <p className="text-xs font-bold text-slate-600">No consultations in this category</p>
            <p className="text-[11px]">
              {selectedTab === 'pending'
                ? 'All farmer inquiries have been assigned or resolved.'
                : 'No historical closed consultations on record yet.'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {consultations.map((q) => {
              const qId = q._id || q.id;
              const isUrgent = q.priority === 'Urgent' || q.priority === 'High';

              return (
                <div key={qId} className="p-5 hover:bg-slate-50/70 transition-colors">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-bold text-[#166534] bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
                        {q.referenceId}
                      </span>
                      <span className="text-xs font-bold text-[#17251B]">
                        {q.farmer?.name || 'Farmer'}
                      </span>
                      {q.farm?.name && (
                        <span className="text-xs text-slate-400">&bull; {q.farm.name}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge
                        size="sm"
                        variant={isUrgent ? 'danger' : 'neutral'}
                      >
                        {q.priority} Urgency
                      </Badge>
                      <span className="text-[11px] text-slate-400">
                        {formatKolkataTime(q.createdAt)}
                      </span>
                    </div>
                  </div>

                  <div className="text-xs font-medium text-slate-700 mb-3 bg-slate-50 p-3 rounded-xl border border-slate-200/60">
                    <div className="text-[11px] font-bold text-slate-400 uppercase mb-1">
                      Crop: {q.crop?.name || q.crop?.cropName || 'Field Crop'} &bull; Attached Photos:{' '}
                      {q.attachments?.length || 0}
                    </div>
                    <h4 className="font-bold text-slate-900 mb-0.5">{q.subject}</h4>
                    <p className="text-slate-600 line-clamp-2">{q.description}</p>
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      {q.diseaseScan ? (
                        <>
                          <Sparkles className="h-3.5 w-3.5 text-indigo-600" />
                          <span className="text-indigo-900 font-semibold">
                            AI Pre-diagnosis: {q.diseaseScan.diseaseName || 'Scan attached'} (
                            {((q.diseaseScan.confidence || 0.85) * 100).toFixed(0)}%)
                          </span>
                        </>
                      ) : (
                        <>
                          <Sprout className="h-3.5 w-3.5 text-[#166534]" />
                          <span>Category: {q.category}</span>
                        </>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="primary"
                        size="sm"
                        icon={Send}
                        onClick={() => navigate(`/expert/consultations/${qId}`)}
                      >
                        Open Workspace
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default ExpertDashboard;
