import mongoose from 'mongoose';

export const SOIL_TYPES = [
  'Alluvial',
  'Black',
  'Red',
  'Laterite',
  'Sandy',
  'Clay',
  'Loamy',
  'Silt',
  'Peat',
  'Saline',
  'Other',
];

export const TEST_METHODS = [
  'Certified Laboratory',
  'Rapid Soil Test Kit',
  'Mobile Testing Van',
  'Digital IoT Soil Sensor',
  'Farmer Estimation',
];

export const PH_RATINGS = [
  'Strongly Acidic',
  'Moderately Acidic',
  'Neutral / Optimal',
  'Moderately Alkaline',
  'Strongly Alkaline',
];

export const NUTRIENT_RATINGS = ['Low', 'Medium', 'High', 'Not Measured'];

export const OC_RATINGS = [
  'Very Low',
  'Low',
  'Medium',
  'High',
  'Not Measured',
];

export const EC_RATINGS = [
  'Non-saline',
  'Slightly Saline',
  'Moderately Saline',
  'Highly Saline',
  'Not Measured',
];

export const OVERALL_HEALTH_STATUSES = [
  'Optimal',
  'Moderately Healthy',
  'Needs Improvement',
  'Degraded / Critical',
  'Insufficient Data',
];

const soilAnalysisSchema = new mongoose.Schema(
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
    sampleId: {
      type: String,
      required: [true, 'Sample identification code is required'],
      trim: true,
      maxlength: [60, 'Sample ID cannot exceed 60 characters'],
    },
    sampleDate: {
      type: Date,
      required: [true, 'Sample collection date is required'],
      default: Date.now,
      index: true,
    },
    labName: {
      type: String,
      trim: true,
      default: 'Agricultural Soil Testing Center',
      maxlength: [150, 'Lab name cannot exceed 150 characters'],
    },
    testMethod: {
      type: String,
      enum: {
        values: TEST_METHODS,
        message: 'Invalid soil test method specified',
      },
      default: 'Certified Laboratory',
    },
    soilType: {
      type: String,
      enum: {
        values: SOIL_TYPES,
        message: 'Invalid soil type specified',
      },
      default: 'Loamy',
    },
    pH: {
      value: {
        type: Number,
        required: [true, 'Soil pH value is required (0 to 14)'],
        min: [0, 'pH cannot be less than 0'],
        max: [14, 'pH cannot exceed 14'],
      },
      isEstimated: {
        type: Boolean,
        default: false,
      },
      rating: {
        type: String,
        enum: PH_RATINGS,
        default: 'Neutral / Optimal',
      },
    },
    nitrogen: {
      value: {
        type: Number,
        default: null,
        min: [0, 'Nitrogen value cannot be negative'],
        max: [2000, 'Nitrogen value exceeds realistic agronomic range'],
      },
      unit: {
        type: String,
        default: 'kg/ha',
      },
      isEstimated: {
        type: Boolean,
        default: false,
      },
      rating: {
        type: String,
        enum: NUTRIENT_RATINGS,
        default: 'Not Measured',
      },
    },
    phosphorus: {
      value: {
        type: Number,
        default: null,
        min: [0, 'Phosphorus value cannot be negative'],
        max: [500, 'Phosphorus value exceeds realistic agronomic range'],
      },
      unit: {
        type: String,
        default: 'kg/ha',
      },
      isEstimated: {
        type: Boolean,
        default: false,
      },
      rating: {
        type: String,
        enum: NUTRIENT_RATINGS,
        default: 'Not Measured',
      },
    },
    potassium: {
      value: {
        type: Number,
        default: null,
        min: [0, 'Potassium value cannot be negative'],
        max: [2000, 'Potassium value exceeds realistic agronomic range'],
      },
      unit: {
        type: String,
        default: 'kg/ha',
      },
      isEstimated: {
        type: Boolean,
        default: false,
      },
      rating: {
        type: String,
        enum: NUTRIENT_RATINGS,
        default: 'Not Measured',
      },
    },
    organicCarbon: {
      value: {
        type: Number,
        default: null,
        min: [0, 'Organic carbon cannot be negative'],
        max: [100, 'Organic carbon percentage cannot exceed 100%'],
      },
      unit: {
        type: String,
        default: '%',
      },
      isEstimated: {
        type: Boolean,
        default: false,
      },
      rating: {
        type: String,
        enum: OC_RATINGS,
        default: 'Not Measured',
      },
    },
    electricalConductivity: {
      value: {
        type: Number,
        default: null,
        min: [0, 'Electrical conductivity cannot be negative'],
        max: [50, 'Electrical conductivity exceeds realistic threshold'],
      },
      unit: {
        type: String,
        default: 'dS/m',
      },
      isEstimated: {
        type: Boolean,
        default: false,
      },
      rating: {
        type: String,
        enum: EC_RATINGS,
        default: 'Not Measured',
      },
    },
    soilMoisture: {
      value: {
        type: Number,
        default: null,
        min: [0, 'Moisture cannot be negative'],
        max: [100, 'Moisture percentage cannot exceed 100%'],
      },
      unit: {
        type: String,
        default: '%',
      },
      measured: {
        type: Boolean,
        default: false,
      },
    },
    soilTemperature: {
      value: {
        type: Number,
        default: null,
        min: [-20, 'Soil temperature cannot be below -20°C'],
        max: [80, 'Soil temperature cannot exceed 80°C'],
      },
      unit: {
        type: String,
        default: '°C',
      },
      measured: {
        type: Boolean,
        default: false,
      },
    },
    notes: {
      type: String,
      trim: true,
      default: '',
      maxlength: [1000, 'Observations note cannot exceed 1000 characters'],
    },
    labReport: {
      url: {
        type: String,
        default: '',
      },
      originalName: {
        type: String,
        default: '',
      },
      mimeType: {
        type: String,
        default: '',
      },
      sizeBytes: {
        type: Number,
        default: 0,
      },
      uploadedAt: {
        type: Date,
        default: null,
      },
    },
    overallHealthStatus: {
      type: String,
      enum: {
        values: OVERALL_HEALTH_STATUSES,
        message: 'Invalid overall soil health status',
      },
      default: 'Insufficient Data',
    },
    assessmentSummary: {
      type: String,
      default: '',
      maxlength: [1200, 'Assessment summary cannot exceed 1200 characters'],
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for farm and sampleDate
soilAnalysisSchema.index({ farm: 1, sampleDate: -1 });
soilAnalysisSchema.index({ farmer: 1, sampleDate: -1 });

const SoilAnalysis = mongoose.model('SoilAnalysis', soilAnalysisSchema);

export default SoilAnalysis;
