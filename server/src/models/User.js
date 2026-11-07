import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      minlength: [2, 'Name must be at least 2 characters long'],
      maxlength: [100, 'Name cannot exceed 100 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [
        /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
        'Please provide a valid email address',
      ],
      index: true,
    },
    passwordHash: {
      type: String,
      required: [true, 'Password hash is required'],
      select: false,
    },
    phone: {
      type: String,
      trim: true,
      default: '',
    },
    location: {
      type: String,
      trim: true,
      default: '',
    },
    role: {
      type: String,
      enum: {
        values: ['farmer', 'expert', 'admin'],
        message: 'Role must be either farmer, expert, or admin',
      },
      default: 'farmer',
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    lastLogin: {
      type: Date,
      default: null,
    },
    expertProfile: {
      specialization: {
        type: String,
        default: 'Crop Protection & Agronomy',
      },
      qualification: {
        type: String,
        default: 'M.Sc. Agriculture (Agronomy)',
      },
      experienceYears: {
        type: Number,
        default: 8,
      },
      institution: {
        type: String,
        default: 'Agricultural University / Extension Center',
      },
      areasOfExpertise: {
        type: [String],
        default: [
          'Crop Protection',
          'Plant Diseases',
          'Soil Health',
          'Irrigation Management',
          'Pest Diagnostics',
        ],
      },
      availabilityStatus: {
        type: String,
        enum: ['Available', 'In Consultation', 'Away', 'Offline'],
        default: 'Available',
      },
      availableDays: {
        type: [String],
        default: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
      },
      consultationModes: {
        type: [String],
        default: ['In-App Message', 'Audio Call', 'Video Call', 'Field Visit'],
      },
      rating: {
        type: Number,
        default: 4.8,
      },
      reviewsCount: {
        type: Number,
        default: 14,
      },
      bio: {
        type: String,
        default: 'Verified agricultural scientist and extension specialist assisting farmers in crop management and yield optimization.',
      },
      isVerified: {
        type: Boolean,
        default: true,
      },
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform: function (_doc, ret) {
        ret.id = ret._id;
        delete ret._id;
        delete ret.__v;
        delete ret.passwordHash;
        return ret;
      },
    },
    toObject: {
      transform: function (_doc, ret) {
        ret.id = ret._id;
        delete ret._id;
        delete ret.__v;
        delete ret.passwordHash;
        return ret;
      },
    },
  }
);

// Virtual for fullName
userSchema.virtual('fullName')
  .get(function () {
    return this.name;
  })
  .set(function (val) {
    this.name = val;
  });

// Method to verify password
userSchema.methods.comparePassword = async function (candidatePassword) {
  if (!this.passwordHash) {
    return false;
  }
  return bcrypt.compare(candidatePassword, this.passwordHash);
};

// Method to return safe user representation without sensitive fields
userSchema.methods.toSafeUser = function () {
  return {
    id: this._id,
    name: this.name,
    fullName: this.name,
    email: this.email,
    phone: this.phone || '',
    location: this.location || '',
    role: this.role,
    expertProfile: this.role === 'expert' ? this.expertProfile : undefined,
    isActive: this.isActive,
    lastLogin: this.lastLogin,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  };
};

export const User = mongoose.model('User', userSchema);
export default User;

