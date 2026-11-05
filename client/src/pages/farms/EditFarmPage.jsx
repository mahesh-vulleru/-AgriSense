import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  Tractor,
  MapPin,
  Sprout,
  Layers,
  ArrowLeft,
  Save,
  Plus,
  X,
  AlertCircle,
} from 'lucide-react';
import farmService from '../../services/farmService.js';
import Button from '../../components/common/Button.jsx';

const SOIL_TYPES = [
  'Alluvial',
  'Black',
  'Red',
  'Laterite',
  'Sandy',
  'Clay',
  'Loamy',
  'Other',
];

const IRRIGATION_TYPES = [
  'Drip',
  'Sprinkler',
  'Flood',
  'Rain-fed',
  'Other',
];

const POPULAR_CROPS = [
  'Wheat',
  'Rice (Paddy)',
  'Corn (Maize)',
  'Cotton',
  'Sugarcane',
  'Soybean',
  'Tomato',
  'Potato',
  'Chili',
  'Groundnut',
  'Mustard',
  'Barley',
  'Onion',
];

export const EditFarmPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: '',
    location: '',
    state: '',
    district: '',
    village: '',
    pincode: '',
    latitude: '',
    longitude: '',
    acreage: '',
    soilType: 'Loamy',
    irrigationType: 'Drip',
    mainCrops: [],
    description: '',
    status: 'Active',
  });

  const [customCropInput, setCustomCropInput] = useState('');
  const [initialLoading, setInitialLoading] = useState(true);
  const [fieldErrors, setFieldErrors] = useState({});
  const [errorMessage, setErrorMessage] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const load = async () => {
      try {
        const data = await farmService.getFarmById(id);
        if (isMounted && data?.success && data?.farm) {
          const f = data.farm;
          setFormData({
            name: f.name || '',
            location: f.location || '',
            state: f.state || '',
            district: f.district || '',
            village: f.village || '',
            pincode: f.pincode || '',
            latitude: f.coordinates?.latitude != null ? String(f.coordinates.latitude) : '',
            longitude: f.coordinates?.longitude != null ? String(f.coordinates.longitude) : '',
            acreage: f.acreage != null ? String(f.acreage) : '',
            soilType: f.soilType || 'Loamy',
            irrigationType: f.irrigationType || 'Drip',
            mainCrops: Array.isArray(f.mainCrops) ? f.mainCrops : [],
            description: f.description || '',
            status: f.status || 'Active',
          });
        }
      } catch (err) {
        if (isMounted) {
          setErrorMessage(err.message || 'Failed to load farm details.');
        }
      } finally {
        if (isMounted) {
          setInitialLoading(false);
        }
      }
    };

    load();

    return () => {
      isMounted = false;
    };
  }, [id]);

  const validate = () => {
    const errors = {};

    if (!formData.name.trim()) {
      errors.name = 'Farm name is required';
    } else if (formData.name.trim().length < 2) {
      errors.name = 'Farm name must be at least 2 characters long';
    }

    if (!formData.location.trim()) {
      errors.location = 'Farm location or primary address is required';
    }

    const parsedAcreage = Number(formData.acreage);
    if (!formData.acreage || formData.acreage === '') {
      errors.acreage = 'Total acreage is required';
    } else if (isNaN(parsedAcreage) || parsedAcreage <= 0) {
      errors.acreage = 'Acreage must be a positive number greater than 0';
    }

    if (formData.latitude) {
      const lat = Number(formData.latitude);
      if (isNaN(lat) || lat < -90 || lat > 90) {
        errors.latitude = 'Latitude must be between -90 and 90';
      }
    }

    if (formData.longitude) {
      const lng = Number(formData.longitude);
      if (isNaN(lng) || lng < -180 || lng > 180) {
        errors.longitude = 'Longitude must be between -180 and 180';
      }
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (fieldErrors[name]) {
      setFieldErrors((prev) => ({ ...prev, [name]: undefined }));
    }
    if (errorMessage) {
      setErrorMessage('');
    }
  };

  const toggleCrop = (cropName) => {
    setFormData((prev) => {
      const exists = prev.mainCrops.includes(cropName);
      return {
        ...prev,
        mainCrops: exists
          ? prev.mainCrops.filter((c) => c !== cropName)
          : [...prev.mainCrops, cropName],
      };
    });
  };

  const handleAddCustomCrop = () => {
    const trimmed = customCropInput.trim();
    if (trimmed && !formData.mainCrops.includes(trimmed)) {
      setFormData((prev) => ({
        ...prev,
        mainCrops: [...prev.mainCrops, trimmed],
      }));
      setCustomCropInput('');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    if (!validate()) {
      return;
    }

    setSaving(true);

    try {
      const payload = {
        name: formData.name.trim(),
        location: formData.location.trim(),
        state: formData.state.trim(),
        district: formData.district.trim(),
        village: formData.village.trim(),
        pincode: formData.pincode.trim(),
        acreage: Number(formData.acreage),
        soilType: formData.soilType,
        irrigationType: formData.irrigationType,
        mainCrops: formData.mainCrops,
        description: formData.description.trim(),
        status: formData.status,
        coordinates: {
          latitude: formData.latitude ? Number(formData.latitude) : null,
          longitude: formData.longitude ? Number(formData.longitude) : null,
        },
      };

      const res = await farmService.updateFarm(id, payload);
      if (res?.success) {
        navigate(`/dashboard/farms/${id}`, {
          state: { successMessage: 'Farm details updated successfully!' },
        });
      }
    } catch (err) {
      setErrorMessage(err.message || 'Failed to update farm details.');
    } finally {
      setSaving(false);
    }
  };

  if (initialLoading) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="h-6 bg-slate-200 rounded w-48 animate-pulse" />
        <div className="h-96 bg-white border border-slate-200 rounded-3xl animate-pulse" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Breadcrumb & Header */}
      <div>
        <Link
          to={`/dashboard/farms/${id}`}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#166534] hover:underline mb-2"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Back to Farm Details</span>
        </Link>
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-[#166534] to-[#145A32] text-white shadow-xs">
            <Tractor className="h-6 w-6 text-[#22C55E]" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#17251B] tracking-tight">
              Edit Farm: {formData.name}
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              Update parcel dimensions, soil categories, and irrigation arrangements.
            </p>
          </div>
        </div>
      </div>

      {/* Global Error Banner */}
      {errorMessage && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-rose-800 text-sm flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
          <p className="font-medium">{errorMessage}</p>
        </div>
      )}

      {/* Edit Form */}
      <form onSubmit={handleSubmit} className="space-y-6" noValidate>
        {/* Section 1: Basic Information */}
        <div className="rounded-2xl border border-slate-200/90 bg-white p-6 sm:p-8 shadow-xs space-y-5">
          <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-[#17251B] flex items-center gap-2">
                <Sprout className="h-4 w-4 text-[#166534]" />
                <span>Basic Farm Information</span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Primary parcel name, status, and acreage.
              </p>
            </div>
            {/* Farm Status Select */}
            <div>
              <label
                htmlFor="status"
                className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1"
              >
                Status
              </label>
              <select
                id="status"
                name="status"
                value={formData.status}
                onChange={handleChange}
                className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#166534]"
              >
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
                <option value="Archived">Archived</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Farm Name */}
            <div>
              <label
                htmlFor="name"
                className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5"
              >
                Farm Name <span className="text-rose-500">*</span>
              </label>
              <input
                id="name"
                name="name"
                type="text"
                value={formData.name}
                onChange={handleChange}
                placeholder="e.g. Green Valley Sector 4A"
                className={`w-full rounded-xl border bg-white px-3.5 py-2.5 text-sm text-[#17251B] placeholder-slate-400 transition-colors focus:outline-none focus:ring-2 focus:ring-[#166534] ${
                  fieldErrors.name
                    ? 'border-rose-400 ring-rose-200'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              />
              {fieldErrors.name && (
                <p className="mt-1 text-xs text-rose-600 font-medium">
                  {fieldErrors.name}
                </p>
              )}
            </div>

            {/* Total Acreage */}
            <div>
              <label
                htmlFor="acreage"
                className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5"
              >
                Total Acreage (Acres) <span className="text-rose-500">*</span>
              </label>
              <input
                id="acreage"
                name="acreage"
                type="number"
                step="0.1"
                min="0.1"
                value={formData.acreage}
                onChange={handleChange}
                placeholder="e.g. 28.5"
                className={`w-full rounded-xl border bg-white px-3.5 py-2.5 text-sm text-[#17251B] placeholder-slate-400 transition-colors focus:outline-none focus:ring-2 focus:ring-[#166534] ${
                  fieldErrors.acreage
                    ? 'border-rose-400 ring-rose-200'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              />
              {fieldErrors.acreage && (
                <p className="mt-1 text-xs text-rose-600 font-medium">
                  {fieldErrors.acreage}
                </p>
              )}
            </div>
          </div>

          {/* Primary Location */}
          <div>
            <label
              htmlFor="location"
              className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5"
            >
              Primary Location / Address <span className="text-rose-500">*</span>
            </label>
            <input
              id="location"
              name="location"
              type="text"
              value={formData.location}
              onChange={handleChange}
              placeholder="e.g. North Ridge Road, Greenfield Sector"
              className={`w-full rounded-xl border bg-white px-3.5 py-2.5 text-sm text-[#17251B] placeholder-slate-400 transition-colors focus:outline-none focus:ring-2 focus:ring-[#166534] ${
                fieldErrors.location
                  ? 'border-rose-400 ring-rose-200'
                  : 'border-slate-200 hover:border-slate-300'
              }`}
            />
            {fieldErrors.location && (
              <p className="mt-1 text-xs text-rose-600 font-medium">
                {fieldErrors.location}
              </p>
            )}
          </div>
        </div>

        {/* Section 2: Regional & Geographic Details */}
        <div className="rounded-2xl border border-slate-200/90 bg-white p-6 sm:p-8 shadow-xs space-y-5">
          <div className="border-b border-slate-100 pb-3">
            <h2 className="text-base font-bold text-[#17251B] flex items-center gap-2">
              <MapPin className="h-4 w-4 text-[#166534]" />
              <span>Geographic &amp; Regional Details</span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Regional identifiers and GPS coordinates.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label
                htmlFor="village"
                className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5"
              >
                Village / Town
              </label>
              <input
                id="village"
                name="village"
                type="text"
                value={formData.village}
                onChange={handleChange}
                placeholder="e.g. Salinas"
                className="w-full rounded-xl border border-slate-200 hover:border-slate-300 bg-white px-3.5 py-2 text-xs sm:text-sm text-[#17251B] focus:outline-none focus:ring-2 focus:ring-[#166534]"
              />
            </div>

            <div>
              <label
                htmlFor="district"
                className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5"
              >
                District
              </label>
              <input
                id="district"
                name="district"
                type="text"
                value={formData.district}
                onChange={handleChange}
                placeholder="e.g. Monterey"
                className="w-full rounded-xl border border-slate-200 hover:border-slate-300 bg-white px-3.5 py-2 text-xs sm:text-sm text-[#17251B] focus:outline-none focus:ring-2 focus:ring-[#166534]"
              />
            </div>

            <div>
              <label
                htmlFor="state"
                className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5"
              >
                State
              </label>
              <input
                id="state"
                name="state"
                type="text"
                value={formData.state}
                onChange={handleChange}
                placeholder="e.g. California"
                className="w-full rounded-xl border border-slate-200 hover:border-slate-300 bg-white px-3.5 py-2 text-xs sm:text-sm text-[#17251B] focus:outline-none focus:ring-2 focus:ring-[#166534]"
              />
            </div>

            <div>
              <label
                htmlFor="pincode"
                className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5"
              >
                Pincode / Postal
              </label>
              <input
                id="pincode"
                name="pincode"
                type="text"
                value={formData.pincode}
                onChange={handleChange}
                placeholder="e.g. 93901"
                className="w-full rounded-xl border border-slate-200 hover:border-slate-300 bg-white px-3.5 py-2 text-xs sm:text-sm text-[#17251B] focus:outline-none focus:ring-2 focus:ring-[#166534]"
              />
            </div>
          </div>

          {/* Coordinates */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
            <div>
              <label
                htmlFor="latitude"
                className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5"
              >
                Latitude (Optional)
              </label>
              <input
                id="latitude"
                name="latitude"
                type="number"
                step="0.000001"
                value={formData.latitude}
                onChange={handleChange}
                placeholder="e.g. 36.6777"
                className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs sm:text-sm text-[#17251B] focus:outline-none focus:ring-2 focus:ring-[#166534]"
              />
            </div>

            <div>
              <label
                htmlFor="longitude"
                className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5"
              >
                Longitude (Optional)
              </label>
              <input
                id="longitude"
                name="longitude"
                type="number"
                step="0.000001"
                value={formData.longitude}
                onChange={handleChange}
                placeholder="e.g. -121.6555"
                className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs sm:text-sm text-[#17251B] focus:outline-none focus:ring-2 focus:ring-[#166534]"
              />
            </div>
          </div>
        </div>

        {/* Section 3: Agronomic & Irrigation Attributes */}
        <div className="rounded-2xl border border-slate-200/90 bg-white p-6 sm:p-8 shadow-xs space-y-5">
          <div className="border-b border-slate-100 pb-3">
            <h2 className="text-base font-bold text-[#17251B] flex items-center gap-2">
              <Layers className="h-4 w-4 text-[#166534]" />
              <span>Soil &amp; Irrigation Profiles</span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Soil classification and watering systems.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="soilType"
                className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5"
              >
                Soil Classification
              </label>
              <select
                id="soilType"
                name="soilType"
                value={formData.soilType}
                onChange={handleChange}
                className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-[#17251B] font-semibold focus:outline-none focus:ring-2 focus:ring-[#166534]"
              >
                {SOIL_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type} Soil
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="irrigationType"
                className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5"
              >
                Primary Irrigation Method
              </label>
              <select
                id="irrigationType"
                name="irrigationType"
                value={formData.irrigationType}
                onChange={handleChange}
                className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-[#17251B] font-semibold focus:outline-none focus:ring-2 focus:ring-[#166534]"
              >
                {IRRIGATION_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type} Irrigation
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Main Crops */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
              Main Cultivated Crops
            </label>
            <div className="flex flex-wrap gap-2 mb-3">
              {POPULAR_CROPS.map((crop) => {
                const isSelected = formData.mainCrops.includes(crop);
                return (
                  <button
                    key={crop}
                    type="button"
                    onClick={() => toggleCrop(crop)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-[#166534] text-white shadow-xs'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                    }`}
                  >
                    {crop} {isSelected && '✓'}
                  </button>
                );
              })}
            </div>

            {/* Custom Crop Input */}
            <div className="flex items-center gap-2 max-w-sm">
              <input
                type="text"
                value={customCropInput}
                onChange={(e) => setCustomCropInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddCustomCrop();
                  }
                }}
                placeholder="Add other crop..."
                className="flex-1 rounded-xl border border-slate-200 px-3 py-1.5 text-xs text-[#17251B] placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#166534]"
              />
              <Button
                variant="outline"
                size="sm"
                type="button"
                onClick={handleAddCustomCrop}
                icon={Plus}
                className="!text-xs"
              >
                Add
              </Button>
            </div>

            {/* Selected Chips */}
            {formData.mainCrops.length > 0 && (
              <div className="mt-3 pt-3 border-t border-slate-100">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                  Currently Cultivated ({formData.mainCrops.length}):
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {formData.mainCrops.map((c) => (
                    <span
                      key={c}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#DCFCE7] text-[#145A32] text-xs font-semibold border border-[#22C55E]/30"
                    >
                      <span>{c}</span>
                      <button
                        type="button"
                        onClick={() => toggleCrop(c)}
                        className="hover:text-rose-600 transition-colors cursor-pointer"
                        title={`Remove ${c}`}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Section 4: Notes & Description */}
        <div className="rounded-2xl border border-slate-200/90 bg-white p-6 sm:p-8 shadow-xs space-y-4">
          <div className="border-b border-slate-100 pb-3">
            <h2 className="text-base font-bold text-[#17251B]">
              Farm Description &amp; Topography Notes
            </h2>
          </div>
          <textarea
            id="description"
            name="description"
            rows={3}
            value={formData.description}
            onChange={handleChange}
            placeholder="Field topography, soil notes, canal coordinates..."
            className="w-full rounded-xl border border-slate-200 hover:border-slate-300 bg-white p-3.5 text-sm text-[#17251B] placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#166534]"
          />
        </div>

        {/* Submit / Cancel Bar */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <Link to={`/dashboard/farms/${id}`}>
            <Button variant="outline" size="md">
              Cancel
            </Button>
          </Link>

          <Button
            type="submit"
            variant="primary"
            size="md"
            loading={saving}
            icon={Save}
            className="!rounded-xl px-6 shadow-md"
          >
            Save Changes
          </Button>
        </div>
      </form>
    </div>
  );
};

export default EditFarmPage;
