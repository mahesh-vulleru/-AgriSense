import mongoose from 'mongoose';
import { WATER_SOURCES } from './IrrigationPlan.js';
import { WATER_UNITS } from './IrrigationSchedule.js';

const waterUsageSchema = new mongoose.Schema(
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
      default: null,
      index: true,
    },
    schedule: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'IrrigationSchedule',
      default: null,
    },
    volume: {
      type: Number,
      required: [true, 'Water volume is required and must be greater than 0'],
      min: [0.01, 'Water volume must be at least 0.01'],
    },
    unit: {
      type: String,
      enum: {
        values: WATER_UNITS,
        message: 'Invalid water measurement unit',
      },
      default: 'Liters',
    },
    volumeLiters: {
      type: Number,
      required: true,
      min: [0.01, 'Normalized volume in liters must be greater than 0'],
    },
    date: {
      type: Date,
      required: [true, 'Irrigation date is required'],
      default: Date.now,
      index: true,
    },
    durationMinutes: {
      type: Number,
      min: [0, 'Duration cannot be negative'],
      default: 60,
    },
    waterSource: {
      type: String,
      enum: {
        values: WATER_SOURCES,
        message: 'Invalid water source',
      },
      default: 'Borewell / Tubewell',
    },
    notes: {
      type: String,
      trim: true,
      default: '',
      maxlength: [500, 'Notes cannot exceed 500 characters'],
    },
  },
  {
    timestamps: true,
  }
);

waterUsageSchema.index({ farm: 1, date: -1 });
waterUsageSchema.index({ farmer: 1, date: -1 });

const WaterUsage = mongoose.model('WaterUsage', waterUsageSchema);

export default WaterUsage;
