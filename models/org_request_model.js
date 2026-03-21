import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema(
  {
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    senderRole: {
      type: String,
      enum: ['requester', 'admin'],
      required: true,
    },
    body: {
      type: String,
      required: true,
      maxlength: 2000,
    },
  },
  { timestamps: true }
);

const orgRequestSchema = new mongoose.Schema(
  {
    requesterId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    orgName: {
      type: String,
      required: true,
    },
    orgDescription: {
      type: String,
      maxlength: 1000,
      default: '',
    },
    orgAvatar: {
      type: String,
      default: null,
    },
    orgBannerImage: {
      type: String,
      default: null,
    },
    status: {
      type: String,
      enum: ['pending', 'needs_revision', 'approved', 'rejected'],
      default: 'pending',
      index: true,
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    rejectionReason: {
      type: String,
      default: null,
    },
    messages: {
      type: [messageSchema],
      default: [],
    },
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      default: null,
    },
  },
  { timestamps: true }
);

orgRequestSchema.index({ status: 1, createdAt: -1 });

const OrgRequest = mongoose.model('OrgRequest', orgRequestSchema);
export default OrgRequest;
