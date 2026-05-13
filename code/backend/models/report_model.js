import mongoose from 'mongoose';

const reportSchema = new mongoose.Schema(
  {
    reporterId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    targetType: {
      type: String,
      enum: ['post', 'user'],
      required: true,
    },
    targetId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      default: null,
    },
    reason: {
      type: String,
      enum: [
        'spam',
        'harassment',
        'misinformation',
        'off_topic',
        'inappropriate',
        'impersonation',
        'other',
      ],
      required: true,
    },
    details: {
      type: String,
      maxlength: 500,
      default: null,
    },
    status: {
      type: String,
      enum: ['open', 'action_taken', 'dismissed'],
      default: 'open',
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    reviewNote: {
      type: String,
      default: null,
    },
    actionTaken: {
      type: String,
      default: null,
    },
  },
  { timestamps: true }
);

// Org admin queries: reports for a specific org
reportSchema.index({ organizationId: 1, status: 1, createdAt: -1 });
// Super admin queries: filter by target type
reportSchema.index({ targetType: 1, status: 1, createdAt: -1 });
// Duplicate prevention: one report per user per target
reportSchema.index({ reporterId: 1, targetId: 1 }, { unique: true });

const Report = mongoose.model('Report', reportSchema);
export default Report;
