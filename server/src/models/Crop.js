import mongoose from 'mongoose';

export const GROWTH_STAGES = [
  'Land Preparation',
  'Sowing / Planting',
  'Sowing', // Backward-compatible alias
  'Germination',
  'Seedling',
  'Vegetative Growth',
  'Tillering / Branching',
  'Flowering',
  'Fruiting / Grain Formation',
  'Fruiting', // Backward-compatible alias
  'Maturity',
  'Harvesting',
  'Harvested',
];

export const CANONICAL_GROWTH_STAGES = [
  'Land Preparation',
  'Sowing / Planting',
  'Germination',
  'Seedling',
  'Vegetative Growth',
  'Tillering / Branching',
  'Flowering',
  'Fruiting / Grain Formation',
  'Maturity',
  'Harvesting',
  'Harvested',
];

export const CROP_STATUSES = ['Active', 'Harvested', 'Archived'];

export const CROP_CATEGORIES = [
  'Cereal',
  'Pulses',
  'Oilseeds',
  'Fiber',
  'Cash Crop',
  'Vegetable',
  'Fruit',
  'Horticulture',
  'Other',
];

export const CROP_SEASONS = ['Kharif', 'Rabi', 'Zaid', 'Year-round', 'Other'];

export const IRRIGATION_METHODS = ['Drip', 'Sprinkler', 'Flood', 'Rain-fed', 'Other'];

const stageHistorySchema = new mongoose.Schema(
  {
    stage: {
      type: String,
      required: [true, 'Growth stage is required for history entry'],
      enum: GROWTH_STAGES,
    },
    transitionDate: {
      type: Date,
      default: Date.now,
    },
    notes: {
      type: String,
      trim: true,
      default: '',
      maxlength: [300, 'Notes cannot exceed 300 characters'],
    },
    recordedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  { _id: true }
);

const calendarEventSchema = new mongoose.Schema(
  {
    activity: {
      type: String,
      required: [true, 'Calendar activity title is required'],
      trim: true,
      maxlength: [120, 'Activity cannot exceed 120 characters'],
    },
    category: {
      type: String,
      enum: ['Stage', 'Irrigation', 'Fertilization', 'Pest Management', 'Harvest', 'General'],
      default: 'General',
    },
    targetDate: {
      type: Date,
      required: [true, 'Activity target date is required'],
    },
    completed: {
      type: Boolean,
      default: false,
    },
    completedDate: {
      type: Date,
      default: null,
    },
    notes: {
      type: String,
      trim: true,
      default: '',
      maxlength: [300, 'Notes cannot exceed 300 characters'],
    },
  },
  { _id: true }
);

const actualHarvestSchema = new mongoose.Schema(
  {
    harvestDate: {
      type: Date,
      default: null,
    },
    actualYield: {
      type: Number,
      default: null,
      min: [0, 'Actual yield cannot be negative'],
    },
    yieldUnit: {
      type: String,
      default: 'kg',
      trim: true,
    },
    qualityGrade: {
      type: String,
      enum: ['Grade A', 'Grade B', 'Grade C', 'Premium', 'Standard', 'Low', 'Not Graded'],
      default: 'Standard',
    },
    harvestNotes: {
      type: String,
      trim: true,
      default: '',
      maxlength: [500, 'Harvest notes cannot exceed 500 characters'],
    },
    recordedAt: {
      type: Date,
      default: null,
    },
  },
  { _id: false }
);

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
    category: {
      type: String,
      enum: {
        values: CROP_CATEGORIES,
        message: 'Invalid crop category specified',
      },
      default: 'Cereal',
      index: true,
    },
    season: {
      type: String,
      enum: {
        values: CROP_SEASONS,
        message: 'Invalid season specified',
      },
      default: 'Kharif',
      index: true,
    },
    irrigationMethod: {
      type: String,
      enum: {
        values: IRRIGATION_METHODS,
        message: 'Invalid irrigation method specified',
      },
      default: 'Drip',
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
    expectedYieldPerAcre: {
      type: Number,
      default: null,
      min: [0, 'Expected yield per acre cannot be negative'],
    },
    estimatedTotalYield: {
      type: Number,
      default: null,
      min: [0, 'Estimated total yield cannot be negative'],
    },
    yieldUnit: {
      type: String,
      default: 'kg',
      trim: true,
    },
    growthStage: {
      type: String,
      enum: {
        values: GROWTH_STAGES,
        message: 'Invalid growth stage specified',
      },
      default: 'Vegetative Growth',
    },
    stageHistory: {
      type: [stageHistorySchema],
      default: [],
    },
    calendar: {
      type: [calendarEventSchema],
      default: [],
    },
    actualHarvest: {
      type: actualHarvestSchema,
      default: () => ({}),
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

// Pre-save calculation of estimatedTotalYield
cropSchema.pre('save', function (next) {
  if (typeof this.cultivatedArea === 'number' && typeof this.expectedYieldPerAcre === 'number') {
    this.estimatedTotalYield = Number((this.cultivatedArea * this.expectedYieldPerAcre).toFixed(2));
  }
  next();
});

// Compound indexes for optimal queries and strict farmer data isolation
cropSchema.index({ owner: 1, status: 1 });
cropSchema.index({ owner: 1, farm: 1 });
cropSchema.index({ owner: 1, growthStage: 1 });
cropSchema.index({ owner: 1, season: 1 });

export const Crop = mongoose.models.Crop || mongoose.model('Crop', cropSchema);
export default Crop;
