import mongoose from 'mongoose';
import { IRRIGATION_METHODS, WATER_SOURCES } from './IrrigationPlan.js';

export const SCHEDULE_STATUSES = [
  'Scheduled',
  'In Progress',
  'Completed',
  'Cancelled',
  'Skipped',
];

export const WATER_UNITS = ['Liters', 'Cubic Meters', 'Gallons', 'Acre-Inches'];

const irrigationScheduleSchema = new mongoose.Schema(
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
    plan: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'IrrigationPlan',
      default: null,
    },
    title: {
      type: String,
      required: [true, 'Activity title or session name is required'],
      trim: true,
      maxlength: [140, 'Title cannot exceed 140 characters'],
    },
    scheduledDate: {
      type: Date,
      required: [true, 'Scheduled date and time is required'],
      index: true,
    },
    durationMinutes: {
      type: Number,
      required: [true, 'Planned duration in minutes is required'],
      min: [1, 'Duration must be at least 1 minute'],
      max: [1440, 'Duration cannot exceed 1440 minutes'],
      default: 60,
    },
    method: {
      type: String,
      enum: {
        values: IRRIGATION_METHODS,
        message: 'Invalid irrigation method',
      },
      default: 'Drip',
    },
    waterSource: {
      type: String,
      enum: {
        values: WATER_SOURCES,
        message: 'Invalid water source',
      },
      default: 'Borewell / Tubewell',
    },
    status: {
      type: String,
      enum: {
        values: SCHEDULE_STATUSES,
        message: 'Invalid schedule status',
      },
      default: 'Scheduled',
      index: true,
    },
    completedAt: {
      type: Date,
      default: null,
    },
    waterUsedLiters: {
      type: Number,
      default: null,
      min: [0, 'Water used cannot be negative'],
    },
    waterVolume: {
      type: Number,
      default: null,
      min: [0, 'Water volume cannot be negative'],
    },
    waterUnit: {
      type: String,
      enum: WATER_UNITS,
      default: 'Liters',
    },
    weatherSnapshot: {
      rainForecastMm: { type: Number, default: 0 },
      temp: { type: Number, default: null },
      humidity: { type: Number, default: null },
      condition: { type: String, default: '' },
      recommendationNotice: { type: String, default: '' },
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

irrigationScheduleSchema.index({ farm: 1, scheduledDate: 1, status: 1 });
irrigationScheduleSchema.index({ farmer: 1, scheduledDate: 1 });

const IrrigationSchedule = mongoose.model('IrrigationSchedule', irrigationScheduleSchema);

export default IrrigationSchedule;
