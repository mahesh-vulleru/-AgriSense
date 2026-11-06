import mongoose from 'mongoose';

export const GROWTH_STAGES = [
  'Land Preparation',
  'Sowing',
  'Germination',
  'Seedling',
  'Vegetative Growth',
  'Flowering',
  'Fruiting',
  'Maturity',
  'Harvested',
];

export const CROP_STATUSES = ['Active', 'Harvested', 'Archived'];

const cropSchema = new mongoose.Schema(
  {
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Crop owner is required'],
      index: true,
    },
    farm: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Farm',
      required: [true, 'Associated farm is required'],
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Crop name is required'],
      trim: true,
      maxlength: [100, 'Crop name cannot exceed 100 characters'],
    },
    variety: {
      type: String,
      trim: true,
      default: '',
      maxlength: [100, 'Variety cannot exceed 100 characters'],
    },
    cultivatedArea: {
      type: Number,
      required: [true, 'Cultivated area is required'],
      min: [0.01, 'Cultivated area must be greater than 0'],
    },
    plantingDate: {
      type: Date,
      default: null,
    },
    expectedHarvestDate: {
      type: Date,
      default: null,
    },
    growthStage: {
      type: String,
      enum: {
        values: GROWTH_STAGES,
        message: 'Invalid growth stage specified',
      },
      default: 'Vegetative Growth',
    },
    status: {
      type: String,
      enum: {
        values: CROP_STATUSES,
        message: 'Invalid crop status specified',
      },
      default: 'Active',
      index: true,
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

// Compound indexes for optimal queries and strict farmer data isolation
cropSchema.index({ owner: 1, status: 1 });
cropSchema.index({ owner: 1, farm: 1 });

export const Crop = mongoose.models.Crop || mongoose.model('Crop', cropSchema);
export default Crop;
