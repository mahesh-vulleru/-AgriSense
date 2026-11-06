import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  Sprout,
  ArrowLeft,
  Tractor,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  FileText,
} from 'lucide-react';
import cropService from '../../services/cropService.js';
import farmService from '../../services/farmService.js';
import Button from '../../components/common/Button.jsx';
import Badge from '../../components/common/Badge.jsx';
import {
  CROP_CATEGORIES,
  CROP_SEASONS,
  IRRIGATION_METHODS,
  YIELD_UNITS,
} from '../../constants/cropConstants.js';

export default function EditCropPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [farms, setFarms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState(null);
  const [formSuccess, setFormSuccess] = useState(false);

  const [formData, setFormData] = useState({
    farm: '',
    name: '',
    variety: '',
    category: 'Cereal',
    season: 'Kharif',
    irrigationMethod: 'Drip',
    cultivatedArea: '',
    plantingDate: '',
    expectedHarvestDate: '',
    expectedYieldPerAcre: '',
    yieldUnit: 'kg',
    notes: '',
  });

  useEffect(() => {
    let active = true;
    async function loadInitialData() {
      try {
        const [cropRes, farmsRes] = await Promise.all([
          cropService.getCropById(id),
          farmService.getFarms(),
        ]);

        if (!active) return;

        if (farmsRes.success && Array.isArray(farmsRes.farms)) {
          setFarms(farmsRes.farms);
        }

        if (cropRes.success && cropRes.crop) {
          const c = cropRes.crop;
          setFormData({
            farm: c.farm?._id || c.farm?.id || c.farm || '',
            name: c.name || '',
            variety: c.variety || '',
            category: c.category || 'Cereal',
            season: c.season || 'Kharif',
            irrigationMethod: c.irrigationMethod || 'Drip',
            cultivatedArea: c.cultivatedArea !== undefined ? String(c.cultivatedArea) : '',
            plantingDate: c.plantingDate ? new Date(c.plantingDate).toISOString().split('T')[0] : '',
            expectedHarvestDate: c.expectedHarvestDate
              ? new Date(c.expectedHarvestDate).toISOString().split('T')[0]
              : '',
            expectedYieldPerAcre:
              c.expectedYieldPerAcre !== null && c.expectedYieldPerAcre !== undefined
                ? String(c.expectedYieldPerAcre)
                : '',
            yieldUnit: c.yieldUnit || 'kg',
            notes: c.notes || '',
          });
        }
      } catch (err) {
        console.error('[EDIT_CROP_LOAD_ERROR]', err);
        if (active) setFormError(err.response?.data?.message || 'Failed to load crop for editing');
      } finally {
        if (active) setLoading(false);
      }
    }

    loadInitialData();
    return () => {
      active = false;
    };
  }, [id]);

  const selectedFarmObj = farms.find((f) => (f._id || f.id) === formData.farm);
  const selectedFarmAcreage = selectedFarmObj
    ? selectedFarmObj.acreage || selectedFarmObj.totalAcreage
    : null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    if (formError) setFormError(null);
  };

  const calculatedEstimatedYield = () => {
    const area = parseFloat(formData.cultivatedArea);
    const yieldPerAcre = parseFloat(formData.expectedYieldPerAcre);
    if (!isNaN(area) && !isNaN(yieldPerAcre) && area > 0 && yieldPerAcre > 0) {
      return (area * yieldPerAcre).toFixed(1);
    }
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError(null);

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
        `Cultivated area (${area} acres) cannot exceed total farm parcel acreage (${selectedFarmAcreage} acres)`
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

      const res = await cropService.updateCrop(id, payload);
      if (res.success) {
        setFormSuccess(true);
        setTimeout(() => {
          navigate(`/dashboard/crops/${id}`);
        }, 1000);
      }
    } catch (err) {
      console.error('[EDIT_CROP_SUBMIT_ERROR]', err);
      setFormError(err.response?.data?.message || 'Failed to update crop');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto space-y-6 animate-pulse p-4">
        <div className="h-6 bg-slate-200 rounded w-40" />
        <div className="h-20 bg-slate-200 rounded-2xl" />
        <div className="h-96 bg-slate-100 rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-200">
        <Link
          to={`/dashboard/crops/${id}`}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-[#166534] transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Crop Details
        </Link>
        <Badge size="sm" variant="forest" dot>
          Editing Crop
        </Badge>
      </div>

      {/* Header Banner */}
      <div className="flex items-center gap-3.5">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-[#166534] to-[#145A32] text-white shadow-sm">
          <Sprout className="h-6 w-6 text-[#22C55E]" />
        </div>
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-[#17251B] tracking-tight">
            Edit Crop: {formData.name}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Update agronomic parameters, area, varieties, and harvest targets
          </p>
        </div>
      </div>

      {formError && (
        <div className="rounded-xl border border-rose-200 bg-rose-50/90 p-4 text-rose-800 text-xs flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0" />
          <span>{formError}</span>
        </div>
      )}

      {formSuccess && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50/90 p-4 text-[#166534] text-xs flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-[#22C55E] shrink-0" />
          <span>Crop updated successfully! Returning to details...</span>
        </div>
      )}

      {/* Form */}
      <form
        onSubmit={handleSubmit}
        className="rounded-2xl border border-slate-200/90 bg-white p-6 sm:p-8 shadow-xs space-y-6"
      >
        {/* Farm Parcel */}
        <div>
          <h2 className="text-sm font-bold text-[#17251B] uppercase tracking-wider mb-3 flex items-center gap-2">
            <Tractor className="h-4 w-4 text-[#166534]" />
            Farm Parcel Assignment
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Farm Parcel <span className="text-rose-500">*</span>
              </label>
              <select
                name="farm"
                value={formData.farm}
                onChange={handleChange}
                className="w-full rounded-xl border border-slate-200 bg-[#F7F9F5] p-2.5 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#166534] focus:bg-white cursor-pointer"
                required
              >
                {farms.map((f) => {
                  const acreageVal = f.acreage || f.totalAcreage;
                  return (
                    <option key={f._id || f.id} value={f._id || f.id}>
                      {f.name} ({acreageVal ? `${acreageVal} acres` : 'Acreage not set'})
                    </option>
                  );
                })}
              </select>
            </div>

            {selectedFarmObj && (
              <div className="rounded-xl border border-emerald-900/10 bg-[#DCFCE7]/30 p-3 flex flex-col justify-center text-xs">
                <span className="font-bold text-[#145A32]">{selectedFarmObj.name}</span>
                <span className="text-slate-600">
                  Size: {selectedFarmAcreage || 'N/A'} acres • Soil: {selectedFarmObj.soilType || 'Loamy'} • Irrigation: {selectedFarmObj.irrigationType || 'Drip'}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Botanical Parameters */}
        <div className="pt-4 border-t border-slate-100">
          <h2 className="text-sm font-bold text-[#17251B] uppercase tracking-wider mb-3 flex items-center gap-2">
            <Sprout className="h-4 w-4 text-[#166534]" />
            Crop Characteristics
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Crop Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                className="w-full rounded-xl border border-slate-200 bg-[#F7F9F5] p-2.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#166534] focus:bg-white"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Crop Variety / Hybrid
              </label>
              <input
                type="text"
                name="variety"
                value={formData.variety}
                onChange={handleChange}
                className="w-full rounded-xl border border-slate-200 bg-[#F7F9F5] p-2.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#166534] focus:bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Category
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

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Season
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
                className="w-full rounded-xl border border-slate-200 bg-[#F7F9F5] p-2.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#166534] focus:bg-white"
                required
              />
            </div>
          </div>
        </div>

        {/* Dates & Projections */}
        <div className="pt-4 border-t border-slate-100">
          <h2 className="text-sm font-bold text-[#17251B] uppercase tracking-wider mb-3 flex items-center gap-2">
            <Calendar className="h-4 w-4 text-[#166534]" />
            Dates & Yield Expectations
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Planting Date
              </label>
              <input
                type="date"
                name="plantingDate"
                value={formData.plantingDate}
                onChange={handleChange}
                className="w-full rounded-xl border border-slate-200 bg-[#F7F9F5] p-2.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#166534] focus:bg-white cursor-pointer"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Expected Harvest Date
              </label>
              <input
                type="date"
                name="expectedHarvestDate"
                value={formData.expectedHarvestDate}
                onChange={handleChange}
                className="w-full rounded-xl border border-slate-200 bg-[#F7F9F5] p-2.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#166534] focus:bg-white cursor-pointer"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Expected Yield Per Acre
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
                  className="rounded-xl border border-slate-200 bg-[#F7F9F5] px-2.5 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#166534]"
                >
                  {YIELD_UNITS.map((u) => (
                    <option key={u} value={u}>
                      {u}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {calculatedEstimatedYield() && (
            <div className="mt-3 p-3 rounded-xl border border-emerald-900/10 bg-[#DCFCE7]/40 flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-700">Calculated Total Yield Estimate:</span>
              <span className="font-extrabold text-[#145A32] text-sm">
                {calculatedEstimatedYield()} {formData.yieldUnit}
              </span>
            </div>
          )}
        </div>

        {/* Notes */}
        <div className="pt-4 border-t border-slate-100">
          <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
            <FileText className="h-3.5 w-3.5 text-slate-400" />
            Agronomic Field Notes
          </label>
          <textarea
            name="notes"
            value={formData.notes}
            onChange={handleChange}
            rows={3}
            className="w-full rounded-xl border border-slate-200 bg-[#F7F9F5] p-3 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#166534] focus:bg-white"
          />
        </div>

        {/* Action Buttons */}
        <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
          <Link to={`/dashboard/crops/${id}`}>
            <Button type="button" variant="outline" size="md" className="bg-white text-xs" disabled={submitting}>
              Cancel
            </Button>
          </Link>
          <Button
            type="submit"
            variant="primary"
            size="md"
            icon={Sprout}
            disabled={submitting}
            className="shadow-sm text-xs"
          >
            {submitting ? 'Updating...' : 'Save Crop Changes'}
          </Button>
        </div>
      </form>
    </div>
  );
}
