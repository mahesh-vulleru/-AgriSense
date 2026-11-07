import mongoose from 'mongoose';

export const CONSULTATION_STATUSES = [
  'Submitted',
  'Pending Assignment',
  'Assigned',
  'Accepted',
  'In Progress',
  'Response Provided',
  'Completed',
  'Rejected',
  'Cancelled',
];

export const CONSULTATION_PRIORITIES = ['Low', 'Medium', 'High', 'Urgent'];

export const CONSULTATION_CATEGORIES = [
  'Crop Protection',
  'Plant Diseases',
  'Soil Health',
  'Irrigation',
  'Horticulture',
  'Agricultural Practices',
  'Pest Management',
  'General Advisory',
];

export const CONSULTATION_METHODS = [
  'In-App Message',
  'Audio Call',
  'Video Call',
  'Field Visit',
];

const attachmentSchema = new mongoose.Schema(
  {
    url: { type: String, required: true },
    filename: { type: String, default: '' },
    mimeType: { type: String, default: 'image/jpeg' },
    sizeBytes: { type: Number, default: 0 },
    uploadedAt: { type: Date, default: Date.now },
  },
  { _id: true }
);

const statusHistorySchema = new mongoose.Schema(
  {
    status: {
      type: String,
      enum: CONSULTATION_STATUSES,
      required: true,
    },
    changedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    changedAt: {
      type: Date,
      default: Date.now,
    },
    notes: {
      type: String,
      trim: true,
      default: '',
    },
  },
  { _id: true }
);

const expertRecommendationSchema = new mongoose.Schema(
  {
    problemAssessment: {
      type: String,
      trim: true,
      default: '',
    },
    possibleCauses: {
      type: [String],
      default: [],
    },
    recommendedPractices: {
      type: [String],
      default: [],
    },
    preventiveMeasures: {
      type: [String],
      default: [],
    },
    followUpInstructions: {
      type: String,
      trim: true,
      default: '',
    },
    expertNotes: {
      type: String,
      trim: true,
      default: '',
    },
    recommendedNextSteps: {
      type: [String],
      default: [],
    },
    submittedAt: {
      type: Date,
      default: null,
    },
    submittedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  { _id: false }
);

const consultationSchema = new mongoose.Schema(
  {
    referenceId: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
    },
    farmer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Farmer reference is required'],
      index: true,
    },
    expert: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
    farm: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Farm',
      required: [true, 'Associated farm parcel is required'],
      index: true,
    },
    crop: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Crop',
      required: [true, 'Associated crop is required'],
      index: true,
    },
    diseaseScan: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'DiseaseScan',
      default: null,
    },
    subject: {
      type: String,
      required: [true, 'Consultation subject is required'],
      trim: true,
      maxlength: [180, 'Subject cannot exceed 180 characters'],
    },
    description: {
      type: String,
      required: [true, 'Detailed problem description is required'],
      trim: true,
      maxlength: [3000, 'Description cannot exceed 3000 characters'],
    },
    category: {
      type: String,
      enum: {
        values: CONSULTATION_CATEGORIES,
        message: 'Invalid consultation category',
      },
      required: [true, 'Consultation category is required'],
      index: true,
    },
    priority: {
      type: String,
      enum: {
        values: CONSULTATION_PRIORITIES,
        message: 'Invalid consultation priority',
      },
      default: 'Medium',
      index: true,
    },
    preferredMethod: {
      type: String,
      enum: {
        values: CONSULTATION_METHODS,
        message: 'Invalid preferred consultation method',
      },
      default: 'In-App Message',
    },
    status: {
      type: String,
      enum: {
        values: CONSULTATION_STATUSES,
        message: 'Invalid consultation status',
      },
      default: 'Submitted',
      index: true,
    },
    attachments: {
      type: [attachmentSchema],
      default: [],
    },
    statusHistory: {
      type: [statusHistorySchema],
      default: [],
    },
    recommendation: {
      type: expertRecommendationSchema,
      default: () => ({}),
    },
    rejectionReason: {
      type: String,
      trim: true,
      default: '',
    },
    rating: {
      type: Number,
      min: 1,
      max: 5,
      default: null,
    },
    feedback: {
      type: String,
      trim: true,
      default: '',
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

// Helper static method to generate unique human-readable reference IDs
consultationSchema.statics.generateReferenceId = async function () {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const datePrefix = `CONS-${year}${month}${day}`;

  // Generate 4-character random uppercase alphanumeric suffix
  const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
  const ref = `${datePrefix}-${randomSuffix}`;

  const exists = await this.findOne({ referenceId: ref });
  if (exists) {
    return this.generateReferenceId();
  }
  return ref;
};

consultationSchema.index({ farmer: 1, createdAt: -1 });
consultationSchema.index({ expert: 1, createdAt: -1 });

const Consultation =
  mongoose.models.Consultation || mongoose.model('Consultation', consultationSchema);

export default Consultation;
