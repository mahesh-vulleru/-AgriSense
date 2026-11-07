import mongoose from 'mongoose';
import { CANONICAL_GROWTH_STAGES } from './Crop.js';

export const HEALTH_STATUSES = [
  'Healthy',
  'Normal',
  'Needs Attention',
  'At Risk',
  'Critical',
];

export const LEAF_CONDITIONS = [
  'Normal / Deep Green',
  'Pale Green / Chlorosis',
  'Yellowing',
  'Wilting',
  'Spots / Lesions',
  'Curling',
  'Browning / Scorched',
];

export const GROWTH_CONDITIONS = [
  'Optimal',
  'Normal',
  'Stunted',
  'Irregular',
  'Slow',
];

export const PEST_SEVERITIES = ['None', 'Minor', 'Moderate', 'Severe'];

export const DISEASE_CATEGORIES = [
  'None',
  'Fungal',
  'Bacterial',
  'Viral',
  'Nutrient Deficiency',
  'Unknown',
];

export const SOIL_MOISTURE_LEVELS = [
  'Dry',
  'Adequate',
  'Moist',
  'Saturated / Waterlogged',
];

export const WATER_STRESS_LEVELS = [
  'None',
  'Low',
  'Moderate',
  'High',
  'Severe',
];

const cropAssessmentSchema = new mongoose.Schema(
  {
    farmer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Farmer reference is required'],
      index: true,
    },
    crop: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Crop',
      required: [true, 'Crop reference is required'],
      index: true,
    },
    farm: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Farm',
      required: [true, 'Farm reference is required'],
      index: true,
    },
    assessmentDate: {
      type: Date,
      default: Date.now,
      index: true,
    },
    growthStage: {
      type: String,
      enum: CANONICAL_GROWTH_STAGES,
      default: 'Vegetative Growth',
    },
    healthStatus: {
      type: String,
      enum: HEALTH_STATUSES,
      required: [true, 'Health status is required'],
      default: 'Healthy',
      index: true,
    },
    growthCondition: {
      type: String,
      enum: GROWTH_CONDITIONS,
      default: 'Optimal',
    },
    leafCondition: {
      type: String,
      enum: LEAF_CONDITIONS,
      default: 'Normal / Deep Green',
    },
    pestObservations: {
      severity: {
        type: String,
        enum: PEST_SEVERITIES,
        default: 'None',
      },
      details: {
        type: String,
        trim: true,
        default: '',
        maxlength: [500, 'Pest details cannot exceed 500 characters'],
      },
    },
    diseaseSymptoms: {
      severity: {
        type: String,
        enum: PEST_SEVERITIES,
        default: 'None',
      },
      category: {
        type: String,
        enum: DISEASE_CATEGORIES,
        default: 'None',
      },
      details: {
        type: String,
        trim: true,
        default: '',
        maxlength: [500, 'Disease details cannot exceed 500 characters'],
      },
    },
    soilMoisture: {
      type: String,
      enum: SOIL_MOISTURE_LEVELS,
      default: 'Adequate',
    },
    waterStress: {
      type: String,
      enum: WATER_STRESS_LEVELS,
      default: 'None',
    },
    weatherSnapshot: {
      temperature: { type: Number, default: null },
      humidity: { type: Number, default: null },
      condition: { type: String, default: '' },
      windSpeed: { type: Number, default: null },
      rainfall: { type: Number, default: 0 },
      heatRisk: { type: String, default: 'Low' },
      fungalRisk: { type: String, default: 'Low' },
      droughtRisk: { type: String, default: 'Low' },
    },
    notes: {
      type: String,
      trim: true,
      default: '',
      maxlength: [1000, 'Notes cannot exceed 1000 characters'],
    },
    photos: [
      {
        url: { type: String, required: true },
        caption: { type: String, trim: true, default: '' },
        uploadedAt: { type: Date, default: Date.now },
      },
    ],
    source: {
      type: String,
      enum: [
        'Manual Agronomic Observation',
        'Automated Scan',
        'Expert Assessment',
      ],
      default: 'Manual Agronomic Observation',
    },
    sensorDataAvailable: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform: function (_doc, ret) {
        ret.id = ret._id;
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

cropAssessmentSchema.index({ farmer: 1, assessmentDate: -1 });
cropAssessmentSchema.index({ crop: 1, assessmentDate: -1 });
cropAssessmentSchema.index({ farm: 1, healthStatus: 1 });

export const CropAssessment =
  mongoose.models.CropAssessment ||
  mongoose.model('CropAssessment', cropAssessmentSchema);

export default CropAssessment;
