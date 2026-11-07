import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  ScanEye,
  Camera,
  UploadCloud,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Sparkles,
  Sprout,
  Clock,
  Eye,
  Trash2,
  X,
  Thermometer,
  Droplets,
} from 'lucide-react';
import diseaseService from '../../services/diseaseService.js';
import farmService from '../../services/farmService.js';
import cropService from '../../services/cropService.js';
import Button from '../../components/common/Button.jsx';
import Badge from '../../components/common/Badge.jsx';
import Modal from '../../components/common/Modal.jsx';
import { PRIORITY_CROPS, SCAN_STATUS_CONFIG } from '../../constants/diseaseConstants.js';

export default function DiseaseDetectionPage() {
  // Provider status state
  const [providerStatus, setProviderStatus] = useState({
    configured: true,
    provider: 'gemini',
    model: 'gemini-2.5-flash',
    message: '',
  });

  // Farms and crops
  const [farms, setFarms] = useState([]);
  const [crops, setCrops] = useState([]);

  // Selection states
  const [selectedFarmId, setSelectedFarmId] = useState('');
  const [selectedCropId, setSelectedCropId] = useState('');

  // Image input states
  const [inputMode, setInputMode] = useState('upload'); // 'upload' | 'camera'
  const [imagePreview, setImagePreview] = useState(null);
  const [imageBase64, setImageBase64] = useState(null);
  const [imageFileMeta, setImageFileMeta] = useState(null);
  const [notes, setNotes] = useState('');

  // Camera states
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  // Analysis execution states
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [scanError, setScanError] = useState(null);

  // History states
  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('scanner'); // 'scanner' | 'history'

  // Modals state
  const [activeDetailScan, setActiveDetailScan] = useState(null);
  const [scanToDelete, setScanToDelete] = useState(null);
  const [deletingScan, setDeletingScan] = useState(false);
  const [actionSuccess, setActionSuccess] = useState(null);

  // Load initial data
  const loadInitialData = useCallback(async (isSilent = false) => {
    if (isSilent) setRefreshing(true);
    setScanError(null);

    try {
      const [statusRes, farmsRes, cropsRes, historyRes] = await Promise.all([
        diseaseService.getProviderStatus(),
        farmService.getFarms(),
        cropService.getCrops(),
        diseaseService.getHistory({ limit: 50 }),
      ]);

      if (statusRes?.success) setProviderStatus(statusRes);
      if (farmsRes?.success && Array.isArray(farmsRes.farms)) {
        setFarms(farmsRes.farms);
        if (!selectedFarmId && farmsRes.farms.length > 0) {
          setSelectedFarmId(farmsRes.farms[0]._id);
        }
      } else if (Array.isArray(farmsRes?.data)) {
        setFarms(farmsRes.data);
        if (!selectedFarmId && farmsRes.data.length > 0) {
          setSelectedFarmId(farmsRes.data[0]._id);
        }
      }

      if (cropsRes?.success && Array.isArray(cropsRes.crops)) {
        setCrops(cropsRes.crops);
      } else if (Array.isArray(cropsRes?.data)) {
        setCrops(cropsRes.data);
      }

      if (historyRes?.success && Array.isArray(historyRes.scans)) {
        setHistory(historyRes.scans);
      }
    } catch (err) {
      setScanError(err?.response?.data?.message || err?.message || 'Failed to initialize AI disease scanner');
    } finally {
      setLoadingHistory(false);
      setRefreshing(false);
    }
  }, [selectedFarmId]);

  useEffect(() => {
    let isSubscribed = true;
    const fetchInit = async () => {
      try {
        const [statusRes, farmsRes, cropsRes, historyRes] = await Promise.all([
          diseaseService.getProviderStatus(),
          farmService.getFarms(),
          cropService.getCrops(),
          diseaseService.getHistory({ limit: 50 }),
        ]);

        if (isSubscribed) {
          if (statusRes?.success) setProviderStatus(statusRes);
          const farmList = Array.isArray(farmsRes.farms) ? farmsRes.farms : Array.isArray(farmsRes?.data) ? farmsRes.data : [];
          setFarms(farmList);
          if (farmList.length > 0) {
            setSelectedFarmId(farmList[0]._id);
          }

          const cropList = Array.isArray(cropsRes.crops) ? cropsRes.crops : Array.isArray(cropsRes?.data) ? cropsRes.data : [];
          setCrops(cropList);

          if (historyRes?.success && Array.isArray(historyRes.scans)) {
            setHistory(historyRes.scans);
          }
        }
      } catch (err) {
        if (isSubscribed) {
          setScanError(err?.response?.data?.message || err?.message || 'Failed to load scanner data');
        }
      } finally {
        if (isSubscribed) {
          setLoadingHistory(false);
        }
      }
    };

    fetchInit();
    return () => {
      isSubscribed = false;
    };
  }, []);

  // Filter crops for currently selected farm
  const availableCrops = useMemo(() => {
    if (!selectedFarmId) return crops;
    return crops.filter((c) => {
      const cFarmId = c.farm?._id || c.farm;
      return cFarmId === selectedFarmId;
    });
  }, [crops, selectedFarmId]);

  // Determine active crop ID (persisting manual choice if valid for farm, otherwise fallback to priority/first crop)
  const activeCropId = useMemo(() => {
    if (selectedCropId && availableCrops.some((c) => c._id === selectedCropId)) {
      return selectedCropId;
    }
    if (availableCrops.length > 0) {
      const priorityMatch = availableCrops.find((c) =>
        PRIORITY_CROPS.some((p) => c.name?.toLowerCase().includes(p.toLowerCase()))
      );
      return priorityMatch ? priorityMatch._id : availableCrops[0]._id;
    }
    return '';
  }, [selectedCropId, availableCrops]);

  // Stop camera stream cleanly
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setIsCameraActive(false);
  }, []);

  // Clean up camera on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  // Start Device Camera
  const startCamera = async () => {
    setCameraError(null);
    try {
      if (!navigator?.mediaDevices?.getUserMedia) {
        throw new Error('Camera access is not supported by your browser.');
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: 'environment' }, // Back camera for plant foliage
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setIsCameraActive(true);
    } catch (err) {
      setCameraError(
        err.name === 'NotAllowedError'
          ? 'Camera permission denied. Please grant camera permission in your browser or upload a saved photo.'
          : `Camera error: ${err.message}`
      );
      setIsCameraActive(false);
    }
  };

  // Capture snapshot from video stream
  const capturePhoto = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const base64 = canvas.toDataURL('image/jpeg', 0.9);
    setImageBase64(base64);
    setImagePreview(base64);
    setImageFileMeta({
      name: `camera_foliage_${Date.now()}.jpg`,
      size: Math.round((base64.length * 3) / 4),
      type: 'image/jpeg',
      source: 'camera',
    });

    stopCamera();
  };

  // File Upload Handler (Drag & Drop or File Picker)
  const handleFileUpload = (file) => {
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      setScanError('Photograph file size exceeds the maximum limit of 10MB.');
      return;
    }

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      setScanError('Unsupported image format. Allowed formats: JPEG, PNG, WEBP.');
      return;
    }

    setScanError(null);
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result;
      setImageBase64(base64);
      setImagePreview(base64);
      setImageFileMeta({
        name: file.name,
        size: file.size,
        type: file.type,
        source: 'upload',
      });
    };
    reader.onerror = () => {
      setScanError('Failed to read the selected photograph.');
    };
    reader.readAsDataURL(file);
  };

  // Clear chosen photo
  const handleClearPhoto = () => {
    setImageBase64(null);
    setImagePreview(null);
    setImageFileMeta(null);
    stopCamera();
  };

  // Submit actual image for real AI disease diagnosis
  const handleAnalyzeCrop = async () => {
    if (!selectedFarmId || !activeCropId) {
      setScanError('Please select both a farm parcel and a crop before analyzing.');
      return;
    }

    if (!imageBase64) {
      setScanError('Please capture or upload a crop foliage photograph.');
      return;
    }

    setAnalyzing(true);
    setScanError(null);
    setAnalysisResult(null);

    try {
      const res = await diseaseService.scanCrop({
        farmId: selectedFarmId,
        cropId: activeCropId,
        imageBase64,
        filename: imageFileMeta?.name || 'crop_scan.jpg',
        captureMethod: imageFileMeta?.source || 'upload',
        notes,
      });

      if (res?.success && res.scan) {
        setAnalysisResult(res.scan);
        setActionSuccess('AI Crop Disease Diagnosis completed successfully.');
        await loadInitialData(true);
      } else {
        setScanError(res?.message || 'AI diagnosis failed to return a valid assessment.');
      }
    } catch (err) {
      const msg = err?.response?.data?.message || err?.message || 'Failed to complete AI crop disease scan.';
      setScanError(msg);
    } finally {
      setAnalyzing(false);
    }
  };

  // Confirm delete scan
  const handleConfirmDeleteScan = async () => {
    if (!scanToDelete) return;
    setDeletingScan(true);
    try {
      await diseaseService.deleteScan(scanToDelete._id);
      setActionSuccess('Disease scan record deleted.');
      setScanToDelete(null);
      await loadInitialData(true);
    } catch (err) {
      setScanError(err?.response?.data?.message || 'Failed to delete scan record.');
    } finally {
      setDeletingScan(false);
    }
  };

  const getStatusMeta = (status) => {
    return SCAN_STATUS_CONFIG[status] || SCAN_STATUS_CONFIG['Unable to Determine'];
  };

  const selectedCrop = crops.find((c) => c._id === activeCropId);

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
      {/* 1. Header & AI Provider Status */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
              AI Crop Disease Scanner & Plant Pathology
            </h1>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
              Phase 9
            </span>
          </div>
          <p className="mt-1 text-sm text-slate-500">
            Real-time multimodal Gemini AI disease diagnosis, visual symptom identification, and agronomic management actions.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Provider status badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-semibold shadow-xs">
            <span
              className={`w-2 h-2 rounded-full ${
                providerStatus.configured ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
              }`}
            ></span>
            <span className="text-slate-800">
              {providerStatus.provider === 'gemini' ? 'Google Gemini' : providerStatus.provider} ·{' '}
              <span className="text-slate-500">{providerStatus.model}</span>
            </span>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => loadInitialData(true)}
            disabled={refreshing}
            className="border-slate-200 text-slate-700 hover:bg-slate-50"
          >
            <RefreshCw className={`w-4 h-4 mr-1.5 ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </Button>
        </div>
      </div>

      {/* AI Setup Required Warning Banner */}
      {!providerStatus.configured && (
        <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs sm:text-sm">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
            <div>
              <h4 className="font-bold text-amber-950">Gemini AI Setup Required</h4>
              <p className="mt-0.5 text-amber-800 leading-relaxed">
                Live crop disease diagnosis is currently inactive because a Google Gemini API key has not been configured.
                Please add <code className="bg-amber-100 px-1 py-0.5 rounded font-mono font-semibold">GEMINI_API_KEY=your_key</code> in{' '}
                <code className="bg-amber-100 px-1 py-0.5 rounded font-mono font-semibold">server/.env</code> to enable live multimodal analysis.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Action Notification Banner */}
      {actionSuccess && (
        <div className="flex items-center justify-between p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-sm">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span className="font-medium">{actionSuccess}</span>
          </div>
          <button
            onClick={() => setActionSuccess(null)}
            className="text-emerald-700 hover:text-emerald-900 font-semibold text-xs ml-4"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Global Error Banner */}
      {scanError && (
        <div className="flex items-center justify-between p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-sm">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
            <span className="font-medium">{scanError}</span>
          </div>
          <button
            onClick={() => setScanError(null)}
            className="text-rose-700 hover:text-rose-900 font-semibold text-xs ml-4"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* View Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveTab('scanner')}
          className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors flex items-center gap-2 ${
            activeTab === 'scanner'
              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <ScanEye className="w-4 h-4" />
          Live AI Scanner
        </button>

        <button
          onClick={() => setActiveTab('history')}
          className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors flex items-center gap-2 ${
            activeTab === 'history'
              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <Clock className="w-4 h-4" />
          Scan History ({history.length})
        </button>
      </div>

      {/* ======================================================================== */}
      {/* 2. SCANNER WORKSPACE                                                     */}
      {/* ======================================================================== */}
      {activeTab === 'scanner' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Farm/Crop Selection & Image Capture Input */}
          <div className="lg:col-span-5 space-y-5">
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                1. Select Target Parcel & Crop
              </h3>

              {/* Farm Selection */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Farm Parcel <span className="text-rose-500">*</span>
                </label>
                <select
                  value={selectedFarmId}
                  onChange={(e) => setSelectedFarmId(e.target.value)}
                  className="w-full text-xs rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="">Select Farm Parcel</option>
                  {farms.map((f) => (
                    <option key={f._id} value={f._id}>
                      {f.name} ({f.location || f.district})
                    </option>
                  ))}
                </select>
              </div>

              {/* Crop Selection */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Crop Species <span className="text-rose-500">*</span>
                </label>
                <select
                  value={activeCropId}
                  onChange={(e) => setSelectedCropId(e.target.value)}
                  className="w-full text-xs rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="">Select Crop to Inspect</option>
                  {availableCrops.map((c) => (
                    <option key={c._id} value={c._id}>
                      {c.name} ({c.variety || 'Standard'}) · {c.growthStage || 'Vegetative'}
                    </option>
                  ))}
                </select>

                {/* Priority crop tags */}
                <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[10px] text-slate-500">
                  <span className="font-semibold">Priority Models:</span>
                  {PRIORITY_CROPS.map((pc) => (
                    <span key={pc} className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200">
                      {pc}
                    </span>
                  ))}
                </div>
              </div>

              {selectedCrop && (
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs space-y-1">
                  <div className="flex items-center justify-between text-slate-600">
                    <span>Growth Stage:</span>
                    <strong className="text-slate-800">{selectedCrop.growthStage || 'Vegetative'}</strong>
                  </div>
                  <div className="flex items-center justify-between text-slate-600">
                    <span>Cultivated Area:</span>
                    <strong className="text-slate-800">{selectedCrop.cultivatedArea || 1} Acres</strong>
                  </div>
                </div>
              )}
            </div>

            {/* Image Input Section */}
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                  2. Crop Photograph
                </h3>

                {/* Mode toggle */}
                <div className="flex items-center p-0.5 bg-slate-100 rounded-lg border border-slate-200 text-xs">
                  <button
                    type="button"
                    onClick={() => {
                      setInputMode('upload');
                      stopCamera();
                    }}
                    className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                      inputMode === 'upload' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-900'
                    }`}
                  >
                    Upload File
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setInputMode('camera');
                      startCamera();
                    }}
                    className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                      inputMode === 'camera' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-900'
                    }`}
                  >
                    Device Camera
                  </button>
                </div>
              </div>

              {/* Mode 1: File Upload */}
              {inputMode === 'upload' && !imagePreview && (
                <div
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    const file = e.dataTransfer.files?.[0];
                    if (file) handleFileUpload(file);
                  }}
                  className="border-2 border-dashed border-slate-300 hover:border-emerald-500 rounded-xl p-6 text-center cursor-pointer transition-colors bg-slate-50/50"
                  onClick={() => document.getElementById('cropPhotoInput')?.click()}
                >
                  <UploadCloud className="w-10 h-10 text-slate-400 mx-auto mb-2" />
                  <span className="text-xs font-semibold text-slate-700 block">
                    Click to browse or drag & drop photograph
                  </span>
                  <span className="text-[11px] text-slate-400 block mt-1">
                    JPEG, PNG, WEBP up to 10MB
                  </span>
                  <input
                    id="cropPhotoInput"
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={(e) => handleFileUpload(e.target.files?.[0])}
                    className="hidden"
                  />
                </div>
              )}

              {/* Mode 2: Camera Capture Stream */}
              {inputMode === 'camera' && !imagePreview && (
                <div className="space-y-3">
                  {cameraError ? (
                    <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs space-y-2">
                      <p>{cameraError}</p>
                      <Button variant="outline" size="xs" onClick={startCamera}>
                        Retry Camera
                      </Button>
                    </div>
                  ) : (
                    <div className="relative rounded-xl overflow-hidden bg-black aspect-4/3 flex items-center justify-center">
                      <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        muted
                        className="w-full h-full object-cover"
                      />
                      {isCameraActive && (
                        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-2">
                          <Button
                            type="button"
                            variant="primary"
                            size="sm"
                            onClick={capturePhoto}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-md font-bold"
                          >
                            <Camera className="w-4 h-4 mr-1.5" />
                            Capture Photo
                          </Button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Mobile camera direct input fallback */}
                  <div className="text-center pt-1">
                    <label className="text-[11px] text-emerald-700 hover:text-emerald-800 font-semibold cursor-pointer underline">
                      Direct Mobile Camera Launcher
                      <input
                        type="file"
                        accept="image/*"
                        capture="environment"
                        onChange={(e) => handleFileUpload(e.target.files?.[0])}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>
              )}

              {/* Image Preview Card (Shared when photo is selected/captured) */}
              {imagePreview && (
                <div className="relative rounded-xl overflow-hidden border border-slate-200 bg-slate-100 group">
                  <img
                    src={imagePreview}
                    alt="Crop Foliage Preview"
                    className="w-full max-h-72 object-contain bg-slate-900/5"
                  />
                  <button
                    type="button"
                    onClick={handleClearPhoto}
                    title="Remove Photo"
                    className="absolute top-2 right-2 p-1.5 rounded-full bg-slate-900/70 hover:bg-slate-900 text-white transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                  <div className="p-2.5 bg-white border-t border-slate-200 text-xs flex items-center justify-between text-slate-600">
                    <span className="truncate max-w-[200px] font-medium">{imageFileMeta?.name}</span>
                    <span className="text-[11px] text-slate-400">
                      {imageFileMeta ? `${Math.round(imageFileMeta.size / 1024)} KB` : ''}
                    </span>
                  </div>
                </div>
              )}

              {/* Optional Field Notes */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Field Observations (Optional)
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Symptoms noticed on lower foliage after 3 days of rain."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full text-xs rounded-lg border border-slate-300 px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {/* Analyze Button */}
              <Button
                variant="primary"
                size="md"
                onClick={handleAnalyzeCrop}
                disabled={analyzing || !imageBase64 || !activeCropId || !providerStatus.configured}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-xs py-2.5"
              >
                {analyzing ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Gemini AI Analyzing Symptoms...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Analyze Crop Pathology with Gemini AI
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Right Column: Real-time Analysis Results & Pathology Findings */}
          <div className="lg:col-span-7 space-y-5">
            {analyzing && (
              <div className="bg-white rounded-xl border border-slate-200 p-8 text-center shadow-xs space-y-4">
                <div className="w-14 h-14 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 mx-auto animate-pulse">
                  <ScanEye className="w-7 h-7" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Multimodal AI Pathology in Progress
                  </h3>
                  <p className="mt-1 text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
                    Google Gemini ({providerStatus.model}) is inspecting visible foliar discoloration, necrotic lesions,
                    pathogen morphology, and insect feeding marks...
                  </p>
                </div>
                <div className="h-1.5 w-64 bg-slate-100 rounded-full mx-auto overflow-hidden">
                  <div className="h-full bg-emerald-500 rounded-full animate-pulse w-3/4"></div>
                </div>
              </div>
            )}

            {/* Analysis Result Card */}
            {analysisResult && !analyzing && (
              <div className="bg-white rounded-xl border border-slate-200 p-5 sm:p-6 shadow-xs space-y-5">
                {/* Header status */}
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between pb-4 border-b border-slate-100 gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                        Diagnosis Assessment
                      </span>
                      <Badge variant={getStatusMeta(analysisResult.status).variant}>
                        {getStatusMeta(analysisResult.status).label}
                      </Badge>
                    </div>
                    <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 mt-1">
                      {analysisResult.possibleDisease}
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Target: <strong className="text-slate-700">{analysisResult.crop?.name}</strong> · Farm:{' '}
                      <strong className="text-slate-700">{analysisResult.farm?.name}</strong> · Analyzed:{' '}
                      {new Date(analysisResult.scanTimestamp).toLocaleTimeString('en-US', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>

                  {/* Calibration notice pill */}
                  <div className="text-right">
                    <span className="inline-block text-[11px] font-semibold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-md border border-slate-200">
                      {analysisResult.confidenceNote}
                    </span>
                    <span className="block text-[10px] text-slate-400 mt-1">
                      {analysisResult.aiProvider} · {analysisResult.aiModel}
                    </span>
                  </div>
                </div>

                {/* Visible Physical Symptoms */}
                {analysisResult.visibleSymptoms && analysisResult.visibleSymptoms.length > 0 && (
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2">
                      Visible Symptoms Observed by AI:
                    </h4>
                    <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                      {analysisResult.visibleSymptoms.map((sym, idx) => (
                        <li key={idx} className="flex items-start gap-2 p-2 rounded-lg bg-slate-50 border border-slate-200/80 text-slate-700">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
                          <span>{sym}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Explanation */}
                {analysisResult.explanation && (
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1">
                    <h4 className="font-bold text-slate-900">Pathological Explanation:</h4>
                    <p className="text-slate-600 leading-relaxed">{analysisResult.explanation}</p>
                  </div>
                )}

                {/* Differential Causes */}
                {analysisResult.alternativeCauses && analysisResult.alternativeCauses.length > 0 && (
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-1.5">
                      Alternative Differentials:
                    </h4>
                    <div className="flex flex-wrap items-center gap-1.5 text-xs">
                      {analysisResult.alternativeCauses.map((alt, idx) => (
                        <span key={idx} className="px-2.5 py-1 rounded-md bg-amber-50 text-amber-800 border border-amber-200">
                          {alt}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Practical Recommended Actions */}
                {analysisResult.suggestedActions && analysisResult.suggestedActions.length > 0 && (
                  <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/50 space-y-2">
                    <h4 className="text-xs font-bold text-emerald-900 uppercase tracking-wider">
                      Recommended Agronomic Actions & Management:
                    </h4>
                    <ul className="space-y-1.5 text-xs text-emerald-950">
                      {analysisResult.suggestedActions.map((act, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <span className="w-4 h-4 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                            {idx + 1}
                          </span>
                          <span>{act}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Environmental Context Chips */}
                {analysisResult.environmentalContext && (
                  <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 text-[11px] text-slate-500">
                    <span className="font-semibold text-slate-700">Scan Environment:</span>
                    {analysisResult.environmentalContext.temperature && (
                      <span className="flex items-center gap-1 bg-slate-100 px-2 py-0.5 rounded">
                        <Thermometer className="w-3 h-3 text-amber-500" />
                        {analysisResult.environmentalContext.temperature}°C
                      </span>
                    )}
                    {analysisResult.environmentalContext.humidity && (
                      <span className="flex items-center gap-1 bg-slate-100 px-2 py-0.5 rounded">
                        <Droplets className="w-3 h-3 text-blue-500" />
                        {analysisResult.environmentalContext.humidity}% RH
                      </span>
                    )}
                    {analysisResult.environmentalContext.growthStage && (
                      <span className="flex items-center gap-1 bg-slate-100 px-2 py-0.5 rounded">
                        <Sprout className="w-3 h-3 text-emerald-500" />
                        {analysisResult.environmentalContext.growthStage}
                      </span>
                    )}
                  </div>
                )}

                {/* Legal & Expert Verification Disclaimer */}
                <div className="p-3.5 rounded-lg bg-slate-100 border border-slate-200 text-slate-600 text-[11px] leading-relaxed">
                  <strong>DISCLAIMER & FIELD ADVISORY:</strong> AI-generated preliminary assessment. Confirm important disease and treatment decisions with a qualified agricultural expert or district Krishi Vigyan Kendra (KVK) plant pathologist.
                </div>
              </div>
            )}

            {/* Empty prompt when no analysis has run yet */}
            {!analysisResult && !analyzing && (
              <div className="bg-white rounded-xl border border-slate-200 p-8 text-center shadow-xs">
                <ScanEye className="w-12 h-12 text-slate-400 mx-auto mb-3" />
                <h3 className="text-base font-bold text-slate-900">
                  Ready for Crop Pathology Scanning
                </h3>
                <p className="mt-1 text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
                  Select your farm parcel, choose the registered crop, capture or upload an un-obscured leaf photograph,
                  and click &quot;Analyze Crop Pathology&quot; to receive a diagnostic assessment powered by Google Gemini.
                </p>
                <div className="mt-4 p-3 bg-slate-50 rounded-lg border border-slate-200 text-[11px] text-slate-500 max-w-sm mx-auto text-left space-y-1">
                  <strong>Best practices for accurate foliar diagnosis:</strong>
                  <div>• Center the camera on affected leaf spots or lesions.</div>
                  <div>• Ensure ample natural sunlight without heavy shadows.</div>
                  <div>• Avoid blurry or out-of-focus camera angles.</div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ======================================================================== */}
      {/* 3. TAB 2: HISTORICAL SCANS LOG                                           */}
      {/* ======================================================================== */}
      {activeTab === 'history' && (
        <div className="space-y-4">
          {loadingHistory ? (
            <div className="bg-white rounded-xl border border-slate-200 p-12 text-center shadow-xs">
              <RefreshCw className="w-8 h-8 text-emerald-600 animate-spin mx-auto mb-3" />
              <p className="text-xs text-slate-500">Loading archived disease scans...</p>
            </div>
          ) : history.length > 0 ? (
            <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-slate-900">Historical AI Disease Scans</h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Showing {history.length} archived scans for authenticated farmer
                  </p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-semibold">
                    <tr>
                      <th className="px-6 py-3">Photograph</th>
                      <th className="px-6 py-3">Crop & Farm</th>
                      <th className="px-6 py-3">Diagnosis</th>
                      <th className="px-6 py-3">Status</th>
                      <th className="px-6 py-3">Date & Time</th>
                      <th className="px-6 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {history.map((scan) => {
                      const meta = getStatusMeta(scan.status);
                      return (
                        <tr key={scan._id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="px-6 py-3.5">
                            <img
                              src={scan.image?.url}
                              alt="Crop scan"
                              className="w-12 h-12 rounded-lg object-cover border border-slate-200 bg-slate-100"
                            />
                          </td>

                          <td className="px-6 py-3.5">
                            <div className="font-bold text-slate-900">{scan.crop?.name}</div>
                            <div className="text-slate-500 text-[11px]">
                              {scan.farm?.name} · {scan.crop?.growthStage || 'Foliage'}
                            </div>
                          </td>

                          <td className="px-6 py-3.5">
                            <div className="font-semibold text-slate-900 max-w-xs truncate">
                              {scan.possibleDisease}
                            </div>
                            <div className="text-[11px] text-slate-400">
                              {scan.visibleSymptoms?.slice(0, 2).join(', ') || 'No symptoms noted'}
                            </div>
                          </td>

                          <td className="px-6 py-3.5">
                            <Badge variant={meta.variant}>{meta.label}</Badge>
                          </td>

                          <td className="px-6 py-3.5 text-slate-600">
                            <div>
                              {new Date(scan.scanTimestamp).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric',
                              })}
                            </div>
                            <div className="text-[10px] text-slate-400">
                              {new Date(scan.scanTimestamp).toLocaleTimeString('en-US', {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </div>
                          </td>

                          <td className="px-6 py-3.5 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => setActiveDetailScan(scan)}
                                title="View Full AI Findings"
                                className="p-1.5 text-slate-400 hover:text-emerald-600 rounded-lg hover:bg-slate-100"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => setScanToDelete(scan)}
                                title="Delete Scan"
                                className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-slate-100"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-slate-200 p-8 text-center shadow-xs">
              <Clock className="w-10 h-10 text-slate-400 mx-auto mb-2" />
              <h3 className="text-base font-bold text-slate-900">No Scan Records Archival</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
                Completed AI crop scans will automatically be preserved in this chronological log for long-term health tracking.
              </p>
            </div>
          )}
        </div>
      )}

      {/* ======================================================================== */}
      {/* MODAL 1: FULL SCAN DIAGNOSTICS VIEWER                                    */}
      {/* ======================================================================== */}
      <Modal
        isOpen={Boolean(activeDetailScan)}
        onClose={() => setActiveDetailScan(null)}
        title="AI Crop Disease Assessment Details"
        maxWidth="max-w-2xl"
      >
        {activeDetailScan && (
          <div className="space-y-4 text-xs">
            {/* Image & Quick summary */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-3 bg-slate-50 border border-slate-200 rounded-xl items-center">
              <img
                src={activeDetailScan.image?.url}
                alt="Analyzed Crop"
                className="w-full h-32 rounded-lg object-contain bg-black/10"
              />
              <div className="sm:col-span-2 space-y-1">
                <Badge variant={getStatusMeta(activeDetailScan.status).variant}>
                  {getStatusMeta(activeDetailScan.status).label}
                </Badge>
                <h3 className="text-base font-bold text-slate-900 mt-1">
                  {activeDetailScan.possibleDisease}
                </h3>
                <p className="text-slate-500">
                  {activeDetailScan.crop?.name} · {activeDetailScan.farm?.name}
                </p>
                <div className="text-[11px] text-slate-400">
                  {activeDetailScan.aiProvider} ({activeDetailScan.aiModel}) · {activeDetailScan.confidenceNote}
                </div>
              </div>
            </div>

            {/* Symptoms */}
            {activeDetailScan.visibleSymptoms?.length > 0 && (
              <div>
                <h4 className="font-bold text-slate-900 uppercase tracking-wider mb-1.5">
                  Observed Physical Symptoms:
                </h4>
                <ul className="space-y-1 text-slate-700">
                  {activeDetailScan.visibleSymptoms.map((s, i) => (
                    <li key={i} className="flex items-start gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 mt-0.5 shrink-0" />
                      <span>{s}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Explanation */}
            {activeDetailScan.explanation && (
              <div className="p-3.5 rounded-lg bg-white border border-slate-200 space-y-1">
                <strong className="text-slate-900 block">Pathological Evaluation:</strong>
                <p className="text-slate-600 leading-relaxed">{activeDetailScan.explanation}</p>
              </div>
            )}

            {/* Recommended actions */}
            {activeDetailScan.suggestedActions?.length > 0 && (
              <div className="p-3.5 rounded-lg bg-emerald-50 border border-emerald-200 space-y-1.5 text-emerald-950">
                <strong className="block text-emerald-900">Recommended Agronomic Actions:</strong>
                <ul className="space-y-1">
                  {activeDetailScan.suggestedActions.map((a, i) => (
                    <li key={i} className="flex items-start gap-1.5">
                      <span className="font-bold">{i + 1}.</span>
                      <span>{a}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="p-3 rounded-lg bg-slate-100 text-slate-500 text-[11px] leading-relaxed">
              <strong>DISCLAIMER:</strong> AI-generated preliminary assessment. Confirm important disease and treatment decisions with a qualified agricultural expert.
            </div>
          </div>
        )}
      </Modal>

      {/* ======================================================================== */}
      {/* MODAL 2: DELETE SCAN CONFIRMATION                                        */}
      {/* ======================================================================== */}
      <Modal
        isOpen={Boolean(scanToDelete)}
        onClose={() => setScanToDelete(null)}
        title="Delete Scan Record"
        maxWidth="max-w-md"
      >
        {scanToDelete && (
          <div className="space-y-4 text-xs">
            <p className="text-slate-600 leading-relaxed">
              Are you sure you want to delete scan record for{' '}
              <strong className="text-slate-900">{scanToDelete.possibleDisease}</strong>? This action cannot be
              undone.
            </p>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setScanToDelete(null)}
                disabled={deletingScan}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={handleConfirmDeleteScan}
                disabled={deletingScan}
                className="bg-rose-600 hover:bg-rose-700 text-white"
              >
                {deletingScan ? 'Deleting...' : 'Delete Permanently'}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
