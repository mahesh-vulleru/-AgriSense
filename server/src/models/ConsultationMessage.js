import mongoose from 'mongoose';

const consultationMessageSchema = new mongoose.Schema(
  {
    consultation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Consultation',
      required: [true, 'Consultation reference is required'],
      index: true,
    },
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Sender reference is required'],
      index: true,
    },
    senderRole: {
      type: String,
      enum: ['farmer', 'expert', 'admin', 'system'],
      required: [true, 'Sender role is required'],
    },
    message: {
      type: String,
      required: [true, 'Message text is required'],
      trim: true,
      maxlength: [3000, 'Message cannot exceed 3000 characters'],
    },
    messageType: {
      type: String,
      enum: ['text', 'image', 'system', 'recommendation'],
      default: 'text',
    },
    attachments: [
      {
        url: { type: String, required: true },
        filename: { type: String, default: '' },
        mimeType: { type: String, default: 'image/jpeg' },
        sizeBytes: { type: Number, default: 0 },
      },
    ],
    isReadByFarmer: {
      type: Boolean,
      default: false,
    },
    isReadByExpert: {
      type: Boolean,
      default: false,
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

consultationMessageSchema.index({ consultation: 1, createdAt: 1 });

const ConsultationMessage =
  mongoose.models.ConsultationMessage ||
  mongoose.model('ConsultationMessage', consultationMessageSchema);

export default ConsultationMessage;
