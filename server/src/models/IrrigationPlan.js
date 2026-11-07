import mongoose from 'mongoose';

export const IRRIGATION_METHODS = [
  'Drip',
  'Sprinkler',
  'Flood',
  'Furrow',
  'Other',
];

export const WATER_SOURCES = [
  'Borewell / Tubewell',
  'Canal',
  'Farm Pond / Reservoir',
  'River / Stream',
  'Municipal / Tanker',
  'Rainwater Harvesting',
  'Other',
];

export const IRRIGATION_FREQUENCIES = [
  'Daily',
  'Alternate Days',
  'Twice a Week',
  'Weekly',
  'As Needed / Soil Triggered',
  'Custom',
];

export const PLAN_STATUSES = ['Active', 'Paused', 'Completed', 'Archived'];

const irrigationPlanSchema = new mongoose.Schema(
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
      required: [true, 'Farm parcel reference is required'],
      index: true,
    },
    crop: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Crop',
      required: [true, 'Crop reference is required'],
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Irrigation plan name is required'],
      trim: true,
      maxlength: [120, 'Plan name cannot exceed 120 characters'],
    },
    method: {
      type: String,
      enum: {
        values: IRRIGATION_METHODS,
        message: 'Invalid irrigation method specified',
      },
      required: [true, 'Irrigation method is required'],
      default: 'Drip',
    },
    cultivatedArea: {
      type: Number,
      required: [true, 'Cultivated area is required'],
      min: [0.01, 'Cultivated area must be greater than 0'],
    },
    waterSource: {
      type: String,
      enum: {
        values: WATER_SOURCES,
        message: 'Invalid water source specified',
      },
      default: 'Borewell / Tubewell',
    },
    startDate: {
      type: Date,
      required: [true, 'Plan start date is required'],
      default: Date.now,
    },
    frequency: {
      type: String,
      enum: {
        values: IRRIGATION_FREQUENCIES,
        message: 'Invalid irrigation frequency specified',
      },
      default: 'Alternate Days',
    },
    plannedDurationMinutes: {
      type: Number,
      required: [true, 'Planned duration per session is required'],
      min: [1, 'Duration must be at least 1 minute'],
      max: [1440, 'Duration cannot exceed 1440 minutes (24 hours)'],
      default: 60,
    },
    waterVolumePerSessionLiters: {
      type: Number,
      default: null,
      min: [0, 'Water volume cannot be negative'],
    },
    status: {
      type: String,
      enum: {
        values: PLAN_STATUSES,
        message: 'Invalid plan status',
      },
      default: 'Active',
      index: true,
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

irrigationPlanSchema.index({ farm: 1, crop: 1, status: 1 });
irrigationPlanSchema.index({ farmer: 1, status: 1 });

const IrrigationPlan = mongoose.model('IrrigationPlan', irrigationPlanSchema);

export default IrrigationPlan;
