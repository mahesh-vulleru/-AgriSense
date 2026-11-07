import mongoose from 'mongoose';

export const SCAN_STATUSES = [
  'Healthy',
  'Diseased',
  'Pest Damage',
  'Nutrient Deficiency',
  'Physiological Stress',
  'Unable to Determine',
];

const diseaseScanSchema = new mongoose.Schema(
  {
    farmer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Farmer reference is required'],
      index: true,
    },
    farm: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Farm',
      required: [true, 'Farm reference is required'],
      index: true,
    },
    crop: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Crop',
      required: [true, 'Crop reference is required'],
      index: true,
    },
    image: {
      url: {
        type: String,
        required: [true, 'Photograph URL is required'],
      },
      filename: {
        type: String,
        default: '',
      },
      mimeType: {
        type: String,
        default: 'image/jpeg',
      },
      sizeBytes: {
        type: Number,
        default: 0,
      },
      captureMethod: {
        type: String,
        enum: ['camera', 'upload'],
        default: 'upload',
      },
    },
    scanTimestamp: {
      type: Date,
      default: Date.now,
      index: true,
    },
    aiProvider: {
      type: String,
      default: 'gemini',
    },
    aiModel: {
      type: String,
      default: 'gemini-2.5-flash',
    },
    status: {
      type: String,
      enum: {
        values: SCAN_STATUSES,
        message: 'Invalid scan status',
      },
      default: 'Unable to Determine',
      index: true,
    },
    identifiedCrop: {
      type: String,
      trim: true,
      default: '',
    },
    suitableForAnalysis: {
      type: Boolean,
      default: true,
    },
    possibleDisease: {
      type: String,
      trim: true,
      default: 'Healthy / No Pathogen Detected',
      maxlength: [200, 'Disease name cannot exceed 200 characters'],
    },
    visibleSymptoms: {
      type: [String],
      default: [],
    },
    alternativeCauses: {
      type: [String],
      default: [],
    },
    explanation: {
      type: String,
      trim: true,
      default: '',
      maxlength: [2000, 'Explanation cannot exceed 2000 characters'],
    },
    suggestedActions: {
      type: [String],
      default: [],
    },
    expertVerificationNeeded: {
      type: Boolean,
      default: true,
    },
    confidenceNote: {
      type: String,
      default: 'Confidence not calibrated',
    },
    environmentalContext: {
      temperature: { type: Number, default: null },
      humidity: { type: Number, default: null },
      recentRainfallMm: { type: Number, default: null },
      growthStage: { type: String, default: '' },
      soilMoisture: { type: String, default: '' },
    },
    rawMetadata: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    notes: {
      type: String,
      trim: true,
      default: '',
      maxlength: [1000, 'Notes cannot exceed 1000 characters'],
    },
  },
  {
    timestamps: true,
  }
);

diseaseScanSchema.index({ farm: 1, scanTimestamp: -1 });
diseaseScanSchema.index({ crop: 1, scanTimestamp: -1 });
diseaseScanSchema.index({ farmer: 1, scanTimestamp: -1 });

const DiseaseScan = mongoose.model('DiseaseScan', diseaseScanSchema);

export default DiseaseScan;
