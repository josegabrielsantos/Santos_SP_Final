import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema(
  {
    recipientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    type: {
      type: String,
      enum: [
        'reply', 'comment', 'like', 'mention',
        'join_request', 'join_approved', 'join_rejected',
        'post_approved', 'post_rejected', 'announcement',
        'org_request_submitted', 'org_request_approved', 'org_request_rejected',
        'org_request_followup', 'org_request_reply',
      ],
      required: true,
    },
    postId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Post',
      default: null,
    },
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      default: null,
    },
    commentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Comment',
      default: null,
    },
    orgRequestId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'OrgRequest',
      default: null,
    },
    message: {
      type: String,
      required: true,
    },
    isRead: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

// Index for fetching user's notifications newest first
notificationSchema.index({ recipientId: 1, createdAt: -1 });
// Index for unread count
notificationSchema.index({ recipientId: 1, isRead: 1 });

const Notification = mongoose.model('Notification', notificationSchema);
export default Notification;
