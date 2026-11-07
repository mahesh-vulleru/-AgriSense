import mongoose from 'mongoose';

const notificationPreferenceSchema = new mongoose.Schema(
  {
    farmer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Farmer reference is required'],
      unique: true,
      index: true,
    },
    weatherAlerts: {
      type: Boolean,
      default: true,
    },
    cropAlerts: {
      type: Boolean,
      default: true,
    },
    soilAlerts: {
      type: Boolean,
      default: true,
    },
    irrigationAlerts: {
      type: Boolean,
      default: true,
    },
    diseaseAlerts: {
      type: Boolean,
      default: true,
    },
    systemAlerts: {
      type: Boolean,
      default: true,
    },
    criticalOnly: {
      type: Boolean,
      default: false,
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

const NotificationPreference =
  mongoose.models.NotificationPreference ||
  mongoose.model('NotificationPreference', notificationPreferenceSchema);

export default NotificationPreference;
