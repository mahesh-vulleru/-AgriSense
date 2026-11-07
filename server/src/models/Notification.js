import mongoose from 'mongoose';

export const NOTIFICATION_CATEGORIES = [
  'weather',
  'crop',
  'soil',
  'irrigation',
  'disease',
  'system',
];

export const NOTIFICATION_SEVERITIES = [
  'info',
  'success',
  'warning',
  'critical',
];

const notificationSchema = new mongoose.Schema(
  {
    farmer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Farmer reference is required'],
      index: true,
    },
    title: {
      type: String,
      required: [true, 'Notification title is required'],
      trim: true,
      maxlength: [180, 'Title cannot exceed 180 characters'],
    },
    message: {
      type: String,
      required: [true, 'Notification message is required'],
      trim: true,
      maxlength: [1000, 'Message cannot exceed 1000 characters'],
    },
    category: {
      type: String,
      enum: {
        values: NOTIFICATION_CATEGORIES,
        message: 'Invalid notification category',
      },
      required: [true, 'Notification category is required'],
      index: true,
    },
    severity: {
      type: String,
      enum: {
        values: NOTIFICATION_SEVERITIES,
        message: 'Invalid notification severity',
      },
      default: 'info',
      index: true,
    },
    farm: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Farm',
      default: null,
      index: true,
    },
    crop: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Crop',
      default: null,
      index: true,
    },
    relatedId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },
    relatedModel: {
      type: String,
      enum: [
        'DiseaseScan',
        'IrrigationSchedule',
        'IrrigationPlan',
        'SoilAnalysis',
        'Crop',
        'CropAssessment',
        'Farm',
        'Consultation',
        null,
      ],
      default: null,
    },
    actionUrl: {
      type: String,
      default: '',
      trim: true,
    },
    actionLabel: {
      type: String,
      default: '',
      trim: true,
    },
    isRead: {
      type: Boolean,
      default: false,
      index: true,
    },
    readAt: {
      type: Date,
      default: null,
    },
    dedupKey: {
      type: String,
      default: null,
      index: true,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: function (_doc, ret) {
        ret.id = ret._id;
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
    toObject: {
      virtuals: true,
      transform: function (_doc, ret) {
        ret.id = ret._id;
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

// Compound indexes for querying and deduping
notificationSchema.index({ farmer: 1, createdAt: -1 });
notificationSchema.index({ farmer: 1, isRead: 1 });
notificationSchema.index({ farmer: 1, dedupKey: 1 });

const Notification = mongoose.models.Notification || mongoose.model('Notification', notificationSchema);

export default Notification;
