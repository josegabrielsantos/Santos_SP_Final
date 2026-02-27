import mongoose from 'mongoose';

// -- Poll sub-schemas --

const pollOptionSchema = new mongoose.Schema(
  {
    optionId:  { type: String, required: true },
    text:      { type: String, required: true },
    voteCount: { type: Number, default: 0 },
    voterIds:  { type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }], default: [] },
  },
  { _id: false }
);

const pollSchema = new mongoose.Schema(
  {
    question:      { type: String, required: true },
    isMultiple:    { type: Boolean, required: true, default: false },
    options:       { type: [pollOptionSchema], required: true },
    totalVotes:    { type: Number, default: 0 },
    closesAt:      { type: Date, default: null },
  },
  { _id: false }
);

// -- Post schema --

const postSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      maxlength: 200,
    },
    body: {
      type: mongoose.Schema.Types.Mixed, // TipTap / ProseMirror JSON
      required: true,
    },
    bodyText: {
      type: String,
      required: true, // Plaintext extraction for ES - never displayed in UI
    },
    tags: {
      type: [String],
      default: [],
      validate: {
        validator: (v) => v.length <= 10,
        message: 'A post can have at most 10 tags.',
      },
    },
    authorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      default: null,
    },
    status: {
      type: String,
      enum: ['draft', 'pending', 'published', 'hidden'],
      required: true,
      default: 'draft',
      index: true,
    },
    likeCount: {
      type: Number,
      required: true,
      default: 0,
    },
    commentCount: {
      type: Number,
      required: true,
      default: 0,
    },
    likedBy: {
      type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
      default: [],
    },
    reportedBy: {
      type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
      default: [],
    },
    isReported: {
      type: Boolean,
      required: true,
      default: false,
      index: true,
    },
    mediaUrls: {
      type: [String],
      default: [],
    },
    paperIds: {
      type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Paper' }],
      default: [],
    },
    poll: {
      type: pollSchema,
      default: null,
    },
    type: {
      type: String,
      enum: ['post', 'announcement', 'poll', 'paper_share', 'update'],
      required: true,
      default: 'post',
      index: true,
    },
    publishedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

// -- Indexes --

postSchema.index({ organizationId: 1, status: 1, publishedAt: -1 });
postSchema.index({ authorId: 1, publishedAt: -1 });
postSchema.index({ status: 1, publishedAt: -1 });
postSchema.index({ type: 1, status: 1, publishedAt: -1 });
postSchema.index({ isReported: 1, status: 1 });

// -- Pre-save hooks --

postSchema.pre('save', function (next) {
  // Set publishedAt exactly once when status first becomes 'published'
  if (
    this.isModified('status') &&
    this.status === 'published' &&
    !this.publishedAt
  ) {
    this.publishedAt = new Date();
  }

  // Keep isReported in sync with reportedBy array
  this.isReported = this.reportedBy.length > 0;

  next();
});

// -- Post-save ES sync hook --

import { indexPost, deletePost } from '../elastic/esSync.js';

postSchema.post('save', async function (doc) {
  try {
    if (doc.status === 'published') {
      await indexPost(doc);
    } else {
      await deletePost(doc._id.toString());
    }
  } catch (err) {
    console.error('[ES sync] post save failed:', err.message);
  }
});

postSchema.post('findOneAndUpdate', async function (doc) {
  if (!doc) return;
  try {
    if (doc.status === 'published') {
      await indexPost(doc);
    } else {
      await deletePost(doc._id.toString());
    }
  } catch (err) {
    console.error('[ES sync] post update failed:', err.message);
  }
});

const Post = mongoose.model('Post', postSchema);
export default Post;
