import mongoose from 'mongoose';

const userActivitySchema = new mongoose.Schema(
  {
    userId:     { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    targetId:   { type: mongoose.Schema.Types.ObjectId, required: true },
    targetType: { type: String, enum: ['post', 'paper'], required: true },
    action:     { type: String, enum: ['view', 'like', 'comment', 'save'], required: true },
    tags:       { type: [String], default: [] },
  },
  { timestamps: true }
);

// Auto-expire after 90 days
userActivitySchema.index({ createdAt: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 });
// Fast user-scoped queries
userActivitySchema.index({ userId: 1, createdAt: -1 });
// Prevent duplicate events for same (user, target, action) combination
userActivitySchema.index({ userId: 1, targetId: 1, action: 1 }, { unique: true, sparse: true });

const UserActivity = mongoose.model('UserActivity', userActivitySchema);
export default UserActivity;
