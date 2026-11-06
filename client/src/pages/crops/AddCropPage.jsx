import { useState, useEffect } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import {
  Sprout,
  ArrowLeft,
  Tractor,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  FileText,
} from 'lucide-react';
import cropService from '../../services/cropService.js';
import farmService from '../../services/farmService.js';
import Button from '../../components/common/Button.jsx';
import Badge from '../../components/common/Badge.jsx';
import {
  GROWTH_STAGES,
  CROP_CATEGORIES,
  CROP_SEASONS,
  IRRIGATION_METHODS,
  YIELD_UNITS,
} from '../../constants/cropConstants.js';

export default function AddCropPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const preselectedFarmId = searchParams.get('farmId') || '';

  const [farms, setFarms] = useState([]);
  const [loadingFarms, setLoadingFarms] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState(null);
  const [formSuccess, setFormSuccess] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    farm: preselectedFarmId,
    name: '',
    variety: '',
    category: 'Cereal',
    season: 'Kharif',
    irrigationMethod: 'Drip',
    cultivatedArea: '',
    plantingDate: new Date().toISOString().split('T')[0],
    expectedHarvestDate: '',
    expectedYieldPerAcre: '',
    yieldUnit: 'kg',
    growthStage: 'Land Preparation',
    notes: '',
  });

  // Fetch available farms
  useEffect(() => {
    let active = true;
    async function loadFarms() {
      try {
        const res = await farmService.getFarms();
        if (active && res.success && Array.isArray(res.farms)) {
          setFarms(res.farms);
          if (!preselectedFarmId && res.farms.length > 0) {
            setFormData((prev) => ({
              ...prev,
              farm: res.farms[0]._id || res.farms[0].id,
            }));
          }
        }
      } catch (err) {
        console.error('[ADD_CROP_LOAD_FARMS_ERROR]', err);
        if (active) setFormError('Failed to load registered farms. Please try again.');
      } finally {
        if (active) setLoadingFarms(false);
      }
    }
    loadFarms();
    return () => {
      active = false;
    };
  }, [preselectedFarmId]);

  const selectedFarmObj = farms.find(
    (f) => (f._id || f.id) === formData.farm
  );

  const selectedFarmAcreage = selectedFarmObj
    ? selectedFarmObj.acreage || selectedFarmObj.totalAcreage
    : null;

  // Handle Input Changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    if (formError) setFormError(null);
  };

  // Estimated Total Yield calculation
  const calculatedEstimatedYield = () => {
    const area = parseFloat(formData.cultivatedArea);
    const yieldPerAcre = parseFloat(formData.expectedYieldPerAcre);
    if (!isNaN(area) && !isNaN(yieldPerAcre) && area > 0 && yieldPerAcre > 0) {
      return (area * yieldPerAcre).toFixed(1);
    }
    return null;
  };

  // Form Validation & Submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError(null);

    // Validation
    if (!formData.name.trim()) {
      setFormError('Crop name is required');
      return;
    }
    if (!formData.farm) {
      setFormError('Please select a farm parcel');
      return;
    }
    const area = parseFloat(formData.cultivatedArea);
    if (isNaN(area) || area <= 0) {
      setFormError('Please enter a valid cultivated area greater than 0 acres');
      return;
    }

    if (selectedFarmAcreage && area > selectedFarmAcreage) {
      setFormError(
        `Cultivated area (${area} acres) cannot exceed the selected farm parcel's total size (${selectedFarmAcreage} acres)`
      );
      return;
    }

    if (formData.plantingDate && formData.expectedHarvestDate) {
      if (new Date(formData.expectedHarvestDate) <= new Date(formData.plantingDate)) {
        setFormError('Expected harvest date must be after planting date');
        return;
      }
    }

    try {
      setSubmitting(true);
      const payload = {
        ...formData,
        cultivatedArea: area,
        expectedYieldPerAcre: formData.expectedYieldPerAcre
          ? parseFloat(formData.expectedYieldPerAcre)
          : null,
      };

      const res = await cropService.createCrop(payload);
      if (res.success) {
        setFormSuccess(true);
        setTimeout(() => {
          navigate('/dashboard/crops');
        }, 1200);
      }
    } catch (err) {
      console.error('[ADD_CROP_ERROR]', err);
      setFormError(err.response?.data?.message || 'Failed to register crop');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Top Breadcrumb & Navigation */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-200">
        <Link
          to="/dashboard/crops"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-[#166534] transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Crops
        </Link>
        <Badge size="sm" variant="forest" dot>
          MongoDB Integrated
        </Badge>
      </div>

      {/* Header Banner */}
      <div className="flex items-center gap-3.5">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-[#166534] to-[#145A32] text-white shadow-sm">
          <Sprout className="h-6 w-6 text-[#22C55E]" />
        </div>
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-[#17251B] tracking-tight">
            Register New Crop
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Record planting details, phenological stages, and projected harvest timelines
          </p>
        </div>
      </div>

      {/* Notifications */}
      {formError && (
        <div className="rounded-xl border border-rose-200 bg-rose-50/90 p-4 text-rose-800 text-xs flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0" />
          <span>{formError}</span>
        </div>
      )}

      {formSuccess && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50/90 p-4 text-[#166534] text-xs flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-[#22C55E] shrink-0" />
          <span>Crop registered successfully! Redirecting to crop management...</span>
        </div>
      )}

      {/* No Farms Warning */}
      {!loadingFarms && farms.length === 0 && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50/80 p-5 text-amber-900 text-xs space-y-3">
          <div className="flex items-center gap-2 font-bold text-sm">
            <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0" />
            No Registered Farms Found
          </div>
          <p>
            You must register at least one farm parcel before adding crops. Crops are tied to specific
            geographical parcels for soil analysis and weather advisory.
          </p>
          <Link to="/dashboard/farms/new">
            <Button variant="primary" size="sm" icon={Tractor} className="shadow-xs text-xs">
              Register a Farm Parcel First
            </Button>
          </Link>
        </div>
      )}

      {/* Form Card */}
      <form
        onSubmit={handleSubmit}
        className="rounded-2xl border border-slate-200/90 bg-white p-6 sm:p-8 shadow-xs space-y-6"
      >
        {/* Section 1: Parcel Selection */}
        <div>
          <h2 className="text-sm font-bold text-[#17251B] uppercase tracking-wider mb-3 flex items-center gap-2">
            <Tractor className="h-4 w-4 text-[#166534]" />
            1. Farm Parcel Assignment
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Select Farm Parcel <span className="text-rose-500">*</span>
              </label>
              <select
                name="farm"
                value={formData.farm}
                onChange={handleChange}
                disabled={loadingFarms || farms.length === 0}
                className="w-full rounded-xl border border-slate-200 bg-[#F7F9F5] p-2.5 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#166534] focus:bg-white transition-all cursor-pointer"
                required
              >
                {farms.map((f) => {
                  const acreageVal = f.acreage || f.totalAcreage;
                  return (
                    <option key={f._id || f.id} value={f._id || f.id}>
                      {f.name} ({acreageVal ? `${acreageVal} acres` : 'Acreage not set'} • {f.soilType || 'Soil'})
                    </option>
                  );
                })}
              </select>
            </div>

            {selectedFarmObj && (
              <div className="rounded-xl border border-emerald-900/10 bg-[#DCFCE7]/30 p-3 flex flex-col justify-center text-xs">
                <span className="font-bold text-[#145A32]">{selectedFarmObj.name}</span>
                <span className="text-slate-600">
                  Total Size: {selectedFarmAcreage || 'N/A'} acres • Soil: {selectedFarmObj.soilType || 'Loamy'} • Irrigation: {selectedFarmObj.irrigationType || 'Drip'}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Section 2: Crop Details */}
        <div className="pt-4 border-t border-slate-100">
          <h2 className="text-sm font-bold text-[#17251B] uppercase tracking-wider mb-3 flex items-center gap-2">
            <Sprout className="h-4 w-4 text-[#166534]" />
            2. Crop Botanical & Agronomic Details
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Crop Name */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Crop Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="e.g. Paddy / Rice, Wheat, Cotton"
                className="w-full rounded-xl border border-slate-200 bg-[#F7F9F5] p-2.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#166534] focus:bg-white transition-all"
                required
              />
            </div>

            {/* Variety */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Crop Variety / Hybrid Name
              </label>
              <input
                type="text"
                name="variety"
                value={formData.variety}
                onChange={handleChange}
                placeholder="e.g. Pusa 1121, Kaveri 51, BT-Cotton"
                className="w-full rounded-xl border border-slate-200 bg-[#F7F9F5] p-2.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#166534] focus:bg-white transition-all"
              />
            </div>

            {/* Category */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Crop Category
              </label>
              <select
                name="category"
                value={formData.category}
                onChange={handleChange}
                className="w-full rounded-xl border border-slate-200 bg-[#F7F9F5] p-2.5 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#166534] focus:bg-white cursor-pointer"
              >
                {CROP_CATEGORIES.filter((c) => c !== 'All').map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            {/* Season */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Growing Season
              </label>
              <select
                name="season"
                value={formData.season}
                onChange={handleChange}
                className="w-full rounded-xl border border-slate-200 bg-[#F7F9F5] p-2.5 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#166534] focus:bg-white cursor-pointer"
              >
                {CROP_SEASONS.filter((s) => s !== 'All').map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>

            {/* Irrigation Method */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Irrigation Method
              </label>
              <select
                name="irrigationMethod"
                value={formData.irrigationMethod}
                onChange={handleChange}
                className="w-full rounded-xl border border-slate-200 bg-[#F7F9F5] p-2.5 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#166534] focus:bg-white cursor-pointer"
              >
                {IRRIGATION_METHODS.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>

            {/* Cultivated Area */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Cultivated Area (Acres) <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                name="cultivatedArea"
                value={formData.cultivatedArea}
                onChange={handleChange}
                placeholder="e.g. 5.5"
                className="w-full rounded-xl border border-slate-200 bg-[#F7F9F5] p-2.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#166534] focus:bg-white transition-all"
                required
              />
              {selectedFarmAcreage && (
                <p className="text-[10px] text-slate-400 mt-0.5">
                  Farm parcel max: {selectedFarmAcreage} acres
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Section 3: Phenological Stages & Timeline */}
        <div className="pt-4 border-t border-slate-100">
          <h2 className="text-sm font-bold text-[#17251B] uppercase tracking-wider mb-3 flex items-center gap-2">
            <Calendar className="h-4 w-4 text-[#166534]" />
            3. Lifecycle Stages & Calendar Projections
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Initial Growth Stage */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Initial Growth Stage
              </label>
              <select
                name="growthStage"
                value={formData.growthStage}
                onChange={handleChange}
                className="w-full rounded-xl border border-slate-200 bg-[#F7F9F5] p-2.5 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#166534] focus:bg-white cursor-pointer"
              >
                {GROWTH_STAGES.map((st) => (
                  <option key={st} value={st}>
                    {st}
                  </option>
                ))}
              </select>
            </div>

            {/* Planting Date */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Planting / Sowing Date
              </label>
              <input
                type="date"
                name="plantingDate"
                value={formData.plantingDate}
                onChange={handleChange}
                className="w-full rounded-xl border border-slate-200 bg-[#F7F9F5] p-2.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#166534] focus:bg-white cursor-pointer"
              />
            </div>

            {/* Expected Harvest Date */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Target Harvest Date
              </label>
              <input
                type="date"
                name="expectedHarvestDate"
                value={formData.expectedHarvestDate}
                onChange={handleChange}
                className="w-full rounded-xl border border-slate-200 bg-[#F7F9F5] p-2.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#166534] focus:bg-white cursor-pointer"
              />
            </div>
          </div>
        </div>

        {/* Section 4: Yield Projections */}
        <div className="pt-4 border-t border-slate-100">
          <h2 className="text-sm font-bold text-[#17251B] uppercase tracking-wider mb-3 flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-[#166534]" />
            4. Yield Estimates & Calculations
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Expected Yield Per Acre (Optional)
              </label>
              <div className="flex gap-2">
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  name="expectedYieldPerAcre"
                  value={formData.expectedYieldPerAcre}
                  onChange={handleChange}
                  placeholder="e.g. 1800"
                  className="w-full rounded-xl border border-slate-200 bg-[#F7F9F5] p-2.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#166534] focus:bg-white"
                />
                <select
                  name="yieldUnit"
                  value={formData.yieldUnit}
                  onChange={handleChange}
                  className="rounded-xl border border-slate-200 bg-[#F7F9F5] px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#166534] cursor-pointer"
                >
                  {YIELD_UNITS.map((u) => (
                    <option key={u} value={u}>
                      {u}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Calculated Yield Preview */}
            <div className="rounded-xl border border-slate-200/80 bg-[#F7F9F5] p-3 flex items-center justify-between">
              <div>
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                  Estimated Total Production
                </span>
                <span className="text-lg font-black text-[#145A32]">
                  {calculatedEstimatedYield()
                    ? `${calculatedEstimatedYield()} ${formData.yieldUnit}`
                    : 'Enter acreage & yield to calculate'}
                </span>
              </div>
              <TrendingUp className="h-6 w-6 text-[#22C55E]" />
            </div>
          </div>
        </div>

        {/* Section 5: Field Notes */}
        <div className="pt-4 border-t border-slate-100">
          <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
            <FileText className="h-3.5 w-3.5 text-slate-400" />
            Agronomic Field Notes & Soil Observations (Optional)
          </label>
          <textarea
            name="notes"
            value={formData.notes}
            onChange={handleChange}
            placeholder="e.g. Basal compost incorporated, seed primed with Trichoderma, drip lines spaced at 4 feet..."
            rows={3}
            className="w-full rounded-xl border border-slate-200 bg-[#F7F9F5] p-3 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#166534] focus:bg-white transition-all"
          />
        </div>

        {/* Actions */}
        <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
          <Link to="/dashboard/crops">
            <Button
              type="button"
              variant="outline"
              size="md"
              className="bg-white text-xs"
              disabled={submitting}
            >
              Cancel
            </Button>
          </Link>
          <Button
            type="submit"
            variant="primary"
            size="md"
            icon={Sprout}
            disabled={submitting || loadingFarms || farms.length === 0}
            className="shadow-sm text-xs"
          >
            {submitting ? 'Registering Crop...' : 'Save & Register Crop'}
          </Button>
        </div>
      </form>
    </div>
  );
}
