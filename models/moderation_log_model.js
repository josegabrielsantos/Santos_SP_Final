import mongoose from 'mongoose';

const moderationLogSchema = new mongoose.Schema(
  {
    performedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    action: {
      type: String,
      enum: [
        'post_hidden',
        'post_unhidden',
        'post_deleted',
        'comment_hidden',
        'comment_unhidden',
        'comment_deleted',
        'user_banned',
        'user_unbanned',
        'user_deactivated',
        'user_reactivated',
        'user_role_changed',
        'org_deactivated',
        'org_reactivated',
        'org_deleted',
      ],
      required: true,
    },
    targetType: {
      type: String,
      enum: ['post', 'comment', 'user', 'organization'],
      required: true,
    },
    targetId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    details: {
      type: String,
      default: null,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
  },
  { timestamps: true }
);

moderationLogSchema.index({ createdAt: -1 });
moderationLogSchema.index({ action: 1, createdAt: -1 });
moderationLogSchema.index({ targetType: 1, createdAt: -1 });
moderationLogSchema.index({ performedBy: 1, createdAt: -1 });

const ModerationLog = mongoose.model('ModerationLog', moderationLogSchema);
export default ModerationLog;
