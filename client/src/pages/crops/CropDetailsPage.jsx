import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  Sprout,
  ArrowLeft,
  Tractor,
  AlertTriangle,
  Edit,
  TrendingUp,
  Plus,
  Archive,
  Check,
} from 'lucide-react';
import cropService from '../../services/cropService.js';
import Button from '../../components/common/Button.jsx';
import Badge from '../../components/common/Badge.jsx';
import Modal from '../../components/common/Modal.jsx';
import { GROWTH_STAGES, STAGE_CONFIG } from '../../constants/cropConstants.js';

export default function CropDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [crop, setCrop] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('history'); // 'history' | 'calendar' | 'harvest' | 'parcel'

  // Modal States
  const [showStageModal, setShowStageModal] = useState(false);
  const [stageForm, setStageForm] = useState({ stage: '', notes: '', transitionDate: '' });
  const [submittingStage, setSubmittingStage] = useState(false);

  const [showHarvestModal, setShowHarvestModal] = useState(false);
  const [harvestForm, setHarvestForm] = useState({
    actualYield: '',
    yieldUnit: 'kg',
    qualityGrade: 'Grade A',
    harvestDate: new Date().toISOString().split('T')[0],
    harvestNotes: '',
  });
  const [submittingHarvest, setSubmittingHarvest] = useState(false);

  const [showMilestoneModal, setShowMilestoneModal] = useState(false);
  const [milestoneForm, setMilestoneForm] = useState({
    activity: '',
    category: 'General',
    targetDate: '',
    notes: '',
  });
  const [submittingMilestone, setSubmittingMilestone] = useState(false);

  const openStageModal = (targetStage = null) => {
    setStageForm({
      stage: targetStage || crop?.growthStage || 'Vegetative Growth',
      notes: '',
      transitionDate: new Date().toISOString().split('T')[0],
    });
    setShowStageModal(true);
  };

  useEffect(() => {
    let active = true;
    async function loadData() {
      try {
        const res = await cropService.getCropById(id);
        if (active && res.success && res.crop) {
          setCrop(res.crop);
          setStageForm((prev) => {
            if (!prev.stage) {
              return {
                stage: res.crop.growthStage || 'Vegetative Growth',
                notes: '',
                transitionDate: new Date().toISOString().split('T')[0],
              };
            }
            return prev;
          });
          setHarvestForm((prev) => ({
            ...prev,
            yieldUnit: res.crop.yieldUnit || prev.yieldUnit || 'kg',
          }));
        }
      } catch (err) {
        if (active) setError(err.response?.data?.message || 'Failed to load crop details');
      } finally {
        if (active) setLoading(false);
      }
    }
    loadData();
    return () => {
      active = false;
    };
  }, [id]);

  // Handle Stage Update Submit
  const handleStageSubmit = async (e) => {
    e.preventDefault();
    try {
      setSubmittingStage(true);
      const res = await cropService.updateCropStage(id, stageForm);
      if (res.success) {
        setCrop(res.crop);
        setShowStageModal(false);
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update growth stage');
    } finally {
      setSubmittingStage(false);
    }
  };

  // Handle Harvest Record Submit
  const handleHarvestSubmit = async (e) => {
    e.preventDefault();
    const yieldNum = parseFloat(harvestForm.actualYield);
    if (isNaN(yieldNum) || yieldNum < 0) {
      alert('Please enter a valid positive harvest yield');
      return;
    }
    try {
      setSubmittingHarvest(true);
      const res = await cropService.recordHarvest(id, {
        ...harvestForm,
        actualYield: yieldNum,
      });
      if (res.success) {
        setCrop(res.crop);
        setShowHarvestModal(false);
        setActiveTab('harvest');
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to record harvest');
    } finally {
      setSubmittingHarvest(false);
    }
  };

  // Handle Add Calendar Milestone
  const handleMilestoneSubmit = async (e) => {
    e.preventDefault();
    if (!milestoneForm.activity.trim() || !milestoneForm.targetDate) {
      alert('Please provide activity name and target date');
      return;
    }
    try {
      setSubmittingMilestone(true);
      const res = await cropService.addCalendarMilestone(id, milestoneForm);
      if (res.success) {
        setCrop((prev) => ({ ...prev, calendar: res.calendar }));
        setShowMilestoneModal(false);
        setMilestoneForm({ activity: '', category: 'General', targetDate: '', notes: '' });
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to add milestone');
    } finally {
      setSubmittingMilestone(false);
    }
  };

  // Handle Toggle Milestone Completed
  const handleToggleMilestone = async (milestoneId, currentCompleted) => {
    try {
      const res = await cropService.updateCalendarMilestone(id, milestoneId, {
        completed: !currentCompleted,
      });
      if (res.success) {
        setCrop((prev) => ({ ...prev, calendar: res.calendar }));
      }
    } catch (err) {
      console.error('[TOGGLE_MILESTONE_ERROR]', err);
    }
  };

  // Handle Archive
  const handleArchiveCrop = async () => {
    if (!window.confirm(`Are you sure you want to archive "${crop.name}"?`)) return;
    try {
      const res = await cropService.archiveCrop(id);
      if (res.success) {
        navigate('/dashboard/crops');
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to archive crop');
    }
  };

  const formatDate = (dateVal) => {
    if (!dateVal) return 'Not set';
    try {
      const d = new Date(dateVal);
      if (isNaN(d.getTime())) return 'Invalid date';
      return d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return 'Not set';
    }
  };

  const currentStageIndex = crop
    ? GROWTH_STAGES.findIndex((s) => s.toLowerCase() === (crop.growthStage || '').toLowerCase())
    : -1;

  if (loading && !crop) {
    return (
      <div className="space-y-6 animate-pulse p-4">
        <div className="h-6 bg-slate-200 rounded w-40" />
        <div className="h-14 bg-slate-200 rounded-2xl" />
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 bg-slate-100 rounded-xl" />
          ))}
        </div>
        <div className="h-64 bg-slate-100 rounded-2xl" />
      </div>
    );
  }

  if (error || !crop) {
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50/80 p-8 text-center max-w-lg mx-auto space-y-4">
        <AlertTriangle className="h-10 w-10 text-rose-600 mx-auto" />
        <h2 className="text-base font-bold text-rose-900">Crop Not Found</h2>
        <p className="text-xs text-rose-700">{error || 'Unable to retrieve crop information.'}</p>
        <Link to="/dashboard/crops">
          <Button variant="outline" size="sm" icon={ArrowLeft} className="bg-white text-xs">
            Back to Crop List
          </Button>
        </Link>
      </div>
    );
  }

  const stageConfig = STAGE_CONFIG[crop.growthStage] || {
    step: 5,
    percent: 45,
    color: '#166534',
    badgeVariant: 'neutral',
  };

  return (
    <div className="space-y-6">
      {/* Top Navigation */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-200">
        <Link
          to="/dashboard/crops"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-[#166534] transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Crop Management
        </Link>
        <div className="flex items-center gap-2">
          <Badge
            size="sm"
            variant={
              crop.status === 'Active'
                ? 'success'
                : crop.status === 'Harvested'
                ? 'info'
                : 'neutral'
            }
            dot
          >
            {crop.status}
          </Badge>
          <span className="text-xs text-slate-400">ID: {crop.id || crop._id}</span>
        </div>
      </div>

      {/* Main Header Banner */}
      <div className="rounded-2xl border border-slate-200/90 bg-white p-5 sm:p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[#166534] to-[#145A32] text-white shadow-xs">
            <Sprout className="h-7 w-7 text-[#22C55E]" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-bold text-[#17251B] tracking-tight">
                {crop.name}
              </h1>
              {crop.variety && (
                <span className="px-2.5 py-0.5 rounded-full bg-[#DCFCE7] text-[#145A32] font-semibold text-xs border border-[#22C55E]/20">
                  {crop.variety}
                </span>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 mt-1">
              <span className="flex items-center gap-1">
                <Tractor className="h-3.5 w-3.5 text-[#166534]" />
                {crop.farm?.name || 'Assigned Parcel'}
              </span>
              <span>•</span>
              <span>Category: <strong className="text-slate-700">{crop.category || 'Cereal'}</strong></span>
              <span>•</span>
              <span>Season: <strong className="text-slate-700">{crop.season || 'Kharif'}</strong></span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => openStageModal()}
            className="text-xs bg-[#DCFCE7] text-[#145A32] border-[#22C55E]/40 hover:bg-[#bbf7d0]"
          >
            Update Stage
          </Button>

          {crop.status !== 'Harvested' && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowHarvestModal(true)}
              className="text-xs bg-sky-50 text-sky-700 border-sky-300 hover:bg-sky-100"
            >
              Record Harvest
            </Button>
          )}

          <Link to={`/dashboard/crops/${crop.id || crop._id}/edit`}>
            <Button variant="outline" size="sm" icon={Edit} className="text-xs bg-white">
              Edit Crop
            </Button>
          </Link>

          <Button
            variant="outline"
            size="sm"
            icon={Archive}
            onClick={handleArchiveCrop}
            className="text-xs bg-white text-rose-600 hover:bg-rose-50 border-rose-200"
            title="Archive Crop"
          />
        </div>
      </div>

      {/* Metric Highlights */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="rounded-xl bg-white border border-slate-200/80 p-4 shadow-2xs">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
            Cultivated Area
          </span>
          <div className="text-2xl font-black text-[#145A32] mt-1">
            {crop.cultivatedArea} <span className="text-sm font-bold text-slate-500">acres</span>
          </div>
          <span className="text-[11px] text-slate-500 mt-0.5 block">
            Method: {crop.irrigationMethod || 'Drip'}
          </span>
        </div>

        <div className="rounded-xl bg-white border border-slate-200/80 p-4 shadow-2xs">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
            Current Stage
          </span>
          <div className="text-lg font-bold text-[#17251B] mt-1 truncate">
            {crop.growthStage}
          </div>
          <span className="text-[11px] text-slate-500 mt-0.5 block">
            Step {stageConfig.step} of 11 ({stageConfig.percent}%)
          </span>
        </div>

        <div className="rounded-xl bg-white border border-slate-200/80 p-4 shadow-2xs">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
            Target Harvest
          </span>
          <div className="text-lg font-bold text-[#17251B] mt-1">
            {formatDate(crop.expectedHarvestDate)}
          </div>
          <span className="text-[11px] text-slate-500 mt-0.5 block">
            Planted: {formatDate(crop.plantingDate)}
          </span>
        </div>

        <div className="rounded-xl bg-white border border-slate-200/80 p-4 shadow-2xs">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
            {crop.status === 'Harvested' ? 'Actual Yield' : 'Est. Total Yield'}
          </span>
          <div className="text-2xl font-black text-[#166534] mt-1">
            {crop.status === 'Harvested' && crop.actualHarvest?.actualYield
              ? `${crop.actualHarvest.actualYield.toLocaleString()} ${crop.actualHarvest.yieldUnit || 'kg'}`
              : crop.estimatedTotalYield
              ? `${crop.estimatedTotalYield.toLocaleString()} ${crop.yieldUnit || 'kg'}`
              : '—'}
          </div>
          <span className="text-[11px] text-slate-500 mt-0.5 block">
            {crop.expectedYieldPerAcre ? `${crop.expectedYieldPerAcre} ${crop.yieldUnit || 'kg'}/acre target` : 'Projected yield'}
          </span>
        </div>
      </div>

      {/* 11-Stage Interactive Lifecycle Visualizer */}
      <div className="rounded-2xl border border-slate-200/90 bg-white p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-3 border-b border-slate-100">
          <div>
            <h2 className="text-base font-bold text-[#17251B] flex items-center gap-2">
              <Sprout className="h-5 w-5 text-[#166534]" />
              Phenological Lifecycle Timeline (11 Stages)
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Click any stage below to record a transition or advance growth milestone
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => openStageModal()}
            className="text-xs bg-white text-[#166534]"
          >
            Advance Stage
          </Button>
        </div>

        {/* Stepper Scroll Container */}
        <div className="overflow-x-auto pb-2 pt-1">
          <div className="flex items-center min-w-[900px] justify-between relative px-2">
            {/* Background Connector Bar */}
            <div className="absolute left-6 right-6 top-4 h-1 bg-slate-200 z-0" />
            <div
              className="absolute left-6 top-4 h-1 bg-[#22C55E] transition-all duration-500 z-0"
              style={{
                width: `${Math.max(0, Math.min(100, (currentStageIndex / (GROWTH_STAGES.length - 1)) * 100))}%`,
              }}
            />

            {GROWTH_STAGES.map((stageName, index) => {
              const isCompleted = currentStageIndex > index;
              const isCurrent = currentStageIndex === index;

              return (
                <button
                  key={stageName}
                  type="button"
                  onClick={() => openStageModal(stageName)}
                  className="flex flex-col items-center group relative z-10 focus:outline-none cursor-pointer max-w-[80px]"
                >
                  {/* Step Bubble */}
                  <div
                    className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold transition-all shadow-xs ${
                      isCurrent
                        ? 'bg-[#166534] text-white ring-4 ring-[#DCFCE7] scale-110'
                        : isCompleted
                        ? 'bg-[#22C55E] text-white'
                        : 'bg-white text-slate-400 border-2 border-slate-300 group-hover:border-[#166534]'
                    }`}
                  >
                    {isCompleted ? (
                      <Check className="h-4 w-4 text-white stroke-[3]" />
                    ) : (
                      index + 1
                    )}
                  </div>

                  {/* Stage Label */}
                  <span
                    className={`text-[10px] text-center mt-2 leading-tight transition-colors ${
                      isCurrent
                        ? 'font-extrabold text-[#145A32]'
                        : isCompleted
                        ? 'font-semibold text-slate-700'
                        : 'text-slate-400 group-hover:text-slate-600'
                    }`}
                  >
                    {stageName}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="border-b border-slate-200">
        <nav className="flex space-x-6 text-xs font-bold" aria-label="Tabs">
          <button
            onClick={() => setActiveTab('history')}
            className={`pb-3 px-1 border-b-2 transition-all cursor-pointer ${
              activeTab === 'history'
                ? 'border-[#166534] text-[#166534]'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Transition History ({crop.stageHistory?.length || 0})
          </button>

          <button
            onClick={() => setActiveTab('calendar')}
            className={`pb-3 px-1 border-b-2 transition-all cursor-pointer ${
              activeTab === 'calendar'
                ? 'border-[#166534] text-[#166534]'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Agronomic Calendar ({crop.calendar?.length || 0})
          </button>

          <button
            onClick={() => setActiveTab('harvest')}
            className={`pb-3 px-1 border-b-2 transition-all cursor-pointer ${
              activeTab === 'harvest'
                ? 'border-[#166534] text-[#166534]'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Harvest & Yield Summary
          </button>

          <button
            onClick={() => setActiveTab('parcel')}
            className={`pb-3 px-1 border-b-2 transition-all cursor-pointer ${
              activeTab === 'parcel'
                ? 'border-[#166534] text-[#166534]'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Parcel Context & Soil
          </button>
        </nav>
      </div>

      {/* Tab Content: 1. Transition History */}
      {activeTab === 'history' && (
        <div className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-bold text-[#17251B]">Stage Transition Audit Log</h3>
              <p className="text-xs text-slate-500">
                Timestamped records of all phenological progression milestones
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => openStageModal()}
              className="text-xs bg-white"
            >
              Log New Stage
            </Button>
          </div>

          {(!crop.stageHistory || crop.stageHistory.length === 0) ? (
            <p className="text-xs text-slate-400 py-6 text-center">No stage transitions logged yet.</p>
          ) : (
            <div className="space-y-4 relative pl-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
              {crop.stageHistory
                .slice()
                .reverse()
                .map((historyItem, idx) => (
                  <div key={historyItem._id || idx} className="relative">
                    <div className="absolute -left-6 top-1 h-3 w-3 rounded-full bg-[#166534] ring-4 ring-white" />
                    <div className="rounded-xl border border-slate-200/70 bg-[#F7F9F5] p-3 text-xs space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-[#145A32]">{historyItem.stage}</span>
                        <span className="text-[11px] text-slate-500">
                          {formatDate(historyItem.transitionDate)}
                        </span>
                      </div>
                      {historyItem.notes && (
                        <p className="text-slate-600 leading-relaxed">{historyItem.notes}</p>
                      )}
                      {historyItem.recordedBy && (
                        <span className="text-[10px] text-slate-400 block pt-0.5">
                          Logged by: {historyItem.recordedBy.name || 'Farmer'}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>
      )}

      {/* Tab Content: 2. Agronomic Calendar */}
      {activeTab === 'calendar' && (
        <div className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-bold text-[#17251B]">Milestone Activity Schedule</h3>
              <p className="text-xs text-slate-500">
                Scheduled agronomic interventions, nutrient sprays, and harvest dates
              </p>
            </div>
            <Button
              variant="primary"
              size="sm"
              icon={Plus}
              onClick={() => setShowMilestoneModal(true)}
              className="text-xs shadow-xs"
            >
              Add Milestone
            </Button>
          </div>

          {(!crop.calendar || crop.calendar.length === 0) ? (
            <p className="text-xs text-slate-400 py-6 text-center">
              No milestones scheduled yet. Add an activity to monitor tasks.
            </p>
          ) : (
            <div className="divide-y divide-slate-100">
              {crop.calendar.map((item) => (
                <div
                  key={item._id}
                  className="py-3 flex items-start justify-between gap-3 text-xs"
                >
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      checked={Boolean(item.completed)}
                      onChange={() => handleToggleMilestone(item._id, item.completed)}
                      className="mt-0.5 h-4 w-4 rounded text-[#166534] focus:ring-[#166534] cursor-pointer"
                    />
                    <div>
                      <span
                        className={`font-semibold block ${
                          item.completed ? 'line-through text-slate-400' : 'text-[#17251B]'
                        }`}
                      >
                        {item.activity}
                      </span>
                      {item.notes && (
                        <p className="text-[11px] text-slate-500 mt-0.5">{item.notes}</p>
                      )}
                      <span className="inline-block mt-1 text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                        {item.category || 'General'}
                      </span>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="font-semibold text-slate-700">
                      {formatDate(item.targetDate)}
                    </span>
                    {item.completed && (
                      <span className="block text-[10px] text-emerald-600 font-medium">
                        Completed
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab Content: 3. Harvest Summary */}
      {activeTab === 'harvest' && (
        <div className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-bold text-[#17251B]">Harvest Production & Yield Analytics</h3>
              <p className="text-xs text-slate-500">
                Verified harvest yields, quality grade, and variance against initial targets
              </p>
            </div>
            {crop.status !== 'Harvested' && (
              <Button
                variant="primary"
                size="sm"
                onClick={() => setShowHarvestModal(true)}
                className="text-xs shadow-xs"
              >
                Record Harvest Now
              </Button>
            )}
          </div>

          {crop.actualHarvest?.actualYield ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="rounded-xl border border-sky-200 bg-sky-50/50 p-4">
                <span className="text-[11px] font-semibold text-sky-700 uppercase tracking-wider block">
                  Actual Total Yield
                </span>
                <span className="text-2xl font-black text-sky-900 mt-1 block">
                  {crop.actualHarvest.actualYield.toLocaleString()} {crop.actualHarvest.yieldUnit}
                </span>
                <span className="text-xs text-slate-600 mt-1 block">
                  Harvested on: {formatDate(crop.actualHarvest.harvestDate)}
                </span>
              </div>

              <div className="rounded-xl border border-slate-200 bg-[#F7F9F5] p-4">
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                  Quality Grade
                </span>
                <span className="text-2xl font-black text-[#145A32] mt-1 block">
                  {crop.actualHarvest.qualityGrade || 'Standard'}
                </span>
                <span className="text-xs text-slate-600 mt-1 block">
                  Certified produce quality
                </span>
              </div>

              <div className="rounded-xl border border-slate-200 bg-[#F7F9F5] p-4">
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                  Initial Projected Target
                </span>
                <span className="text-2xl font-black text-slate-800 mt-1 block">
                  {crop.estimatedTotalYield ? `${crop.estimatedTotalYield.toLocaleString()} ${crop.yieldUnit || 'kg'}` : 'N/A'}
                </span>
                {crop.estimatedTotalYield && (
                  <span className="text-xs font-semibold text-emerald-700 mt-1 block">
                    Variance: {(((crop.actualHarvest.actualYield - crop.estimatedTotalYield) / crop.estimatedTotalYield) * 100).toFixed(1)}%
                  </span>
                )}
              </div>

              {crop.actualHarvest.harvestNotes && (
                <div className="col-span-full rounded-xl border border-slate-200 bg-white p-4 text-xs">
                  <span className="font-bold text-slate-700 block mb-1">Harvest Notes:</span>
                  <p className="text-slate-600">{crop.actualHarvest.harvestNotes}</p>
                </div>
              )}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-[#F7F9F5] p-8 text-center max-w-md mx-auto space-y-3">
              <TrendingUp className="h-8 w-8 text-[#166534] mx-auto" />
              <h4 className="text-sm font-bold text-[#17251B]">Harvest Not Yet Recorded</h4>
              <p className="text-xs text-slate-500">
                This crop is currently in active growth. Once mature, record actual yield and produce
                quality to close out the lifecycle.
              </p>
              <Button
                variant="primary"
                size="sm"
                onClick={() => setShowHarvestModal(true)}
                className="text-xs shadow-xs"
              >
                Record Crop Harvest
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Tab Content: 4. Parcel Context */}
      {activeTab === 'parcel' && (
        <div className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-bold text-[#17251B]">Associated Farm Parcel</h3>
              <p className="text-xs text-slate-500">
                Geographical soil and irrigation properties for this field
              </p>
            </div>
            {crop.farm?._id && (
              <Link to={`/dashboard/farms/${crop.farm._id}`}>
                <Button variant="outline" size="sm" className="text-xs bg-white">
                  View Full Parcel Details
                </Button>
              </Link>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div className="p-3 bg-[#F7F9F5] rounded-xl border border-slate-100">
              <span className="font-semibold text-slate-400 block mb-1">Parcel Name & Location</span>
              <span className="font-bold text-slate-800 text-sm block">{crop.farm?.name || 'General Parcel'}</span>
              <span className="text-slate-600 mt-0.5 block">{crop.farm?.location || 'Location not specified'}</span>
            </div>

            <div className="p-3 bg-[#F7F9F5] rounded-xl border border-slate-100">
              <span className="font-semibold text-slate-400 block mb-1">Soil Type & Texture</span>
              <span className="font-bold text-slate-800 text-sm block">{crop.farm?.soilType || 'Loamy'}</span>
              <span className="text-slate-600 mt-0.5 block">Recommended for {crop.category || 'cereal'} cultivation</span>
            </div>

            <div className="p-3 bg-[#F7F9F5] rounded-xl border border-slate-100">
              <span className="font-semibold text-slate-400 block mb-1">Irrigation Infrastructure</span>
              <span className="font-bold text-slate-800 text-sm block">{crop.irrigationMethod || crop.farm?.irrigationType || 'Drip'}</span>
              <span className="text-slate-600 mt-0.5 block">High water-efficiency profile</span>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 1: Update Stage */}
      <Modal
        isOpen={showStageModal}
        onClose={() => setShowStageModal(false)}
        title="Transition Phenological Growth Stage"
        subtitle={crop ? `${crop.name} (${crop.variety || 'Standard'})` : ''}
      >
        <form onSubmit={handleStageSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Target Growth Stage (11 Stages)
            </label>
            <select
              value={stageForm.stage}
              onChange={(e) => setStageForm((prev) => ({ ...prev, stage: e.target.value }))}
              className="w-full rounded-xl border border-slate-200 bg-white p-2.5 font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#166534]"
              required
            >
              {GROWTH_STAGES.map((s, idx) => (
                <option key={s} value={s}>
                  Stage {idx + 1}: {s}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Transition Effective Date
            </label>
            <input
              type="date"
              value={stageForm.transitionDate}
              onChange={(e) => setStageForm((prev) => ({ ...prev, transitionDate: e.target.value }))}
              className="w-full rounded-xl border border-slate-200 bg-white p-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#166534]"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Agronomic Observations & Field Notes
            </label>
            <textarea
              value={stageForm.notes}
              onChange={(e) => setStageForm((prev) => ({ ...prev, notes: e.target.value }))}
              placeholder="e.g. Flower initiation noticed across 70% of rows. Moisture levels optimal."
              rows={3}
              className="w-full rounded-xl border border-slate-200 bg-white p-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#166534]"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowStageModal(false)}
              disabled={submittingStage}
              className="bg-white"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={submittingStage}
              className="shadow-xs"
            >
              {submittingStage ? 'Recording...' : 'Save Stage Transition'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* MODAL 2: Record Harvest */}
      <Modal
        isOpen={showHarvestModal}
        onClose={() => setShowHarvestModal(false)}
        title="Record Harvest Yield"
        subtitle={crop ? `${crop.name} - Mark crop cycle as harvested` : ''}
      >
        <form onSubmit={handleHarvestSubmit} className="space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Actual Total Yield <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                step="0.1"
                min="0"
                value={harvestForm.actualYield}
                onChange={(e) => setHarvestForm((prev) => ({ ...prev, actualYield: e.target.value }))}
                placeholder="e.g. 15400"
                className="w-full rounded-xl border border-slate-200 bg-white p-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#166534]"
                required
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Yield Unit
              </label>
              <select
                value={harvestForm.yieldUnit}
                onChange={(e) => setHarvestForm((prev) => ({ ...prev, yieldUnit: e.target.value }))}
                className="w-full rounded-xl border border-slate-200 bg-white p-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#166534]"
              >
                <option value="kg">kg</option>
                <option value="quintals">quintals</option>
                <option value="tons">tons</option>
                <option value="bags">bags</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Quality Grade
              </label>
              <select
                value={harvestForm.qualityGrade}
                onChange={(e) => setHarvestForm((prev) => ({ ...prev, qualityGrade: e.target.value }))}
                className="w-full rounded-xl border border-slate-200 bg-white p-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#166534]"
              >
                <option value="Grade A">Grade A</option>
                <option value="Grade B">Grade B</option>
                <option value="Grade C">Grade C</option>
                <option value="Premium">Premium</option>
                <option value="Standard">Standard</option>
                <option value="Low">Low</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Harvest Date
              </label>
              <input
                type="date"
                value={harvestForm.harvestDate}
                onChange={(e) => setHarvestForm((prev) => ({ ...prev, harvestDate: e.target.value }))}
                className="w-full rounded-xl border border-slate-200 bg-white p-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#166534]"
                required
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Harvest Notes / Market Destination
            </label>
            <textarea
              value={harvestForm.harvestNotes}
              onChange={(e) => setHarvestForm((prev) => ({ ...prev, harvestNotes: e.target.value }))}
              placeholder="e.g. Moisture level checked at 13.5%. Dispatched to district mandis."
              rows={3}
              className="w-full rounded-xl border border-slate-200 bg-white p-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#166534]"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowHarvestModal(false)}
              disabled={submittingHarvest}
              className="bg-white"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={submittingHarvest}
              className="shadow-xs"
            >
              {submittingHarvest ? 'Saving...' : 'Confirm & Complete Harvest'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* MODAL 3: Add Calendar Milestone */}
      <Modal
        isOpen={showMilestoneModal}
        onClose={() => setShowMilestoneModal(false)}
        title="Schedule Agronomic Milestone"
        subtitle="Add a target field operation or advisory milestone"
      >
        <form onSubmit={handleMilestoneSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Activity Title <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={milestoneForm.activity}
              onChange={(e) => setMilestoneForm((prev) => ({ ...prev, activity: e.target.value }))}
              placeholder="e.g. Second foliar zinc spray, weed removal"
              className="w-full rounded-xl border border-slate-200 bg-white p-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#166534]"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Category
              </label>
              <select
                value={milestoneForm.category}
                onChange={(e) => setMilestoneForm((prev) => ({ ...prev, category: e.target.value }))}
                className="w-full rounded-xl border border-slate-200 bg-white p-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#166534]"
              >
                <option value="General">General</option>
                <option value="Fertilization">Fertilization</option>
                <option value="Irrigation">Irrigation</option>
                <option value="Pest Management">Pest Management</option>
                <option value="Stage">Stage</option>
                <option value="Harvest">Harvest</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Target Date <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                value={milestoneForm.targetDate}
                onChange={(e) => setMilestoneForm((prev) => ({ ...prev, targetDate: e.target.value }))}
                className="w-full rounded-xl border border-slate-200 bg-white p-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#166534]"
                required
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Activity Notes (Optional)
            </label>
            <textarea
              value={milestoneForm.notes}
              onChange={(e) => setMilestoneForm((prev) => ({ ...prev, notes: e.target.value }))}
              placeholder="e.g. Apply early morning before heat index rises..."
              rows={2}
              className="w-full rounded-xl border border-slate-200 bg-white p-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#166534]"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowMilestoneModal(false)}
              disabled={submittingMilestone}
              className="bg-white"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={submittingMilestone}
              className="shadow-xs"
            >
              {submittingMilestone ? 'Adding...' : 'Add to Calendar'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
