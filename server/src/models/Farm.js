import mongoose from 'mongoose';

const farmSchema = new mongoose.Schema(
  {
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Farm owner is required'],
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Farm name is required'],
      trim: true,
      minlength: [2, 'Farm name must be at least 2 characters long'],
      maxlength: [120, 'Farm name cannot exceed 120 characters'],
    },
    location: {
      type: String,
      required: [true, 'Farm location is required'],
      trim: true,
      maxlength: [200, 'Location cannot exceed 200 characters'],
    },
    state: {
      type: String,
      trim: true,
      default: '',
      maxlength: [100, 'State cannot exceed 100 characters'],
    },
    district: {
      type: String,
      trim: true,
      default: '',
      maxlength: [100, 'District cannot exceed 100 characters'],
    },
    village: {
      type: String,
      trim: true,
      default: '',
      maxlength: [100, 'Village cannot exceed 100 characters'],
    },
    pincode: {
      type: String,
      trim: true,
      default: '',
      maxlength: [20, 'Pincode cannot exceed 20 characters'],
    },
    coordinates: {
      latitude: {
        type: Number,
        default: null,
        min: [-90, 'Latitude must be between -90 and 90'],
        max: [90, 'Latitude must be between -90 and 90'],
      },
      longitude: {
        type: Number,
        default: null,
        min: [-180, 'Longitude must be between -180 and 180'],
        max: [180, 'Longitude must be between -180 and 180'],
      },
    },
    acreage: {
      type: Number,
      required: [true, 'Total acreage is required and must be greater than 0'],
      min: [0.01, 'Acreage must be at least 0.01 acres'],
    },
    soilType: {
      type: String,
      enum: {
        values: [
          'Alluvial',
          'Black',
          'Red',
          'Laterite',
          'Sandy',
          'Clay',
          'Loamy',
          'Other',
        ],
        message: 'Invalid soil type specified',
      },
      default: 'Loamy',
    },
    irrigationType: {
      type: String,
      enum: {
        values: ['Drip', 'Sprinkler', 'Flood', 'Rain-fed', 'Other'],
        message: 'Invalid irrigation type specified',
      },
      default: 'Drip',
    },
    mainCrops: {
      type: [String],
      default: [],
    },
    description: {
      type: String,
      trim: true,
      default: '',
      maxlength: [1000, 'Description cannot exceed 1000 characters'],
    },
    status: {
      type: String,
      enum: {
        values: ['Active', 'Inactive', 'Archived'],
        message: 'Status must be Active, Inactive, or Archived',
      },
      default: 'Active',
      index: true,
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
    toObject: {
      transform: function (_doc, ret) {
        ret.id = ret._id;
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

// Compound index for efficient owner & status lookups
farmSchema.index({ owner: 1, status: 1 });
farmSchema.index({ owner: 1, name: 1 });

export const Farm = mongoose.model('Farm', farmSchema);
export default Farm;

